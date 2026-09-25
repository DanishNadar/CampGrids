# CampGrids AWS production proposal and deployment runbook

## Decision

Use Amazon RDS for PostgreSQL as CampGrids' transactional system of record.
EC2 runs the private FastAPI application behind an Application Load Balancer.
S3 stores static web files, private imports/exports, and analytics exports.
Amazon Redshift Serverless is an optional, separate reporting warehouse.

Do **not** use Redshift for sign-in, rosters, progress, classes, or any other
live CampGrids decision. It is an append-oriented reporting store and does not
enforce primary, unique, or foreign key constraints. PostgreSQL enforces those
relationships instead.

The implementation in this repository is a production foundation, not a claim
that the current browser application has already moved off Supabase. The
current front end still calls Supabase for Camps, classes, rosters, Mother Grid,
assignments, progress, belts, partners, content, administration, and realtime
updates. The existing EC2 API initially implements only the account profile
boundary. Do not change production DNS or turn Supabase off until the cutover
gates below are complete.

## Target architecture

```text
Browser
  ├─ CloudFront → private S3 web bucket
  ├─ Cognito staff pool (email + required MFA) ─┐
  └─ Cognito student pool (class-code challenge) ├─ HTTPS ALB + WAF
                                                 │       ↓
                                                 └→ two private EC2 API instances
                                                            ↓
                                                   private Multi-AZ RDS PostgreSQL

RDS reporting view → scheduled Lambda → encrypted analytics S3 → Redshift Serverless

CloudWatch, SNS, VPC Flow Logs, KMS, Secrets Manager, IAM, SES, ACM, and DNS
support every tier. Browsers never receive a database, Redshift, or AWS secret.
```

## Exact resources to request

Request a dedicated production account/environment and a matching non-production
environment. Student and guardian data must not be tested against production.

| Area | Initial production request | Why it is needed |
| --- | --- | --- |
| AWS tenancy | Production and non-production environments; organization-standard Region | Keeps test data and changes away from student production data. |
| Network | One `/16` VPC across two AZs; 2 public, 2 private app, and 2 isolated database subnets | Separates internet-facing, application, and database traffic. CIDR must not overlap organization networks. |
| Egress | Two NAT Gateways, one per AZ, plus an S3 gateway endpoint | Resilient outbound patching/managed-service access without public EC2 addresses. |
| API | One internet-facing ALB, HTTPS on 443, port-80 redirect, WAF, and ALB health checks | TLS termination, failover, safe rollout, and request protection. |
| Compute | EC2 Auto Scaling Group: `t3.medium`, min/desired 2, max 4; 30 GiB encrypted gp3 each; Amazon Linux 2023 | Runs FastAPI with availability during a single-instance/AZ failure. No SSH keys or public IPs. |
| Transactional database | RDS PostgreSQL, `db.t4g.medium`, Multi-AZ, 50 GiB gp3 scaling to 200 GiB, private only | Required source of truth for accounts, roles, classes, enrollments, progress, belts, content, imports, and audit records. |
| Database resilience | 35-day automated backup/PITR, deletion protection, encrypted backups, PostgreSQL logs, performance insights | Recoverable student data and operational diagnosis. |
| Authentication | Two Cognito User Pools and browser clients: staff/password/email MFA; student/custom class-code challenge | Staff MFA must not be weakened to accommodate students. Cognito proves identity while RDS/API still authorizes access. |
| Auth functions | Three small Python Lambda triggers: Define, Create, and Verify custom challenge | Preserves the present student class-code experience, validating active enrollment against RDS. |
| Email | SES verified organizational domain, DKIM, production sending approval, a monitored `no-reply` sender | Delivers staff invitation, recovery, and email-MFA messages without consumer SMTP. |
| Web storage | Private S3 web bucket + one CloudFront distribution with Origin Access Control | Serves static site files only through HTTPS; the S3 bucket is never public. |
| Private files | Separate KMS-encrypted/versioned S3 bucket for roster and Mother Grid imports, generated exports, short-lived temporary files | Keeps PII-bearing files separate from the public web and analytics. Use presigned URLs from the API. |
| Secrets/encryption | One customer-managed KMS data key; Secrets Manager secrets for RDS master (managed by RDS), API DB user, student-auth DB user, analytics DB user, HMAC key, and Redshift admin | Removes passwords and analytics HMAC keys from source, EC2 user data, browser files, and Git. |
| Analytics | Optional Redshift Serverless workgroup, 4 RPU base capacity, private access, KMS, workload usage limit; separate analytics S3 bucket | Enables historical/cross-program reporting only after there is a real reporting workload. |
| Analytics job | EventBridge nightly schedule and one 512 MiB/15 minute Lambda | Exports pseudonymized account/event facts to S3 and loads Redshift. No names, email, guardian data, raw IDs, class codes, or metadata leave RDS. |
| Monitoring | CloudWatch logs/metrics, VPC Flow Logs, alarms for ALB 5xx/unhealthy targets/API CPU/RDS CPU/RDS free storage/Lambda errors, and an SNS operations topic | Someone is alerted when the service or data path is unhealthy. |
| DNS/TLS | DNS record changes plus ACM certificate for `api.<domain>` in the workload Region; a second ACM certificate in `us-east-1` if using a custom CloudFront frontend hostname | HTTPS at both application entry points. CloudFront certificates have the `us-east-1` constraint. |
| Identity/governance | Least-privilege deployment role (prefer GitHub OIDC), named human SSO roles, account-level CloudTrail, GuardDuty/Security Hub as required by organization policy, budget alerts/cost allocation tags | Makes changes auditable and avoids shared credentials. |

