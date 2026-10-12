-- The category belongs in the column header. Each Grid cell must instead name
-- the project that a camper begins in that belt/category intersection.
--
-- Earlier imports used category as the title when a cell had more than one
-- project, which made titles repeat down a column and hid the actual project.

with renamed as (
  update public.mother_grid_cells
  set title = left(btrim(projects -> 0 ->> 'name'), 180),
      updated_at = now()
  where title = category
    and jsonb_typeof(projects) = 'array'
    and jsonb_array_length(projects) > 0
    and nullif(btrim(projects -> 0 ->> 'name'), '') is not null
  returning id, belt_code, category, title
)
update public.class_assignments assignment
set title = renamed.title
from public.class_grid_cells selection
join renamed on renamed.id = selection.mother_grid_cell_id
where assignment.class_id = selection.class_id
  and assignment.belt = renamed.belt_code
  and assignment.category is not distinct from renamed.category
  -- Only repair assignments that carry the old category-as-title value. Other
  -- published assignments remain immutable historical snapshots.
  and assignment.title = renamed.category;

notify pgrst, 'reload schema';
