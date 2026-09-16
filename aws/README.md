# CampGrids account data on AWS

## The production boundary

Use these AWS services with distinct responsibilities:

| Service | Responsibility | Must not contain |
| --- | --- | --- |
| Amazon Cognito | Passwords, password recovery, staff MFA, and browser tokens | CampGrids authorization rules or reporting data |
| Amazon RDS for PostgreSQL | Source of truth for accounts, roles, class membership, guardian contact data, and audit events | Plaintext passwords, MFA codes, or browser session tokens |
| EC2 account API | The only service allowed to reach RDS; validates Cognito tokens and applies authorization | Long-lived AWS keys or database passwords in source code |
| Amazon S3 | Versioned, encrypted export files and Redshift manifests | Passwords, MFA codes, JWTs, or raw guardian contact data |
| Amazon Redshift | Pseudonymized, append-oriented reporting data | Credentials, active sessions, recovery data, or guardian PII |

Redshift is deliberately not the account system of record. Its unique, primary-key, and foreign-key constraints are informational rather than enforced, so it cannot protect account uniqueness, enrolment integrity, or role transitions. The RDS schema is where those guarantees live; the Redshift schema is the reporting copy.

## What is included

- `rds/001_account_source_of_truth.sql` creates the transactional account model and an atomic account-provisioning function.
- `redshift/001_account_reporting.sql` creates a PII-minimized account/event warehouse and documents the S3 `COPY` contract.
- `account-api/` is an EC2-ready API boundary for authenticated profile reads and updates. It verifies Cognito JWTs and never exposes direct database credentials to the browser.

The existing browser still uses Supabase. Do **not** point it at these files or remove Supabase until the API routes needed by `dashboard.js`, the Cognito pool, and the migration export have all been deployed and tested. This avoids a split account source of truth.

## Safe rollout

1. Create a Cognito User Pool with email aliases for staff, required MFA for staff, and a separate student custom-auth flow if passwordless class-code login is retained. Never copy passwords, magic links, one-time codes, or Supabase sessions into AWS.
2. Create an encrypted, Multi-AZ RDS PostgreSQL database in private subnets. Apply `rds/001_account_source_of_truth.sql` with a migration owner. Give the EC2 instance profile database access through RDS IAM authentication or retrieve a rotating credential from Secrets Manager.
3. Run the account API on an EC2 instance in the same VPC. Put it behind HTTPS (ALB or a reverse proxy), restrict its CORS origins to the deployed CampGrids origins, and pass the configuration listed in `account-api/.env.example` as instance environment values or Secrets Manager references.
4. Export only the columns listed in the Redshift schema to an SSE-KMS encrypted, versioned S3 bucket. Load a dated manifest with Redshift `COPY`; retain the manifest and checksum so every warehouse load is reproducible.
5. Backfill RDS from Supabase in a maintenance window, reconcile counts and identifiers, then point the browser at the EC2 API. Keep Supabase read-only until profile, roster, class membership, staff MFA, and student access tests all pass.
6. Schedule a least-privilege export job after cutover. Redshift is for analytics and administration reports; it is never queried from the browser or used for sign-in decisions.

## Required deployment values

Keep these out of Git and out of browser JavaScript:

```text
DATABASE_URL=postgresql://...                 # RDS, TLS required
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_...
COGNITO_APP_CLIENT_ID=...
CORS_ALLOWED_ORIGINS=https://camp-grids.example.org,https://www.camp-grids.example.org
```

For Redshift, grant the cluster only a dedicated `COPY` role that can read the specific S3 export prefix. The EC2 API should have no Redshift write permissions. Use separate KMS keys or grants for RDS backups and export objects.

## Cutover acceptance checks

- A Cognito token for an inactive RDS account is rejected by the API.
- A token whose subject has no matching RDS account is rejected by the API.
- Users cannot change their own role, username, email, active state, or guardian information through the profile route.
- Duplicate usernames, emails, and Cognito subjects fail in RDS under concurrent provisioning.
- Staff MFA policy is enforced by Cognito before staff-only API routes are made available.
- S3 export files have no password, recovery, session, guardian-email, or raw student-name fields.
- Redshift row counts and account/event hashes reconcile to the RDS export manifest.

AWS documents that Redshift key constraints are not enforced; this is why the source-of-truth schema remains PostgreSQL and why the reporting schema does not pretend to be an authorization database. See [Amazon Redshift table constraints](https://docs.aws.amazon.com/redshift/latest/dg/t_Defining_constraints.html) and [Redshift database security](https://docs.aws.amazon.com/redshift/latest/dg/r_Database_objects.html).