The provided CloudFormation template implements the bolded application foundation:

- [bootstrap-artifacts.yaml](infrastructure/bootstrap-artifacts.yaml) creates the protected deployment-artifact bucket.
- [campgrids-production.yaml](infrastructure/campgrids-production.yaml) creates the VPC, EC2/RDS/ALB, Cognito, storage, WAF, IAM, monitoring, and conditional Redshift path.
- [parameters.production.example.json](infrastructure/parameters.production.example.json) is the non-secret parameter template.

## What is mandatory versus deferred

Mandatory before the AWS production cutover: VPC, ALB, two EC2 instances,
RDS PostgreSQL, Cognito, SES, KMS/Secrets Manager, S3, CloudWatch/SNS, WAF,
ACM/DNS, IAM, database backups, and the complete application migration.

Redshift is not mandatory for a functional CampGrids launch. It should be enabled
when leadership has recurring historical/cross-camp reporting or a BI audience.
If there are only occasional reports, query the pseudonymized S3 export with
Athena first and defer Redshift. The production template defaults
`EnableRedshift` to `false`; this is a cost-control choice, not an architecture
omission. When enabled, it creates a private 4-RPU Serverless warehouse and the
nightly export job.

Do not add ECS/Kubernetes, a service mesh, Redis, SQS, WebSockets, a data lake,
or a second application database at launch. They do not solve a current
CampGrids requirement. Revisit SQS for large asynchronous imports and WebSockets
only if the 30–60 second content refresh alternative is unacceptable.

## Security controls already designed into the setup

- EC2, RDS, Lambda, and Redshift have no public IP/public endpoint. There is no
  inbound SSH rule; administrators use Systems Manager Session Manager.
- The EC2 security group accepts port 8080 only from the ALB. The database
  accepts 5432 only from the API or two narrowly scoped Lambda security groups.
- RDS uses three runtime users: API read/write, student-auth read-only, and
  analytics-export read-only. The student auth and analytics functions cannot
  use the API credential.
- S3 Block Public Access, bucket-owner enforcement, versioning, TLS-only bucket
  policies, lifecycle rules, and SSE-KMS protect non-public data.
