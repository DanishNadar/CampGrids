-- CampGrids transactional account source of truth for Amazon RDS PostgreSQL.
-- Apply as a migration owner, not as the EC2 runtime application role.
-- Password hashes, recovery tokens, MFA codes, and browser sessions belong in
-- Cognito and must never be added to this schema.

begin;

create extension if not exists citext;
create extension if not exists pgcrypto;
create schema if not exists campgrids;

create type campgrids.account_role as enum ('student', 'teacher', 'admin');
create type campgrids.class_status as enum ('draft', 'active', 'archived');

create table campgrids.accounts (
  id uuid primary key default gen_random_uuid(),
  cognito_sub uuid not null unique,
  role campgrids.account_role not null,
  username citext not null unique,
  email citext unique,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  check (username ~ '^[a-z0-9]{2,80}$'),
  check ((role = 'student') or email is not null),
  check ((is_active and deactivated_at is null) or (not is_active))
);

create table campgrids.student_accounts (
  account_id uuid primary key references campgrids.accounts(id) on delete restrict,
  grade text check (grade is null or char_length(btrim(grade)) <= 40),
  guardian_name text check (guardian_name is null or char_length(btrim(guardian_name)) <= 160),
  guardian_email citext,
  emergency_notes text,
  created_at timestamptz not null default now()
);

