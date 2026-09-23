-- A cell title is the name of the thing, and nothing else.
--
-- The Mother Grid importer built the title of a multi-activity cell as
-- "Category (N activities)". The cell already prints the count on its own line
-- underneath, so every such cell showed it twice - and because the title is
-- clamped to two lines, the suffix pushed the actual name out of view:
--
--     Origami (Figure) (2...      <- the title
--     2 activities                <- the same count, again
--
-- The importer no longer writes it. This clears it from the rows already stored,
-- so the Grid does not stay wrong until the next import.

-- ---------------------------------------------------------------------------
-- 1. The Mother Grid
-- ---------------------------------------------------------------------------

update public.mother_grid_cells
set title = btrim(regexp_replace(title, '\s*\(\d+\s+activit(y|ies)\)\s*$', '')),
    updated_at = now()
where title ~ '\(\d+\s+activit(y|ies)\)\s*$'
  -- Never empty a title: the table requires one between 1 and 180 characters.
  and btrim(regexp_replace(title, '\s*\(\d+\s+activit(y|ies)\)\s*$', '')) <> '';

-- ---------------------------------------------------------------------------
-- 2. Assignments already published from those cells
--
--    class_assignments.title is copied from the cell at publish time, so campers
--    are looking at the same duplicated count.
-- ---------------------------------------------------------------------------

update public.class_assignments
set title = btrim(regexp_replace(title, '\s*\(\d+\s+activit(y|ies)\)\s*$', ''))
where title ~ '\(\d+\s+activit(y|ies)\)\s*$'
  and btrim(regexp_replace(title, '\s*\(\d+\s+activit(y|ies)\)\s*$', '')) <> '';

notify pgrst, 'reload schema';
