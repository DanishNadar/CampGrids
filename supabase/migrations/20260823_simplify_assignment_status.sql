-- Assignment progress has two current states. Preserve completed records and
-- safely move historical not_started/submitted records into in_progress.
begin;

alter table public.student_assignment_progress
  alter column status drop default;

create type public.assignment_status_next as enum ('in_progress', 'complete');

alter table public.student_assignment_progress
  alter column status type public.assignment_status_next
  using (
    case when status = 'complete'::public.assignment_status then 'complete' else 'in_progress' end
  )::public.assignment_status_next;

drop type public.assignment_status;
alter type public.assignment_status_next rename to assignment_status;

alter table public.student_assignment_progress
  alter column status set default 'in_progress'::public.assignment_status;

commit;