create table campgrids.teacher_accounts (
  account_id uuid primary key references campgrids.accounts(id) on delete restrict,
  title text check (title is null or char_length(btrim(title)) <= 120),
  approved_at timestamptz,
  approved_by uuid references campgrids.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table campgrids.admin_accounts (
  account_id uuid primary key references campgrids.accounts(id) on delete restrict,
  department text check (department is null or char_length(btrim(department)) <= 120),
  created_at timestamptz not null default now()
);

create table campgrids.username_counters (
  base_username citext primary key,
  next_suffix integer not null default 0 check (next_suffix >= 0),
  created_at timestamptz not null default now()
);

create table campgrids.classes (
  id uuid primary key default gen_random_uuid(),
  code varchar(12) not null unique check (code ~ '^[A-Z0-9]{7,12}$'),
  name text not null check (char_length(btrim(name)) between 1 and 140),
  owner_id uuid not null references campgrids.accounts(id) on delete restrict,
  status campgrids.class_status not null default 'draft',
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table campgrids.class_teachers (
  class_id uuid not null references campgrids.classes(id) on delete cascade,
  teacher_id uuid not null references campgrids.accounts(id) on delete restrict,
  added_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table campgrids.class_enrolments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references campgrids.classes(id) on delete cascade,
  student_id uuid not null references campgrids.accounts(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  exited_at timestamptz,
  unique (class_id, student_id),
  check (exited_at is null or exited_at >= enrolled_at)
);

create table campgrids.account_audit_events (
  id bigint generated always as identity primary key,
  account_id uuid references campgrids.accounts(id) on delete set null,
  actor_id uuid references campgrids.accounts(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]{2,80}$'),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index accounts_active_role_idx on campgrids.accounts(role, is_active);
create index class_enrolments_student_idx on campgrids.class_enrolments(student_id) where exited_at is null;
create index account_audit_events_account_idx on campgrids.account_audit_events(account_id, occurred_at desc);

create or replace function campgrids.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger accounts_set_updated_at before update on campgrids.accounts
  for each row execute function campgrids.set_updated_at();
create trigger classes_set_updated_at before update on campgrids.classes
  for each row execute function campgrids.set_updated_at();

-- Role checks belong in the transactional store, not only in API code. They
-- prevent a bad import or a future endpoint from making a student a teacher,
-- assigning a student as a class owner, or enrolling staff as campers.
create or replace function campgrids.require_account_role()
returns trigger language plpgsql as $$
declare
  v_role campgrids.account_role;
  v_active boolean;
begin
  if tg_table_name = 'classes' then
    select role, is_active into v_role, v_active from campgrids.accounts where id = new.owner_id;
    if v_role not in ('teacher', 'admin') or not coalesce(v_active, false) then
      raise exception 'A class owner must be an active teacher or administrator';
    end if;
  elsif tg_table_name = 'class_teachers' then
    select role, is_active into v_role, v_active from campgrids.accounts where id = new.teacher_id;
    if v_role not in ('teacher', 'admin') or not coalesce(v_active, false) then
      raise exception 'Only an active teacher or administrator can teach a class';
    end if;
  elsif tg_table_name = 'class_enrolments' then
    select role, is_active into v_role, v_active from campgrids.accounts where id = new.student_id;
    if v_role <> 'student' or not coalesce(v_active, false) then
      raise exception 'Only an active student can be enrolled in a class';
    end if;
  end if;
  return new;
end;
$$;

create trigger classes_require_owner_role before insert or update of owner_id on campgrids.classes
  for each row execute function campgrids.require_account_role();
create trigger class_teachers_require_role before insert or update of teacher_id on campgrids.class_teachers
  for each row execute function campgrids.require_account_role();
create trigger class_enrolments_require_role before insert or update of student_id on campgrids.class_enrolments
  for each row execute function campgrids.require_account_role();

-- The counter row is locked by the UPSERT. The account unique constraint is
-- the final guard when EC2 is horizontally scaled.
create or replace function campgrids.provision_account(
  p_account_id uuid,
  p_cognito_sub uuid,
  p_role campgrids.account_role,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_grade text default null,
  p_guardian_name text default null,
  p_guardian_email text default null,
  p_title text default null,
  p_approved_by uuid default null,
  p_department text default null
)
returns campgrids.accounts
language plpgsql
security definer
set search_path = campgrids, pg_catalog
as $$
declare
  v_base text;
  v_suffix integer;
  v_username text;
  v_account campgrids.accounts;
begin
  v_base := lower(substr(regexp_replace(coalesce(p_first_name, ''), '[^A-Za-z0-9]', '', 'g'), 1, 1)
             || regexp_replace(coalesce(p_last_name, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_base) < 2 then
    raise exception 'A first name and last name are required';
  end if;
  if p_role <> 'student' and nullif(btrim(p_email), '') is null then
    raise exception 'Staff accounts require an email address';
  end if;
  if p_approved_by is null or not exists (
    select 1 from accounts where id = p_approved_by and role = 'admin' and is_active
  ) then
    raise exception 'An active administrator must approve account provisioning';
  end if;

  -- These checks yield a useful error rather than repeatedly trying an
  -- unrelated username after a duplicate email or Cognito identity.
  if exists (select 1 from accounts where cognito_sub = p_cognito_sub) then
    raise exception 'This Cognito identity is already provisioned';
  end if;
  if p_email is not null and exists (select 1 from accounts where email = lower(btrim(p_email))::citext) then
    raise exception 'An account already uses this email address';
  end if;

  loop
    insert into username_counters (base_username, next_suffix)
    values (v_base, 1)
    on conflict (base_username) do update
      set next_suffix = username_counters.next_suffix + 1
    returning next_suffix - 1 into v_suffix;

    v_username := v_base || case when v_suffix = 0 then '' else v_suffix::text end;
    insert into accounts (id, cognito_sub, role, username, email, first_name, last_name)
    values (
      p_account_id,
      p_cognito_sub,
      p_role,
      v_username,
      nullif(lower(btrim(p_email)), '')::citext,
      btrim(p_first_name),
      btrim(p_last_name)
    )
    on conflict (username) do nothing
    returning * into v_account;
    exit when found;
  end loop;

  if p_role = 'student' then
    insert into student_accounts (account_id, grade, guardian_name, guardian_email)
    values (v_account.id, nullif(btrim(p_grade), ''), nullif(btrim(p_guardian_name), ''), nullif(lower(btrim(p_guardian_email)), '')::citext);
  elsif p_role = 'teacher' then
    insert into teacher_accounts (account_id, title, approved_at, approved_by)
    values (v_account.id, nullif(btrim(p_title), ''), now(), p_approved_by);
  else
    insert into admin_accounts (account_id, department)
    values (v_account.id, nullif(btrim(p_department), ''));
  end if;

  insert into account_audit_events (account_id, actor_id, event_type, metadata)
  values (v_account.id, p_approved_by, 'account_provisioned', jsonb_build_object('role', p_role, 'username', v_account.username));
  return v_account;
end;
$$;

-- The EC2 process should use a dedicated non-owner role. Do not grant this
-- role to browsers, BI tools, Redshift, or humans with day-to-day access.
-- Example, run after replacing the role name with your provisioned role:
-- create role campgrids_api login;
-- grant usage on schema campgrids to campgrids_api;
-- grant select, update (first_name, last_name) on campgrids.accounts to campgrids_api;
-- grant insert on campgrids.account_audit_events to campgrids_api;
-- grant execute on function campgrids.provision_account(uuid, uuid, campgrids.account_role, text, text, text, text, text, text, text, uuid, text) to campgrids_api;

commit;
