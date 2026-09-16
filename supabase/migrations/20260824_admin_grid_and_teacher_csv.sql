-- MSI administration: Mother Grid ownership, class sub-grids, and batch
-- teacher provisioning. This migration is additive and safe to run after the
-- 20260823 email-2FA migration.

alter table public.teacher_profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temporary_password_issued_at timestamptz;

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

create or replace function public.allocate_teacher_username(p_first_name text, p_last_name text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can provision teacher accounts';
  end if;
  return public.generate_available_username(p_first_name, p_last_name, null);
end;
$$;

create or replace function public.complete_teacher_password_setup()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.current_role() <> 'teacher' then
    raise exception 'Only an authenticated teacher can finish password setup';
  end if;
  perform set_config('app.teacher_password_setup', 'true', true);
  update public.teacher_profiles
  set must_change_password = false,
      temporary_password_issued_at = null
  where user_id = auth.uid() and must_change_password;
  return found;
end;
$$;

create or replace function public.protect_teacher_password_setup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.must_change_password is distinct from old.must_change_password
    and auth.role() <> 'service_role'
    and not public.is_admin()
    and coalesce(current_setting('app.teacher_password_setup', true), '') <> 'true' then
    raise exception 'Use the password-change flow to update this account';
  end if;
  return new;
end;
$$;

drop trigger if exists teacher_profiles_protect_password_setup on public.teacher_profiles;
create trigger teacher_profiles_protect_password_setup
  before update on public.teacher_profiles
  for each row execute procedure public.protect_teacher_password_setup();

drop trigger if exists mother_grid_cells_updated_at on public.mother_grid_cells;
create trigger mother_grid_cells_updated_at
  before update on public.mother_grid_cells
  for each row execute procedure public.set_updated_at();

-- A teacher using the one-time password can request the recovery email, but
-- cannot pass staff RLS or access camper records until they select a new one.
create or replace function public.is_staff_2fa_verified()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (
    select 1
    from public.profiles p
    join public.staff_email_2fa_sessions s on s.user_id = p.id
    where p.id = auth.uid()
      and p.role in ('teacher', 'admin')
      and p.is_active
      and (p.role <> 'teacher' or exists (
        select 1 from public.teacher_profiles tp
        where tp.user_id = p.id and not tp.must_change_password
      ))
      and s.session_id::text = coalesce(auth.jwt() ->> 'session_id', '')
      and lower(s.email::text) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and s.expires_at > now()
  ), false)
$$;

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
grant execute on function public.allocate_teacher_username(text, text), public.complete_teacher_password_setup() to authenticated;
