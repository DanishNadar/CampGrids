-- A student unlocks a category one belt at a time. The browser mirrors this
-- rule for feedback, but this protected action is the enforcement point.
create or replace function public.save_student_grid_activity_progress(
  p_class_id uuid,
  p_mother_grid_cell_id uuid,
  p_activity_index integer,
  p_status text
)
returns public.assignment_status
language plpgsql security definer set search_path = public as $$
declare
  enrollment_value uuid;
  cell_belt text;
  cell_category text;
  cell_title text;
  cell_projects jsonb;
  activity_total integer;
  activity_label text;
  target_rank integer;
  has_incomplete_prerequisite boolean;
  saved_status public.assignment_status;
begin
  if public.current_role() <> 'student' then
    raise exception 'Only a student can update class Grid activity progress';
  end if;
  if p_status not in ('in_progress', 'complete') then
    raise exception 'Choose an in-progress or complete activity status';
  end if;

  select e.id into enrollment_value
  from public.class_enrollments e
  where e.class_id = p_class_id
    and e.student_id = auth.uid()
    and e.exited_at is null;
  if enrollment_value is null then
    raise exception 'You are not enrolled in this class';
  end if;

  select m.belt_code, m.category, m.title, m.projects
  into cell_belt, cell_category, cell_title, cell_projects
  from public.class_grid_cells cg
  join public.mother_grid_cells m on m.id = cg.mother_grid_cell_id
  where cg.class_id = p_class_id
    and cg.mother_grid_cell_id = p_mother_grid_cell_id
    and m.is_active;
  if cell_belt is null then
    raise exception 'That activity is not in your class Grid';
  end if;

  activity_total := greatest(coalesce(jsonb_array_length(cell_projects), 0), 1);
  if p_activity_index < 0 or p_activity_index >= activity_total then
    raise exception 'That activity is not available in this Grid cell';
  end if;
  activity_label := coalesce(
    nullif(trim(coalesce(cell_projects -> p_activity_index ->> 'name', '')), ''),
    cell_title
  );
  target_rank := public.belt_rank(cell_belt);

  select exists (
    select 1
    from public.class_grid_cells lower_selection
    join public.mother_grid_cells lower_cell on lower_cell.id = lower_selection.mother_grid_cell_id
    where lower_selection.class_id = p_class_id
      and lower_cell.is_active
      and lower_cell.category is not distinct from cell_category
      and public.belt_rank(lower_cell.belt_code) < target_rank
      and exists (
        select 1
        from generate_series(
          0,
          greatest(coalesce(jsonb_array_length(lower_cell.projects), 0), 1) - 1
        ) as required_activity(activity_index)
        where not exists (
          select 1
          from public.student_grid_activity_progress completed
          where completed.enrollment_id = enrollment_value
            and completed.mother_grid_cell_id = lower_cell.id
            and completed.activity_index = required_activity.activity_index
            and completed.status = 'complete'
        )
      )
  ) into has_incomplete_prerequisite;

  if has_incomplete_prerequisite then
    raise exception 'Complete the earlier belts in this category before starting this activity';
  end if;

  insert into public.student_grid_activity_progress as progress
    (enrollment_id, mother_grid_cell_id, activity_index, activity_name, status, completed_at)
  values (
    enrollment_value,
    p_mother_grid_cell_id,
    p_activity_index,
    activity_label,
    p_status::public.assignment_status,
    case when p_status = 'complete' then now() else null end
  )
  on conflict (enrollment_id, mother_grid_cell_id, activity_index) do update
    set activity_name = excluded.activity_name,
        status = case when progress.status = 'complete' then progress.status else excluded.status end,
        completed_at = case
          when progress.status = 'complete' then progress.completed_at
          when excluded.status = 'complete' then now()
          else progress.completed_at
        end
  returning status into saved_status;

  insert into public.student_activity_events (student_id, class_id, event_type, metadata)
  values (
    auth.uid(),
    p_class_id,
    case when p_status = 'complete' then 'assignment_completed'::public.event_type else 'assignment_started'::public.event_type end,
    jsonb_build_object(
      'source', 'class_grid',
      'mother_grid_cell_id', p_mother_grid_cell_id,
      'activity_index', p_activity_index,
      'title', activity_label,
      'belt', cell_belt,
      'category', cell_category
    )
  );

  return saved_status;
end;
$$;

grant execute on function public.save_student_grid_activity_progress(uuid, uuid, integer, text) to authenticated;

notify pgrst, 'reload schema';
