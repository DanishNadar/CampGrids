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

  /* Turns the two likely failures into something actionable. PGRST202 means the
     function is not in the database yet, which is a pending migration rather than a
     problem with what was typed. */
  /* supabase-js reports a blocked or unreachable function this way. It is distinct
     from a function that ran and returned an error, which must not be retried
     against a different code path. */
  function edgeFunctionUnreachable(error) {
    const text = `${error?.name || ''} ${error?.message || ''}`;
    return /FunctionsFetchError|Failed to send a request to the Edge Function|Failed to fetch|NetworkError/i.test(text);
  }

  /* Creates the account without the Edge Function and emails a set-password link.
     Returns the row the report needs, shaped like the function's own response. */
  async function provisionWithoutEdgeFunction(teacher) {
    const { data, error } = await app.getClient().rpc('provision_user_pending_password', {
      p_email: teacher.email,
      p_first_name: teacher.firstName,
      p_last_name: teacher.lastName,
      p_role: 'teacher',
      p_title: teacher.title || null,
    });
    if (error) throw new Error(provisionErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.account_username) throw new Error('The teacher account was created, but its login name was unavailable. Contact MSI IT before creating another account.');
    const sent = await sendPasswordSetupEmail(row.account_email || teacher.email);
    return {
      username: row.account_username,
      email: row.account_email || teacher.email,
      inviteSentAt: sent.at || '',
      emailOk: sent.ok,
      emailMessage: sent.message,
    };
  }

  function provisionErrorMessage(error) {
    const code = String(error?.code || '');
    const text = `${error?.message || ''} ${error?.details || ''}`;
    if (code === 'PGRST202' || /could not find the function|does not exist/i.test(text)) {
      return 'This project does not have provision_user_pending_password yet. Run supabase/migrations/20260915_passwordless_provisioning.sql in the SQL editor, then try again.';
    }
    if (/only msi administrators/i.test(text)) {
      return 'Only a verified MSI administrator can create accounts. Complete email verification and try again.';
    }
    if (/internal camper address/i.test(text)) {
      return 'That address cannot receive mail. Use a real work email address for a teacher.';
    }
    if (/rate limit|too many requests|for security purposes/i.test(text)) {
      return 'Supabase is rate-limiting outgoing email. Wait about a minute, then resend.';
    }
    if (/duplicate key|already exists/i.test(text)) {
      return 'An account already uses that email address. Re-running this form clears its password and sends a fresh set-password link.';
    }
    return error?.message || 'The teacher account could not be created.';
  }

  function downloadCredentials(teacher) {
    /* No password column: the account is created without one, and the teacher sets
       their own through the emailed link. There is nothing secret to write down. */
    const header = ['First name', 'Last name', 'Work email', 'Username', 'Title', 'Set-password link sent'];
    const row = [teacher.firstName, teacher.lastName, teacher.email, teacher.username, teacher.title, teacher.inviteSentAt || ''];
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
    /* Held in a variable because event.currentTarget is only set while the event
       is being dispatched. Every line after the first await sees null, which is
       what made the reset at the end of this handler throw. */
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const teacher = {
      firstName: String(form.get('firstName') || '').trim(),
      lastName: String(form.get('lastName') || '').trim(),
      email: String(form.get('email') || '').trim().toLowerCase(),
      title: String(form.get('title') || '').trim(),
    };
    if (!teacher.firstName || !teacher.lastName || !teacher.email) {
      return setNotice('Enter the teacher’s first name, last name, and work email.', 'isError');
    }

    const submit = formElement.querySelector('button[type="submit"]');
    submit.disabled = true;
    setNotice('Creating the teacher account…');
    try {
      /* Single and CSV provisioning deliberately share the same Edge Function.
         That function uses Supabase's inviteUserByEmail API, which sends the
         dedicated Invite user email. Calling resetPasswordForEmail here used the
         recovery API instead, so a brand-new teacher received a misleading
         "Reset your password" message. */
      let created = null;
      let usedFallback = false;
      let fallbackEmail = { ok: true, message: '' };

      try {
        const { data, error } = await app.getClient().functions.invoke('provision-teachers', {
          body: {
            filename: 'campgrids-single-teacher.csv',
            teachers: [teacher],
            siteOrigin: window.location.origin,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const row = data?.teachers?.[0];
        const firstError = data?.errors?.[0]?.message;
        if (!row?.username) throw new Error(firstError || 'The teacher account could not be created.');

        created = {
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          title: teacher.title,
          email: row.email || teacher.email,
          username: row.username,
          // inviteUserByEmail has already dispatched the invitation before the
          // function returns. Keep the report accurate without sending a second mail.
          inviteSentAt: new Date().toISOString(),
        };
      } catch (functionError) {
        /* Only an unreachable function falls through. A function that ran and
           rejected the request has a real reason, and retrying that against the
           database path would hide it. */
        if (!edgeFunctionUnreachable(functionError)) throw new Error(provisionErrorMessage(functionError));
        usedFallback = true;
        const row = await provisionWithoutEdgeFunction(teacher);
        fallbackEmail = { ok: row.emailOk, message: row.emailMessage };
        created = {
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          title: teacher.title,
          email: row.email,
          username: row.username,
          inviteSentAt: row.inviteSentAt,
        };
      }

      if (usedFallback && !fallbackEmail.ok) {
        showReport(created, `Account created for ${created.email}, but no email went out: ${fallbackEmail.message} Use Resend set-password link.`, 'isWarning');
        formElement.reset();
        return;
      }
      if (usedFallback) {
        /* Worth saying out loud: this email is the recovery template, so it reads as
           a password reset rather than an invitation. Deploying provision-teachers
           restores the invitation wording. */
        showReport(created, `Account created and a set-password link emailed to ${created.email}. The provision-teachers function is not deployed, so the message is the password-reset one rather than the account invitation.`, 'isWarning');
        formElement.reset();
        return;
      }
      showReport(created, `Account created. An MSI CampGrids invitation was emailed to ${created.email}. They choose their own password the first time they sign in.`, 'isSuccess');
      formElement.reset();
    } catch (error) {
      setNotice(error.message || 'The teacher account could not be created.', 'isError');
    } finally {
      submit.disabled = false;
    }
  }

  /* A resend is a real password-recovery action for an account that already
     exists. It therefore uses the separate, explicitly labelled Reset Password
     template rather than pretending it is a new-account invitation. */
  async function sendPasswordSetupEmail(email) {
    const redirectTo = new URL('settings.html?password-setup=1', window.location.href).href;
    const { error } = await app.getClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { ok: false, message: provisionErrorMessage(error), at: '' };
    const at = new Date().toISOString();
    // Best effort: the account works whether or not the timestamp gets recorded.
    try { await app.getClient().rpc('note_password_invite_sent', { p_email: email }); } catch (_) { /* not fatal */ }
    return { ok: true, message: '', at };
  }

  function showReport(teacher, message, kind) {
    const report = document.getElementById('singleTeacherReport');
    document.getElementById('singleTeacherUsername').textContent = teacher.username;
    document.getElementById('singleTeacherEmail').textContent = teacher.email;
    const invite = document.getElementById('singleTeacherInvite');
    if (invite) invite.textContent = teacher.inviteSentAt ? new Date(teacher.inviteSentAt).toLocaleString() : 'not sent yet';
    if (report) report.hidden = false;
    const download = document.getElementById('singleTeacherDownload');
    if (download) download.onclick = () => downloadCredentials(teacher);
    const resend = document.getElementById('singleTeacherResend');
    if (resend) resend.onclick = async () => {
      resend.disabled = true;
      setNotice('Resending the set-password link...');
      const sent = await sendPasswordSetupEmail(teacher.email);
      teacher.inviteSentAt = sent.at || teacher.inviteSentAt;
      showReport(teacher, sent.ok ? `A fresh set-password link was emailed to ${teacher.email}.` : sent.message, sent.ok ? 'isSuccess' : 'isError');
      resend.disabled = false;
    };
    setNotice(message, kind);
  }

  function mount() {
    const csvForm = document.getElementById('teacherCsvImportForm');
    if (!csvForm || document.getElementById('singleTeacherForm')) return;
    const csvCard = csvForm.closest('.toolCard');
    if (!csvCard) return;
    csvCard.insertAdjacentHTML('beforebegin', `
      <article class="toolCard" id="singleTeacherCard">
        <div class="cardHeading"><div><p class="eyebrow">Teacher accounts</p><h3>Add one teacher</h3></div></div>
        <p class="helperText">CampGrids generates a unique username and emails the teacher a link to set their own password. No password is created here, so there is nothing to write down or pass along.</p>
        <form id="singleTeacherForm" class="stackForm">
          <div class="formTwoCols"><label class="fieldLabel">First name<input name="firstName" maxlength="80" autocomplete="given-name" required></label><label class="fieldLabel">Last name<input name="lastName" maxlength="80" autocomplete="family-name" required></label></div>
          <label class="fieldLabel">Work email<input name="email" type="email" maxlength="320" autocomplete="email" required></label>
          <label class="fieldLabel">Title <span class="muted">(optional)</span><input name="title" maxlength="120" placeholder="e.g. Camp Instructor"></label>
          <button class="primaryButton" type="submit">Create teacher account</button>
        </form>
        <p id="singleTeacherNotice" class="workspaceNotice" role="status" aria-live="polite"></p>
        <section id="singleTeacherReport" class="credentialsPanel" hidden aria-live="polite"><div><p class="eyebrow">Teacher account created</p><h3 id="singleTeacherEmail"></h3><dl><div><dt>Username</dt><dd id="singleTeacherUsername"></dd></div><div><dt>Set-password link sent</dt><dd id="singleTeacherInvite"></dd></div></dl><p>No password was created. The teacher follows the emailed link to choose their own, and cannot sign in until they do.</p></div><div class="formActions"><button id="singleTeacherResend" class="secondaryButton" type="button">Resend set-password link</button><button id="singleTeacherDownload" class="secondaryButton" type="button">Download account report</button></div></section>
      </article>`);
    document.getElementById('singleTeacherForm')?.addEventListener('submit', createTeacher);
  }

  new MutationObserver(mount).observe(workspace, { childList: true, subtree: true });
  mount();
})();
