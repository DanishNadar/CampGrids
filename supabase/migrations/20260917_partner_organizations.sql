-- Partner organizations: a company that works with MSI to build its own Grid
-- curriculum, and the public page that presents it.
--
-- This replaces the generic "publish a generated page" tool. That tool wrote free
-- text into content_pages, which could describe a curriculum but could never *be*
-- one: it had no connection to the Mother Grid, so nothing it published stayed in
-- step with the activities. A partner page is instead a selection of real Mother
-- Grid cells, so it is always the current curriculum.

-- ---------------------------------------------------------------------------
-- 1. The organization
-- ---------------------------------------------------------------------------

create table if not exists public.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  -- The slug is the public address, partner.html?org=<slug>, so it is restricted to
  -- characters that survive a URL untouched.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name text not null check (char_length(trim(name)) between 2 and 140),
  summary text check (summary is null or char_length(summary) <= 400),
  focus text check (focus is null or char_length(focus) <= 140),
  contact_name text,
  contact_email citext,
  website text,
  -- Only an active partner is readable by the public; a draft stays internal while
  -- its curriculum is still being chosen.
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists partner_organizations_updated_at on public.partner_organizations;
create trigger partner_organizations_updated_at
  before update on public.partner_organizations
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Their curriculum: a selection of Mother Grid cells
--
--    Same shape as class_grid_cells. Referencing the Mother Grid rather than
--    copying it means a partner's published page follows the next Grid import
--    instead of drifting out of date.
-- ---------------------------------------------------------------------------

create table if not exists public.partner_grid_cells (
  partner_id uuid not null references public.partner_organizations(id) on delete cascade,
  mother_grid_cell_id uuid not null references public.mother_grid_cells(id) on delete cascade,
  selected_by uuid references public.profiles(id) on delete set null,
  selected_at timestamptz not null default now(),
  primary key (partner_id, mother_grid_cell_id)
);

create index if not exists partner_grid_cells_partner_idx on public.partner_grid_cells(partner_id);
create index if not exists partner_organizations_published_idx on public.partner_organizations(slug) where is_published;

-- ---------------------------------------------------------------------------
-- 3. Choosing the curriculum
--
--    Replaced as a whole set, and held to the same rule as a class Grid: belts
--    cannot be skipped. A curriculum that offered Blue without the belts beneath
--    it would not be a progression.
-- ---------------------------------------------------------------------------

create or replace function public.set_partner_grid_cells(p_partner_id uuid, p_cell_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[] := coalesce(p_cell_ids, '{}'::uuid[]);
  ranks integer[];
  written integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can change a partner curriculum';
  end if;

  select array_agg(distinct public.belt_rank(m.belt_code) order by public.belt_rank(m.belt_code))
  into ranks
  from public.mother_grid_cells m
  where m.id = any (ids) and m.is_active;

  if ranks is not null and array_length(ranks, 1) > 1
     and ranks[array_length(ranks, 1)] - ranks[1] + 1 <> array_length(ranks, 1) then
    raise exception 'Belt rows cannot be skipped. Choose a continuous run of belts.';
  end if;

  delete from public.partner_grid_cells where partner_id = p_partner_id;

  insert into public.partner_grid_cells (partner_id, mother_grid_cell_id, selected_by)
  select p_partner_id, m.id, auth.uid()
  from public.mother_grid_cells m
  where m.id = any (ids) and m.is_active;
  get diagnostics written = row_count;

  return written;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The public page's data
--
--    One call returns the organization and its curriculum. It is readable without
--    a session so a partner can share the link, and it returns nothing at all for
--    an unpublished partner, which keeps a draft private without the caller having
--    to remember to filter.
-- ---------------------------------------------------------------------------

create or replace function public.partner_page(p_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when p.id is null then null else jsonb_build_object(
    'name', p.name,
    'slug', p.slug,
    'summary', p.summary,
    'focus', p.focus,
    'website', p.website,
    'contact_name', p.contact_name,
    'contact_email', p.contact_email::text,
    'updated_at', p.updated_at,
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id,
               'belt_code', m.belt_code,
               'column_number', m.column_number,
               'title', m.title,
               'category', m.category,
               'instructions', m.instructions,
               'resource_url', m.resource_url,
               'projects', m.projects
             ) order by public.belt_rank(m.belt_code), m.column_number)
      from public.partner_grid_cells g
      join public.mother_grid_cells m on m.id = g.mother_grid_cell_id
      where g.partner_id = p.id and m.is_active
    ), '[]'::jsonb)
  ) end
  from public.partner_organizations p
  where p.slug = lower(trim(p_slug)) and p.is_published
$$;

-- The admin list, including drafts and how many cells each one carries.
create or replace function public.partner_organizations_admin()
returns table (
  id uuid,
  slug text,
  name text,
  summary text,
  focus text,
  contact_name text,
  contact_email text,
  website text,
  is_published boolean,
  cell_count bigint,
  updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.slug, p.name, p.summary, p.focus, p.contact_name,
         p.contact_email::text, p.website, p.is_published,
         (select count(*) from public.partner_grid_cells g where g.partner_id = p.id),
         p.updated_at
  from public.partner_organizations p
  where public.is_admin()
  order by p.name
$$;

-- ---------------------------------------------------------------------------
-- 5. Access
--
--    The tables themselves are never read by the browser: the public page goes
--    through partner_page and the dashboard through partner_organizations_admin,
--    both security definer. So the policies only have to admit administrators.
-- ---------------------------------------------------------------------------

alter table public.partner_organizations enable row level security;
alter table public.partner_grid_cells enable row level security;

drop policy if exists "partners: admins manage" on public.partner_organizations;
drop policy if exists "partner grid: admins manage" on public.partner_grid_cells;

create policy "partners: admins manage" on public.partner_organizations
  for all using (public.is_admin()) with check (public.is_admin());
create policy "partner grid: admins manage" on public.partner_grid_cells
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.partner_organizations, public.partner_grid_cells to authenticated;
grant execute on function public.set_partner_grid_cells(uuid, uuid[]) to authenticated;
grant execute on function public.partner_organizations_admin() to authenticated;
-- anon as well: a partner shares this link with people who have no CampGrids account.
grant execute on function public.partner_page(text) to anon, authenticated;

notify pgrst, 'reload schema';