- The API accepts tokens only from the configured staff or student Cognito pools,
  verifies the issuer/signature/client, and then requires a matching active RDS
  account.
- WAF applies AWS managed common protections and a 500-requests-per-five-minute
  per-IP limit to the public API. Tune that threshold after measuring real use.
- Analytics uses HMAC keys from Secrets Manager and puts only HMAC keys and
  approved event facts into Redshift. It intentionally omits the event JSON,
  which could contain PII.

## Prerequisites before deployment

1. Choose the AWS Region and obtain an unused, non-overlapping VPC CIDR.
2. Create and validate ACM certificates. The API certificate must be in the
   workload Region; a custom CloudFront certificate must be in `us-east-1`.
3. Verify the SES domain, publish its DKIM records, request SES production
   access, and decide the monitored sender address.
4. Create the DNS records after the stack outputs are available. Route 53 is
   optional; the template works with another DNS provider.
5. Install AWS CLI v2, Python 3.12, PostgreSQL `psql`, and the Session Manager
   plugin on the deployment workstation. Authenticate with an approved SSO/IAM
   deployment role.
6. Copy the sample parameter file and replace every placeholder. It contains
   identifiers and email addresses, never passwords.
7. Agree on an operations mailbox and confirm its SNS subscription when it
   arrives. Also create a monthly AWS Budget alert before deployment.

## Deploy the foundation

From the repository root in PowerShell:

```powershell
Copy-Item aws/infrastructure/parameters.production.example.json aws/infrastructure/parameters.production.json
# Edit parameters.production.json with the real certificate ARNs, SES identity,
# approved origin/domain, operations address, and later the artifact bucket output.

.\aws\scripts\bootstrap-artifacts.ps1 -Region us-east-1
.\aws\scripts\build-and-upload-artifacts.ps1 -Region us-east-1 -ArtifactsBucketName <bootstrap-output>
.\aws\scripts\deploy-production.ps1 -Region us-east-1 -ParameterFile aws/infrastructure/parameters.production.json -StackName campgrids-prod
```

The first EC2 instances start before their least-privilege database user exists,
so the target group will be unhealthy until the next step. This is expected only
during initial provisioning; do not put API DNS into production yet.

In one PowerShell terminal, open a Systems Manager tunnel (it remains open):

```powershell
.\aws\scripts\open-database-tunnel.ps1 -Region us-east-1 -StackName campgrids-prod
```

In a second terminal, initialize a **new** RDS database once. The script refuses
to overwrite an existing schema and does not print passwords:

```powershell
.\aws\scripts\initialize-database.ps1 -Region us-east-1 -StackName campgrids-prod
.\aws\scripts\deploy-production.ps1 -Region us-east-1 -ParameterFile aws/infrastructure/parameters.production.json -StackName campgrids-prod -RefreshApiInstances
```

If Redshift was explicitly enabled, initialize its schema after its workgroup is
available:

```powershell
.\aws\scripts\initialize-redshift.ps1 -Region us-east-1 -StackName campgrids-prod
```

The scripts package the API and Lambda dependencies into the protected artifact
bucket before the primary stack refers to them. This avoids a common first-run
failure where CloudFormation tries to create a Lambda from an object that does
not yet exist.

## Required application migration before a real cutover

The deployment foundation does not replace the application work. Complete and
test these items in a non-production environment before changing frontend DNS:

1. Implement FastAPI routes and authorization for CampGrids workflows: class and
   camp management, teacher/student provisioning, rosters/imports, Mother Grid,
   class selections, assignments, progress, belts, partner pages, editable
   content, navigation/dropdowns, activity events, and audit views. The RDS
   tables are in [002_core_application_schema.sql](rds/002_core_application_schema.sql).
2. Replace every Supabase browser call with the API/Cognito client. Do not expose
   an RDS password, Secrets Manager value, Redshift endpoint, or service role in
   JavaScript.
