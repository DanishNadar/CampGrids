-- Teacher accounts and student roster enrollment are MSI-admin operations.
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

drop policy if exists "enrollments: teacher manage" on public.class_enrollments;
drop policy if exists "enrollments: admins manage" on public.class_enrollments;
create policy "enrollments: admins manage" on public.class_enrollments
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.protect_profile_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() and (new.role is distinct from old.role or new.username is distinct from old.username or new.email is distinct from old.email or new.is_active is distinct from old.is_active) then
    raise exception 'Only an MSI administrator can change roles, login identities, or account status';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
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
