-- CampGrids runtime database roles. Run after 001 and 002.
--
-- Passwords are deliberately not present here. The initialization script reads
-- the generated Secrets Manager values and creates these LOGIN roles, then this
-- file grants only the access each runtime component needs.

begin;

grant usage on schema campgrids to campgrids_api, campgrids_student_auth, campgrids_analytics_export;

-- The FastAPI service is the application's trusted policy-enforcement point.
-- No browser, BI user, Lambda custom-auth function, or Redshift role receives
-- this credential. PostgreSQL constraints and triggers remain in force.
grant select, insert, update, delete on all tables in schema campgrids to campgrids_api;
grant usage, select on all sequences in schema campgrids to campgrids_api;
grant execute on all functions in schema campgrids to campgrids_api;

-- Custom authentication needs to answer one question: does this Cognito subject
-- have an active enrollment for the submitted class code? It cannot modify data.
grant select (id, cognito_sub, role, is_active) on campgrids.accounts to campgrids_student_auth;
grant select (id, code, status) on campgrids.classes to campgrids_student_auth;
grant select (student_id, class_id, exited_at) on campgrids.class_enrolments to campgrids_student_auth;

-- The scheduled export reads only the already-minimized source columns. It has
-- no rights to student profile/guardian tables or application content.
grant select (id, role, is_active, created_at, updated_at, deactivated_at)
  on campgrids.accounts to campgrids_analytics_export;
grant select (id, account_id, actor_id, event_type, occurred_at)
  on campgrids.account_audit_events to campgrids_analytics_export;

alter default privileges in schema campgrids grant select, insert, update, delete on tables to campgrids_api;
alter default privileges in schema campgrids grant usage, select on sequences to campgrids_api;
alter default privileges in schema campgrids grant execute on functions to campgrids_api;

commit;
