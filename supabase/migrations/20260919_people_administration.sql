-- People administration: one place to see and manage every account.
--
-- An administrator could already create accounts but not review them: there was no
-- way to see who exists, who never activated, which classes someone belongs to, or
-- to remove a person who has left. Everything below is read and written through
-- security-definer functions that check is_admin() themselves, so the browser needs
-- no new table privileges and RLS is unchanged.
--
-- Two relationships matter here and they are not symmetric:
--   * a camper belongs to a class through class_enrollments, which is closed by
--     setting exited_at rather than deleted, so their work stays attached to it;
--   * a teacher belongs to a class through class_teachers, and additionally owns
--     the class if classes.owner_id points at them. The owner is a teacher of the
--     class by way of a trigger, and must not be removable as if they were an
--     ordinary member.

-- ---------------------------------------------------------------------------
-- 1. The directory
--
--    One row per person with what an administrator actually looks for: who they
--    are, how they sign in, whether the account is usable yet, and which classes
--    they touch.
-- ---------------------------------------------------------------------------

drop function if exists public.admin_directory(public.user_role, text);
create function public.admin_directory(p_role public.user_role default null, p_search text default null)
returns table (
  id uuid,
  full_name text,
  account_email text,
  account_username text,
  account_role public.user_role,
  is_active boolean,
  awaiting_password boolean,
  invite_sent_at timestamptz,
  grade text,
  title text,
  department text,
  class_names text[],
  class_ids uuid[],
  owned_class_count integer,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    (p.first_name || ' ' || p.last_name),
    p.email::text,
    p.username::text,
    p.role,
    p.is_active,
    coalesce(p.must_change_password, false),
    p.password_invite_sent_at,
    sp.grade,
    tp.title,
    ap.department,
    coalesce(cls.names, array[]::text[]),
    coalesce(cls.ids, array[]::uuid[]),
    coalesce(owned.total, 0),
    p.created_at
  from public.profiles p
  left join public.student_profiles sp on sp.user_id = p.id
  left join public.teacher_profiles tp on tp.user_id = p.id
  left join public.admin_profiles ap on ap.user_id = p.id
  left join lateral (
    -- Current classes only: an exited enrolment is history, not membership.
    select array_agg(c.name order by c.name) as names,
           array_agg(c.id order by c.name) as ids
    from public.classes c
    where (p.role = 'student' and exists (
             select 1 from public.class_enrollments e
             where e.class_id = c.id and e.student_id = p.id and e.exited_at is null))
       or (p.role <> 'student' and exists (
             select 1 from public.class_teachers ct
             where ct.class_id = c.id and ct.teacher_id = p.id))
  ) cls on true
  left join lateral (
    -- Owning a class is what blocks deletion, so the count travels with the row
    -- and the interface can explain the refusal before it happens.
    select count(*)::integer as total from public.classes c where c.owner_id = p.id
  ) owned on true
  where public.is_admin()
    and (p_role is null or p.role = p_role)
    and (
      p_search is null or trim(p_search) = ''
      or p.first_name ilike '%' || trim(p_search) || '%'
      or p.last_name ilike '%' || trim(p_search) || '%'
      or p.email::text ilike '%' || trim(p_search) || '%'
      or p.username::text ilike '%' || trim(p_search) || '%'
    )
  order by p.role, p.last_name, p.first_name
$$;

-- Every class with its lead, its staff, and how full it is. Drives the pickers.
drop function if exists public.admin_classes();
create function public.admin_classes()
returns table (
  id uuid,
  code text,
  name text,
  status public.class_status,
  owner_id uuid,
  owner_name text,
  teacher_names text[],
  camper_count integer,
  starts_on date,
  ends_on date
)
language sql stable security definer set search_path = public as $$
  select c.id, c.code::text, c.name, c.status, c.owner_id,
         (o.first_name || ' ' || o.last_name),
         coalesce((
           select array_agg(t.first_name || ' ' || t.last_name order by t.last_name)
           from public.class_teachers ct
           join public.profiles t on t.id = ct.teacher_id
           where ct.class_id = c.id
         ), array[]::text[]),
         (select count(*)::integer from public.class_enrollments e
          where e.class_id = c.id and e.exited_at is null),
         c.starts_on, c.ends_on
  from public.classes c
  left join public.profiles o on o.id = c.owner_id
  where public.is_admin()
  order by c.name
$$;

-- ---------------------------------------------------------------------------
-- 2. Activating and deactivating
--
--    Deactivation is the normal way to remove someone. It takes effect at once,
--    because is_staff_2fa_verified and the camper sign-in both require is_active,
--    and it keeps their work, belts, and history intact.
-- ---------------------------------------------------------------------------

create or replace function public.set_account_active(p_user_id uuid, p_active boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can change account status';
  end if;
  -- Nothing in the interface could undo an administrator locking themselves out.
  if p_user_id = auth.uid() and not p_active then
    raise exception 'You cannot deactivate your own administrator account';
  end if;

  update public.profiles set is_active = p_active, updated_at = now() where id = p_user_id;
  if not found then raise exception 'No account with that id'; end if;
  return p_active;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Deleting
--
--    Deliberately narrow. Most of the tables that point at a profile do so with
--    on delete restrict, because they record who did something; a person who has
--    run a class or awarded a belt genuinely cannot be erased without taking that
--    record with them. This removes what is only membership, refuses clearly when
--    authored work is in the way, and says to deactivate instead.
--
--    Campers are the exception: their enrolments cascade to progress and belts, so
--    a delete really would discard work. It is allowed, but only when the caller
--    has confirmed it knowing the count.
-- ---------------------------------------------------------------------------

create or replace function public.delete_account(p_user_id uuid, p_confirm_discard_work boolean default false)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  target_role public.user_role;
  work_count integer := 0;
  blocker text;
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can delete accounts';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own administrator account';
  end if;

  select role into target_role from public.profiles where id = p_user_id;
  if target_role is null then raise exception 'No account with that id'; end if;

  if target_role = 'student' then
    select count(*) into work_count
    from public.student_assignment_progress sap
    join public.class_enrollments e on e.id = sap.enrollment_id
    where e.student_id = p_user_id;

    if work_count > 0 and not p_confirm_discard_work then
      raise exception
        'That camper has % completed activity record(s), which deleting would discard. Deactivate the account instead, or confirm the deletion.',
        work_count;
    end if;

    -- Progress and belt awards hang off the enrolment and go with it.
    delete from public.class_enrollments where student_id = p_user_id;
  else
    -- Authored work pins a staff account in place. Name the first thing found so
    -- the administrator knows what to do rather than seeing a database error.
    select case
      when exists (select 1 from public.classes where owner_id = p_user_id)
        then 'still leads at least one class'
      when exists (select 1 from public.class_assignments where created_by = p_user_id)
        then 'created class activities that would be lost'
      when exists (select 1 from public.belt_awards where awarded_by = p_user_id)
        then 'has awarded belts that must stay on record'
      when exists (select 1 from public.class_grid_cells where selected_by = p_user_id)
        then 'built class Grids that are still in use'
      when exists (select 1 from public.import_batches where uploaded_by = p_user_id)
        then 'uploaded rosters or Grids that are still on record'
      when exists (select 1 from public.content_pages where created_by = p_user_id)
        then 'authored published pages'
      when exists (select 1 from public.navigation_items where created_by = p_user_id)
        then 'authored navigation entries'
      else null
    end into blocker;

    if blocker is not null then
      raise exception 'That account % , so it cannot be deleted. Deactivate it instead, which blocks every sign-in and keeps the record.', blocker;
    end if;

    delete from public.class_teachers where teacher_id = p_user_id;
  end if;

  delete from public.profiles where id = p_user_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Class membership and access
--
--    Both sides are set as a whole list, the way a class Grid is, so the interface
--    sends the state it wants rather than a sequence of adds and removes.
-- ---------------------------------------------------------------------------

create or replace function public.set_student_classes(p_student_id uuid, p_class_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[] := coalesce(p_class_ids, '{}'::uuid[]);
  current_total integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can change class membership';
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
    raise exception 'That account is not a camper';
  end if;
  if exists (select 1 from unnest(ids) as wanted(id)
             where not exists (select 1 from public.classes c where c.id = wanted.id)) then
    raise exception 'One of those classes no longer exists';
  end if;

  -- Leaving a class closes the enrolment; the work done in it stays attached.
  update public.class_enrollments
  set exited_at = now()
  where student_id = p_student_id and exited_at is null and not (class_id = any (ids));

  -- Re-joining reopens the original enrolment, so returning campers keep history.
  insert into public.class_enrollments (class_id, student_id)
  select wanted.id, p_student_id from unnest(ids) as wanted(id)
  on conflict (class_id, student_id) do update set exited_at = null;

  select count(*)::integer into current_total
  from public.class_enrollments
  where student_id = p_student_id and exited_at is null;
  return current_total;
end;
$$;

create or replace function public.set_teacher_classes(p_teacher_id uuid, p_class_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[] := coalesce(p_class_ids, '{}'::uuid[]);
  owned text[];
  current_total integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can change class staffing';
  end if;
  if not exists (select 1 from public.profiles where id = p_teacher_id and role in ('teacher', 'admin')) then
    raise exception 'That account is not a teacher or administrator';
  end if;

  -- The lead teacher is a member of their own class by construction. Dropping
  -- them here would be undone by the trigger and leave the class unattended.
  select array_agg(c.name order by c.name) into owned
  from public.classes c
  where c.owner_id = p_teacher_id and not (c.id = any (ids));

  if owned is not null then
    raise exception 'This teacher leads %, so they cannot be removed from it. Reassign the class first.',
      array_to_string(owned, ', ');
  end if;

  delete from public.class_teachers
  where teacher_id = p_teacher_id and not (class_id = any (ids));

  insert into public.class_teachers (class_id, teacher_id)
  select wanted.id, p_teacher_id from unnest(ids) as wanted(id)
  on conflict (class_id, teacher_id) do nothing;

  select count(*)::integer into current_total
  from public.class_teachers where teacher_id = p_teacher_id;
  return current_total;
end;
$$;

-- Handing a class to a different lead, which is what unblocks deleting a teacher.
create or replace function public.set_class_owner(p_class_id uuid, p_owner_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only MSI administrators can reassign a class';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_owner_id and role in ('teacher', 'admin') and is_active
  ) then
    raise exception 'A class can only be led by an active teacher or administrator';
  end if;

  update public.classes set owner_id = p_owner_id, updated_at = now() where id = p_class_id;
  if not found then raise exception 'No class with that id'; end if;

  -- The lead is always on the staff list; the trigger only covers inserts.
  insert into public.class_teachers (class_id, teacher_id)
  values (p_class_id, p_owner_id)
  on conflict (class_id, teacher_id) do nothing;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Access
-- ---------------------------------------------------------------------------

grant execute on function public.admin_directory(public.user_role, text) to authenticated;
grant execute on function public.admin_classes() to authenticated;
grant execute on function public.set_account_active(uuid, boolean) to authenticated;
grant execute on function public.delete_account(uuid, boolean) to authenticated;
grant execute on function public.set_student_classes(uuid, uuid[]) to authenticated;
grant execute on function public.set_teacher_classes(uuid, uuid[]) to authenticated;
grant execute on function public.set_class_owner(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
