-- CampGrids core transactional data on Amazon RDS for PostgreSQL.
--
-- Apply after 001_account_source_of_truth.sql, as the migration owner. This
-- ports the application concepts that are currently backed by Supabase. It is
-- intentionally a database foundation, not permission to cut traffic over:
-- the corresponding FastAPI routes and front-end client migration must pass
-- acceptance tests before Supabase is made read-only.

begin;

create type campgrids.assignment_status as enum ('in_progress', 'complete');
create type campgrids.student_event_type as enum (
  'signed_in', 'grid_opened', 'resource_opened', 'video_opened',
  'assignment_started', 'assignment_submitted', 'assignment_completed',
  'assignment_reviewed', 'belt_awarded', 'profile_updated'
);

create table campgrids.camps (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campgrids.classes
  add column camp_id uuid references campgrids.camps(id) on delete set null;

create table campgrids.mother_grid_cells (
  id uuid primary key default gen_random_uuid(),
  belt_code text not null check (belt_code in ('WT', 'YW', 'OR', 'GN', 'BU', 'PL', 'BN', 'BK')),
  column_number integer not null check (column_number between 1 and 24),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  category text,
  instructions text,
  resource_url text,
  projects jsonb not null default '[]'::jsonb check (jsonb_typeof(projects) = 'array'),
  is_active boolean not null default true,
  created_by uuid references campgrids.accounts(id) on delete set null,
  updated_by uuid references campgrids.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (belt_code, column_number)
);

create table campgrids.class_grid_cells (
  class_id uuid not null references campgrids.classes(id) on delete cascade,
  mother_grid_cell_id uuid not null references campgrids.mother_grid_cells(id) on delete cascade,
  selected_by uuid not null references campgrids.accounts(id) on delete restrict,
  selected_at timestamptz not null default now(),
  primary key (class_id, mother_grid_cell_id)
);

create table campgrids.import_batches (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references campgrids.classes(id) on delete cascade,
  uploaded_by uuid not null references campgrids.accounts(id) on delete restrict,
  original_filename text not null check (char_length(btrim(original_filename)) between 1 and 255),
  object_key text check (object_key is null or object_key ~ '^[A-Za-z0-9!_.*''()/=-]+(?:/[A-Za-z0-9!_.*''()/=-]+)*$'),
  row_count integer not null default 0 check (row_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  created_at timestamptz not null default now()
);

create table campgrids.class_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references campgrids.classes(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  instructions text,
  category text,
  belt text,
  resource_url text,
  due_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references campgrids.accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campgrids.student_assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references campgrids.class_assignments(id) on delete cascade,
  enrolment_id uuid not null references campgrids.class_enrolments(id) on delete cascade,
  status campgrids.assignment_status not null default 'in_progress',
  score numeric(5,2) check (score is null or score between 0 and 100),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references campgrids.accounts(id) on delete set null,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, enrolment_id),
  check ((status = 'in_progress' and reviewed_at is null) or status = 'complete')
);

create table campgrids.belt_awards (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references campgrids.class_enrolments(id) on delete cascade,
  category text not null check (char_length(btrim(category)) between 1 and 140),
  belt text not null check (char_length(btrim(belt)) between 1 and 80),
  awarded_by uuid not null references campgrids.accounts(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  note text,
  unique (enrolment_id, category, belt)
);

create table campgrids.student_activity_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references campgrids.accounts(id) on delete cascade,
  class_id uuid references campgrids.classes(id) on delete set null,
  assignment_id uuid references campgrids.class_assignments(id) on delete set null,
  event_type campgrids.student_event_type not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

create table campgrids.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  summary text,
  body jsonb not null default '{"blocks":[]}'::jsonb check (jsonb_typeof(body) = 'object'),
  is_published boolean not null default false,
  created_by uuid not null references campgrids.accounts(id) on delete restrict,
  updated_by uuid references campgrids.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campgrids.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 100),
  href text not null check (char_length(btrim(href)) between 1 and 2048),
  location text not null default 'primary' check (location in ('primary', 'footer', 'teacher')),
  position integer not null default 0,
  page_id uuid references campgrids.content_pages(id) on delete set null,
  is_visible boolean not null default true,
  created_by uuid not null references campgrids.accounts(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (location, position)
);

create table campgrids.dropdown_options (
  id uuid primary key default gen_random_uuid(),
  group_key text not null check (group_key ~ '^[a-z0-9_-]+$'),
  value text not null check (char_length(btrim(value)) between 1 and 160),
  label text not null check (char_length(btrim(label)) between 1 and 160),
  position integer not null default 0,
  is_active boolean not null default true,
  updated_by uuid references campgrids.accounts(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (group_key, value),
  unique (group_key, position)
);

create table campgrids.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name text not null check (char_length(btrim(name)) between 2 and 140),
  summary text check (summary is null or char_length(summary) <= 400),
  focus text check (focus is null or char_length(focus) <= 140),
  contact_name text,
  contact_email citext,
  website text,
  is_published boolean not null default false,
  created_by uuid references campgrids.accounts(id) on delete set null,
  updated_by uuid references campgrids.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campgrids.partner_grid_cells (
  partner_id uuid not null references campgrids.partner_organizations(id) on delete cascade,
  mother_grid_cell_id uuid not null references campgrids.mother_grid_cells(id) on delete cascade,
  selected_by uuid references campgrids.accounts(id) on delete set null,
  selected_at timestamptz not null default now(),
  primary key (partner_id, mother_grid_cell_id)
);

create table campgrids.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references campgrids.accounts(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_]{2,80}$'),
  entity_type text not null check (entity_type ~ '^[a-z][a-z0-9_]{2,80}$'),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

create index classes_camp_idx on campgrids.classes(camp_id) where camp_id is not null;
create index mother_grid_cells_active_idx on campgrids.mother_grid_cells(belt_code, column_number) where is_active;
create index class_grid_cells_class_idx on campgrids.class_grid_cells(class_id);
create index class_assignments_class_idx on campgrids.class_assignments(class_id, published_at);
create index progress_enrolment_idx on campgrids.student_assignment_progress(enrolment_id);
create index belt_awards_enrolment_idx on campgrids.belt_awards(enrolment_id);
create index student_events_student_idx on campgrids.student_activity_events(student_id, occurred_at desc);
create index student_events_class_idx on campgrids.student_activity_events(class_id, occurred_at desc);
create index navigation_visible_idx on campgrids.navigation_items(location, position) where is_visible;
create index partner_published_idx on campgrids.partner_organizations(slug) where is_published;
create index partner_grid_cells_partner_idx on campgrids.partner_grid_cells(partner_id);
create index audit_log_entity_idx on campgrids.audit_log(entity_type, entity_id, occurred_at desc);

create trigger camps_set_updated_at before update on campgrids.camps
  for each row execute function campgrids.set_updated_at();
create trigger mother_grid_cells_set_updated_at before update on campgrids.mother_grid_cells
  for each row execute function campgrids.set_updated_at();
create trigger class_assignments_set_updated_at before update on campgrids.class_assignments
  for each row execute function campgrids.set_updated_at();
create trigger progress_set_updated_at before update on campgrids.student_assignment_progress
  for each row execute function campgrids.set_updated_at();
create trigger content_pages_set_updated_at before update on campgrids.content_pages
  for each row execute function campgrids.set_updated_at();
create trigger navigation_items_set_updated_at before update on campgrids.navigation_items
  for each row execute function campgrids.set_updated_at();
create trigger dropdown_options_set_updated_at before update on campgrids.dropdown_options
  for each row execute function campgrids.set_updated_at();
create trigger partner_organizations_set_updated_at before update on campgrids.partner_organizations
  for each row execute function campgrids.set_updated_at();

-- A progress row must belong to a student enrolled in the assignment's class.
-- This is enforced in PostgreSQL even if a future API route is implemented
-- incorrectly or two web requests arrive concurrently.
create or replace function campgrids.validate_progress_scope()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1
    from campgrids.class_assignments assignment
    join campgrids.class_enrolments enrolment on enrolment.id = new.enrolment_id
    where assignment.id = new.assignment_id
      and assignment.class_id = enrolment.class_id
  ) then
    raise exception 'Assignment progress must use an enrolment in the assignment class';
  end if;
  return new;
end;
$$;

create trigger progress_requires_matching_class before insert or update of assignment_id, enrolment_id
  on campgrids.student_assignment_progress
  for each row execute function campgrids.validate_progress_scope();

-- A belt award must be made by active staff. A staff-only API route also checks
-- class scope; this rule prevents imports or background jobs from bypassing it.
create or replace function campgrids.validate_belt_award_actor()
returns trigger language plpgsql as $$
declare
  actor_role campgrids.account_role;
  actor_active boolean;
begin
  select role, is_active into actor_role, actor_active
  from campgrids.accounts where id = new.awarded_by;
  if actor_role not in ('teacher', 'admin') or not coalesce(actor_active, false) then
    raise exception 'Only active staff can award a belt';
  end if;
  return new;
end;
$$;

create trigger belt_awards_require_staff before insert or update of awarded_by
  on campgrids.belt_awards
  for each row execute function campgrids.validate_belt_award_actor();

commit;
