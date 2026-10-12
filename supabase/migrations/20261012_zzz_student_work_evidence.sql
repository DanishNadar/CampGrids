-- Private student work evidence: images, video, audio, and PDFs attached to a
-- self-directed class Grid activity. Storage stays private to the student and
-- their current class teachers.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-work',
  'student-work',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.student_activity_evidence (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.class_enrollments(id) on delete cascade,
  mother_grid_cell_id uuid not null references public.mother_grid_cells(id) on delete cascade,
  activity_index integer not null check (activity_index >= 0),
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 240),
  media_type text not null check (char_length(trim(media_type)) between 1 and 120),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists student_activity_evidence_enrollment_idx
  on public.student_activity_evidence(enrollment_id, created_at desc);

alter table public.student_activity_evidence enable row level security;

drop policy if exists "student evidence: class scope read" on public.student_activity_evidence;
create policy "student evidence: class scope read" on public.student_activity_evidence
  for select using (
    exists (
      select 1 from public.class_enrollments e
      where e.id = enrollment_id
        and (public.is_teacher_of(e.class_id) or (e.student_id = auth.uid() and e.exited_at is null))
    )
  );

drop policy if exists "student work: uploader writes own objects" on storage.objects;
create policy "student work: uploader writes own objects" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'student-work'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "student work: class scope reads objects" on storage.objects;
create policy "student work: class scope reads objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'student-work'
    and exists (
      select 1
      from public.student_activity_evidence evidence
      join public.class_enrollments e on e.id = evidence.enrollment_id
      where evidence.storage_path = name
        and (public.is_teacher_of(e.class_id) or (e.student_id = auth.uid() and e.exited_at is null))
    )
  );

drop policy if exists "student work: uploader removes own objects" on storage.objects;
create policy "student work: uploader removes own objects" on storage.objects
  for delete to authenticated using (
    bucket_id = 'student-work'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.student_activity_evidence evidence
      where evidence.storage_path = name
    )
  );

create or replace function public.record_student_grid_evidence(
  p_class_id uuid,
  p_mother_grid_cell_id uuid,
  p_activity_index integer,
  p_storage_path text,
  p_file_name text,
  p_media_type text,
  p_byte_size integer,
  p_caption text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  enrollment_value uuid;
  evidence_id uuid;
begin
  if public.current_role() <> 'student' then
    raise exception 'Only a student can upload activity evidence';
  end if;
  if p_storage_path !~ ('^' || auth.uid()::text || '/') then
    raise exception 'Evidence must be stored in your private work folder';
  end if;
  if p_media_type not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'application/pdf') then
    raise exception 'That evidence file type is not allowed';
  end if;
  if p_byte_size < 1 or p_byte_size > 10485760 then
    raise exception 'Evidence files must be 10 MB or smaller';
  end if;

  select e.id into enrollment_value
  from public.class_enrollments e
  where e.class_id = p_class_id and e.student_id = auth.uid() and e.exited_at is null;
  if enrollment_value is null then raise exception 'You are not enrolled in this class'; end if;

  if not exists (
    select 1 from public.class_grid_cells cg
    join public.mother_grid_cells cell on cell.id = cg.mother_grid_cell_id
    where cg.class_id = p_class_id
      and cg.mother_grid_cell_id = p_mother_grid_cell_id
      and cell.is_active
      and p_activity_index between 0 and greatest(coalesce(jsonb_array_length(cell.projects), 0), 1) - 1
  ) then
    raise exception 'That activity is not in your class Grid';
  end if;

  perform public.save_student_grid_activity_progress(
    p_class_id, p_mother_grid_cell_id, p_activity_index, 'in_progress'
  );

  insert into public.student_activity_evidence
    (enrollment_id, mother_grid_cell_id, activity_index, storage_path, file_name, media_type, byte_size, caption)
  values
    (enrollment_value, p_mother_grid_cell_id, p_activity_index, p_storage_path,
     left(trim(p_file_name), 240), p_media_type, p_byte_size, nullif(trim(coalesce(p_caption, '')), ''))
  returning id into evidence_id;

  insert into public.student_activity_events (student_id, class_id, event_type, metadata)
  values (
    auth.uid(), p_class_id, 'assignment_submitted',
    jsonb_build_object('source', 'class_grid', 'mother_grid_cell_id', p_mother_grid_cell_id,
      'activity_index', p_activity_index, 'evidence_id', evidence_id, 'file_name', left(trim(p_file_name), 240))
  );

  return evidence_id;
end;
$$;

grant select on public.student_activity_evidence to authenticated;
grant execute on function public.record_student_grid_evidence(uuid, uuid, integer, text, text, text, integer, text) to authenticated;

notify pgrst, 'reload schema';
