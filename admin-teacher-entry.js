/* Adds a secure single-teacher provisioning path to the administrator
   dashboard. The existing CSV bulk-import remains unchanged. This script only
   mounts when the verified administrator view has rendered its teacher CSV
   form, so teachers and campers never see this control. */
(() => {
  const workspace = document.getElementById('workspace');
  const app = window.CampGridsApp;
  const escapeCsv = (value) => {
    const text = String(value ?? '');
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
  };

  function setNotice(message, kind = '') {
    const notice = document.getElementById('singleTeacherNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.className = `workspaceNotice ${kind}`;
  }

  async function functionErrorMessage(error, fallback) {
    try {
      const payload = await error?.context?.json?.();
      return payload?.error || payload?.message || error?.message || fallback;
    } catch (_) {
      return error?.message || fallback;
    }
  }

  function downloadCredentials(teacher) {
    const header = ['First name', 'Last name', 'Work email', 'Username', 'Temporary password', 'Title'];
    const row = [teacher.firstName, teacher.lastName, teacher.email, teacher.username, teacher.temporaryPassword, teacher.title];
    const csv = `${header.map(escapeCsv).join(',')}\r\n${row.map(escapeCsv).join(',')}\r\n`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `campgrids-teacher-access-${teacher.username}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  async function createTeacher(event) {
    event.preventDefault();
    if (!app?.configured()) return setNotice(app?.configurationMessage || 'CampGrids is not connected.', 'isError');
    const form = new FormData(event.currentTarget);
    const teacher = {
      firstName: String(form.get('firstName') || '').trim(),
      lastName: String(form.get('lastName') || '').trim(),
      email: String(form.get('email') || '').trim().toLowerCase(),
      title: String(form.get('title') || '').trim(),
    };
    if (!teacher.firstName || !teacher.lastName || !teacher.email) {
      return setNotice('Enter the teacher’s first name, last name, and work email.', 'isError');
    }

    const submit = event.currentTarget.querySelector('button[type="submit"]');
    submit.disabled = true;
    setNotice('Creating the teacher account…');
    try {
      const { data, error } = await app.getClient().functions.invoke('provision-teachers', {
        body: { filename: 'single-teacher-entry.csv', teachers: [teacher] },
      });
      if (error) throw new Error(await functionErrorMessage(error, 'The teacher account could not be created.'));
      if (data?.error) throw new Error(data.error);
      if (data?.errors?.length) throw new Error(data.errors[0].message || 'The teacher account could not be created.');
      const created = data?.teachers?.[0];
      if (!created?.username || !created?.temporaryPassword) throw new Error('The teacher account was created, but its one-time credentials were unavailable. Contact MSI IT before creating another account.');

      const report = document.getElementById('singleTeacherReport');
      document.getElementById('singleTeacherUsername').textContent = created.username;
      document.getElementById('singleTeacherPassword').textContent = created.temporaryPassword;
      document.getElementById('singleTeacherEmail').textContent = created.email;
      report.hidden = false;
      document.getElementById('singleTeacherDownload').onclick = () => downloadCredentials(created);
      event.currentTarget.reset();
      setNotice('Teacher account created. Download the one-time access report now.', 'isSuccess');
    } catch (error) {
      setNotice(error.message || 'The teacher account could not be created.', 'isError');
    } finally {
      submit.disabled = false;
    }
  }

  function mount() {
    const csvForm = document.getElementById('teacherCsvImportForm');
    if (!csvForm || document.getElementById('singleTeacherForm')) return;
    const csvCard = csvForm.closest('.toolCard');
    if (!csvCard) return;
    csvCard.insertAdjacentHTML('beforebegin', `
      <article class="toolCard" id="singleTeacherCard">
        <div class="cardHeading"><div><p class="eyebrow">Teacher accounts</p><h3>Add one teacher</h3></div></div>
        <p class="helperText">CampGrids generates a unique username and one-time password. The password is stored only by Supabase Auth, never in CampGrids; download and share the access report privately.</p>
        <form id="singleTeacherForm" class="stackForm">
          <div class="formTwoCols"><label class="fieldLabel">First name<input name="firstName" maxlength="80" autocomplete="given-name" required></label><label class="fieldLabel">Last name<input name="lastName" maxlength="80" autocomplete="family-name" required></label></div>
          <label class="fieldLabel">Work email<input name="email" type="email" maxlength="320" autocomplete="email" required></label>
          <label class="fieldLabel">Title <span class="muted">(optional)</span><input name="title" maxlength="120" placeholder="e.g. Camp Instructor"></label>
          <button class="primaryButton" type="submit">Create teacher account</button>
        </form>
        <p id="singleTeacherNotice" class="workspaceNotice" role="status" aria-live="polite"></p>
        <section id="singleTeacherReport" class="credentialsPanel" hidden aria-live="polite"><div><p class="eyebrow">One-time teacher access</p><h3 id="singleTeacherEmail"></h3><dl><div><dt>Username</dt><dd id="singleTeacherUsername"></dd></div><div><dt>Temporary password</dt><dd id="singleTeacherPassword"></dd></div></dl><p>Download this report now. The teacher must set a personal password before accessing their workspace.</p></div><button id="singleTeacherDownload" class="secondaryButton" type="button">Download one-time report</button></section>
      </article>`);
    document.getElementById('singleTeacherForm')?.addEventListener('submit', createTeacher);
  }

  new MutationObserver(mount).observe(workspace, { childList: true, subtree: true });
  mount();
})();
