-- Account portability: Supabase now, RDS + Redshift later.
--
-- aws/rds/001_account_source_of_truth.sql and aws/redshift/001_account_reporting.sql
-- already fix the shape the accounts have to arrive in. Three things stood between
-- what this project stores and what those files accept:
--
--   * campgrids.accounts has deactivated_at; public.profiles had no equivalent, so
--     the Redshift dim_account column could only ever be exported as null;
--   * campgrids.accounts requires an email on every non-student and a username
--     matching ^[a-z0-9]{2,80}$ - neither is checked here, so a bad row would fail
--     the migration rather than the insert that created it;
--   * the Redshift export must carry no personal data at all, keyed by an HMAC
--     whose secret lives in Secrets Manager and never in the database.
--
-- This adds the missing column, a way to see violations before a migration hits
-- them, and the two export shapes. Nothing here changes how the application reads
-- or writes an account.

-- ---------------------------------------------------------------------------
-- 1. deactivated_at
--
--    Maintained by trigger rather than by callers, because is_active is written
--    from several places (set_account_active, the People table, direct SQL) and a
--    timestamp only some of them set would be worse than none.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

comment on column public.profiles.deactivated_at is
  'When is_active last became false. Mirrors campgrids.accounts.deactivated_at.';

create or replace function public.track_profile_deactivation()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.is_active is distinct from old.is_active then
    new.deactivated_at := case when new.is_active then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_track_deactivation on public.profiles;
create trigger profiles_track_deactivation
  before update on public.profiles
  for each row execute function public.track_profile_deactivation();

-- Existing rows: an inactive account with no timestamp gets the best available
-- approximation rather than a guess presented as fact.
update public.profiles
set deactivated_at = coalesce(deactivated_at, updated_at)
where not is_active and deactivated_at is null;

-- ---------------------------------------------------------------------------
-- 2. The source-of-truth shape
--
--    Column for column with campgrids.accounts. cognito_sub has no counterpart
--    yet - Supabase Auth holds the identity - so the account id stands in for it
--    and the migration maps it when the accounts move to Cognito.
-- ---------------------------------------------------------------------------

create or replace view public.account_source_of_truth as
  select
    p.id,
    p.id                as cognito_sub,
    p.role::text        as role,
    p.username::text    as username,
    p.email::text       as email,
    p.first_name,
    p.last_name,
    p.is_active,
    p.created_at,
    p.updated_at,
    p.deactivated_at
  from public.profiles p;

comment on view public.account_source_of_truth is
  'campgrids.accounts as it would be loaded. Staff rows must have an email and a '
  'username matching ^[a-z0-9]{2,80}$; run account_portability_report() to check.';

-- ---------------------------------------------------------------------------
-- 3. What would fail on the way over
--
--    Every constraint campgrids.accounts declares that this schema does not, so a
--    bad row is found here rather than halfway through a load.
-- ---------------------------------------------------------------------------

create or replace function public.account_portability_report()
returns table (account_id uuid, account_email text, problem text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(p.email::text, '(none)'), problem
  from public.profiles p
  cross join lateral (
    values
      (case when p.role <> 'student' and p.email is null
            then 'campgrids.accounts requires an email on every non-student' end),
      (case when p.username is null
            then 'campgrids.accounts requires a username' end),
      (case when p.username is not null and p.username::text !~ '^[a-z0-9]{2,80}$'
            then 'username does not match ^[a-z0-9]{2,80}$' end),
      (case when char_length(btrim(p.first_name)) not between 1 and 80
            then 'first_name must be 1 to 80 characters' end),
      (case when char_length(btrim(p.last_name)) not between 1 and 80
            then 'last_name must be 1 to 80 characters' end),
      (case when p.is_active and p.deactivated_at is not null
            then 'an active account must not carry a deactivated_at' end)
  ) as checks(problem)
  where public.is_admin() and problem is not null
  order by p.id
$$;

-- ---------------------------------------------------------------------------
-- 4. The Redshift export
--
--    analytics.dim_account carries no personal data: no username, name, email,
--    subject, or class code. Rows are keyed by an HMAC of the account id, and the
--    secret is passed in by the export worker rather than stored here, so the
--    database never holds the key that would re-identify a row.
-- ---------------------------------------------------------------------------

create or replace function public.account_export_for_redshift(p_hmac_key text)
returns table (
  account_id varchar(36),
  account_key varchar(64),
  role varchar(16),
  is_active boolean,
  created_at timestamp,
  updated_at timestamp,
  deactivated_at timestamp,
  exported_at timestamp
)
language sql stable security definer set search_path = public, extensions as $$
  select
    p.id::varchar(36),
    encode(extensions.hmac(p.id::text, p_hmac_key, 'sha256'), 'hex')::varchar(64),
    p.role::varchar(16),
    p.is_active,
    (p.created_at at time zone 'UTC')::timestamp,
    (p.updated_at at time zone 'UTC')::timestamp,
    (p.deactivated_at at time zone 'UTC')::timestamp,
    (now() at time zone 'UTC')::timestamp
  from public.profiles p
  where public.is_admin()
    and length(coalesce(p_hmac_key, '')) >= 32
$$;

comment on function public.account_export_for_redshift(text) is
  'analytics.dim_account rows. The HMAC key comes from Secrets Manager and is '
  'never stored here; a key shorter than 32 characters returns nothing rather '
  'than exporting weakly-keyed identifiers.';

-- analytics.fact_account_event, from the audit log this project already writes.
create or replace function public.account_events_for_redshift(p_since timestamptz default null)
returns table (
  event_id bigint,
  account_id varchar(36),
  actor_account_id varchar(36),
  event_type varchar(84),
  metadata_super jsonb,
  occurred_at timestamp,
  exported_at timestamp
)
language sql stable security definer set search_path = public as $$
  select
    a.id,
    -- entity_id is the account the event was about, but only when the event was
    -- about an account; a class or a Grid cell id must not land in this column.
    (case when a.entity_type in ('account', 'profile', 'student', 'teacher', 'admin')
          then a.entity_id end)::varchar(36),
    a.actor_id::varchar(36),
    -- campgrids.account_audit_events requires ^[a-z][a-z0-9_]{2,80}$.
    lower(regexp_replace(a.action, '[^a-zA-Z0-9_]', '_', 'g'))::varchar(84),
    a.metadata,
    (a.occurred_at at time zone 'UTC')::timestamp,
    (now() at time zone 'UTC')::timestamp
  from public.audit_log a
  where public.is_admin()
    and (p_since is null or a.occurred_at > p_since)
  order by a.id
$$;

grant execute on function public.account_portability_report() to authenticated;
grant execute on function public.account_export_for_redshift(text) to authenticated;
grant execute on function public.account_events_for_redshift(timestamptz) to authenticated;
grant select on public.account_source_of_truth to authenticated;

notify pgrst, 'reload schema';
