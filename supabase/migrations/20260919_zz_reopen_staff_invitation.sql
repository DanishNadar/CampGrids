-- Reopening an invitation that was half-accepted.
--
-- A staff account can get stuck in a state the invite flow cannot serve. The person
-- clicks their set-password link, which confirms their email address and signs them
-- in, and then closes the tab without choosing a password. They are left confirmed,
-- with no password, and still flagged must_change_password.
--
-- From then on inviteUserByEmail refuses with "A user with this email address has
-- already been registered" (GoTrue returns 422), so Resend invitation fails for
-- exactly the people most likely to need it. There is no supported admin API for
-- this: PUT /admin/users with email_confirm:false, and with email_confirmed_at:null,
-- both answer 200 and leave the confirmation in place. Verified against this project.
--
-- The remaining options were to send the recovery template instead - which is the
-- "reset your password" email going to someone who has never had one, the thing this
-- project already decided not to do - or to put the account back into the state it
-- should have been in. This does the latter, as narrowly as possible.
--
-- confirmed_at is a generated column (LEAST(email_confirmed_at, phone_confirmed_at)),
-- so clearing email_confirmed_at keeps the two consistent by itself.

create or replace function public.reopen_staff_invitation(p_email text)
returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare
  target_id uuid;
  already_unconfirmed boolean;
begin
  /* Every condition here is a reason this account cannot be in use, so nothing that
     works can be disturbed:
       - it belongs to a teacher or administrator we invited,
       - it is still flagged as needing a password,
       - it is active, and
       - it genuinely has no password set.
     An account failing any one of these is left alone and the caller told nothing
     changed. */
  select u.id, u.email_confirmed_at is null
    into target_id, already_unconfirmed
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
    and p.role in ('teacher', 'admin')
    and p.is_active
    and p.must_change_password
    and (u.encrypted_password is null or u.encrypted_password = '');

  if target_id is null then return false; end if;
  -- Nothing to undo; the invitation would already have gone out.
  if already_unconfirmed then return false; end if;

  update auth.users
  set email_confirmed_at = null,
      invited_at = now(),
      updated_at = now()
  where id = target_id;

  return true;
end;
$$;

/* Only the Edge Function may call this, and only after it has checked that the
   caller is an administrator with email two-factor verification. It is deliberately
   unreachable from a browser session. */
revoke execute on function public.reopen_staff_invitation(text) from public;
revoke execute on function public.reopen_staff_invitation(text) from anon;
revoke execute on function public.reopen_staff_invitation(text) from authenticated;
grant execute on function public.reopen_staff_invitation(text) to service_role;

notify pgrst, 'reload schema';
