(() => {
  const workspace = document.getElementById('workspace');
  const printWorkspace = document.getElementById('printWorkspace');
  const app = window.CampGridsApp;
  const beltNames = ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black'];
  const gridRows = [['WT', 'White'], ['YW', 'Yellow'], ['OR', 'Orange'], ['GN', 'Green'], ['BU', 'Blue'], ['PL', 'Purple'], ['BN', 'Brown'], ['BK', 'Black']];
  const state = { profile: null, classes: [], adminClasses: [], selectedClassId: '', motherGrid: [], studentCredentialRows: [], teacherCredentialRows: [], editingMotherGridCellId: '', gridZoom: 1, classGridDraft: null, classGridDraftFor: '', availableStudents: [], rosterDraft: null, partners: [], selectedPartnerId: '', partnerGridDraft: null, partnerGridDraftFor: '' };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const dateValue = (value) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const initials = (profile) => `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

  function notice(message, kind = '') { const node = document.getElementById('workspaceNotice'); if (node) { node.textContent = message; node.className = `workspaceNotice ${kind}`; } }
  function actionsHeader(label, heading, lede) { return `<header class="workspaceHeader"><div><p class="eyebrow">${escapeHtml(label)}</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(lede)}</p></div><div class="accountBadge"><span class="avatar">${initials(state.profile)}</span><span><strong>${escapeHtml(`${state.profile.first_name} ${state.profile.last_name}`)}</strong><small>${escapeHtml(state.profile.role)}</small></span><button class="quietButton" type="button" data-action="sign-out">Sign out</button></div></header><p id="workspaceNotice" class="workspaceNotice" role="status" aria-live="polite"></p>`; }
  function beltOptions(selected = '') { return beltNames.map((belt) => `<option ${belt === selected ? 'selected' : ''}>${belt}</option>`).join(''); }
  function gridColumnCount(cells = state.motherGrid) { return Math.max(8, ...cells.map((cell) => Number(cell.column_number) || 0)); }
  /* A column is one workbook category all the way down, so its name can be read
     off whichever cell in that column happens to carry it. */
  function columnCategories(cells) { const names = new Map(); cells.forEach((cell) => { const column = Number(cell.column_number); if (cell.category && column && !names.has(column)) names.set(column, cell.category); }); return names; }
  /* Belt order, matching public.belt_rank in the database. */
  function beltRank(code) { return gridRows.findIndex(([entry]) => entry === code) + 1; }
  /* The selected belts have to be one unbroken run: a class cannot be given Blue
     without the belts beneath it. Returns the belts that would be skipped. */
  function skippedBelts(cells) { const ranks = [...new Set(cells.map((cell) => beltRank(cell.belt_code)).filter(Boolean))].sort((a, b) => a - b); if (ranks.length < 2) return []; const gaps = []; for (let rank = ranks[0]; rank <= ranks[ranks.length - 1]; rank += 1) { if (!ranks.includes(rank)) gaps.push(gridRows[rank - 1][1]); } return gaps; }
  function selectedClass() { return state.classes.find((entry) => entry.id === state.selectedClassId) || null; }
  function classSelector() { return state.classes.length ? `<label class="fieldLabel compactField">Current class<select id="classPicker">${state.classes.map((entry) => `<option value="${entry.id}" ${entry.id === state.selectedClassId ? 'selected' : ''}>${escapeHtml(entry.name)} · ${escapeHtml(entry.code)}</option>`).join('')}</select></label>` : '<p class="emptyCopy">Create your first class to begin building its Grid.</p>'; }
  function rosterOptions(classData) { return classData.roster.filter((entry) => !entry.exited_at).map((entry) => `<option value="${entry.id}">${escapeHtml(`${entry.profiles.first_name} ${entry.profiles.last_name} (${entry.profiles.username})`)}</option>`).join(''); }
  function progressOptions(classData, includeBlank = false) { return `${includeBlank ? '<option value="">No assignment update</option>' : ''}${classData.assignments.map((assignment) => `<option value="${assignment.id}">${escapeHtml(assignment.title)}</option>`).join('')}`; }
  function selectedGridOptions(classData) { return classData.gridCells.map((selection) => { const cell = selection.mother_grid_cells; return cell ? `<option value="${cell.id}">${escapeHtml(`${cell.belt_code} · C${cell.column_number} · ${cell.title}`)}</option>` : ''; }).join(''); }
  function classKpis(classData) { const roster = classData.roster.filter((entry) => !entry.exited_at); const possible = roster.length * classData.assignments.length; const completed = classData.progress.filter((entry) => entry.status === 'complete').length; const belts = classData.awards.reduce((counts, award) => { counts[award.belt] = (counts[award.belt] || 0) + 1; return counts; }, {}); return { campers: roster.length, possible, completed, completion: possible ? completed / possible * 100 : 0, belts }; }
  function beltSummary(kpis) { const entries = Object.entries(kpis.belts); return entries.length ? entries.map(([belt, count]) => `<span class="beltPill belt${belt}">${escapeHtml(belt)} <b>${count}</b></span>`).join('') : '<span class="muted">No belts awarded yet</span>'; }

  function completionSummary(classData) {
    const activeIds = new Set(classData.roster.filter((entry) => !entry.exited_at).map((entry) => entry.id));
    const completeByAssignment = classData.progress.reduce((counts, entry) => { if (entry.status === 'complete' && activeIds.has(entry.enrollment_id)) counts.set(entry.assignment_id, (counts.get(entry.assignment_id) || 0) + 1); return counts; }, new Map());
    const categories = new Map();
    classData.assignments.forEach((assignment) => { const category = assignment.category || 'Other activities'; const belt = assignment.belt || 'Unassigned'; if (!categories.has(category)) categories.set(category, new Map()); const belts = categories.get(category); if (!belts.has(belt)) belts.set(belt, []); belts.get(belt).push(assignment.id); });
    if (!categories.size) return '<p class="emptyCopy">Publish activities from the class Grid to show completion by belt and category.</p>';
    const rows = [...categories.entries()].map(([category, belts]) => { const beltRows = [...belts.entries()].map(([belt, assignments]) => { const completed = assignments.reduce((sum, id) => sum + (completeByAssignment.get(id) || 0), 0); const possible = assignments.length * activeIds.size; return { belt, completed, possible, percent: possible ? Math.round(completed / possible * 100) : 0 }; }); const percent = beltRows.length ? Math.round(beltRows.reduce((sum, belt) => sum + belt.percent, 0) / beltRows.length) : 0; return `<article class="categoryCompletion"><div class="completionLabel"><strong>${escapeHtml(category)}</strong><b>${percent}%</b></div><div class="completionTrack"><span style="width:${percent}%"></span></div><small>${beltRows.filter((belt) => belt.percent === 100).length}/${beltRows.length} belts complete</small><div class="beltCompletionList">${beltRows.map((belt) => `<div><span>${escapeHtml(belt.belt)} belt</span><b>${belt.percent}%</b><small>${belt.completed}/${belt.possible} completed</small></div>`).join('')}</div></article>`; }).join('');
    return `<section class="completionSummary"><div class="completionSummaryHeading"><div><p class="eyebrow">Completion overview</p><h3>Belts build each category</h3></div><p>Each category is the average completion of its published belts.</p></div><div class="categoryCompletionGrid">${rows}</div></section>`;
  }

  function gridCellMarkup(cell, isSelected, mode, beltCode, columnNumber) {
    const color = `belt${beltCode}`; const label = cell ? `${beltCode}, column ${columnNumber}: ${cell.title}` : `${beltCode}, column ${columnNumber}: empty`; const count = Array.isArray(cell?.projects) ? cell.projects.length : 0;
    /* The column heading already names the category, so the second line is the
       activity count instead of repeating it. */
    const title = cell?.title ? `<strong>${escapeHtml(cell.title)}</strong><small>${count ? `${count} activit${count === 1 ? 'y' : 'ies'}` : escapeHtml(cell.category || 'Grid activity')}</small>` : '<span class="gridEmpty">—</span>';
    if (mode === 'admin') return `<button type="button" class="motherGridCell ${color} ${cell ? 'hasCell' : 'isEmpty'} ${state.editingMotherGridCellId === cell?.id ? 'isEditing' : ''}" data-mother-grid-cell="${cell?.id || ''}" data-grid-belt="${beltCode}" data-grid-column="${columnNumber}" aria-label="${escapeHtml(label)}">${title}</button>`;
    if (mode === 'teacher' || mode === 'partner') return cell ? `<button type="button" class="motherGridCell ${color} hasCell ${isSelected ? 'isSelected' : ''}" data-class-grid-cell="${cell.id}" aria-pressed="${String(isSelected)}" aria-label="${escapeHtml(`${label}; ${isSelected ? 'selected' : 'not selected'}`)}">${title}<em>${isSelected ? 'Selected' : 'Select'}</em></button>` : `<div class="motherGridCell ${color} isEmpty">${title}</div>`;
    return `<div class="motherGridCell ${color} ${cell ? 'hasCell' : 'isEmpty'} ${isSelected ? 'isSelected' : ''}">${cell && isSelected ? `${title}<em>In your class Grid</em>` : '<span class="gridEmpty">—</span>'}</div>`;
  }

  function renderMotherGrid({ mode, cells = state.motherGrid, selectedIds = new Set(), heading = 'Mother Grid', description = '' }) {
    const columns = gridColumnCount(cells); const map = new Map(cells.map((cell) => [`${cell.belt_code}-${cell.column_number}`, cell])); const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    const categoryNames = columnCategories(cells);
    const headers = Array.from({ length: columns }, (_, index) => { const column = index + 1; const name = categoryNames.get(column) || `C${column}`; const populated = cells.some((cell) => Number(cell.column_number) === column); return (mode === 'teacher' || mode === 'partner') && populated ? `<button type="button" class="motherGridColumn isPickable" data-grid-column-select="${column}" title="${escapeHtml(`Take or release every belt in ${name}`)}">${escapeHtml(name)}</button>` : `<span class="motherGridColumn" title="${escapeHtml(name)}">${escapeHtml(name)}</span>`; }).join('');
    const rows = gridRows.map(([code, name]) => `<div class="motherGridRow"><span class="motherGridRowLabel belt${code}" title="${name} belt">${code}</span>${Array.from({ length: columns }, (_, index) => { const cell = map.get(`${code}-${index + 1}`); return gridCellMarkup(cell, Boolean(cell && selected.has(cell.id)), mode, code, index + 1); }).join('')}</div>`).join('');
    const defaultText = (mode === 'teacher' || mode === 'partner') ? 'Click a category heading to take or release that whole column, or click single cells. Belt rows cannot be skipped, so a selection has to be one unbroken run of belts. Nothing reaches campers until you save.' : mode === 'admin' ? 'The whole Grid comes from an imported sheet. Click a cell to see what it holds; use Import a Mother Grid to change it.' : 'These are the Mother Grid activities your teacher selected for this class.';
    return `<br><article class="toolCard motherGridCard"><div class="cardHeading"><div><p class="eyebrow">${escapeHtml(heading)}</p><h3>${mode === 'teacher' ? 'Select your class sub-grid' : mode === 'partner' ? 'Select this partner curriculum' : mode === 'admin' ? 'Edit the overall Grid' : 'My class Grid'}</h3><p class="helperText">${escapeHtml(description || defaultText)}</p></div><label class="gridZoomControl">Zoom<input type="range" min="0.8" max="1.35" step="0.05" value="${state.gridZoom}" data-grid-zoom-control></label></div><div class="motherGridViewport"><div class="motherGridCanvas" data-mother-grid-canvas style="--grid-scale:${state.gridZoom}; --grid-columns:${columns}"><div class="motherGridHeader"><span class="motherGridCorner">Belt</span>${headers}</div>${rows}</div></div></article>`;
  }

  async function loadTeacherClasses() {
    const client = app.getClient();
    const [classesResult, motherResult] = await Promise.all([client.from('classes').select('id, name, code, status, starts_on, ends_on, notes, created_at').order('created_at', { ascending: false }), client.from('mother_grid_cells').select('id, belt_code, column_number, title, category, instructions, resource_url, projects, is_active').eq('is_active', true).order('belt_code').order('column_number')]);
    if (classesResult.error || motherResult.error) throw classesResult.error || motherResult.error;
    state.motherGrid = motherResult.data || []; const classes = classesResult.data || []; const classIds = classes.map((entry) => entry.id);
    const { data: selectionRows, error: selectionError } = classIds.length ? await client.from('class_grid_cells').select('class_id, mother_grid_cell_id, mother_grid_cells(id, belt_code, column_number, title, category, instructions, resource_url, projects, is_active)').in('class_id', classIds) : { data: [], error: null };
    if (selectionError) throw selectionError;
    const selections = new Map(); (selectionRows || []).forEach((entry) => { const list = selections.get(entry.class_id) || []; list.push(entry); selections.set(entry.class_id, list); });
    state.classes = await Promise.all(classes.map(async (classRow) => {
      const [rosterResult, assignmentsResult] = await Promise.all([client.from('class_enrollments').select('id, student_id, exited_at, profiles!class_enrollments_student_id_fkey(first_name, last_name, username)').eq('class_id', classRow.id).order('enrolled_at'), client.from('class_assignments').select('id, title, instructions, category, belt, resource_url, due_at, published_at, created_at').eq('class_id', classRow.id).order('created_at', { ascending: false })]);
      if (rosterResult.error || assignmentsResult.error) throw rosterResult.error || assignmentsResult.error;
      const roster = rosterResult.data || []; const ids = roster.map((entry) => entry.id);
      const [progressResult, awardsResult] = await Promise.all([ids.length ? client.from('student_assignment_progress').select('id, enrollment_id, assignment_id, status, score, submitted_at, reviewed_at').in('enrollment_id', ids) : Promise.resolve({ data: [], error: null }), ids.length ? client.from('belt_awards').select('id, enrollment_id, category, belt, awarded_at, note').in('enrollment_id', ids).order('awarded_at', { ascending: false }) : Promise.resolve({ data: [], error: null })]);
      if (progressResult.error || awardsResult.error) throw progressResult.error || awardsResult.error;
      return { ...classRow, roster, assignments: assignmentsResult.data || [], progress: progressResult.data || [], awards: awardsResult.data || [], gridCells: selections.get(classRow.id) || [] };
    }));
    if (!state.selectedClassId || !state.classes.some((entry) => entry.id === state.selectedClassId)) state.selectedClassId = state.classes[0]?.id || '';
  }

  async function loadAdminDashboard() {
    const client = app.getClient(); const [classesResult, motherResult] = await Promise.all([client.from('classes').select('id, name, code, status, created_at').order('created_at', { ascending: false }), client.from('mother_grid_cells').select('id, belt_code, column_number, title, category, instructions, resource_url, projects, is_active').order('belt_code').order('column_number')]);
    if (classesResult.error || motherResult.error) throw classesResult.error || motherResult.error;
    state.adminClasses = classesResult.data || []; state.motherGrid = motherResult.data || [];

    /* Partner organizations and their curriculum selections. A missing function
       means this project has not had the partner migration applied yet, which must
       not take the whole dashboard down with it. */
    try {
      const [partnersResult, selectionResult] = await Promise.all([
        client.rpc('partner_organizations_admin'),
        client.from('partner_grid_cells').select('partner_id, mother_grid_cell_id')
      ]);
      if (partnersResult.error) throw partnersResult.error;
      const selections = new Map();
      (selectionResult.data || []).forEach((row) => {
        if (!selections.has(row.partner_id)) selections.set(row.partner_id, []);
        selections.get(row.partner_id).push(row.mother_grid_cell_id);
      });
      state.partners = (partnersResult.data || []).map((entry) => ({ ...entry, cellIds: selections.get(entry.id) || [] }));
    } catch (partnerError) {
      console.warn('Partner organizations unavailable', partnerError?.message || partnerError);
      state.partners = [];
    }
  }

  function renderTeacher() {
    const campers = state.classes.reduce((sum, classData) => sum + classKpis(classData).campers, 0); const possible = state.classes.reduce((sum, classData) => sum + classKpis(classData).possible, 0); const completed = state.classes.reduce((sum, classData) => sum + classKpis(classData).completed, 0); const current = selectedClass(); const kpis = current ? classKpis(current) : null;
    workspace.innerHTML = `${actionsHeader('Teacher workspace', 'Class management', 'Create classes, choose a sub-grid, review student work, and export the details your team needs.')}<section class="kpiGrid"><article class="kpiCard"><span>Active classes</span><strong>${state.classes.filter((entry) => entry.status === 'active').length}</strong><small>${state.classes.length} total</small></article><article class="kpiCard"><span>Campers</span><strong>${campers}</strong><small>Across your classes</small></article><article class="kpiCard"><span>Completion</span><strong>${possible ? Math.round(completed / possible * 100) : 0}%</strong><small>${completed} of ${possible} assignment records</small></article></section><section class="workspaceGrid teacherTopGrid"><article class="toolCard"><div class="cardHeading"><div><p class="eyebrow">New class</p><h2>Start a group</h2></div><span class="infoTag">Unique code</span></div><form id="createClassForm" class="stackForm"><label class="fieldLabel">Class name<input name="name" required maxlength="140" placeholder="e.g. Young Makers - Week 1"></label><div class="formTwoCols"><label class="fieldLabel">Starts<input name="startsOn" type="date"></label><label class="fieldLabel">Ends<input name="endsOn" type="date"></label></div><label class="fieldLabel">Teacher notes<textarea name="notes" rows="2" placeholder="Optional internal notes"></textarea></label><button class="primaryButton" type="submit">Create class &amp; code</button></form></article><article class="toolCard classAtGlance"><div class="cardHeading"><div><p class="eyebrow">Class overview</p><h2>${current ? escapeHtml(current.name) : 'No class selected'}</h2></div>${classSelector()}</div>${current ? `<div class="classCode"><span>Class code</span><strong>${escapeHtml(current.code)}</strong><button class="copyButton" data-copy-code="${escapeHtml(current.code)}" type="button">Copy</button></div><div class="beltSummary"><span class="summaryLabel">Belts earned</span>${beltSummary(kpis)}</div>` : ''}</article></section>${current ? renderClassManager(current) : ''}`;
    bindTeacherEvents();
  }

  function renderClassManager(classData) {
    const roster = classData.roster.length ? classData.roster.map((entry) => { const info = entry.profiles || {}; const completed = classData.progress.filter((item) => item.enrollment_id === entry.id && item.status === 'complete').length; const belts = classData.awards.filter((item) => item.enrollment_id === entry.id).length; return `<tr><td><strong>${escapeHtml(`${info.first_name || ''} ${info.last_name || ''}`)}</strong><small>${escapeHtml(info.username || '')}</small></td><td>${completed}/${classData.assignments.length}</td><td>${belts}</td></tr>`; }).join('') : '<tr><td colspan="3" class="emptyTable">An MSI administrator adds campers from the standardized roster CSV.</td></tr>';
    const selectedIds = gridDraft() || new Set();
    const assignments = classData.gridCells.length ? `<form id="assignmentForm" class="stackForm"><label class="fieldLabel">Class Grid activity<select name="gridCellId">${selectedGridOptions(classData)}</select></label><label class="fieldLabel">Teacher instructions<textarea name="instructions" rows="2" placeholder="What should campers document, build, or submit?"></textarea></label><label class="fieldLabel">Due date &amp; time<input name="dueAt" type="datetime-local"></label><div class="formTwoCols"><button class="primaryButton" type="submit">Publish assignment</button><button class="secondaryButton" type="button" data-action="print-selected-grid">Print selected activity</button></div></form>` : '<p class="emptyCopy">Select one or more Mother Grid cells first. Only class selections can be published to campers.</p>';
    return `<section class="managerSection"><div class="sectionHeading"><div><p class="eyebrow">Manage ${escapeHtml(classData.name)}</p><h2>Class Grid, work, and reporting</h2></div><div class="exportActions"><button class="secondaryButton" type="button" data-action="export-class">Export class CSV</button><button class="secondaryButton" type="button" data-action="print-grid">Print Grid assignment</button></div></div>${renderMotherGrid({ mode: 'teacher', selectedIds, heading: `${classData.name} Grid` })}<div class="gridDraftBar ${draftIsDirty() ? 'isDirty' : ''}"><p>${draftIsDirty() ? `${selectedIds.size} activit${selectedIds.size === 1 ? 'y' : 'ies'} chosen &middot; unsaved` : `${selectedIds.size} activit${selectedIds.size === 1 ? 'y' : 'ies'} in this class Grid`}</p><div class="formActions"><button class="primaryButton" type="button" data-action="save-class-grid" ${draftIsDirty() ? '' : 'disabled'}>Save class Grid</button><button class="secondaryButton" type="button" data-action="reset-class-grid" ${draftIsDirty() ? '' : 'disabled'}>Discard changes</button></div></div><article class="toolCard rosterPickerCard"><div class="cardHeading"><div><p class="eyebrow">Campers</p><h3>Choose who is in this class</h3><p class="helperText">Only MSI administrators create camper accounts. Pick from the accounts they have already provisioned. Removing someone exits them from the class and keeps their work.</p></div></div>${state.availableStudents.length ? `<div class="rosterPicker">${state.availableStudents.map((student) => { const chosen = rosterDraft()?.has(student.id); return `<button type="button" class="rosterChip ${chosen ? 'isSelected' : ''}" data-roster-student="${student.id}" aria-pressed="${String(Boolean(chosen))}"><strong>${escapeHtml(`${student.first_name} ${student.last_name}`)}</strong><small>${escapeHtml(student.username || '')}${student.grade ? ` &middot; grade ${escapeHtml(student.grade)}` : ''}</small></button>`; }).join('')}</div><div class="formActions"><button class="primaryButton" type="button" data-action="save-roster">Save roster</button></div>` : '<p class="emptyCopy">No camper accounts exist yet. An MSI administrator creates them from the standardized roster CSV.</p>'}</article><div class="workspaceGrid managerGrid"><article class="toolCard"><div class="cardHeading"><div><p class="eyebrow">Assignments</p><h3>Publish selected Grid activities</h3></div></div>${assignments}</article></div><article class="toolCard camperUpdateCard"><div class="cardHeading"><div><p class="eyebrow">Camper update</p><h3>Review work and recognize progress</h3></div></div><form id="camperUpdateForm" class="stackForm"><label class="fieldLabel">Camper<select name="enrollmentId" required>${rosterOptions(classData)}</select></label><div class="formThreeCols"><label class="fieldLabel">Assignment<select name="assignmentId">${progressOptions(classData, true)}</select></label><label class="fieldLabel">Status<select name="status"><option value="in_progress">In progress</option><option value="complete">Completed</option></select></label><label class="fieldLabel">Score %<input name="score" type="number" min="0" max="100" step="0.01"></label></div><div class="formThreeCols"><label class="fieldLabel">Belt category<input name="category" placeholder="Optional, e.g. Notebooking"></label><label class="fieldLabel">Belt<select name="belt">${beltOptions()}</select></label><label class="fieldLabel">Recognition note<input name="note" placeholder="Optional"></label></div><p class="helperText">Save an assignment update, a belt award, or both at once.</p><button class="primaryButton" type="submit">Save camper update</button></form></article><article class="toolCard rosterCard"><div class="cardHeading"><div><p class="eyebrow">Class roster</p><h3>${classData.roster.length} camper${classData.roster.length === 1 ? '' : 's'}</h3></div></div>${completionSummary(classData)}<div class="tableScroll"><table class="dataTable"><thead><tr><th>Camper</th><th>Completion</th><th>Belts</th></tr></thead><tbody>${roster}</tbody></table></div></article></section>`;
  }

  function adminClassOptions() { return state.adminClasses.map((entry) => `<option value="${entry.id}">${escapeHtml(`${entry.name} · ${entry.code}`)}</option>`).join(''); }
  function selectedPartner() { return state.partners.find((entry) => entry.id === state.selectedPartnerId) || null; }

  /* A partner's curriculum is staged the same way a class Grid is, for the same
     reason: choosing a whole column would otherwise be one request per belt, and the
     no-skipped-belts rule can only be judged on the finished selection. */
  function partnerGridDraft() {
    const partner = selectedPartner();
    if (!partner) return null;
    if (state.partnerGridDraft && state.partnerGridDraftFor === partner.id) return state.partnerGridDraft;
    state.partnerGridDraft = new Set(partner.cellIds || []);
    state.partnerGridDraftFor = partner.id;
    return state.partnerGridDraft;
  }
  function partnerDraftIsDirty() {
    const partner = selectedPartner(); const draft = partnerGridDraft();
    if (!partner || !draft) return false;
    const saved = new Set(partner.cellIds || []);
    return saved.size !== draft.size || [...draft].some((id) => !saved.has(id));
  }
  function applyPartnerDraftChange(mutate) {
    const draft = partnerGridDraft();
    if (!draft) throw new Error('Choose a partner first.');
    const previous = new Set(draft);
    mutate(draft);
    const gaps = skippedBelts(state.motherGrid.filter((cell) => draft.has(cell.id)));
    if (gaps.length) {
      state.partnerGridDraft = previous;
      throw new Error(`That would skip the ${gaps.join(' and ')} belt${gaps.length === 1 ? '' : 's'}. A curriculum has to be one unbroken run of belts.`);
    }
    renderAdminDashboard();
  }

  function partnerCard() {
    const partner = selectedPartner();
    const draft = partnerGridDraft();
    const picker = state.partners.length
      ? `<label class="fieldLabel compactField">Partner<select id="partnerPicker"><option value="">Choose a partner…</option>${state.partners.map((entry) => `<option value="${entry.id}" ${entry.id === state.selectedPartnerId ? 'selected' : ''}>${escapeHtml(entry.name)}${entry.is_published ? '' : ' (draft)'}</option>`).join('')}</select></label>`
      : '<p class="emptyCopy">No partner organizations yet. Add the first one below.</p>';

    const detail = partner ? `<div class="partnerAdminDetail">
        <p class="helperText">Public page: <a href="partner.html?org=${encodeURIComponent(partner.slug)}" target="_blank" rel="noopener noreferrer">partner.html?org=${escapeHtml(partner.slug)}</a>${partner.is_published ? '' : ' — not published yet, so the link shows nothing to the public.'}</p>
        <div class="formActions">
          <button class="secondaryButton" type="button" data-action="toggle-partner-published">${partner.is_published ? 'Unpublish' : 'Publish this page'}</button>
        </div>
        <div class="gridDraftBar ${partnerDraftIsDirty() ? 'isDirty' : ''}">
          <p>${partnerDraftIsDirty() ? `${draft.size} activit${draft.size === 1 ? 'y' : 'ies'} chosen · unsaved` : `${draft.size} activit${draft.size === 1 ? 'y' : 'ies'} in this curriculum`}</p>
          <div class="formActions">
            <button class="primaryButton" type="button" data-action="save-partner-grid" ${partnerDraftIsDirty() ? '' : 'disabled'}>Save curriculum</button>
            <button class="secondaryButton" type="button" data-action="reset-partner-grid" ${partnerDraftIsDirty() ? '' : 'disabled'}>Discard changes</button>
          </div>
        </div>
      </div>` : '';

    return `<article class="toolCard"><div class="cardHeading"><div><p class="eyebrow">Partner organizations</p><h3>Build a partner Grid curriculum</h3>
        <p class="helperText">A company that works with MSI gets its own public page built from real Mother Grid cells, so it stays in step with the Grid instead of being a copy that goes stale. Pick the partner, choose their activities, then publish.</p></div></div>
      ${picker}
      ${detail}
      ${partner ? renderMotherGrid({ mode: 'partner', selectedIds: draft, heading: `${partner.name} curriculum`, description: 'Click a category heading to take or release that whole column, or click single cells. Belts cannot be skipped.' }) : ''}
      <details class="partnerNewDetails" ${state.partners.length ? '' : 'open'}><summary>Add a partner organization</summary>
        <form id="partnerForm" class="stackForm">
          <div class="formTwoCols"><label class="fieldLabel">Company name<input name="name" required maxlength="140"></label><label class="fieldLabel">URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" placeholder="msi-makerspace"></label></div>
          <label class="fieldLabel">Focus <span class="muted">(one line)</span><input name="focus" maxlength="140" placeholder="e.g. Digital fabrication for middle schools"></label>
          <label class="fieldLabel">Summary<textarea name="summary" rows="3" maxlength="400" placeholder="A short paragraph for the top of their page."></textarea></label>
          <div class="formTwoCols"><label class="fieldLabel">Contact name<input name="contactName" maxlength="140"></label><label class="fieldLabel">Contact email<input name="contactEmail" type="email" maxlength="320"></label></div>
          <label class="fieldLabel">Website<input name="website" type="url" placeholder="https://…"></label>
          <button class="primaryButton" type="submit">Add partner</button>
        </form>
      </details></article>`;
  }

  async function createPartner(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const slug = String(form.get('slug') || '').trim().toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a slug of lowercase letters, numbers, and single hyphens.');
    const { data, error } = await app.getClient().from('partner_organizations').insert({
      slug,
      name: String(form.get('name') || '').trim(),
      focus: String(form.get('focus') || '').trim() || null,
      summary: String(form.get('summary') || '').trim() || null,
      contact_name: String(form.get('contactName') || '').trim() || null,
      contact_email: String(form.get('contactEmail') || '').trim() || null,
      website: String(form.get('website') || '').trim() || null,
      created_by: state.profile.id,
      updated_by: state.profile.id
    }).select('id').single();
    if (error) throw new Error(/duplicate key/i.test(error.message) ? `The slug "${slug}" is already taken.` : error.message);
    await app.audit('partner_created', 'partner_organization', data.id, { slug });
    state.selectedPartnerId = data.id;
    state.partnerGridDraft = null; state.partnerGridDraftFor = '';
    formElement.reset();
    await loadAdminDashboard(); renderAdminDashboard();
    notice('Partner added. Choose their activities, then publish the page.', 'isSuccess');
  }

  async function savePartnerGrid() {
    const partner = selectedPartner(); const draft = partnerGridDraft();
    if (!partner || !draft) throw new Error('Choose a partner first.');
    const { data, error } = await app.getClient().rpc('set_partner_grid_cells', { p_partner_id: partner.id, p_cell_ids: [...draft] });
    if (error) throw error;
    await app.audit('partner_curriculum_saved', 'partner_organization', partner.id, { cells: Number(data) || 0 });
    state.partnerGridDraft = null; state.partnerGridDraftFor = '';
    await loadAdminDashboard(); renderAdminDashboard();
    notice(`Curriculum saved with ${Number(data) || 0} activit${Number(data) === 1 ? 'y' : 'ies'}.`, 'isSuccess');
  }

  async function togglePartnerPublished() {
    const partner = selectedPartner();
    if (!partner) throw new Error('Choose a partner first.');
    const next = !partner.is_published;
    if (next && !(partner.cellIds || []).length) throw new Error('Choose at least one activity before publishing this page.');
    const { error } = await app.getClient().from('partner_organizations').update({ is_published: next, updated_by: state.profile.id }).eq('id', partner.id);
    if (error) throw error;
    await app.audit(next ? 'partner_published' : 'partner_unpublished', 'partner_organization', partner.id, { slug: partner.slug });
    await loadAdminDashboard(); renderAdminDashboard();
    notice(next ? `Published. Share partner.html?org=${partner.slug}` : 'Unpublished. The public link now shows nothing.', 'isSuccess');
  }

  function reportPanels() { const teacher = state.teacherCredentialRows.length ? `<article class="credentialsPanel"><div><p class="eyebrow">Provisioning report ready</p><h3>${state.teacherCredentialRows.length} teacher account${state.teacherCredentialRows.length === 1 ? '' : 's'} created</h3><p>Download it now. Temporary passwords are intentionally not stored in CampGrids.</p></div><button class="secondaryButton" type="button" data-action="download-teacher-report">Download teacher access report</button></article>` : ''; const student = state.studentCredentialRows.length ? `<article class="credentialsPanel"><div><p class="eyebrow">Camper report ready</p><h3>${state.studentCredentialRows.length} student account${state.studentCredentialRows.length === 1 ? '' : 's'} created</h3><p>Share each username with its class code. Campers do not use passwords.</p></div><button class="secondaryButton" type="button" data-action="download-student-report">Download student access report</button></article>` : ''; return teacher + student; }

  function renderAdminDashboard() {
    const cell = state.motherGrid.find((entry) => entry.id === state.editingMotherGridCellId); const roster = state.adminClasses.length ? `<article class="toolCard"><div class="cardHeading"><div><p class="eyebrow">Camper accounts</p><h3>Import a standardized roster</h3></div><a class="smallLink" href="data:text/csv;charset=utf-8,first_name,last_name,grade,guardian_name,guardian_email%0AFannie,Yu,5,," download="campgrids-student-roster-template.csv">CSV template</a></div><p class="helperText">Required columns: first_name, last_name, grade, guardian_name, guardian_email.</p><form id="adminRosterImportForm" class="stackForm"><label class="fieldLabel">Class<select name="classId" required>${adminClassOptions()}</select></label><label class="fileField"><input name="roster" type="file" accept=".csv,text/csv" required><span>Choose student CSV</span></label><button class="primaryButton" type="submit">Create student accounts</button></form></article>` : '<article class="toolCard"><p class="eyebrow">Camper accounts</p><h3>Import a standardized roster</h3><p class="emptyCopy">A teacher must create a class before campers can be imported.</p></article>';
    workspace.innerHTML = `${actionsHeader('MSI administration', 'Administration workspace', 'Manage the Mother Grid, provision staff and campers from CSV, and maintain the live site.')}${reportPanels()}<section class="adminSection"><div class="sectionHeading"><div><p class="eyebrow">Mother Grid</p><h2>The overall Grid</h2><p>Only MSI administrators can change the source Grid. Teacher class selections always use these published cells.</p></div></div>${renderMotherGrid({ mode: 'admin', heading: 'Mother Grid editor' })}<div class="workspaceGrid adminGrid adminGridTwo"><article class="toolCard"><p class="eyebrow">Mother Grid</p><h3>Import a Mother Grid</h3><p class="helperText">Upload the whole Grid as one standardized sheet. Row 1 names a category per column, column A names the belt at the start of each belt band, and each cell reads <code>Project name: Instructions | https://...</code> (<code>Video</code> works too, and the URL half is optional). <a href="assets/mother-grid-template.csv" download>Download the template</a> exported from Fab Lab Camp Grids.xlsx.</p><form id="motherGridImportForm" class="stackForm"><label class="fieldLabel">Mother Grid sheet (.csv)<input name="grid" type="file" accept=".csv,text/csv" required></label><p class="helperText">A cell keeps its identity across imports, so re-importing an edited sheet updates activities in place and leaves every teacher's class selection intact. Intersections missing from the sheet are withdrawn from teachers rather than deleted.</p><div class="formActions"><button class="primaryButton" type="submit">Import Mother Grid</button></div></form>${cell ? `<p class="helperText"><strong>${escapeHtml(`${cell.belt_code} C${cell.column_number}`)}</strong> &middot; ${escapeHtml(cell.category || 'Grid activity')}${cell.projects?.length ? ` &middot; ${cell.projects.length} activit${cell.projects.length === 1 ? 'y' : 'ies'}` : ''}<br><button class="quietButton" type="button" data-action="clear-grid-cell">Clear selection</button></p>` : ''}</article><article class="toolCard"><div class="cardHeading"><div><p class="eyebrow">Teacher accounts</p><h3>Import teachers from CSV</h3></div><a class="smallLink" href="data:text/csv;charset=utf-8,first_name,last_name,email,title%0AFannie,Yu,fannie.yu@example.org,Camp%20Instructor" download="campgrids-teacher-template.csv">CSV template</a></div><p class="helperText">Required columns: first_name, last_name, email. Optional: title. CampGrids generates usernames and temporary passwords in the report.</p><form id="teacherCsvImportForm" class="stackForm"><label class="fileField"><input name="teacherCsv" type="file" accept=".csv,text/csv" required><span>Choose teacher CSV</span></label><button class="primaryButton" type="submit">Create teacher accounts and report</button></form></article>${roster}</div></section><section class="adminSection"><div class="sectionHeading"><div><p class="eyebrow">Live site controls</p><h2>Published content</h2><p>These controls are administrator-only and save directly to Supabase.</p></div></div><div class="workspaceGrid adminGrid">${partnerCard()}<article class="toolCard"><p class="eyebrow">Navigation</p><h3>Add a live menu link</h3><p class="helperText">Adds a published partner page to the site navigation.</p><form id="navForm" class="stackForm"><label class="fieldLabel">Link label<input name="label" required></label><label class="fieldLabel">Partner page<select name="slug" required><option value="">Choose a partner page…</option>${state.partners.map((entry) => `<option value="${escapeHtml(entry.slug)}">${escapeHtml(entry.name)}${entry.is_published ? '' : ' (draft)'}</option>`).join('')}</select></label><div class="formTwoCols"><label class="fieldLabel">Position<input name="position" type="number" min="0" required></label><label class="fieldLabel">Location<select name="location"><option value="primary">Primary navigation</option><option value="footer">Footer</option><option value="teacher">Teacher workspace</option></select></label></div><button class="primaryButton" type="submit">Publish link</button></form></article><article class="toolCard"><p class="eyebrow">Live dropdowns</p><h3>Update option lists</h3><form id="dropdownForm" class="stackForm"><label class="fieldLabel">Dropdown key<input name="groupKey" required pattern="[a-z0-9_-]+" placeholder="e.g. camp-selector"></label><div class="formTwoCols"><label class="fieldLabel">Stored value<input name="value" required></label><label class="fieldLabel">Visible label<input name="label" required></label></div><label class="fieldLabel">Position<input name="position" type="number" min="0" required></label><button class="primaryButton" type="submit">Save dropdown option</button></form></article></div></section>`;
    bindAdminEvents(); window.CampGridsLiveContent?.refresh();
  }

  function csvLine(values) { return values.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','); }
  function downloadCsv(filename, headings, rows) { const content = [csvLine(headings), ...rows.map(csvLine)].join('\r\n'); const href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = href; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(href), 500); }
  function exportClass(classData) { const rows = classData.roster.map((entry) => { const progress = classData.progress.filter((item) => item.enrollment_id === entry.id); const awards = classData.awards.filter((item) => item.enrollment_id === entry.id); return [`${entry.profiles.first_name} ${entry.profiles.last_name}`, entry.profiles.username, classData.assignments.length ? `${Math.round(progress.filter((item) => item.status === 'complete').length / classData.assignments.length * 100)}%` : '0%', awards.map((award) => `${award.category}: ${award.belt}`).join('; ')]; }); downloadCsv(`${classData.code}-progress.csv`, ['Camper', 'Username', 'Completion', 'Belts'], rows); }
  function printGridAssignment(classData, activity) { const item = activity || classData.gridCells[0]?.mother_grid_cells; if (!item) return notice('Select a Mother Grid activity before printing.', 'isError'); printWorkspace.innerHTML = `<article class="printDocument"><div class="printBrand"><span>MSI Camps</span><strong>CampGrids</strong></div><p class="eyebrow">Printable Grid assignment</p><h1>${escapeHtml(item.title)}</h1><dl><div><dt>Class</dt><dd>${escapeHtml(classData.name)}</dd></div><div><dt>Grid path</dt><dd>${escapeHtml(`${item.category || 'Grid'} · ${item.belt_code || ''} Belt`)}</dd></div><div><dt>Class code</dt><dd>${escapeHtml(classData.code)}</dd></div></dl><section><h2>Instructions</h2><p>${escapeHtml(item.instructions || 'Open the Grid activity, follow each step, and use this space to document your process, choices, and what you learned.')}</p></section><section class="printLines"><h2>My notes</h2><div></div><div></div><div></div><div></div></section><p class="printUrl">Resource: ${escapeHtml(item.resource_url || '')}</p></article>`; window.print(); }

  function csvRows(text) { const rows = []; let row = []; let value = ''; let quoted = false; for (let index = 0; index < text.length; index += 1) { const char = text[index]; if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; } else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[index + 1] === '\n') index += 1; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ''; } else value += char; } row.push(value.trim()); if (row.some(Boolean)) rows.push(row); if (rows.length < 2) throw new Error('The CSV needs a header row and at least one person.'); return rows; }
  function parsePeopleCsv(text, required, optional = []) { const rows = csvRows(text); const headers = rows.shift().map((header) => header.toLowerCase().replace(/[^a-z]/g, '')); const missing = required.filter((header) => !headers.includes(header)); if (missing.length) throw new Error(`Use the CSV template. Missing required column(s): ${missing.join(', ')}.`); const get = (row, key) => { const index = headers.indexOf(key); return index >= 0 ? String(row[index] || '').trim() : ''; }; return rows.map((row) => { const person = {}; [...required, ...optional].forEach((key) => { person[key] = get(row, key); }); return person; }).filter((person) => Object.values(person).some(Boolean)); }
  function parseStudentCsv(text) { return parsePeopleCsv(text, ['firstname', 'lastname', 'grade', 'guardianname', 'guardianemail']).map((row) => ({ firstName: row.firstname, lastName: row.lastname, grade: row.grade, guardianName: row.guardianname, guardianEmail: row.guardianemail })); }
  function parseTeacherCsv(text) { return parsePeopleCsv(text, ['firstname', 'lastname', 'email'], ['title']).map((row) => ({ firstName: row.firstname, lastName: row.lastname, email: row.email, title: row.title })); }

  async function createClass(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const { data: rows, error } = await app.getClient().rpc('create_class', { p_name: String(form.get('name')).trim(), p_starts_on: form.get('startsOn') || null, p_ends_on: form.get('endsOn') || null, p_notes: form.get('notes') || null }); if (error) throw error; const item = rows?.[0]; if (!item) throw new Error('The class was not created. Please try again.'); await app.audit('class_created', 'class', item.id, { name: item.name, code: item.code }); state.selectedClassId = item.id; await loadTeacherClasses(); renderTeacher(); notice(`Class created. Its unique code is ${item.code}.`, 'isSuccess'); }
  /* The class Grid is edited as a staged set rather than written cell by cell.
     Two reasons: a teacher picking a whole column would otherwise fire one request
     per belt, and the "no skipped belts" rule can only be judged once the whole
     selection is known. Building any multi-belt selection passes through states that
     are momentarily invalid. */
  function gridDraft() {
    const classData = selectedClass();
    if (!classData) return null;
    if (state.classGridDraft && state.classGridDraftFor === classData.id) return state.classGridDraft;
    state.classGridDraft = new Set(classData.gridCells.map((entry) => entry.mother_grid_cell_id));
    state.classGridDraftFor = classData.id;
    return state.classGridDraft;
  }
  function draftCells(draft) { return state.motherGrid.filter((cell) => draft.has(cell.id)); }
  function draftIsDirty() {
    const classData = selectedClass(); const draft = gridDraft();
    if (!classData || !draft) return false;
    const saved = new Set(classData.gridCells.map((entry) => entry.mother_grid_cell_id));
    return saved.size !== draft.size || [...draft].some((id) => !saved.has(id));
  }
  /* Applies a change only if the result is still an unbroken run of belts, so the
     rule is enforced at the moment of the click and the teacher is told which belt
     is missing rather than being left with a selection the save would reject. */
  function applyDraftChange(mutate) {
    const draft = gridDraft();
    if (!draft) throw new Error('Choose a class first.');
    const previous = new Set(draft);
    mutate(draft);
    const gaps = skippedBelts(draftCells(draft));
    if (gaps.length) {
      state.classGridDraft = previous;
      throw new Error(`That would skip the ${gaps.join(' and ')} belt${gaps.length === 1 ? '' : 's'}. A class Grid has to be one unbroken run of belts.`);
    }
    renderTeacher();
  }
  function toggleGridCellDraft(cellId) { applyDraftChange((draft) => { if (draft.has(cellId)) draft.delete(cellId); else draft.add(cellId); }); }
  /* A category heading takes the whole column, or releases it when every populated
     belt in that column is already taken. */
  function toggleGridColumnDraft(columnNumber) {
    const column = state.motherGrid.filter((cell) => Number(cell.column_number) === Number(columnNumber));
    if (!column.length) return;
    applyDraftChange((draft) => {
      const holdsAll = column.every((cell) => draft.has(cell.id));
      column.forEach((cell) => { if (holdsAll) draft.delete(cell.id); else draft.add(cell.id); });
    });
  }
  function resetGridDraft() { state.classGridDraft = null; state.classGridDraftFor = ''; renderTeacher(); }
  async function saveClassGrid() {
    const classData = selectedClass(); const draft = gridDraft();
    if (!classData || !draft) throw new Error('Choose a class first.');
    const gaps = skippedBelts(draftCells(draft));
    if (gaps.length) throw new Error(`Remove the gap first: the ${gaps.join(' and ')} belt${gaps.length === 1 ? ' is' : 's are'} skipped.`);
    const { data, error } = await app.getClient().rpc('set_class_grid_cells', { p_class_id: classData.id, p_cell_ids: [...draft] });
    if (error) throw error;
    await app.audit('class_grid_saved', 'class', classData.id, { cells: Number(data) || 0 });
    state.classGridDraft = null; state.classGridDraftFor = '';
    await loadTeacherClasses(); renderTeacher();
    notice(`Class Grid saved with ${Number(data) || 0} activit${Number(data) === 1 ? 'y' : 'ies'}. Campers see it now.`, 'isSuccess');
  }

  /* Accounts are created only by administrators. This picker just enrolls students
     who already exist into a class the signed-in teacher runs. */
  async function loadAvailableStudents() {
    const { data, error } = await app.getClient().rpc('available_students');
    if (error) throw error;
    state.availableStudents = data || [];
  }
  function rosterDraft() {
    const classData = selectedClass();
    if (!classData) return null;
    if (state.rosterDraft && state.rosterDraft.classId === classData.id) return state.rosterDraft.ids;
    state.rosterDraft = { classId: classData.id, ids: new Set(classData.roster.filter((entry) => !entry.exited_at).map((entry) => entry.student_id)) };
    return state.rosterDraft.ids;
  }
  function toggleRosterDraft(studentId) { const ids = rosterDraft(); if (!ids) return; if (ids.has(studentId)) ids.delete(studentId); else ids.add(studentId); renderTeacher(); }
  async function saveClassRoster() {
    const classData = selectedClass(); const ids = rosterDraft();
    if (!classData || !ids) throw new Error('Choose a class first.');
    const { data, error } = await app.getClient().rpc('set_class_roster', { p_class_id: classData.id, p_student_ids: [...ids] });
    if (error) throw error;
    await app.audit('class_roster_saved', 'class', classData.id, { students: ids.size });
    state.rosterDraft = null;
    await loadTeacherClasses(); renderTeacher();
    notice(`Roster saved. ${ids.size} camper${ids.size === 1 ? '' : 's'} enrolled.`, 'isSuccess');
  }
  async function createAssignment(event) { event.preventDefault(); const classData = selectedClass(); const form = new FormData(event.currentTarget); const cellId = String(form.get('gridCellId') || ''); const cell = classData?.gridCells.find((entry) => entry.mother_grid_cell_id === cellId)?.mother_grid_cells; if (!classData || !cell) throw new Error('Choose an activity from this class Grid.'); const { data, error } = await app.getClient().from('class_assignments').insert({ class_id: classData.id, title: cell.title, category: cell.category, belt: cell.belt_code, resource_url: cell.resource_url, instructions: String(form.get('instructions') || '') || cell.instructions || null, due_at: form.get('dueAt') || null, published_at: new Date().toISOString(), created_by: state.profile.id }).select().single(); if (error) throw error; await app.audit('assignment_published', 'class_assignment', data.id, { class_id: classData.id, mother_grid_cell_id: cell.id, title: cell.title }); await loadTeacherClasses(); renderTeacher(); notice('Assignment published to your class.', 'isSuccess'); }
  async function saveCamperUpdate(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const enrollmentId = String(form.get('enrollmentId') || ''); const assignmentId = String(form.get('assignmentId') || ''); const category = String(form.get('category') || '').trim(); const status = String(form.get('status') || 'in_progress'); const score = String(form.get('score') || '').trim(); if (!assignmentId && !category) throw new Error('Choose an assignment update, enter a belt category, or do both.'); if (assignmentId) { const payload = { assignment_id: assignmentId, enrollment_id: enrollmentId, status, score: score ? Number(score) : null, submitted_at: status === 'complete' ? new Date().toISOString() : null, reviewed_at: new Date().toISOString(), reviewed_by: state.profile.id }; const { error } = await app.getClient().from('student_assignment_progress').upsert(payload, { onConflict: 'assignment_id,enrollment_id' }); if (error) throw error; await app.audit('assignment_reviewed', 'class_assignment', assignmentId, { enrollment_id: enrollmentId, status, score: payload.score }); } if (category) { const { data, error } = await app.getClient().from('belt_awards').insert({ enrollment_id: enrollmentId, category, belt: form.get('belt'), note: form.get('note') || null, awarded_by: state.profile.id }).select().single(); if (error) throw error; await app.audit('belt_awarded', 'belt_award', data.id, { enrollment_id: data.enrollment_id, category: data.category, belt: data.belt }); } await loadTeacherClasses(); renderTeacher(); notice(assignmentId && category ? 'Progress saved and belt awarded.' : assignmentId ? 'Progress saved.' : 'Belt awarded and added to the student timeline.', 'isSuccess'); }
  async function importStudentRoster(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get('roster'); const classId = String(form.get('classId') || ''); if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose the student CSV template.'); if (!classId) throw new Error('Choose the class for this roster.'); const students = parseStudentCsv(await file.text()); notice(`Creating ${students.length} student account${students.length === 1 ? '' : 's'}...`); const { data, error } = await app.getClient().functions.invoke('provision-students', { body: { classId, filename: file.name, students } }); if (error) throw error; if (data?.error) throw new Error(data.error); state.studentCredentialRows = data.students || []; await loadAdminDashboard(); renderAdminDashboard(); notice(`${data.students?.length || 0} student account(s) created${data.errors?.length ? `; ${data.errors.length} row(s) need attention` : ''}.`, data.errors?.length ? 'isWarning' : 'isSuccess'); }
  async function importTeacherCsv(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get('teacherCsv'); if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose the teacher CSV template.'); const teachers = parseTeacherCsv(await file.text()); notice(`Creating ${teachers.length} teacher account${teachers.length === 1 ? '' : 's'}...`); const { data, error } = await app.getClient().functions.invoke('provision-teachers', { body: { filename: file.name, teachers, siteOrigin: window.location.origin } }); if (error) throw error; if (data?.error) throw new Error(data.error); state.teacherCredentialRows = data.teachers || []; renderAdminDashboard(); notice(`${data.teachers?.length || 0} teacher account(s) created and emailed a set-password link${data.errors?.length ? `; ${data.errors.length} row(s) need attention` : ''}. No passwords were issued.`, data.errors?.length ? 'isWarning' : 'isSuccess'); }
  /* Belt names as they are written in column A of the workbook. */
  const beltCodesByName = { white: 'WT', yellow: 'YW', orange: 'OR', green: 'GN', blue: 'BU', purple: 'PL', brown: 'BN', black: 'BK' };

  /* Splits the sheet into rows using the same quoting rules as the roster CSV reader,
     but keeps blank cells. In a grid a column position carries meaning, so a row
     cannot be compacted the way a list of people can. */
  function gridCsvRows(text) {
    const rows = []; let row = []; let value = ''; let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { row.push(value); value = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[index + 1] === '\n') index += 1; row.push(value); rows.push(row); row = []; value = ''; }
      else value += char;
    }
    row.push(value); rows.push(row);
    return rows.filter((entry) => entry.some((cell) => cell.trim()));
  }

  /* Reads one grid cell, for example "Fold-Up Pup: Instructions | https://...".
     The workbook is inconsistent about the suffix, using both "Video" and "Videos"
     and in one place "Whale :Videos" with the space before the colon, and many cells
     are a bare project name with no suffix at all. So the suffix match is loose and
     optional, and a cell with no URL is still a usable activity. */
  function parseGridEntry(raw) {
    const parts = String(raw).split('|');
    const url = parts.slice(1).join('|').trim();
    const text = parts[0].trim();
    if (!text) return null;
    const match = text.match(/^(.*?)\s*:\s*(instructions?|videos?)$/i);
    const name = (match ? match[1] : text).trim();
    if (!name) return null;
    return { name, kind: match ? (/^instruction/i.test(match[2]) ? 'instructions' : 'video') : 'activity', url };
  }

  /* Turns the standardized sheet into one payload row per belt/category intersection.
     Several sheet rows collapse into a single cell: the workbook stacks a project's
     instructions and video on consecutive lines, and both belong to the same project
     inside the same square. */
  function parseMotherGridCsv(text) {
    const rows = gridCsvRows(text);
    if (rows.length < 2) throw new Error('The sheet needs a category header row and at least one belt row.');
    const categories = rows.shift().slice(1).map((name) => name.trim());
    if (!categories.some(Boolean)) throw new Error('Row 1 must name a category in each column, starting at column B.');
    if (categories.filter(Boolean).length > 24) throw new Error(`The Grid supports up to 24 category columns; this sheet has ${categories.filter(Boolean).length}.`);

    const cells = new Map(); const unknownBelts = new Set(); let belt = '';
    rows.forEach((row) => {
      const label = (row[0] || '').trim();
      if (label) { const code = beltCodesByName[label.toLowerCase()]; if (code) belt = code; else unknownBelts.add(label); }
      if (!belt) return;
      categories.forEach((category, index) => {
        if (!category) return;
        const entry = parseGridEntry(row[index + 1] || '');
        if (!entry) return;
        const key = `${belt}-${index + 1}`;
        if (!cells.has(key)) cells.set(key, { belt_code: belt, column_number: index + 1, category, projects: new Map() });
        const cell = cells.get(key);
        if (!cell.projects.has(entry.name)) cell.projects.set(entry.name, { name: entry.name, instructions_url: '', video_url: '' });
        const project = cell.projects.get(entry.name);
        if (entry.kind === 'video') project.video_url = project.video_url || entry.url;
        else project.instructions_url = project.instructions_url || entry.url;
      });
    });
    if (!cells.size) throw new Error('No activities were found. Check that column A names each belt.');
    if (unknownBelts.size) throw new Error(`Column A has unrecognised belt name(s): ${[...unknownBelts].join(', ')}. Use White, Yellow, Orange, Green, Blue, Purple, Brown, or Black.`);

    const payload = [...cells.values()].map((cell) => {
      const projects = [...cell.projects.values()];
      const first = projects[0];
      return { belt_code: cell.belt_code, column_number: cell.column_number, category: cell.category, title: projects.length === 1 ? first.name.slice(0, 180) : `${cell.category} (${projects.length} activities)`.slice(0, 180), instructions: null, resource_url: first.instructions_url || first.video_url || null, projects };
    });
    return { cells: payload, categories: categories.filter(Boolean) };
  }

  async function importMotherGrid(event) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('grid');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose the standardized Mother Grid .csv sheet.');
    const { cells, categories } = parseMotherGridCsv(await file.text());
    notice(`Importing ${cells.length} Grid cells across ${categories.length} categories...`);
    const { data, error } = await app.getClient().rpc('import_mother_grid', { p_cells: cells });
    if (error) throw error;
    const summary = Array.isArray(data) ? data[0] : data;
    await app.audit('mother_grid_imported', 'mother_grid_cell', null, { filename: file.name, cells: cells.length, categories: categories.length });
    state.editingMotherGridCellId = '';
    await loadAdminDashboard(); renderAdminDashboard();
    notice(`Mother Grid imported: ${summary?.inserted || 0} added, ${summary?.updated || 0} updated, ${summary?.deactivated || 0} withdrawn.`, 'isSuccess');
  }
  /* Links a published partner page into the live navigation. page_id stays null:
   the target is a partner page rather than a content_pages row, and href carries
   the full address so site.js needs no special case. */
  async function createNavigation(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const slug = String(form.get('slug') || '').trim();
    const partner = state.partners.find((entry) => entry.slug === slug);
    if (!partner) throw new Error('Choose a partner page to link.');
    if (!partner.is_published) throw new Error(`Publish the ${partner.name} page before linking it in navigation.`);
    const { error } = await app.getClient().from('navigation_items').insert({
      label: String(form.get('label') || '').trim(),
      href: `partner.html?org=${encodeURIComponent(slug)}`,
      location: form.get('location'),
      position: Number(form.get('position')),
      is_visible: true,
      created_by: state.profile.id
    });
    if (error) throw error;
    await app.audit('navigation_item_created', 'navigation_item', null, { label: form.get('label'), slug });
    await window.CampGridsLiveContent?.refresh();
    notice('Live menu link published.', 'isSuccess');
  }
  async function createDropdownOption(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const groupKey = String(form.get('groupKey')).trim(); const value = String(form.get('value')).trim(); const { error } = await app.getClient().from('dropdown_options').upsert({ group_key: groupKey, value, label: String(form.get('label')).trim(), position: Number(form.get('position')), is_active: true, updated_by: state.profile.id }, { onConflict: 'group_key,value' }); if (error) throw error; await app.audit('dropdown_option_saved', 'dropdown_option', null, { groupKey, value }); await window.CampGridsLiveContent?.refresh(); notice('Dropdown option saved live.', 'isSuccess'); }

  function bindZoomControls() { document.querySelectorAll('[data-grid-zoom-control]').forEach((control) => control.addEventListener('input', (event) => { state.gridZoom = Number(event.currentTarget.value); document.querySelectorAll('[data-mother-grid-canvas]').forEach((canvas) => canvas.style.setProperty('--grid-scale', String(state.gridZoom))); })); }
  function bindTeacherEvents() { document.getElementById('classPicker')?.addEventListener('change', (event) => { state.selectedClassId = event.target.value; state.classGridDraft = null; state.classGridDraftFor = ''; state.rosterDraft = null; renderTeacher(); }); document.getElementById('createClassForm')?.addEventListener('submit', (event) => run(createClass, event)); document.getElementById('assignmentForm')?.addEventListener('submit', (event) => run(createAssignment, event)); document.getElementById('camperUpdateForm')?.addEventListener('submit', (event) => run(saveCamperUpdate, event)); document.querySelectorAll('[data-class-grid-cell]').forEach((button) => button.addEventListener('click', () => run(() => toggleGridCellDraft(button.dataset.classGridCell), null))); document.querySelectorAll('[data-grid-column-select]').forEach((button) => button.addEventListener('click', () => run(() => toggleGridColumnDraft(button.dataset.gridColumnSelect), null))); document.querySelector('[data-action="save-class-grid"]')?.addEventListener('click', () => run(saveClassGrid, null)); document.querySelector('[data-action="reset-class-grid"]')?.addEventListener('click', () => run(resetGridDraft, null)); document.querySelectorAll('[data-roster-student]').forEach((button) => button.addEventListener('click', () => run(() => toggleRosterDraft(button.dataset.rosterStudent), null))); document.querySelector('[data-action="save-roster"]')?.addEventListener('click', () => run(saveClassRoster, null)); document.querySelector('[data-action="sign-out"]')?.addEventListener('click', signOut); document.querySelector('[data-action="export-class"]')?.addEventListener('click', () => exportClass(selectedClass())); document.querySelector('[data-action="print-grid"]')?.addEventListener('click', () => printGridAssignment(selectedClass())); document.querySelector('[data-action="print-selected-grid"]')?.addEventListener('click', () => { const cellId = document.querySelector('#assignmentForm [name="gridCellId"]')?.value; printGridAssignment(selectedClass(), selectedClass()?.gridCells.find((entry) => entry.mother_grid_cell_id === cellId)?.mother_grid_cells); }); document.querySelector('[data-copy-code]')?.addEventListener('click', async (event) => { await navigator.clipboard.writeText(event.currentTarget.dataset.copyCode); notice('Class code copied.', 'isSuccess'); }); bindZoomControls(); }
  function bindAdminEvents() { document.getElementById('adminRosterImportForm')?.addEventListener('submit', (event) => run(importStudentRoster, event)); document.getElementById('teacherCsvImportForm')?.addEventListener('submit', (event) => run(importTeacherCsv, event)); document.getElementById('motherGridImportForm')?.addEventListener('submit', (event) => run(importMotherGrid, event)); document.getElementById('partnerForm')?.addEventListener('submit', (event) => run(createPartner, event));
    document.getElementById('partnerPicker')?.addEventListener('change', (event) => { state.selectedPartnerId = event.target.value; state.partnerGridDraft = null; state.partnerGridDraftFor = ''; renderAdminDashboard(); });
    document.querySelector('[data-action="save-partner-grid"]')?.addEventListener('click', () => run(savePartnerGrid, null));
    document.querySelector('[data-action="reset-partner-grid"]')?.addEventListener('click', () => run(() => { state.partnerGridDraft = null; state.partnerGridDraftFor = ''; renderAdminDashboard(); }, null));
    document.querySelector('[data-action="toggle-partner-published"]')?.addEventListener('click', () => run(togglePartnerPublished, null));
    document.querySelectorAll('[data-class-grid-cell]').forEach((button) => button.addEventListener('click', () => run(() => applyPartnerDraftChange((draft) => { const id = button.dataset.classGridCell; if (draft.has(id)) draft.delete(id); else draft.add(id); }), null)));
    document.querySelectorAll('[data-grid-column-select]').forEach((button) => button.addEventListener('click', () => run(() => { const column = state.motherGrid.filter((cell) => Number(cell.column_number) === Number(button.dataset.gridColumnSelect)); if (!column.length) return; applyPartnerDraftChange((draft) => { const holdsAll = column.every((cell) => draft.has(cell.id)); column.forEach((cell) => { if (holdsAll) draft.delete(cell.id); else draft.add(cell.id); }); }); }, null))); document.getElementById('navForm')?.addEventListener('submit', (event) => run(createNavigation, event)); document.getElementById('dropdownForm')?.addEventListener('submit', (event) => run(createDropdownOption, event)); document.querySelectorAll('[data-mother-grid-cell]').forEach((button) => button.addEventListener('click', () => { state.editingMotherGridCellId = button.dataset.motherGridCell || ''; renderAdminDashboard(); })); document.querySelector('[data-action="clear-grid-cell"]')?.addEventListener('click', () => { state.editingMotherGridCellId = ''; renderAdminDashboard(); }); document.querySelector('[data-action="download-teacher-report"]')?.addEventListener('click', () => downloadCsv(`campgrids-teacher-access-${new Date().toISOString().slice(0, 10)}.csv`, ['First name', 'Last name', 'Work email', 'Username', 'Title', 'Set-password link emailed'], state.teacherCredentialRows.map((row) => [row.firstName, row.lastName, row.email, row.username, row.title, row.invited ? 'yes' : 'no']))); document.querySelector('[data-action="download-student-report"]')?.addEventListener('click', () => downloadCsv(`campgrids-student-access-${new Date().toISOString().slice(0, 10)}.csv`, ['First name', 'Last name', 'Username', 'Grade'], state.studentCredentialRows.map((row) => [row.firstName, row.lastName, row.username, row.grade]))); document.querySelector('[data-action="sign-out"]')?.addEventListener('click', signOut); bindZoomControls(); }

  async function renderStudent() {
    const client = app.getClient(); const [enrollmentsResult, assignmentsResult, progressResult, awardsResult, eventsResult] = await Promise.all([client.from('class_enrollments').select('id, class_id, classes(name, code, status)').eq('student_id', state.profile.id).is('exited_at', null), client.from('class_assignments').select('id, class_id, title, instructions, category, belt, resource_url, due_at, published_at').not('published_at', 'is', null).order('created_at', { ascending: false }), client.from('student_assignment_progress').select('id, assignment_id, enrollment_id, status, score, submitted_at, feedback, class_assignments(class_id, title)').order('updated_at', { ascending: false }), client.from('belt_awards').select('id, belt, category, awarded_at, note, class_enrollments(class_id)').order('awarded_at', { ascending: false }), client.from('student_activity_events').select('id, event_type, metadata, occurred_at, class_id').order('occurred_at', { ascending: false }).limit(12)]);
    [enrollmentsResult, assignmentsResult, progressResult, awardsResult, eventsResult].forEach((result) => { if (result.error) throw result.error; }); const enrollments = enrollmentsResult.data || []; const ids = new Set(enrollments.map((entry) => entry.class_id)); let activeClassId = window.localStorage.getItem('campgrids-active-class'); if (!ids.has(activeClassId)) activeClassId = enrollments[0]?.class_id || ''; if (activeClassId) window.localStorage.setItem('campgrids-active-class', activeClassId);
    const { data: selectionRows, error: selectionError } = activeClassId ? await client.from('class_grid_cells').select('class_id, mother_grid_cell_id, mother_grid_cells(id, belt_code, column_number, title, category, instructions, resource_url, projects)').eq('class_id', activeClassId) : { data: [], error: null }; if (selectionError) throw selectionError; const gridCells = (selectionRows || []).map((entry) => entry.mother_grid_cells).filter(Boolean); const selectedIds = new Set(gridCells.map((cell) => cell.id)); const enrollment = enrollments.find((entry) => entry.class_id === activeClassId); const progress = (progressResult.data || []).filter((entry) => entry.enrollment_id === enrollment?.id); const awards = (awardsResult.data || []).filter((entry) => entry.class_enrollments?.class_id === activeClassId); const events = (eventsResult.data || []).filter((entry) => !entry.class_id || entry.class_id === activeClassId); const assignments = (assignmentsResult.data || []).filter((entry) => entry.class_id === activeClassId);
    const assignmentRows = assignments.length ? assignments.map((assignment) => { const record = progress.find((entry) => entry.assignment_id === assignment.id); const done = record?.status === 'complete'; return `<article class="studentAssignment"><div><p class="eyebrow">${escapeHtml(`${assignment.category || 'Grid'} · ${assignment.belt || 'Activity'} Belt`)}</p><h3>${escapeHtml(assignment.title)}</h3><p>${escapeHtml(assignment.instructions || 'Open the resource and complete the activity.')}</p><small>Due ${dateValue(assignment.due_at)}</small></div><div class="assignmentActions"><span class="statusPill ${done ? 'complete' : 'in_progress'}">${done ? 'Completed' : 'In progress'}</span>${assignment.resource_url ? `<a class="secondaryButton" target="_blank" rel="noopener noreferrer" href="${escapeHtml(assignment.resource_url)}" data-student-resource="${assignment.id}">Open activity</a>` : ''}${done ? '<span class="completionAction">Completed</span>' : `<button class="primaryButton" type="button" data-student-progress="${assignment.id}">Mark completed</button>`}</div></article>`; }).join('') : '<p class="emptyCopy">There are no published assignments in this class yet.</p>';
    workspace.innerHTML = `${actionsHeader('Student dashboard', `Hi, ${state.profile.first_name}.`, 'Your class Grid, earned belts, and activity timeline are all in one place.')}<section class="studentClassBar"><label class="fieldLabel">My class<select id="studentClassPicker">${enrollments.map((entry) => `<option value="${entry.class_id}" ${entry.class_id === activeClassId ? 'selected' : ''}>${escapeHtml(`${entry.classes.name} · ${entry.classes.code}`)}</option>`).join('')}</select></label><a class="secondaryButton" href="campgrids.html">Explore the Grid</a></section>${renderMotherGrid({ mode: 'student', cells: gridCells, selectedIds, heading: enrollment?.classes?.name || 'My class' })}<section class="studentLayout"><div><div class="sectionHeading"><div><p class="eyebrow">My assignments</p><h2>What to work on</h2></div></div>${assignmentRows}</div><aside class="studentTimeline"><p class="eyebrow">Profile timeline</p><h2>Recent activity</h2>${events.length ? `<ol>${events.map((entry) => `<li><span>${escapeHtml(entry.event_type.replaceAll('_', ' '))}</span><small>${dateValue(entry.occurred_at)}${entry.metadata?.title ? ` · ${escapeHtml(entry.metadata.title)}` : ''}</small></li>`).join('')}</ol>` : '<p class="emptyCopy">Your Grid activity will appear here as you work.</p>'}<div class="studentBelts"><p class="eyebrow">My belts</p>${awards.length ? awards.map((award) => `<span class="beltPill belt${escapeHtml(award.belt)}">${escapeHtml(`${award.category} · ${award.belt}`)}</span>`).join('') : '<p class="emptyCopy">No belts awarded yet.</p>'}</div></aside></section>`;
    document.getElementById('studentClassPicker')?.addEventListener('change', (event) => { window.localStorage.setItem('campgrids-active-class', event.target.value); renderStudent().catch(handleError); }); document.querySelector('[data-action="sign-out"]')?.addEventListener('click', signOut); document.querySelectorAll('[data-student-resource]').forEach((link) => link.addEventListener('click', () => app.logStudentEvent('resource_opened', { source: 'student_dashboard', assignment_id: link.dataset.studentResource }, activeClassId, link.dataset.studentResource))); document.querySelectorAll('[data-student-progress]').forEach((button) => button.addEventListener('click', () => run(() => updateStudentProgress(button.dataset.studentProgress, enrollment.id, activeClassId), null))); bindZoomControls();
  }
  async function updateStudentProgress(assignmentId, enrollmentId, classId) { const { error } = await app.getClient().from('student_assignment_progress').upsert({ assignment_id: assignmentId, enrollment_id: enrollmentId, status: 'complete', submitted_at: new Date().toISOString() }, { onConflict: 'assignment_id,enrollment_id' }); if (error) throw error; await app.logStudentEvent('assignment_completed', { status: 'complete' }, classId, assignmentId); await renderStudent(); notice('Marked completed.', 'isSuccess'); }
  async function signOut() { await app.getClient().auth.signOut(); window.location.assign('auth.html'); }
  /* PostgREST answers a query against a table that is not in the database with a 404
     rather than a SQL error, and its raw message ("Could not find the table ... in the
     schema cache") reads like a bug in this page. These are the two codes it uses, the
     older SQL one and the newer schema-cache one. Returning the table name lets the
     caller explain the real cause: a migration that has not been run yet. */
  function missingTableName(error) {
    if (!error) return '';
    const code = String(error.code || '');
    const text = `${error.message || ''} ${error.details || ''}`;
    if (code !== '42P01' && code !== 'PGRST205' && !/could not find the table|relation .* does not exist/i.test(text)) return '';
    return (text.match(/['"](?:[a-z_]+\.)?([a-z_][a-z0-9_]*)['"]/i) || [])[1] || '';
  }

  function describeError(error) {
    const table = missingTableName(error);
    if (table) return `This workspace reads the "${table}" table, which does not exist in the connected Supabase project. Run the pending migrations in supabase/migrations against this project, then reload.`;
    return error?.message || 'Something went wrong. Please try again.';
  }

  /* A failure before the workspace has rendered has nowhere to put a notice, because
     the notice element is created by actionsHeader as part of rendering. Falling back
     to notice() in that window silently discarded the message and left the page on
     "Loading your workspace..." indefinitely, with the reason only in the console. */
  function fatal(error) {
    workspace.innerHTML = `<section class="loadingState"><p class="eyebrow">Workspace unavailable</p><h1>This workspace could not be opened.</h1><p>${escapeHtml(describeError(error))}</p><p class="workspaceNotice isError">${escapeHtml(error?.code ? `Reference: ${error.code}` : '')}</p><button class="primaryButton" type="button" data-action="retry">Try again</button></section>`;
    document.querySelector('[data-action="retry"]')?.addEventListener('click', () => window.location.reload());
  }

  async function run(task, event) { try { await task(event); } catch (error) { handleError(error); } }
  function handleError(error) { console.error(error); if (document.getElementById('workspaceNotice')) notice(describeError(error), 'isError'); else fatal(error); }
  async function init() { if (!app.configured()) { workspace.innerHTML = `<section class="loadingState"><p class="eyebrow">Setup required</p><h1>Connect Supabase to open the workspace.</h1><p>${escapeHtml(app.configurationMessage)}</p></section>`; return; } if (!await app.getSession()) { window.location.replace('auth.html'); return; } state.profile = await app.getProfile(); if (!state.profile?.is_active) throw new Error('This account is inactive. Please contact MSI camps.'); if (state.profile.role === 'teacher' || state.profile.role === 'admin') { const { data: verified, error } = await app.getClient().rpc('is_staff_2fa_verified'); if (error || !verified) { await app.getClient().auth.signOut(); window.location.replace(state.profile.role === 'admin' ? 'admin/' : 'auth.html'); return; } } if (state.profile.role === 'student') await renderStudent(); else if (state.profile.role === 'admin') { await loadAdminDashboard(); renderAdminDashboard(); } else { await loadTeacherClasses(); await loadAvailableStudents(); renderTeacher(); } }
  init().catch(handleError);
})();
