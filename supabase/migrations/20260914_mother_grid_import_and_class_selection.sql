-- Mother Grid bulk import, belt-contiguous class selection, and teacher enrollment
-- of admin-provisioned students.
--
-- This migration is self-sufficient: it re-declares the Mother Grid tables with
-- "if not exists" so it can be applied to a project where
-- 20260824_admin_grid_and_teacher_csv.sql has not been run yet. Everything is
-- additive and safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Tables (no-ops where 20260824 already created them)
-- ---------------------------------------------------------------------------

create table if not exists public.mother_grid_cells (
  id uuid primary key default gen_random_uuid(),
  belt_code text not null check (belt_code in ('WT', 'YW', 'OR', 'GN', 'BU', 'PL', 'BN', 'BK')),
  column_number integer not null check (column_number between 1 and 24),
  title text not null check (char_length(trim(title)) between 1 and 180),
  category text,
  instructions text,
  resource_url text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (belt_code, column_number)
);

create table if not exists public.class_grid_cells (
  class_id uuid not null references public.classes(id) on delete cascade,
  mother_grid_cell_id uuid not null references public.mother_grid_cells(id) on delete cascade,
  selected_by uuid not null references public.profiles(id) on delete restrict,
  selected_at timestamptz not null default now(),
  primary key (class_id, mother_grid_cell_id)
);

create index if not exists mother_grid_cells_active_idx
  on public.mother_grid_cells(belt_code, column_number) where is_active;
create index if not exists class_grid_cells_class_idx on public.class_grid_cells(class_id);

-- ---------------------------------------------------------------------------
-- 2. A Grid cell is one belt x category intersection and holds the several
--    projects the workbook stacks inside it, each with its own links.
--    Shape: [{ "name": "...", "instructions_url": "...", "video_url": "..." }]
-- ---------------------------------------------------------------------------

alter table public.mother_grid_cells
  add column if not exists projects jsonb not null default '[]'::jsonb;

alter table public.mother_grid_cells
  drop constraint if exists mother_grid_cells_projects_is_array;
alter table public.mother_grid_cells
  add constraint mother_grid_cells_projects_is_array
  check (jsonb_typeof(projects) = 'array');

-- The column headings come from the workbook, so a column carries one category
-- name across every belt. Reading it back per cell keeps the grid self-describing.
create index if not exists mother_grid_cells_category_idx
  on public.mother_grid_cells(column_number, category);

-- ---------------------------------------------------------------------------
-- 3. Belt order, so "you cannot skip a belt row" can be checked in one place
-- ---------------------------------------------------------------------------

create or replace function public.belt_rank(p_code text)
returns integer language sql immutable set search_path = public as $$
  select case p_code
    when 'WT' then 1 when 'YW' then 2 when 'OR' then 3 when 'GN' then 4
    when 'BU' then 5 when 'PL' then 6 when 'BN' then 7 when 'BK' then 8
  end
$$;

-- ---------------------------------------------------------------------------
-- 4. Admin-only Mother Grid import
--
--    Deliberately an upsert on (belt_code, column_number) rather than a delete
--    and reload. A cell keeps its id across imports, so class_grid_cells rows
--    that reference it survive; a delete would cascade and silently wipe every
--    teacher's class selection. Cells absent from the import are deactivated
--    instead of removed, which hides them from teachers while keeping history.
-- ---------------------------------------------------------------------------

create or replace function public.import_mother_grid(p_cells jsonb)
returns table (inserted integer, updated integer, deactivated integer)
language plpgsql security definer set search_path = public, extensions as $$
declare
  ins integer := 0;
  upd integer := 0;
  deact integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can import the Mother Grid';
  end if;
  if p_cells is null or jsonb_typeof(p_cells) <> 'array' then
    raise exception 'The import payload must be an array of Grid cells';
  end if;
  if jsonb_array_length(p_cells) = 0 then
    raise exception 'The uploaded sheet produced no Grid cells';
  end if;

  with incoming as (
    select c->>'belt_code' as belt_code,
           (c->>'column_number')::integer as column_number,
           nullif(trim(c->>'title'), '') as title,
           nullif(trim(c->>'category'), '') as category,
           nullif(trim(c->>'instructions'), '') as instructions,
           nullif(trim(c->>'resource_url'), '') as resource_url,
           coalesce(c->'projects', '[]'::jsonb) as projects
    from jsonb_array_elements(p_cells) as c
  ), written as (
    insert into public.mother_grid_cells as m
      (belt_code, column_number, title, category, instructions, resource_url,
       projects, is_active, created_by, updated_by)
    select belt_code, column_number, title, category, instructions, resource_url,
           projects, true, auth.uid(), auth.uid()
    from incoming
    on conflict (belt_code, column_number) do update
      set title = excluded.title,
          category = excluded.category,
          instructions = excluded.instructions,
          resource_url = excluded.resource_url,
          projects = excluded.projects,
          is_active = true,
          updated_by = auth.uid()
    -- xmax is zero only on a genuinely new row, which separates the two counts.
    returning (xmax = 0) as was_insert
  )
  select count(*) filter (where was_insert), count(*) filter (where not was_insert)
  into ins, upd
  from written;

  update public.mother_grid_cells m
  set is_active = false, updated_by = auth.uid()
  where m.is_active
    and not exists (
      select 1 from jsonb_array_elements(p_cells) as c
      where c->>'belt_code' = m.belt_code
        and (c->>'column_number')::integer = m.column_number
    );
  get diagnostics deact = row_count;

  return query select ins, upd, deact;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Class Grid selection, replaced as a whole set
