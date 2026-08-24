-- CampGrids Supabase schema
-- Run this file in the Supabase SQL editor (or with `supabase db push`) before
-- deploying the static app. The schema deliberately keeps the application data
-- in `public` and authentication identities in Supabase Auth (`auth.users`).

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.class_status as enum ('draft', 'active', 'archived');
create type public.assignment_status as enum ('not_started', 'in_progress', 'submitted', 'complete');
create type public.event_type as enum ('signed_in', 'grid_opened', 'resource_opened', 'video_opened', 'assignment_started', 'assignment_submitted', 'assignment_completed', 'assignment_reviewed', 'belt_awarded', 'profile_updated');

-- Every authenticated person has exactly one profile, plus a role-specific
-- profile row. Admin is intentionally not accepted from browser metadata.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  email citext unique,
  username citext unique,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-z0-9]+$')
);

create table public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  grade text,
  guardian_name text,
  guardian_email citext,
  emergency_notes text,
  created_at timestamptz not null default now()
);

create table public.teacher_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  title text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.admin_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  department text,
  created_at timestamptz not null default now()
);

create table public.username_sequences (
  base_username citext primary key,
  next_suffix integer not null default 0 check (next_suffix >= 0),
  created_at timestamptz not null default now()
);

create table public.camps (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  code varchar(12) not null unique check (code ~ '^[A-Z0-9]{7,12}$'),
  name text not null check (char_length(trim(name)) between 1 and 140),
  camp_id uuid references public.camps(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  status public.class_status not null default 'draft',
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_date_range check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.class_teachers (
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  added_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  exited_at timestamptz,
  unique (class_id, student_id),
  constraint enrollment_dates check (exited_at is null or exited_at >= enrolled_at)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  original_filename text not null,
  row_count integer not null default 0 check (row_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- The lesson snapshot lives on the class assignment: historical exports remain
-- correct even after an MSI admin updates the public Grid.
create table public.class_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  instructions text,
  category text,
  belt text,
  resource_url text,
  due_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.class_assignments(id) on delete cascade,
  enrollment_id uuid not null references public.class_enrollments(id) on delete cascade,
  status public.assignment_status not null default 'not_started',
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, enrollment_id)
);

create table public.belt_awards (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.class_enrollments(id) on delete cascade,
  category text not null,
  belt text not null,
  awarded_by uuid not null references public.profiles(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  note text,
  unique (enrollment_id, category, belt)
);

-- This append-only stream is the student profile timeline. The application logs
-- grid/resource opens and progression changes here, with a class when known.
create table public.student_activity_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  assignment_id uuid references public.class_assignments(id) on delete set null,
  event_type public.event_type not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- MSI-maintained content controls. These tables power live pages, navigation,
-- and dropdowns without a deploy. Existing static pages continue to work.
create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  body jsonb not null default '{"blocks":[]}'::jsonb,
  is_published boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  location text not null default 'primary' check (location in ('primary', 'footer', 'teacher')),
  position integer not null default 0,
  page_id uuid references public.content_pages(id) on delete set null,
  is_visible boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (location, position)
);

create table public.dropdown_options (
  id uuid primary key default gen_random_uuid(),
  group_key text not null check (group_key ~ '^[a-z0-9_-]+$'),
  value text not null,
  label text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (group_key, value),
  unique (group_key, position)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index class_enrollments_student_idx on public.class_enrollments(student_id) where exited_at is null;
create index class_assignments_class_idx on public.class_assignments(class_id, published_at);
create index progress_enrollment_idx on public.student_assignment_progress(enrollment_id);
create index belt_awards_enrollment_idx on public.belt_awards(enrollment_id);
create index student_events_student_idx on public.student_activity_events(student_id, occurred_at desc);
create index student_events_class_idx on public.student_activity_events(class_id, occurred_at desc);
create index navigation_visible_idx on public.navigation_items(location, position) where is_visible;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_profile_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- A person can edit their display details, but their role, login identity, and
  -- active status remain MSI-managed. Administrators retain full control.
  if auth.role() <> 'service_role' and not public.is_admin() and (new.role is distinct from old.role or new.username is distinct from old.username or new.email is distinct from old.email or new.is_active is distinct from old.is_active) then
    raise exception 'Only an MSI administrator can change roles, login identities, or account status';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  -- Browser signup metadata cannot create staff roles. The admin-only Edge
  -- function promotes a newly created default student profile to teacher.
  insert into public.profiles (id, role, email, username, first_name, last_name)
  values (
    new.id,
    'student',
    lower(new.email),
    nullif(lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9]', '', 'g')), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 'CampGrids'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), 'User')
  );
  insert into public.student_profiles (user_id, grade, guardian_name, guardian_email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'grade', ''),
    nullif(new.raw_user_meta_data ->> 'guardian_name', ''),
    nullif(new.raw_user_meta_data ->> 'guardian_email', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

create or replace function public.is_teacher_of(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.is_admin() or exists (
      select 1 from public.classes c
      left join public.class_teachers ct on ct.class_id = c.id
      where c.id = p_class_id and (c.owner_id = auth.uid() or ct.teacher_id = auth.uid())
    ), false
  )
$$;

create or replace function public.is_enrolled_in(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_enrollments
    where class_id = p_class_id and student_id = auth.uid() and exited_at is null
  )
$$;

-- Uses pgcrypto instead of an application-side random generator. The unique
-- constraint is the final guard; the loop makes duplicates vanishingly unlikely.
create or replace function public.generate_class_code()
returns varchar language plpgsql security definer set search_path = public, extensions as $$
declare
  candidate varchar(12);
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_byte integer;
  idx integer;
begin
  loop
    candidate := '';
    for idx in 1..7 loop
      random_byte := get_byte(gen_random_bytes(1), 0);
      candidate := candidate || substr(alphabet, (random_byte % char_length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.classes where code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.assign_class_code()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.code is null or btrim(new.code) = '' then new.code := public.generate_class_code(); end if;
  new.code := upper(new.code);
  return new;
end;
$$;

create trigger classes_assign_code before insert or update of code on public.classes
  for each row execute procedure public.assign_class_code();

create or replace function public.validate_class_teacher_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.teacher_id and role in ('teacher', 'admin')
  ) then
    raise exception 'Only a teacher or admin can teach a class';
  end if;
  return new;
end;
$$;

create or replace function public.validate_class_enrollment_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.student_id and role = 'student'
  ) then
    raise exception 'Only a student can be enrolled in a class';
  end if;
  return new;
end;
$$;

create trigger class_teachers_validate_role before insert or update on public.class_teachers
  for each row execute procedure public.validate_class_teacher_role();
create trigger class_enrollments_validate_role before insert or update on public.class_enrollments
  for each row execute procedure public.validate_class_enrollment_role();

-- Atomic sequence means dnadar, dnadar1, dnadar2 ... are allocated consistently
-- when an MSI administrator imports a standardized roster.
create or replace function public.allocate_student_username(p_class_id uuid, p_first_name text, p_last_name text)
returns text language plpgsql security definer set search_path = public as $$
declare
  base_name text;
  suffix integer;
begin
  if not public.is_admin() then raise exception 'Only MSI administrators can add students to a class'; end if;
  base_name := lower(substr(regexp_replace(coalesce(p_first_name, ''), '[^a-zA-Z0-9]', '', 'g'), 1, 1)
                || regexp_replace(coalesce(p_last_name, ''), '[^a-zA-Z0-9]', '', 'g'));
  if char_length(base_name) < 2 then raise exception 'A first name and last name are required'; end if;
  insert into public.username_sequences (base_username, next_suffix)
  values (base_name, 1)
  on conflict (base_username) do update
    set next_suffix = public.username_sequences.next_suffix + 1
  returning next_suffix - 1 into suffix;
  return base_name || case when suffix = 0 then '' else suffix::text end;
end;
$$;

-- Allows the auth page to turn a teacher/admin username into its stored email.
-- Profile read policies remain private; this function returns only a login hint.
create or replace function public.resolve_login_email(p_login_identifier text)
returns text language sql stable security definer set search_path = public as $$
  select email::text
  from public.profiles
  where username = lower(regexp_replace(trim(p_login_identifier), '[^a-zA-Z0-9]', '', 'g'))
    and role in ('teacher', 'admin') and is_active
  limit 1
$$;

-- Returns the selected active class for an authenticated student. The browser
-- retains this class id so the student's session opens the correct class.
create or replace function public.verify_student_class_code(p_class_code text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare matching_class_id uuid;
begin
  if public.current_role() <> 'student' then raise exception 'Only student accounts can enter a class'; end if;
  select ce.class_id into matching_class_id
  from public.class_enrollments ce
  join public.classes c on c.id = ce.class_id
  where ce.student_id = auth.uid()
    and ce.exited_at is null
    and c.status = 'active'
    and c.code = upper(trim(p_class_code))
  limit 1;
  if matching_class_id is null then raise exception 'This student is not enrolled in that class'; end if;
  return matching_class_id;
end;
$$;

-- Class creation runs inside the database so the authenticated teacher becomes
-- the owner automatically. This avoids relying on a browser-supplied owner id
-- and works consistently with RLS enabled.
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

create or replace function public.log_student_event(
  p_event_type public.event_type,
  p_class_id uuid default null,
  p_assignment_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer set search_path = public as $$
declare event_id bigint;
begin
  if public.current_role() <> 'student' then raise exception 'Only student events can be logged'; end if;
  if p_event_type not in ('signed_in', 'grid_opened', 'resource_opened', 'video_opened', 'assignment_started', 'assignment_submitted', 'assignment_completed', 'profile_updated') then
    raise exception 'This event type is system-managed';
  end if;
  if p_class_id is not null and not public.is_enrolled_in(p_class_id) then raise exception 'Not enrolled in this class'; end if;
  insert into public.student_activity_events (student_id, class_id, assignment_id, event_type, metadata)
  values (auth.uid(), p_class_id, p_assignment_id, p_event_type, coalesce(p_metadata, '{}'::jsonb))
  returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.record_audit_event(
  p_action text, p_entity_type text, p_entity_id uuid default null, p_metadata jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer set search_path = public as $$
declare audit_id bigint;
begin
  if public.current_role() not in ('teacher', 'admin') then
    raise exception 'Only teachers and MSI administrators can record an audit event';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into audit_id;
  return audit_id;
end;
$$;

-- Recognition and reviewed progress are added to the student's timeline by the
-- database itself, so they cannot be skipped by an interrupted browser action.
create or replace function public.log_belt_award_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  class_value uuid;
  student_value uuid;
begin
  select class_id, student_id into class_value, student_value
  from public.class_enrollments where id = new.enrollment_id;
  insert into public.student_activity_events (student_id, class_id, event_type, metadata)
  values (student_value, class_value, 'belt_awarded', jsonb_build_object('category', new.category, 'belt', new.belt, 'award_id', new.id));
  return new;
end;
$$;

create trigger belt_awards_log_student_event after insert on public.belt_awards
  for each row execute procedure public.log_belt_award_event();

create or replace function public.protect_student_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Students can report their own work state, but only a teacher/admin can
  -- grade it, review it, or attach teacher feedback.
  if public.current_role() = 'student' then
    if tg_op = 'INSERT' and (new.score is not null or new.reviewed_at is not null or new.reviewed_by is not null or new.feedback is not null) then
      raise exception 'Students cannot grade their own work';
    end if;
    if tg_op = 'UPDATE' and (new.score is distinct from old.score or new.reviewed_at is distinct from old.reviewed_at or new.reviewed_by is distinct from old.reviewed_by or new.feedback is distinct from old.feedback) then
      raise exception 'Students cannot grade their own work';
    end if;
  end if;
  return new;
end;
$$;

create trigger progress_protect_student_review before insert or update on public.student_assignment_progress
  for each row execute procedure public.protect_student_progress();

-- Keep primary teachers in the join table as well, so every teacher lookup uses
-- the same relation. The class owner must already be a teacher/admin.
create or replace function public.add_owner_as_class_teacher()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = new.owner_id and role in ('teacher', 'admin')) then
    raise exception 'Class owner must be a teacher or admin';
  end if;
  insert into public.class_teachers (class_id, teacher_id) values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger classes_add_owner_teacher after insert on public.classes
  for each row execute procedure public.add_owner_as_class_teacher();

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger profiles_protect_identity before update on public.profiles for each row execute procedure public.protect_profile_identity();
create trigger camps_updated_at before update on public.camps for each row execute procedure public.set_updated_at();
create trigger classes_updated_at before update on public.classes for each row execute procedure public.set_updated_at();
create trigger assignments_updated_at before update on public.class_assignments for each row execute procedure public.set_updated_at();
create trigger progress_updated_at before update on public.student_assignment_progress for each row execute procedure public.set_updated_at();
create trigger pages_updated_at before update on public.content_pages for each row execute procedure public.set_updated_at();
create trigger navigation_updated_at before update on public.navigation_items for each row execute procedure public.set_updated_at();
create trigger dropdowns_updated_at before update on public.dropdown_options for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.username_sequences enable row level security;
alter table public.camps enable row level security;
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.import_batches enable row level security;
alter table public.class_assignments enable row level security;
alter table public.student_assignment_progress enable row level security;
alter table public.belt_awards enable row level security;
alter table public.student_activity_events enable row level security;
alter table public.content_pages enable row level security;
alter table public.navigation_items enable row level security;
alter table public.dropdown_options enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles: self or admin read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: class teacher reads students" on public.profiles for select using (
  role = 'student' and exists (
    select 1 from public.class_enrollments ce where ce.student_id = profiles.id and public.is_teacher_of(ce.class_id)
  )
);
create policy "profiles: self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role());
create policy "profiles: admins update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "student profile: self or class teacher read" on public.student_profiles for select using (
  user_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.class_enrollments ce where ce.student_id = student_profiles.user_id and public.is_teacher_of(ce.class_id)
  )
);
create policy "student profile: self update" on public.student_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "student profile: admins manage" on public.student_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "teacher profile: self or admin read" on public.teacher_profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "teacher profile: self update" on public.teacher_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "teacher profile: admins manage" on public.teacher_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admin profile: admin read" on public.admin_profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "admin profile: admins manage" on public.admin_profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "camps: public read" on public.camps for select using (true);
create policy "camps: admins manage" on public.camps for all using (public.is_admin()) with check (public.is_admin());
create policy "classes: teacher/student scope" on public.classes for select using (public.is_teacher_of(id) or public.is_enrolled_in(id));
create policy "classes: teachers create" on public.classes for insert with check (
  owner_id = auth.uid() and exists (
    select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin') and is_active
  )
);
create policy "classes: teachers update" on public.classes for update using (public.is_teacher_of(id)) with check (public.is_teacher_of(id));
create policy "classes: admins delete" on public.classes for delete using (public.is_admin());
create policy "class teachers: scoped read" on public.class_teachers for select using (public.is_teacher_of(class_id) or public.is_enrolled_in(class_id));
create policy "class teachers: lead manage" on public.class_teachers for all using (public.is_teacher_of(class_id)) with check (public.is_teacher_of(class_id));
create policy "enrollments: scoped read" on public.class_enrollments for select using (student_id = auth.uid() or public.is_teacher_of(class_id));
create policy "enrollments: admins manage" on public.class_enrollments for all using (public.is_admin()) with check (public.is_admin());
create policy "imports: teacher read" on public.import_batches for select using (public.is_teacher_of(class_id));
create policy "assignments: class scope read" on public.class_assignments for select using (public.is_teacher_of(class_id) or (published_at is not null and public.is_enrolled_in(class_id)));
create policy "assignments: teachers manage" on public.class_assignments for all using (public.is_teacher_of(class_id)) with check (public.is_teacher_of(class_id));
create policy "progress: scope read" on public.student_assignment_progress for select using (
  exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and (ce.student_id = auth.uid() or public.is_teacher_of(ce.class_id)))
);
create policy "progress: student update own" on public.student_assignment_progress for update using (
  exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and ce.student_id = auth.uid())
) with check (exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and ce.student_id = auth.uid()));
create policy "progress: student insert own" on public.student_assignment_progress for insert with check (
  exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and ce.student_id = auth.uid())
);
create policy "progress: teachers manage" on public.student_assignment_progress for all using (
  exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and public.is_teacher_of(ce.class_id))
) with check (exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and public.is_teacher_of(ce.class_id)));
create policy "belt awards: scope read" on public.belt_awards for select using (
  exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and (ce.student_id = auth.uid() or public.is_teacher_of(ce.class_id)))
);
create policy "belt awards: teachers manage" on public.belt_awards for all using (
  exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and public.is_teacher_of(ce.class_id))
) with check (exists (select 1 from public.class_enrollments ce where ce.id = enrollment_id and public.is_teacher_of(ce.class_id)));
create policy "student events: student read" on public.student_activity_events for select using (
  student_id = auth.uid() or public.is_admin() or (class_id is not null and public.is_teacher_of(class_id))
);
create policy "student events: students insert only" on public.student_activity_events for insert with check (
  student_id = auth.uid() and public.current_role() = 'student' and (class_id is null or public.is_enrolled_in(class_id))
  and event_type in ('signed_in', 'grid_opened', 'resource_opened', 'video_opened', 'assignment_started', 'assignment_submitted', 'assignment_completed', 'profile_updated')
);
create policy "pages: public published read" on public.content_pages for select using (is_published or public.is_admin());
create policy "pages: admins manage" on public.content_pages for all using (public.is_admin()) with check (public.is_admin());
create policy "nav: public visible read" on public.navigation_items for select using (is_visible or public.is_admin());
create policy "nav: admins manage" on public.navigation_items for all using (public.is_admin()) with check (public.is_admin());
create policy "dropdowns: public active read" on public.dropdown_options for select using (is_active or public.is_admin());
create policy "dropdowns: admins manage" on public.dropdown_options for all using (public.is_admin()) with check (public.is_admin());
create policy "audit: actor or admin read" on public.audit_log for select using (actor_id = auth.uid() or public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.camps, public.content_pages, public.navigation_items, public.dropdown_options to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.resolve_login_email(text), public.verify_student_class_code(text), public.create_class(text, date, date, text), public.is_teacher_of(uuid), public.allocate_student_username(uuid, text, text), public.log_student_event(public.event_type, uuid, uuid, jsonb), public.record_audit_event(text, text, uuid, jsonb) to anon, authenticated;

-- Bootstrap the first MSI admin manually after the user has authenticated once:
-- update public.profiles set role = 'admin' where email = 'msi-admin@example.org';
-- insert into public.admin_profiles (user_id, department)
-- select id, 'MSI Camps' from public.profiles where email = 'msi-admin@example.org'
-- on conflict (user_id) do nothing;
