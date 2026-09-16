-- Apply this migration in the Supabase SQL editor if schema.sql was already
-- installed before the class-creation RPC was added.

create or replace function public.create_class(
  p_name text,
  p_starts_on date default null,
  p_ends_on date default null,
  p_notes text default null
)
returns table (
  id uuid,
  code varchar,
  name text,
  status public.class_status,
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.current_role() not in ('teacher', 'admin') then
    raise exception 'An active teacher or MSI administrator account is required to create a class';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'A class name is required'; end if;
  if p_ends_on is not null and p_starts_on is not null and p_ends_on < p_starts_on then
    raise exception 'The class end date must be on or after the start date';
  end if;

  return query
  insert into public.classes (name, owner_id, status, starts_on, ends_on, notes)
  values (trim(p_name), auth.uid(), 'active', p_starts_on, p_ends_on, nullif(trim(p_notes), ''))
  returning classes.id, classes.code, classes.name, classes.status, classes.starts_on, classes.ends_on, classes.notes, classes.created_at;
end;
$$;

drop policy if exists "classes: teachers create" on public.classes;
create policy "classes: teachers create" on public.classes for insert with check (
  owner_id = auth.uid() and exists (
    select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin') and is_active
  )
);

grant execute on function public.create_class(text, date, date, text) to authenticated;