3. Provision staff in the staff Cognito pool and students in the student pool;
   record Cognito `sub` values in RDS. A student custom-auth flow requires a
   confirmed Cognito user for every student. Staff use normal password plus
   email MFA.
4. Export Supabase data, map identities and foreign keys, load RDS in a staging
   environment, reconcile table counts/representative records, and repeat the
   process in a scheduled maintenance window. Do not copy Supabase password
   hashes, magic links, OTPs, sessions, or recovery tokens.
5. Test permissions with real role scenarios: inactive account rejection,
   teacher limited to their own class, student limited to active enrollment,
   admin administration, duplicate identity prevention, data import failures,
   staff MFA, account recovery, and audit records.
6. Pilot with one camp/class. Then make Supabase read-only, validate a complete
   day of use and analytics export, switch DNS, and retain a documented rollback
   path until acceptance is signed off.

The original live-content realtime behavior can initially become a 30–60 second
browser refresh. Add a WebSocket/pub-sub solution later only if MSI requires
instant administrator updates to connected browsers.

## Cutover acceptance criteria

- Two healthy targets are registered with the ALB and `/health` has no public
  database detail.
- RDS is not publicly accessible; no security group permits SSH or direct
  browser-to-database access.
- Staff email-MFA, invitation, and recovery delivery work through production SES.
- Student custom auth accepts only a confirmed active student with an active
  matching class enrollment; it returns the same generic failure for all others.
- API rejects a valid Cognito token whose RDS account is absent or inactive.
- A roster import uses an authorized presigned S3 URL; a raw roster is absent
  from CloudWatch and analytics storage.
- An RDS restore exercise and a sample object-version restore have been run in
  non-production.
- Alert email subscription is confirmed; alarms are tested; logs have explicit
  retention; CloudTrail and budget alerts are enabled at the account level.
- If Redshift is enabled, the nightly job produces only expected pseudonymized
  columns, Redshift row counts reconcile, and the workgroup usage cap has an
  alert/limit configured.

## Cost and operational guardrails

The deliberately resilient baseline has recurring cost from two NAT Gateways,
two EC2 instances, Multi-AZ RDS, ALB, logs, and public IPv4 addresses. NAT
Gateway charges include uptime and processed data; the S3 gateway endpoint in
the template prevents S3 traffic from incurring NAT processing. Redshift
Serverless charges for active RPU usage and storage, so set a monthly RPU-hour
limit before enabling it. Create a region-specific AWS Pricing Calculator quote
with expected data transfer, RDS backup storage, SES volume, and log retention
before approval; do not rely on generic internet estimates.

## Final proposal to send for approval

> Approve a dedicated CampGrids production and non-production AWS environment.
> Production will run a two-AZ, private application architecture: CloudFront/S3
> for the static web app; WAF-protected HTTPS ALB and two private EC2 FastAPI
> instances for the API; private Multi-AZ RDS PostgreSQL for all transactional
> CampGrids data; Cognito plus SES for identity, staff MFA, invitations and
> recovery; encrypted/versioned S3 for files; KMS, Secrets Manager, IAM,
> CloudWatch/SNS, VPC Flow Logs, account CloudTrail, and budget monitoring for
> security and operations. No EC2 instance or database will be publicly
> reachable and administration will use Systems Manager rather than SSH.
>
> Redshift Serverless is approved as the analytics path but enabled after the
> transactional migration and reporting requirements are validated. It receives
> a nightly pseudonymized S3 export only; it is not an application database.
> Initial sizes are two `t3.medium` API instances (autoscale to four), RDS
> `db.t4g.medium` Multi-AZ with 50 GiB gp3/200 GiB autoscaling and 35-day
> recovery, and Redshift Serverless at 4 RPU with a usage limit when enabled.
>
> Success requires the infrastructure deployment plus a controlled migration of
> the current Supabase-backed application routes and data. We will complete that
> migration in non-production, pilot one class, reconcile data, then cut over
> with Supabase retained read-only for rollback until acceptance is complete.