--
--    Validating the finished selection in one call is what makes the
--    "no skipped belts" rule enforceable. Checking it per row could not work:
--    building any multi-belt selection passes through intermediate states, and
--    removing a middle belt is only invalid once the dust settles.
-- ---------------------------------------------------------------------------

create or replace function public.set_class_grid_cells(p_class_id uuid, p_cell_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[] := coalesce(p_cell_ids, '{}'::uuid[]);
  ranks integer[];
  written integer := 0;
begin
  if not (public.is_teacher_of(p_class_id) or public.is_admin()) then
    raise exception 'Only this class''s teacher can change its Grid';
  end if;

  select array_agg(distinct public.belt_rank(m.belt_code) order by public.belt_rank(m.belt_code))
  into ranks
  from public.mother_grid_cells m
  where m.id = any (ids) and m.is_active;

  -- A run of belts is continuous when the span between the lowest and highest
  -- equals how many distinct belts were chosen.
  if ranks is not null and array_length(ranks, 1) > 1
     and ranks[array_length(ranks, 1)] - ranks[1] + 1 <> array_length(ranks, 1) then
    raise exception 'Belt rows cannot be skipped. Choose a continuous run of belts.';
  end if;

  delete from public.class_grid_cells where class_id = p_class_id;

  insert into public.class_grid_cells (class_id, mother_grid_cell_id, selected_by)
  select p_class_id, m.id, auth.uid()
  from public.mother_grid_cells m
  where m.id = any (ids) and m.is_active;
  get diagnostics written = row_count;

  return written;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Teachers enroll students that an administrator already created.
--    Creating accounts stays with administrators: this only links an existing
--    student profile to a class the caller teaches.
-- ---------------------------------------------------------------------------

create or replace function public.available_students()
returns table (id uuid, first_name text, last_name text, username text, grade text)
language sql stable security definer set search_path = public as $$
  -- username is citext on profiles, so it needs an explicit cast to match the
  -- declared text return column.
  select p.id, p.first_name, p.last_name, p.username::text, sp.grade
  from public.profiles p
  left join public.student_profiles sp on sp.user_id = p.id
  where p.role = 'student' and p.is_active
    and (public.is_admin() or exists (
      select 1 from public.classes c where public.is_teacher_of(c.id)
    ))
  order by p.last_name, p.first_name
$$;

create or replace function public.set_class_roster(p_class_id uuid, p_student_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[] := coalesce(p_student_ids, '{}'::uuid[]);
  written integer := 0;
begin
  if not (public.is_teacher_of(p_class_id) or public.is_admin()) then
    raise exception 'Only this class''s teacher can change its roster';
  end if;

  -- Students removed from the picker are exited rather than deleted, so their
  -- progress, belts, and timeline stay attached to the class they worked in.
  update public.class_enrollments
  set exited_at = now()
  where class_id = p_class_id and exited_at is null
    and student_id <> all (ids);

  insert into public.class_enrollments (class_id, student_id)
  select p_class_id, p.id
  from public.profiles p
  where p.id = any (ids) and p.role = 'student' and p.is_active
  on conflict (class_id, student_id) do update set exited_at = null;
  get diagnostics written = row_count;

  return written;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Access
-- ---------------------------------------------------------------------------

alter table public.mother_grid_cells enable row level security;
alter table public.class_grid_cells enable row level security;

drop policy if exists "mother grid: active authenticated read" on public.mother_grid_cells;
drop policy if exists "mother grid: admins manage" on public.mother_grid_cells;
drop policy if exists "class grid: scoped read" on public.class_grid_cells;
drop policy if exists "class grid: teachers manage" on public.class_grid_cells;

create policy "mother grid: active authenticated read" on public.mother_grid_cells
  for select using (is_active or public.is_admin());
create policy "mother grid: admins manage" on public.mother_grid_cells
  for all using (public.is_admin()) with check (public.is_admin());
create policy "class grid: scoped read" on public.class_grid_cells
  for select using (public.is_teacher_of(class_id) or public.is_enrolled_in(class_id));
create policy "class grid: teachers manage" on public.class_grid_cells
  for all using (public.is_teacher_of(class_id)) with check (public.is_teacher_of(class_id));

grant select, insert, update, delete on public.mother_grid_cells, public.class_grid_cells to authenticated;
grant execute on function public.belt_rank(text) to authenticated;
grant execute on function public.import_mother_grid(jsonb) to authenticated;
grant execute on function public.set_class_grid_cells(uuid, uuid[]) to authenticated;
grant execute on function public.available_students() to authenticated;
grant execute on function public.set_class_roster(uuid, uuid[]) to authenticated;

notify pgrst, 'reload schema';
