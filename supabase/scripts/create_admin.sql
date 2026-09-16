-- Create or promote one MSI administrator, with no password.
--
-- No password is issued here, and none is needed. The account is created with a null
-- encrypted_password, which makes Supabase Auth refuse every password sign-in for it.
-- The administrator gets in by opening admin/, entering their email, and pressing
-- "email me a set-password link"; they choose their own password from that email and
-- are never asked again. SQL cannot send mail, which is why that last step happens in
-- the browser rather than here.
--
-- Safe to run on an email that does not exist yet (it is created), on one that exists
-- as a student (it is promoted), and on one that is already an admin (its password is
-- cleared, which is what a lockout recovery needs).
--
-- Edit the values in the DECLARE block, then run the whole file.

begin;

-- The SQL editor runs as postgres with no JWT. This marks the session as service_role
-- for any helper that checks it, and puts the auth schema on the search path.
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('search_path', 'public, extensions, auth', true);

-- No-ops once the migrations have been applied.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temporary_password_issued_at timestamptz,
  add column if not exists password_invite_sent_at timestamptz;

do $$
declare
  -- ---- edit these ----
  v_email      text := 'dnadar@hawk.illinoistech.edu';
  v_first      text := 'Danish';
  v_last       text := 'Nadar';
  v_department text := 'MSI Camps';
  -- ---------------------
  v_username text;
  v_id       uuid;
begin
  v_email := lower(trim(v_email));
  if position('@' in v_email) = 0 then
    raise exception 'That does not look like an email address: %', v_email;
  end if;
  -- The emailed link is the only way into this account, so the address has to be real.
  if v_email like '%@students.campgrids.local' then
    raise exception 'That is an internal camper address and cannot receive mail.';
  end if;

  select id into v_id from auth.users where lower(auth.users.email) = v_email;

  if v_id is null then
    v_id := gen_random_uuid();
    -- There is no SQL equivalent of the admin createUser API, so the row is written
    -- directly. email_confirmed_at is set because Auth will not send a recovery mail
    -- to an unconfirmed address, and encrypted_password is left null so that no
    -- password sign-in can succeed until one is chosen through the emailed link.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, null,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', v_first, 'last_name', v_last),
      '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      v_email, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now()
    );
    raise notice 'Created % with no password. Use "email me a set-password link" on the admin sign-in page.', v_email;
  else
    update auth.users
    set encrypted_password = null, updated_at = now()
    where id = v_id;
    raise notice 'Cleared the password for existing account %. Use "email me a set-password link" to set a new one.', v_email;
  end if;

  -- on_auth_user_created inserts a student profile for a new user. This is the
  -- safety net for an auth user that somehow has no profile row.
  insert into public.profiles (id, role, email, first_name, last_name)
  values (v_id, 'admin', v_email, v_first, v_last)
  on conflict (id) do nothing;

  -- protect_profile_identity() generates the login name for administrators, so this
  -- only fills one in if that has not already happened.
  select pr.username::text into v_username from public.profiles pr where pr.id = v_id;
  if v_username is null then
    v_username := public.generate_available_username(v_first, v_last, v_id);
  end if;

  update public.profiles
  set first_name = v_first,
      last_name  = v_last,
      email      = v_email,
      role       = 'admin',
      is_active  = true,
      username   = v_username,
      must_change_password         = true,
      temporary_password_issued_at = null
  where id = v_id;

  -- An administrator is not a camper.
  delete from public.student_profiles where student_profiles.user_id = v_id;

  insert into public.admin_profiles (user_id, department)
  values (v_id, coalesce(nullif(trim(v_department), ''), 'MSI Camps'))
  on conflict (user_id) do update set department = excluded.department;
end $$;

select p.email,
       p.username,
       p.role,
       p.is_active,
       p.must_change_password as must_set_password_on_first_sign_in,
       a.department,
       'Open admin/ and press "email me a set-password link"' as next_step
from public.profiles p
join public.admin_profiles a on a.user_id = p.id
where p.email = lower('dnadar@hawk.illinoistech.edu');

commit;
