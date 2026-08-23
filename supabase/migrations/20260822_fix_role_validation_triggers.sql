-- Fixes the role validation trigger used while a class owner is added to
-- class_teachers. Apply this in Supabase SQL Editor after the base schema.

drop trigger if exists class_teachers_validate_role on public.class_teachers;
drop trigger if exists class_enrollments_validate_role on public.class_enrollments;

create or replace function public.validate_class_teacher_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.teacher_id and role in ('teacher', 'admin')
  ) then
    raise exception 'Only a teacher or admin can teach a class';
  end if;
  return new;
end;
$$;

create or replace function public.validate_class_enrollment_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.student_id and role = 'student'
  ) then
    raise exception 'Only a student can be enrolled in a class';
  end if;
  return new;
end;
$$;

create trigger class_teachers_validate_role before insert or update on public.class_teachers
  for each row execute procedure public.validate_class_teacher_role();

create trigger class_enrollments_validate_role before insert or update on public.class_enrollments
  for each row execute procedure public.validate_class_enrollment_role();
