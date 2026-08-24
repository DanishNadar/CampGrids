-- Administrators sign in with a generated first-initial + last-name username.
-- Existing admin names are normalized once; duplicate names receive a suffix.
create or replace function public.generate_available_username(
  p_first_name text,
  p_last_name text,
  p_exclude_user_id uuid default null
)
returns text language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  base_name text;
  candidate text;
  suffix integer := 0;
begin
  base_name := lower(substr(regexp_replace(coalesce(p_first_name, ''), '[^a-zA-Z0-9]', '', 'g'), 1, 1)
                || regexp_replace(coalesce(p_last_name, ''), '[^a-zA-Z0-9]', '', 'g'));
  if char_length(base_name) < 2 then raise exception 'A first name and last name are required'; end if;

  perform pg_advisory_xact_lock(hashtext(base_name));
  loop
    candidate := base_name || case when suffix = 0 then '' else suffix::text end;
    exit when not exists (
      select 1 from public.profiles
      where username = candidate
        and (p_exclude_user_id is null or id <> p_exclude_user_id)
    );
    suffix := suffix + 1;
  end loop;
  return candidate;
end;
$$;

revoke all on function public.generate_available_username(text, text, uuid) from public, anon, authenticated;

create or replace function public.protect_profile_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' and (old.role is distinct from 'admin' or new.username is null) then
    new.username := public.generate_available_username(new.first_name, new.last_name, new.id);
  end if;
  if auth.role() <> 'service_role' and not public.is_admin() and (new.role is distinct from old.role or new.username is distinct from old.username or new.email is distinct from old.email or new.is_active is distinct from old.is_active) then
    raise exception 'Only an MSI administrator can change roles, login identities, or account status';
  end if;
  return new;
end;
$$;

create or replace function public.allocate_student_username(p_class_id uuid, p_first_name text, p_last_name text)
returns text language plpgsql security definer set search_path = public as $$
declare
  base_name text;
  candidate text;
  suffix integer;
begin
  if not public.is_admin() then raise exception 'Only MSI administrators can add students to a class'; end if;
  base_name := lower(substr(regexp_replace(coalesce(p_first_name, ''), '[^a-zA-Z0-9]', '', 'g'), 1, 1)
                || regexp_replace(coalesce(p_last_name, ''), '[^a-zA-Z0-9]', '', 'g'));
  if char_length(base_name) < 2 then raise exception 'A first name and last name are required'; end if;
  loop
    insert into public.username_sequences (base_username, next_suffix)
    values (base_name, 1)
    on conflict (base_username) do update
      set next_suffix = public.username_sequences.next_suffix + 1
    returning next_suffix - 1 into suffix;
    candidate := base_name || case when suffix = 0 then '' else suffix::text end;
    exit when not exists (select 1 from public.profiles where username = candidate);
  end loop;
  return candidate;
end;
$$;

-- Migrations run with database-owner authority. This permits the profile
-- protection trigger while backfilling active administrator usernames.
begin;
select set_config('request.jwt.claim.role', 'service_role', true);
update public.profiles set username = null where role = 'admin';
commit;
