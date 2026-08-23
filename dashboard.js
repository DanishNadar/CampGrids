(() => {
  const workspace = document.getElementById('workspace');
  const printWorkspace = document.getElementById('printWorkspace');
  const app = window.CampGridsApp;
  const state = { profile: null, classes: [], selectedClassId: '', credentialRows: [], adminData: { pages: [], nav: [], dropdowns: [] } };
  const beltNames = ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black'];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const dateValue = (value) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const initials = (profile) => `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

  function notice(message, kind = '') {
    const node = document.getElementById('workspaceNotice');
    if (!node) return;
    node.textContent = message;
    node.className = `workspaceNotice ${kind}`;
  }

  function actionsHeader(label, heading, lede) {
    return `
      <header class="workspaceHeader">
        <div><p class="eyebrow">${escapeHtml(label)}</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(lede)}</p></div>
        <div class="accountBadge"><span class="avatar">${initials(state.profile)}</span><span><strong>${escapeHtml(`${state.profile.first_name} ${state.profile.last_name}`)}</strong><small>${escapeHtml(state.profile.role)}</small></span><button class="quietButton" type="button" data-action="sign-out">Sign out</button></div>
      </header>
      <p id="workspaceNotice" class="workspaceNotice" role="status" aria-live="polite"></p>`;
  }

  function flattenGrid() {
    return (window.CampGridsData || []).flatMap((category) => (category.belts || []).flatMap((belt) => {
      const groups = belt.groups || [{ title: 'Resources', items: belt.items || [] }];
      return groups.flatMap((group) => (group.items || []).map((item) => ({
        title: item.title,
        category: category.name,
        belt: belt.name,
        group: group.title,
        href: item.href || '',
      })));
    }));
  }

  function classKpis(classData) {
    const activeRoster = classData.roster.filter((entry) => !entry.exited_at);
    const possible = activeRoster.length * classData.assignments.length;
    const completed = classData.progress.filter((entry) => entry.status === 'complete').length;
    const graded = classData.progress.filter((entry) => entry.score !== null && entry.score !== undefined);
    const accuracy = graded.length ? graded.reduce((sum, entry) => sum + Number(entry.score), 0) / graded.length : null;
    const belts = classData.awards.reduce((count, award) => {
      count[award.belt] = (count[award.belt] || 0) + 1;
      return count;
    }, {});
    return { campers: activeRoster.length, completion: possible ? (completed / possible) * 100 : 0, completed, possible, accuracy, belts };
  }

  async function loadTeacherClasses() {
    const client = app.getClient();
    const { data: classes, error } = await client
      .from('classes')
      .select('id, name, code, status, starts_on, ends_on, notes, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    state.classes = await Promise.all((classes || []).map(async (classRow) => {
      const [rosterResult, assignmentsResult] = await Promise.all([
        client.from('class_enrollments').select('id, student_id, exited_at, profiles!class_enrollments_student_id_fkey(first_name, last_name, username)').eq('class_id', classRow.id).order('enrolled_at'),
        client.from('class_assignments').select('id, title, instructions, category, belt, resource_url, due_at, published_at, created_at').eq('class_id', classRow.id).order('created_at', { ascending: false }),
      ]);
      if (rosterResult.error) throw rosterResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      const roster = rosterResult.data || [];
      const assignments = assignmentsResult.data || [];
      const enrollmentIds = roster.map((entry) => entry.id);
      const [progressResult, awardsResult] = await Promise.all([
        enrollmentIds.length ? client.from('student_assignment_progress').select('id, enrollment_id, assignment_id, status, score, submitted_at, reviewed_at').in('enrollment_id', enrollmentIds) : Promise.resolve({ data: [], error: null }),
        enrollmentIds.length ? client.from('belt_awards').select('id, enrollment_id, category, belt, awarded_at, note').in('enrollment_id', enrollmentIds).order('awarded_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      ]);
      if (progressResult.error) throw progressResult.error;
      if (awardsResult.error) throw awardsResult.error;
      return { ...classRow, roster, assignments, progress: progressResult.data || [], awards: awardsResult.data || [] };
    }));
    if (!state.selectedClassId || !state.classes.some((entry) => entry.id === state.selectedClassId)) state.selectedClassId = state.classes[0]?.id || '';
  }

  function selectedClass() {
    return state.classes.find((entry) => entry.id === state.selectedClassId) || null;
  }

  function classSelector() {
    if (!state.classes.length) return '<p class="emptyCopy">Create your first class to begin managing campers, assignments, and exports.</p>';
    return `<label class="fieldLabel compactField">Current class
      <select id="classPicker">${state.classes.map((entry) => `<option value="${entry.id}" ${entry.id === state.selectedClassId ? 'selected' : ''}>${escapeHtml(entry.name)} · ${escapeHtml(entry.code)}</option>`).join('')}</select>
    </label>`;
  }

  function gridOptions() {
    return flattenGrid().map((item, index) => `<option value="${index}">${escapeHtml(`${item.category} · ${item.belt} · ${item.title}`)}</option>`).join('');
  }

  function beltOptions(selected = '') {
    return beltNames.map((belt) => `<option ${belt === selected ? 'selected' : ''}>${belt}</option>`).join('');
  }

  function rosterOptions(classData) {
    return classData.roster.filter((entry) => !entry.exited_at).map((entry) => `<option value="${entry.id}">${escapeHtml(`${entry.profiles.first_name} ${entry.profiles.last_name} (${entry.profiles.username})`)}</option>`).join('');
  }

  function progressOptions(classData) {
    return classData.assignments.map((assignment) => `<option value="${assignment.id}">${escapeHtml(assignment.title)}</option>`).join('');
  }

  function beltSummary(kpis) {
    const entries = Object.entries(kpis.belts);
    return entries.length ? entries.map(([belt, count]) => `<span class="beltPill belt${belt}">${escapeHtml(belt)} <b>${count}</b></span>`).join('') : '<span class="muted">No belts awarded yet</span>';
  }

  function renderTeacher() {
    const totalCampers = state.classes.reduce((sum, classData) => sum + classKpis(classData).campers, 0);
    const aggregatePossible = state.classes.reduce((sum, classData) => sum + classKpis(classData).possible, 0);
    const aggregateCompleted = state.classes.reduce((sum, classData) => sum + classKpis(classData).completed, 0);
    const accuracies = state.classes.map(classKpis).filter((kpi) => kpi.accuracy !== null);
    const averageAccuracy = accuracies.length ? accuracies.reduce((sum, kpi) => sum + kpi.accuracy, 0) / accuracies.length : null;
    const current = selectedClass();
    const currentKpis = current ? classKpis(current) : null;

    workspace.innerHTML = `
      ${actionsHeader('Teacher workspace', 'Convenient Class Management', 'Create secure classes, import rosters, review work, and export the data your team needs.')}
      <section class="kpiGrid" aria-label="Teaching overview">
        <article class="kpiCard"><span>Active classes</span><strong>${state.classes.filter((entry) => entry.status === 'active').length}</strong><small>${state.classes.length} total</small></article>
        <article class="kpiCard"><span>Campers</span><strong>${totalCampers}</strong><small>Across your classes</small></article>
        <article class="kpiCard"><span>Completion</span><strong>${aggregatePossible ? Math.round((aggregateCompleted / aggregatePossible) * 100) : 0}%</strong><small>${aggregateCompleted} of ${aggregatePossible} assignment records</small></article>
        <article class="kpiCard"><span>Accuracy</span><strong>${averageAccuracy === null ? '—' : `${Math.round(averageAccuracy)}%`}</strong><small>Scored work only</small></article>
      </section>
      <section class="workspaceGrid teacherTopGrid">
        <article class="toolCard">
          <div class="cardHeading"><div><p class="eyebrow">New class</p><h2>Start a group</h2></div><span class="infoTag">Unique code</span></div>
          <form id="createClassForm" class="stackForm">
            <label class="fieldLabel">Class name<input name="name" required maxlength="140" placeholder="e.g. Young Makers - Week 1"></label>
            <div class="formTwoCols"><label class="fieldLabel">Starts<input name="startsOn" type="date"></label><label class="fieldLabel">Ends<input name="endsOn" type="date"></label></div>
            <label class="fieldLabel">Teacher notes<textarea name="notes" rows="2" placeholder="Optional internal notes"></textarea></label>
            <button class="primaryButton" type="submit">Create class &amp; code</button>
          </form>
        </article>
        <article class="toolCard classAtGlance">
          <div class="cardHeading"><div><p class="eyebrow">Class at a glance</p><h2>${current ? escapeHtml(current.name) : 'No class selected'}</h2></div>${classSelector()}</div>
          ${current ? `<div class="classCode"><span>Class code</span><strong>${escapeHtml(current.code)}</strong><button class="copyButton" data-copy-code="${escapeHtml(current.code)}" type="button">Copy</button></div>
          <div class="classKpiLine"><span><b>${currentKpis.campers}</b> campers</span><span><b>${Math.round(currentKpis.completion)}%</b> complete</span><span><b>${currentKpis.accuracy === null ? '—' : `${Math.round(currentKpis.accuracy)}%`}</b> accuracy</span></div>
          <div class="beltSummary"><span class="summaryLabel">Belts earned</span>${beltSummary(currentKpis)}</div>` : ''}
        </article>
      </section>
      ${current ? renderClassManager(current) : ''}
      ${state.profile.role === 'admin' ? renderAdminControls() : ''}`;
    bindTeacherEvents();
    window.CampGridsLiveContent?.refresh();
  }

  function renderClassManager(classData) {
    const credentialBlock = state.credentialRows.length ? `
      <div class="credentialsPanel"><div><p class="eyebrow">Just imported</p><h3>Student sign-in cards</h3><p>Download these now; temporary passwords are not displayed again after a page refresh.</p></div>
      <button class="secondaryButton" type="button" data-action="download-credentials">Download credentials CSV</button></div>` : '';
    const rosterRows = classData.roster.length ? classData.roster.map((entry) => {
      const info = entry.profiles || {};
      const studentProgress = classData.progress.filter((progress) => progress.enrollment_id === entry.id);
      const complete = studentProgress.filter((progress) => progress.status === 'complete').length;
      const accuracyRows = studentProgress.filter((progress) => progress.score !== null && progress.score !== undefined);
      const accuracy = accuracyRows.length ? Math.round(accuracyRows.reduce((sum, progress) => sum + Number(progress.score), 0) / accuracyRows.length) : '—';
      const studentBelts = classData.awards.filter((award) => award.enrollment_id === entry.id).length;
      return `<tr><td><strong>${escapeHtml(`${info.first_name || ''} ${info.last_name || ''}`)}</strong><small>${escapeHtml(info.username || '')}</small></td><td>${complete}/${classData.assignments.length}</td><td>${accuracy === '—' ? '—' : `${accuracy}%`}</td><td>${studentBelts}</td></tr>`;
    }).join('') : '<tr><td colspan="4" class="emptyTable">No campers yet. Upload a roster to create student accounts.</td></tr>';
    return `
      <section class="managerSection">
        <div class="sectionHeading"><div><p class="eyebrow">Manage ${escapeHtml(classData.name)}</p><h2>Roster, work, and reporting</h2></div><div class="exportActions"><button class="secondaryButton" type="button" data-action="export-class">Export class CSV</button><button class="secondaryButton" type="button" data-action="print-grid">Print Grid assignment</button></div></div>
        ${credentialBlock}
        <div class="workspaceGrid managerGrid">
          <article class="toolCard">
            <div class="cardHeading"><div><p class="eyebrow">Roster import</p><h3>Upload campers</h3></div><a class="smallLink" href="data:text/csv;charset=utf-8,first_name,last_name,grade%0AFannie,Yu,5" download="campgrids-roster-template.csv">CSV template</a></div>
            <p class="helperText">Use the CSV template to upload student/camper information.</p>
            <form id="rosterImportForm" class="stackForm"><label class="fileField"><input name="roster" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required><span>Choose roster spreadsheet</span></label><button class="primaryButton" type="submit">Create student accounts</button></form>
          </article>
          <article class="toolCard">
            <div class="cardHeading"><div><p class="eyebrow">Assignments</p><h3>Build from the live Grid</h3></div></div>
            <form id="assignmentForm" class="stackForm">
              <label class="fieldLabel">Grid activity<select name="gridActivity">${gridOptions()}</select></label>
              <label class="fieldLabel">Teacher instructions<textarea name="instructions" rows="2" placeholder="What should campers document, build, or submit?"></textarea></label>
              <label class="fieldLabel">Due date &amp; time<input name="dueAt" type="datetime-local"></label>
              <div class="formTwoCols"><button class="primaryButton" type="submit">Publish assignment</button><button class="secondaryButton" type="button" data-action="print-selected-grid">Print selected activity</button></div>
            </form>
          </article>
        </div>
        <div class="workspaceGrid managerGrid">
          <article class="toolCard">
            <div class="cardHeading"><div><p class="eyebrow">Review work</p><h3>Update progress</h3></div></div>
            <form id="progressForm" class="formThreeCols compactForm">
              <label class="fieldLabel">Camper<select name="enrollmentId" required>${rosterOptions(classData)}</select></label>
              <label class="fieldLabel">Assignment<select name="assignmentId" required>${progressOptions(classData)}</select></label>
              <label class="fieldLabel">Status<select name="status"><option value="in_progress">In progress</option><option value="submitted">Submitted</option><option value="complete">Complete</option></select></label>
              <label class="fieldLabel">Accuracy %<input name="score" type="number" min="0" max="100" step="0.01"></label>
              <button class="primaryButton" type="submit">Save review</button>
            </form>
          </article>
          <article class="toolCard">
            <div class="cardHeading"><div><p class="eyebrow">Recognition</p><h3>Award a belt</h3></div></div>
            <form id="beltForm" class="formThreeCols compactForm">
              <label class="fieldLabel">Camper<select name="enrollmentId" required>${rosterOptions(classData)}</select></label>
              <label class="fieldLabel">Category<input name="category" required placeholder="e.g. Notebooking"></label>
              <label class="fieldLabel">Belt<select name="belt">${beltOptions()}</select></label>
              <label class="fieldLabel">Note<input name="note" placeholder="Optional"></label>
              <button class="primaryButton" type="submit">Award belt</button>
            </form>
          </article>
        </div>
        <article class="toolCard rosterCard"><div class="cardHeading"><div><p class="eyebrow">Class roster</p><h3>${classData.roster.length} camper${classData.roster.length === 1 ? '' : 's'}</h3></div><div class="beltSummary">${beltSummary(classKpis(classData))}</div></div>
          <div class="tableScroll"><table class="dataTable"><thead><tr><th>Camper</th><th>Completion</th><th>Accuracy</th><th>Belts</th></tr></thead><tbody>${rosterRows}</tbody></table></div>
        </article>
      </section>`;
  }

  function renderAdminControls() {
    return `
      <section class="adminSection">
        <div class="sectionHeading"><div><p class="eyebrow">MSI administration</p><h2>Live site controls</h2><p>Changes save to Supabase and are available to the public interface without changing static files.</p></div></div>
        <div class="workspaceGrid adminGrid">
          <article class="toolCard"><p class="eyebrow">New page</p><h3>Publish a generated page</h3><form id="pageForm" class="stackForm"><label class="fieldLabel">Page title<input name="title" required></label><label class="fieldLabel">URL slug<input name="slug" required pattern="[a-z0-9-]+" placeholder="e.g. camp-safety"></label><label class="fieldLabel">Summary<textarea name="summary" rows="2"></textarea></label><label class="fieldLabel">Page text<textarea name="body" rows="4" required></textarea></label><button class="primaryButton" type="submit">Save page</button></form></article>
          <article class="toolCard"><p class="eyebrow">Navigation</p><h3>Add a live menu link</h3><form id="navForm" class="stackForm"><label class="fieldLabel">Link label<input name="label" required></label><label class="fieldLabel">Page slug<input name="slug" required placeholder="Must match a saved page"></label><div class="formTwoCols"><label class="fieldLabel">Position<input name="position" type="number" min="0" required></label><label class="fieldLabel">Location<select name="location"><option value="primary">Primary navigation</option><option value="footer">Footer</option><option value="teacher">Teacher workspace</option></select></label></div><button class="primaryButton" type="submit">Publish link</button></form></article>
          <article class="toolCard"><p class="eyebrow">Live dropdowns</p><h3>Update option lists</h3><form id="dropdownForm" class="stackForm"><label class="fieldLabel">Dropdown key<input name="groupKey" required pattern="[a-z0-9_-]+" placeholder="e.g. camp-selector"></label><div class="formTwoCols"><label class="fieldLabel">Stored value<input name="value" required></label><label class="fieldLabel">Visible label<input name="label" required></label></div><label class="fieldLabel">Position<input name="position" type="number" min="0" required></label><button class="primaryButton" type="submit">Save dropdown option</button></form><label class="fieldLabel previewField">Live preview (camp-selector)<select data-dropdown-group="camp-selector" data-live-dropdown="true"><option>Choose an option</option></select></label></article>
        </div>
      </section>`;
  }

  function csvLine(values) {
    return values.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',');
  }

  function downloadCsv(filename, headings, rows) {
    const csv = [csvLine(headings), ...rows.map(csvLine)].join('\r\n');
    const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = href; link.download = filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 500);
  }

  function exportClass(classData) {
    const rows = classData.roster.map((entry) => {
      const progress = classData.progress.filter((item) => item.enrollment_id === entry.id);
      const graded = progress.filter((item) => item.score !== null && item.score !== undefined);
      const awards = classData.awards.filter((item) => item.enrollment_id === entry.id);
      return [
        `${entry.profiles.first_name} ${entry.profiles.last_name}`, entry.profiles.username,
        classData.assignments.length ? `${Math.round((progress.filter((item) => item.status === 'complete').length / classData.assignments.length) * 100)}%` : '0%',
        graded.length ? `${Math.round(graded.reduce((sum, item) => sum + Number(item.score), 0) / graded.length)}%` : '',
        awards.map((award) => `${award.category}: ${award.belt}`).join('; '),
      ];
    });
    downloadCsv(`${classData.code}-progress.csv`, ['Camper', 'Username', 'Completion', 'Accuracy', 'Belts'], rows);
  }

  function printGridAssignment(classData, activity = flattenGrid()[0]) {
    if (!activity) return notice('The Grid data is unavailable for printing.', 'isError');
    printWorkspace.innerHTML = `<article class="printDocument"><div class="printBrand"><span>MSI Camps</span><strong>CampGrids</strong></div><p class="eyebrow">Printable Grid assignment</p><h1>${escapeHtml(activity.title)}</h1><dl><div><dt>Class</dt><dd>${escapeHtml(classData.name)}</dd></div><div><dt>Grid path</dt><dd>${escapeHtml(`${activity.category} · ${activity.belt} Belt`)}</dd></div><div><dt>Class code</dt><dd>${escapeHtml(classData.code)}</dd></div></dl><section><h2>Instructions</h2><p>Open the Grid activity, follow each step, and use this space to document your process, choices, and what you learned.</p></section><section class="printLines"><h2>My notes</h2><div></div><div></div><div></div><div></div></section><p class="printUrl">Resource: ${escapeHtml(activity.href)}</p></article>`;
    window.print();
  }

  function rowsToStudents(rows) {
    rows = rows.map((row) => row.map((value) => String(value ?? '').trim()));
    if (rows.length < 2) throw new Error('The spreadsheet needs a header row and at least one camper.');
    const headers = rows.shift().map((header) => header.toLowerCase().replace(/[^a-z]/g, ''));
    const find = (names) => headers.findIndex((header) => names.includes(header));
    const first = find(['firstname', 'first']); const last = find(['lastname', 'last']);
    if (first < 0 || last < 0) throw new Error('The spreadsheet needs first_name and last_name columns.');
    const grade = find(['grade']); const guardianName = find(['guardianname', 'parentname']); const guardianEmail = find(['guardianemail', 'parentemail']); const temporaryPassword = find(['temporarypassword', 'password']);
    return rows.map((values) => ({ firstName: values[first], lastName: values[last], grade: grade >= 0 ? values[grade] : '', guardianName: guardianName >= 0 ? values[guardianName] : '', guardianEmail: guardianEmail >= 0 ? values[guardianEmail] : '', temporaryPassword: temporaryPassword >= 0 ? values[temporaryPassword] : '' })).filter((entry) => entry.firstName || entry.lastName);
  }

  function parseCsv(text) {
    const rows = []; let row = []; let value = ''; let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (character === '"') quoted = !quoted;
      else if (character === ',' && !quoted) { row.push(value.trim()); value = ''; }
      else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && text[index + 1] === '\n') index += 1;
        row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = '';
      } else value += character;
    }
    row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
    return rowsToStudents(rows);
  }

  async function parseRosterFile(file) {
    if (file.name.toLowerCase().endsWith('.csv')) return parseCsv(await file.text());
    if (!window.XLSX) throw new Error('The spreadsheet reader did not load. Use CSV or check your network connection.');
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return rowsToStudents(window.XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }));
  }

  async function createClass(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { data: createdRows, error } = await app.getClient().rpc('create_class', {
      p_name: String(form.get('name')).trim(),
      p_starts_on: form.get('startsOn') || null,
      p_ends_on: form.get('endsOn') || null,
      p_notes: form.get('notes') || null,
    });
    if (error) throw error;
    const data = createdRows?.[0];
    if (!data) throw new Error('The class was not created. Please try again.');
    await app.audit('class_created', 'class', data.id, { name: data.name, code: data.code });
    state.selectedClassId = data.id;
    await loadTeacherClasses(); renderTeacher(); notice(`Class created. Its unique code is ${data.code}.`, 'isSuccess');
  }

  async function importRoster(event) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('roster');
    if (!(file instanceof File)) throw new Error('Choose a CSV file first.');
    const students = await parseRosterFile(file);
    notice(`Creating ${students.length} student account${students.length === 1 ? '' : 's'}…`);
    const { data, error } = await app.getClient().functions.invoke('provision-students', { body: { classId: state.selectedClassId, filename: file.name, students } });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    state.credentialRows = data.students || [];
    await loadTeacherClasses(); renderTeacher();
    notice(`${data.students?.length || 0} student account(s) created${data.errors?.length ? `; ${data.errors.length} row(s) need attention` : ''}.`, data.errors?.length ? 'isWarning' : 'isSuccess');
  }

  async function createAssignment(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const activity = flattenGrid()[Number(form.get('gridActivity'))];
    if (!activity) throw new Error('Choose a Grid activity.');
    const { data, error } = await app.getClient().from('class_assignments').insert({
      class_id: state.selectedClassId, title: activity.title, category: activity.category, belt: activity.belt,
      resource_url: activity.href, instructions: String(form.get('instructions') || ''), due_at: form.get('dueAt') || null,
      published_at: new Date().toISOString(), created_by: state.profile.id,
    }).select().single();
    if (error) throw error;
    await app.audit('assignment_published', 'class_assignment', data.id, { class_id: state.selectedClassId, title: activity.title });
    await loadTeacherClasses(); renderTeacher(); notice('Assignment published to your class.', 'isSuccess');
  }

  async function saveProgress(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const status = String(form.get('status'));
    const scoreText = String(form.get('score') || '').trim();
    const payload = { assignment_id: form.get('assignmentId'), enrollment_id: form.get('enrollmentId'), status, score: scoreText ? Number(scoreText) : null, reviewed_at: new Date().toISOString(), reviewed_by: state.profile.id };
    if (status === 'complete') payload.submitted_at = new Date().toISOString();
    const { error } = await app.getClient().from('student_assignment_progress').upsert(payload, { onConflict: 'assignment_id,enrollment_id' });
    if (error) throw error;
    await app.audit('assignment_reviewed', 'class_assignment', payload.assignment_id, { enrollment_id: payload.enrollment_id, status, score: payload.score });
    await loadTeacherClasses(); renderTeacher(); notice('Progress saved.', 'isSuccess');
  }

  async function awardBelt(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const { data, error } = await app.getClient().from('belt_awards').insert({ enrollment_id: form.get('enrollmentId'), category: String(form.get('category')).trim(), belt: form.get('belt'), note: form.get('note') || null, awarded_by: state.profile.id }).select().single();
    if (error) throw error;
    await app.audit('belt_awarded', 'belt_award', data.id, { enrollment_id: data.enrollment_id, category: data.category, belt: data.belt });
    await loadTeacherClasses(); renderTeacher(); notice('Belt awarded and added to the student timeline.', 'isSuccess');
  }

  async function createPage(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const slug = String(form.get('slug')).trim();
    const { error } = await app.getClient().from('content_pages').insert({ slug, title: String(form.get('title')).trim(), summary: form.get('summary') || null, body: { blocks: [{ type: 'paragraph', text: String(form.get('body')).trim() }] }, is_published: true, created_by: state.profile.id, updated_by: state.profile.id });
    if (error) throw error;
    await app.audit('content_page_created', 'content_page', null, { slug }); renderTeacher(); notice(`Page saved at page.html?slug=${slug}.`, 'isSuccess');
  }

  async function createNavigation(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const slug = String(form.get('slug')).trim();
    const { data: page, error: pageError } = await app.getClient().from('content_pages').select('id').eq('slug', slug).single();
    if (pageError || !page) throw new Error('Save the page before linking it in navigation.');
    const { error } = await app.getClient().from('navigation_items').insert({ label: String(form.get('label')).trim(), href: slug, page_id: page.id, location: form.get('location'), position: Number(form.get('position')), is_visible: true, created_by: state.profile.id });
    if (error) throw error;
    await app.audit('navigation_item_created', 'navigation_item', null, { label: form.get('label'), slug }); renderTeacher(); notice('Live navigation item saved.', 'isSuccess');
  }

  async function createDropdownOption(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const groupKey = String(form.get('groupKey')).trim(); const value = String(form.get('value')).trim();
    const { error } = await app.getClient().from('dropdown_options').upsert({ group_key: groupKey, value, label: String(form.get('label')).trim(), position: Number(form.get('position')), is_active: true, updated_by: state.profile.id }, { onConflict: 'group_key,value' });
    if (error) throw error;
    await app.audit('dropdown_option_saved', 'dropdown_option', null, { groupKey, value });
    await window.CampGridsLiveContent?.refresh();
    notice('Dropdown option saved live.', 'isSuccess');
  }

  function bindTeacherEvents() {
    document.getElementById('classPicker')?.addEventListener('change', (event) => { state.selectedClassId = event.target.value; state.credentialRows = []; renderTeacher(); });
    document.getElementById('createClassForm')?.addEventListener('submit', (event) => run(createClass, event));
    document.getElementById('rosterImportForm')?.addEventListener('submit', (event) => run(importRoster, event));
    document.getElementById('assignmentForm')?.addEventListener('submit', (event) => run(createAssignment, event));
    document.getElementById('progressForm')?.addEventListener('submit', (event) => run(saveProgress, event));
    document.getElementById('beltForm')?.addEventListener('submit', (event) => run(awardBelt, event));
    document.getElementById('pageForm')?.addEventListener('submit', (event) => run(createPage, event));
    document.getElementById('navForm')?.addEventListener('submit', (event) => run(createNavigation, event));
    document.getElementById('dropdownForm')?.addEventListener('submit', (event) => run(createDropdownOption, event));
    document.querySelector('[data-action="sign-out"]')?.addEventListener('click', signOut);
    document.querySelector('[data-action="export-class"]')?.addEventListener('click', () => exportClass(selectedClass()));
    document.querySelector('[data-action="print-grid"]')?.addEventListener('click', () => printGridAssignment(selectedClass()));
    document.querySelector('[data-action="print-selected-grid"]')?.addEventListener('click', () => {
      const index = Number(document.querySelector('#assignmentForm [name="gridActivity"]')?.value);
      printGridAssignment(selectedClass(), flattenGrid()[index]);
    });
    document.querySelector('[data-action="download-credentials"]')?.addEventListener('click', () => downloadCsv(`${selectedClass().code}-student-credentials.csv`, ['First name', 'Last name', 'Username', 'Temporary password', 'Grade'], state.credentialRows.map((entry) => [entry.firstName, entry.lastName, entry.username, entry.temporaryPassword, entry.grade])));
    document.querySelector('[data-copy-code]')?.addEventListener('click', async (event) => { await navigator.clipboard.writeText(event.currentTarget.dataset.copyCode); notice('Class code copied.', 'isSuccess'); });
  }

  async function renderStudent() {
    const client = app.getClient();
    const [enrollmentResult, assignmentsResult, progressResult, awardsResult, eventResult] = await Promise.all([
      client.from('class_enrollments').select('id, class_id, classes(name, code, status)').eq('student_id', state.profile.id).is('exited_at', null),
      client.from('class_assignments').select('id, class_id, title, instructions, category, belt, resource_url, due_at, published_at').not('published_at', 'is', null).order('created_at', { ascending: false }),
      client.from('student_assignment_progress').select('id, assignment_id, enrollment_id, status, score, submitted_at, feedback, class_assignments(class_id, title)').order('updated_at', { ascending: false }),
      client.from('belt_awards').select('id, belt, category, awarded_at, note, class_enrollments(class_id)').order('awarded_at', { ascending: false }),
      client.from('student_activity_events').select('id, event_type, metadata, occurred_at, class_id').order('occurred_at', { ascending: false }).limit(12),
    ]);
    [enrollmentResult, assignmentsResult, progressResult, awardsResult, eventResult].forEach((result) => { if (result.error) throw result.error; });
    const enrollments = enrollmentResult.data || []; const classIds = new Set(enrollments.map((entry) => entry.class_id));
    let activeClassId = window.localStorage.getItem('campgrids-active-class');
    if (!classIds.has(activeClassId)) activeClassId = enrollments[0]?.class_id || '';
    if (activeClassId) window.localStorage.setItem('campgrids-active-class', activeClassId);
    const assignments = (assignmentsResult.data || []).filter((entry) => entry.class_id === activeClassId);
    const enrollment = enrollments.find((entry) => entry.class_id === activeClassId);
    const progress = (progressResult.data || []).filter((entry) => entry.enrollment_id === enrollment?.id);
    const awards = (awardsResult.data || []).filter((entry) => entry.class_enrollments?.class_id === activeClassId);
    const complete = progress.filter((entry) => entry.status === 'complete').length;
    const graded = progress.filter((entry) => entry.score !== null && entry.score !== undefined);
    const activityRows = (eventResult.data || []).filter((entry) => !entry.class_id || entry.class_id === activeClassId);
    const assignmentRows = assignments.length ? assignments.map((assignment) => {
      const record = progress.find((entry) => entry.assignment_id === assignment.id);
      const stateLabel = record?.status?.replace('_', ' ') || 'not started';
      return `<article class="studentAssignment"><div><p class="eyebrow">${escapeHtml(`${assignment.category || 'Grid'} · ${assignment.belt || 'Activity'} Belt`)}</p><h3>${escapeHtml(assignment.title)}</h3><p>${escapeHtml(assignment.instructions || 'Open the resource and complete the activity.')}</p><small>Due ${dateValue(assignment.due_at)}</small></div><div class="assignmentActions"><span class="statusPill ${escapeHtml(record?.status || 'not_started')}">${escapeHtml(stateLabel)}</span>${assignment.resource_url ? `<a class="secondaryButton" target="_blank" rel="noopener noreferrer" href="${escapeHtml(assignment.resource_url)}" data-student-resource="${assignment.id}">Open Grid</a>` : ''}<button class="primaryButton" type="button" data-student-progress="${assignment.id}" data-next-status="${record?.status === 'submitted' ? 'complete' : 'submitted'}">${record?.status === 'submitted' ? 'Mark complete' : 'Submit work'}</button></div></article>`;
    }).join('') : '<p class="emptyCopy">There are no published assignments in this class yet.</p>';
    workspace.innerHTML = `
      ${actionsHeader('Student dashboard', `Hi, ${state.profile.first_name}.`, 'Your CampGrids work, earned belts, and activity timeline are all in one place.')}
      <section class="studentClassBar"><label class="fieldLabel">My class<select id="studentClassPicker">${enrollments.map((entry) => `<option value="${entry.class_id}" ${entry.class_id === activeClassId ? 'selected' : ''}>${escapeHtml(`${entry.classes.name} · ${entry.classes.code}`)}</option>`).join('')}</select></label><a class="secondaryButton" href="campgrids.html">Explore the Grid</a></section>
      <section class="kpiGrid"><article class="kpiCard"><span>Assignments complete</span><strong>${complete}/${assignments.length}</strong><small>Keep building</small></article><article class="kpiCard"><span>Accuracy</span><strong>${graded.length ? `${Math.round(graded.reduce((sum, entry) => sum + Number(entry.score), 0) / graded.length)}%` : '—'}</strong><small>From reviewed work</small></article><article class="kpiCard"><span>Belts earned</span><strong>${awards.length}</strong><small>${awards.map((entry) => entry.belt).join(' · ') || 'Your next one is waiting'}</small></article></section>
      <section class="studentLayout"><div><div class="sectionHeading"><div><p class="eyebrow">My assignments</p><h2>What to work on</h2></div></div>${assignmentRows}</div><aside class="studentTimeline"><p class="eyebrow">Profile timeline</p><h2>Recent activity</h2>${activityRows.length ? `<ol>${activityRows.map((entry) => `<li><span>${escapeHtml(entry.event_type.replaceAll('_', ' '))}</span><small>${dateValue(entry.occurred_at)}${entry.metadata?.title ? ` · ${escapeHtml(entry.metadata.title)}` : ''}</small></li>`).join('')}</ol>` : '<p class="emptyCopy">Your Grid activity will appear here as you work.</p>'}<div class="studentBelts"><p class="eyebrow">My belts</p>${awards.length ? awards.map((award) => `<span class="beltPill belt${escapeHtml(award.belt)}">${escapeHtml(`${award.category} · ${award.belt}`)}</span>`).join('') : '<p class="emptyCopy">No belts awarded yet.</p>'}</div></aside></section>`;
    document.getElementById('studentClassPicker')?.addEventListener('change', (event) => { window.localStorage.setItem('campgrids-active-class', event.target.value); renderStudent().catch(handleError); });
    document.querySelector('[data-action="sign-out"]')?.addEventListener('click', signOut);
    document.querySelectorAll('[data-student-resource]').forEach((link) => link.addEventListener('click', () => app.logStudentEvent('resource_opened', { source: 'student_dashboard', assignment_id: link.dataset.studentResource }, activeClassId, link.dataset.studentResource)));
    document.querySelectorAll('[data-student-progress]').forEach((button) => button.addEventListener('click', () => run(() => updateStudentProgress(button.dataset.studentProgress, button.dataset.nextStatus, enrollment.id, activeClassId), null)));
  }

  async function updateStudentProgress(assignmentId, status, enrollmentId, classId) {
    const { error } = await app.getClient().from('student_assignment_progress').upsert({ assignment_id: assignmentId, enrollment_id: enrollmentId, status, submitted_at: status === 'submitted' || status === 'complete' ? new Date().toISOString() : null }, { onConflict: 'assignment_id,enrollment_id' });
    if (error) throw error;
    await app.logStudentEvent(status === 'submitted' ? 'assignment_submitted' : 'assignment_completed', { status }, classId, assignmentId);
    await renderStudent(); notice(status === 'submitted' ? 'Work submitted for review.' : 'Marked complete.', 'isSuccess');
  }

  async function signOut() {
    await app.getClient().auth.signOut(); window.location.assign('auth.html');
  }

  async function run(task, event) {
    try { await task(event); } catch (error) { handleError(error); }
  }

  function handleError(error) {
    console.error(error); notice(error?.message || 'Something went wrong. Please try again.', 'isError');
  }

  async function init() {
    if (!app.configured()) {
      workspace.innerHTML = `<section class="loadingState"><p class="eyebrow">Setup required</p><h1>Connect Supabase to open the workspace.</h1><p>${escapeHtml(app.configurationMessage)}</p><a class="primaryButton" href="supabase/README.md">Read setup instructions</a></section>`;
      return;
    }
    const session = await app.getSession();
    if (!session) { window.location.replace('auth.html'); return; }
    state.profile = await app.getProfile();
    if (!state.profile?.is_active) throw new Error('This account is inactive. Please contact MSI camps.');
    if (state.profile.role === 'student') await renderStudent();
    else { await loadTeacherClasses(); renderTeacher(); }
  }

  init().catch(handleError);
})();
