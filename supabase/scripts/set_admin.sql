-- CampGrids: create an administrator with an email and a password you choose
-- ============================================================================
--
-- For the IT manager. Paste into the Supabase SQL editor, change the five values,
-- and run. It is one statement: there is no wrapper to miss and no part of it that
-- works on its own, so a partial paste cannot half-run.
--
-- Running it again on the same address re-issues the password. It does not delete
-- anything and does not touch their classes, Grids, or history.

select * from public.create_admin_account(
  p_email      => 'newadmin@msichicago.org',
  p_first_name => 'Jordan',
  p_last_name  => 'Smith',
  p_password   => 'Thundering7Bison',
  p_department => 'MSI Camps'
);

-- ============================================================================
-- What the new administrator does with what you hand over
--
--   1. Signs in at /admin/ with this email and this password.
--   2. Receives a verification code at that same MSI mailbox and enters it.
--   3. Is then required to replace your password with one only they know.
--   4. Reaches the workspace. Never prompted again.
--
-- Step 2 comes before step 3 on purpose. The password you set is a shared secret
-- until they replace it, so replacing it has to prove more than knowing it -
-- otherwise anyone who saw it in transit could set their own and take the account.
-- complete_password_setup() refuses without a recently verified code, so that
-- ordering is enforced by the database, not by the order of the screens.
--
-- The rules applied for you
--
--   * The password must pass public.password_policy_violation(): 12 to 72
--     characters, at least one letter and one digit, no leading or trailing space,
--     and not containing their name, their email, or an obvious word.
--   * Only addresses at msichicago.org are accepted, so a typo or a personal
--     address cannot quietly become an administrator. To allow another domain,
--     pass it explicitly:
--
--         p_allowed_domains => array['msichicago.org', 'hawk.illinoistech.edu']
--
--   * The password expires after public.admin_password_setup_window() (72 hours).
--     After that it will not complete setup, and
--     public.expire_stale_issued_passwords() strips the credential from any
--     account that never used it.
--   * Until the password is replaced, must_change_password keeps
--     is_staff_2fa_verified() false, so no camper record is reachable.
--   * The password is never written to profiles, to audit_log, or to the result
--     below. Hand it over directly, and issue a different one per administrator.
--
-- If something is wrong
--
--   Checking, repairing, or deactivating an existing administrator is a different
--   file: supabase/scripts/manage_admin.sql.
-- ============================================================================
