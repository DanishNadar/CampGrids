-- CampGrids account reporting tables for Amazon Redshift.
-- Load only the minimized S3 export documented below. Redshift does not
-- enforce primary, unique, or foreign key constraints, so these tables must
-- never make authorization or sign-in decisions.

create schema if not exists analytics;

create table if not exists analytics.dim_account (
  account_key varchar(64) not null,
  role varchar(16) not null,
  is_active boolean not null,
  created_at timestamp not null,
  updated_at timestamp not null,
  deactivated_at timestamp,
  exported_at timestamp not null
)
diststyle auto
sortkey (updated_at, account_key);

create table if not exists analytics.fact_account_event (
  event_key varchar(64) not null,
  account_key varchar(64),
  actor_key varchar(64),
  event_type varchar(84) not null,
  occurred_at timestamp not null,
  exported_at timestamp not null
)
diststyle auto
sortkey (occurred_at, account_key);

-- Export contract written by the EC2 worker to a versioned, SSE-KMS S3 prefix:
--
-- accounts/*.csv
--   account_key, role, is_active, created_at, updated_at,
--   deactivated_at, exported_at
--
-- account-events/*.csv
--   event_key, account_key, actor_key, event_type,
--   occurred_at, exported_at
--
-- account_key must be an HMAC or keyed hash generated in the EC2 worker. Do
-- not export raw database ids, username, name, email, guardian data, Cognito
-- subject, JWT, MFA state, password, recovery data, class code, student notes,
-- or unreviewed event metadata. Keep the HMAC
-- key in Secrets Manager and never give the Redshift role permission to read it.
--
-- Create one dated manifest per table. After validating row counts and object
-- checksums, use a transaction to replace only the exported keys, for example:
--
-- begin;
-- create temporary table stage_account as select * from analytics.dim_account where 1 = 0;
-- copy stage_account
-- from 's3://YOUR-ENCRYPTED-BUCKET/campgrids/account-exports/2026-09-13/accounts.manifest'
-- iam_role 'arn:aws:iam::YOUR_ACCOUNT_ID:role/CampGridsRedshiftCopyRole'
-- manifest
-- csv ignoreheader 1 timeformat 'auto';
-- delete from analytics.dim_account target
-- using stage_account source
-- where target.account_key = source.account_key;
-- insert into analytics.dim_account select * from stage_account;
-- commit;
--
-- Do the analogous load for events, deduplicating event_key in the EC2 export
-- worker before the COPY. Redshift receives a least-privilege COPY role with
-- read-only access to this exact prefix; the public internet and browser have
-- no Redshift access.
