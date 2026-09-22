-- create_admin_account: provisioning an administrator as one statement.
--
-- The previous version of this was a do $$ ... $$ block with a settings section at
-- the top. That section reads as though it is the thing to run, so it gets pasted
-- on its own - and plpgsql declarations outside their block are a bare syntax
-- error ("syntax error at or near v_email") that says nothing about the real
-- mistake. A function cannot be half-pasted: the call is one statement, the
-- parameters are named, and a missing one is reported by name.
--
-- Access is deliberately narrow. This mints an administrator, so it is callable
-- only by service_role - the SQL editor and the Management API - and never from a
-- browser session, which holds the anon key.

create or replace function public.create_admin_account(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_password text,
  p_department text default 'MSI Camps',
  p_allowed_domains text[] default array['msichicago.org']
)
returns table (
  email text,
  username text,
  role text,
  password_set boolean,
  must_replace_on_first_sign_in boolean,
  password_valid_until timestamptz,
  auth_row_readable boolean,
  next_step text
)
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_email    text := lower(btrim(p_email));
  v_first    text := btrim(p_first_name);
  v_last     text := btrim(p_last_name);
  v_domain   text;
  v_problem  text;
  v_user_id  uuid;
  v_username text;
  v_base     text;
  v_suffix   int := 0;
  v_created  boolean := false;
begin
  -- ---------------------------------------------------------- validation --
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'p_email is not a valid address: %', coalesce(p_email, '(null)');
  end if;
  if v_first = '' or v_last = '' then
    raise exception 'p_first_name and p_last_name are required; campgrids.accounts rejects an empty name.';
  end if;

  v_domain := split_part(v_email, '@', 2);
  if array_length(p_allowed_domains, 1) is not null
     and not (v_domain = any (p_allowed_domains)) then
    raise exception
      'Refusing to make an administrator at %. Allowed domains: %. Pass p_allowed_domains explicitly if that is genuinely intended.',
      v_domain, array_to_string(p_allowed_domains, ', ');
  end if;

  -- The policy is applied here, so no caller can route around it.
  v_problem := public.password_policy_violation(p_password, v_email, v_first, v_last);
  if v_problem is not null then
    raise exception 'The password %.', v_problem;
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = v_email;

  -- -------------------------------------------------------------- create --
  if v_user_id is null then
    v_user_id := gen_random_uuid();

    /* confirmation_token, recovery_token, email_change_token_new and email_change
       have no column default, and the Auth service reads them into non-nullable
       strings. Leaving them NULL does not fail this insert but makes every later
       sign-in for the address answer "500 Database error querying schema",
       including with the wrong password. */
    insert into auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      now(),
      '', '', '', '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('first_name', v_first, 'last_name', v_last),
      now(), now()
    );

    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (gen_random_uuid(), v_user_id, v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            'email', now(), now());
    v_created := true;
  else
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        banned_until = null,
        deleted_at = null,
        confirmation_token     = coalesce(confirmation_token, ''),
        recovery_token         = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change           = coalesce(email_change, ''),
        updated_at = now()
    where id = v_user_id;
  end if;

  -- ------------------------------------------------------------ username --
  select p.username into v_username from public.profiles p where p.id = v_user_id;
  if v_username is null then
    -- Shaped to campgrids.accounts' ^[a-z0-9]{2,80}$ so the row migrates as-is.
    v_base := lower(left(regexp_replace(v_first, '[^a-zA-Z0-9]', '', 'g'), 1)
                 || regexp_replace(v_last, '[^a-zA-Z0-9]', '', 'g'));
    if char_length(v_base) < 2 then v_base := 'admin'; end if;
    v_base := left(v_base, 78);
    v_username := v_base;
    while exists (select 1 from public.profiles p where p.username = v_username and p.id <> v_user_id) loop
      v_suffix := v_suffix + 1;
      v_username := v_base || v_suffix::text;
    end loop;
  end if;

  -- ------------------------------------------------------------- profile --
  insert into public.profiles (id, role, email, username, first_name, last_name, is_active)
  values (v_user_id, 'admin', v_email, v_username, v_first, v_last, true)
  on conflict (id) do update
  set role = 'admin', email = excluded.email,
      username = coalesce(public.profiles.username, excluded.username),
      first_name = excluded.first_name, last_name = excluded.last_name,
      is_active = true, updated_at = now();

  /* must_change_password keeps is_staff_2fa_verified() false, so no camper record
     is reachable until the issued password is replaced.
     temporary_password_issued_at starts the expiry window and is what makes
     complete_password_setup() demand the emailed code first. */
  update public.profiles
  set must_change_password = true,
      temporary_password_issued_at = now(),
      password_invite_sent_at = null
  where id = v_user_id;

  delete from public.student_profiles where user_id = v_user_id;

  insert into public.admin_profiles (user_id, department)
  values (v_user_id, p_department)
  on conflict (user_id) do update set department = excluded.department;

  -- Anything open predates this password and must not survive it.
  delete from public.staff_email_2fa_sessions where user_id = v_user_id;
  delete from public.staff_email_2fa_challenges where user_id = v_user_id;
  delete from auth.sessions where user_id = v_user_id;
  delete from auth.refresh_tokens where user_id = v_user_id::text;

  -- The password is never recorded, here or anywhere else.
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null,
          case when v_created then 'admin_account_created' else 'admin_password_reissued' end,
          'admin', v_user_id,
          jsonb_build_object('email', v_email, 'department', p_department,
                             'issued_by', 'it_manager_sql', 'created', v_created));

  -- -------------------------------------------------------------- report --
  return query
  select p.email::text,
         p.username::text,
         p.role::text,
         (u.encrypted_password is not null and u.encrypted_password <> ''),
         p.must_change_password,
         p.temporary_password_issued_at + public.admin_password_setup_window(),
         (u.confirmation_token is not null and u.recovery_token is not null
          and u.email_change_token_new is not null and u.email_change is not null),
         'Ready. Give them this email and the password you chose. They sign in at /admin/, enter the emailed code, then choose their own password.'::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = v_user_id;
end;
$$;

comment on function public.create_admin_account(text, text, text, text, text, text[]) is
  'Creates or re-issues an administrator with a password chosen by IT. The password '
  'must pass password_policy_violation(); the account is flagged to replace it, and '
  'complete_password_setup() requires an emailed code before it can be replaced.';

/* Only the SQL editor and the Management API. A browser holds the anon key and
   authenticates as anon or authenticated, neither of which may mint an admin. */
revoke execute on function public.create_admin_account(text, text, text, text, text, text[]) from public;
revoke execute on function public.create_admin_account(text, text, text, text, text, text[]) from anon;
revoke execute on function public.create_admin_account(text, text, text, text, text, text[]) from authenticated;
grant execute on function public.create_admin_account(text, text, text, text, text, text[]) to service_role;

notify pgrst, 'reload schema';
