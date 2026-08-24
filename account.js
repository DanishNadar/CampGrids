(() => {
  const notice = document.getElementById('authNotice');
  const classLoginForm = document.getElementById('classLoginForm');
  const teacherLoginForm = document.getElementById('teacherLoginForm');
  const teacherSendCode = document.getElementById('teacherSendCode');
  const teacherVerificationStep = document.getElementById('teacherVerificationStep');
  const teacherResendCode = document.getElementById('teacherResendCode');
  const teacherStartOver = document.getElementById('teacherStartOver');
  const teacherCredentialFields = [...teacherLoginForm.querySelectorAll('[data-teacher-credential]')];
  const teacherState = { email: '', ticket: '' };

  function setNotice(message, state = '') {
    notice.textContent = message;
    notice.className = `formNotice ${state}`;
  }

  function normalizeUsername(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async function functionErrorMessage(error, fallback) {
    try {
      const payload = await error?.context?.json?.();
      return payload?.error || payload?.message || error?.message || fallback;
    } catch (_) {
      return error?.message || fallback;
    }
  }

  function resetTeacherVerification() {
    teacherState.email = '';
    teacherState.ticket = '';
    teacherVerificationStep.hidden = true;
    teacherSendCode.hidden = false;
    teacherCredentialFields.forEach((field) => {
      field.hidden = false;
      field.querySelector('input').disabled = false;
    });
  }

  function showTeacherVerification() {
    teacherCredentialFields.forEach((field) => {
      field.hidden = true;
      field.querySelector('input').disabled = true;
    });
    teacherSendCode.hidden = true;
    teacherVerificationStep.hidden = false;
  }

  function setActiveTab(tab) {
    classLoginForm.hidden = tab !== 'class';
    teacherLoginForm.hidden = tab !== 'teacher';
    document.querySelectorAll('[data-auth-tab]').forEach((button) => {
      const active = button.dataset.authTab === tab;
      button.classList.toggle('isActive', active);
      button.setAttribute('aria-selected', String(active));
    });
    setNotice('');
  }

  document.querySelectorAll('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.authTab)));

  async function redirectForSession() {
    if (!window.CampGridsApp.configured()) return;
    const app = window.CampGridsApp;
    const profile = await app.getProfile();
    if (!profile) return;
    if (profile.role === 'teacher' || profile.role === 'admin') {
      const { data: verified, error } = await app.getClient().rpc('is_staff_2fa_verified');
      if (error || !verified) {
        await app.getClient().auth.signOut();
        return;
      }
    }
    window.location.assign(app.dashboardHref(profile.role));
  }

  async function requestStaffEmailCode(app) {
    const redirectTo = new URL('/verify.html', window.location.origin).href;
    const { data: request, error } = await app.getClient().functions.invoke('request-staff-email-2fa', { body: { redirectTo } });
    if (error) throw new Error(await functionErrorMessage(error, 'We could not send the verification email. Please try again.'));
    if (request?.error) throw new Error(request.error);
    if (!request?.email || !request?.ticket) throw new Error('We could not start email verification. Please try again.');
    teacherState.email = request.email;
    teacherState.ticket = request.ticket;
  }

  classLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.CampGridsApp.configured()) return setNotice(window.CampGridsApp.configurationMessage, 'isError');
    const form = new FormData(classLoginForm);
    const username = normalizeUsername(form.get('username'));
    const classCode = String(form.get('classCode') || '').trim().toUpperCase();
    if (!username || !classCode) return setNotice('Enter your class code and student username.', 'isError');

    setNotice('Entering your class...');
    try {
      const { data, error } = await window.CampGridsApp.getClient().functions.invoke('student-class-login', {
        body: { username, classCode, redirectTo: new URL('auth.html', window.location.href).href },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.actionLink || !data?.classId) throw new Error('We could not start your class sign-in. Please try again.');
      window.localStorage.setItem('campgrids-active-class', data.classId);
      window.location.assign(data.actionLink);
    } catch (error) {
      setNotice(error.message || 'We could not sign you in.', 'isError');
    }
  });

  async function beginTeacherLogin(app, formData) {
    const identity = String(formData.get('identity') || '').trim();
    const password = String(formData.get('password') || '');
    if (!identity || !password) throw new Error('Enter your teacher username or email address and password.');
    setNotice('Checking your teacher account...');
    await app.getClient().auth.signOut();
    let email = identity.toLowerCase();
    if (!identity.includes('@')) {
      const { data, error } = await app.getClient().rpc('resolve_login_email', { p_login_identifier: identity });
      if (error || !data) throw new Error('We could not find that teacher username. Try your email address instead.');
      email = data;
    }
    const { error } = await app.getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await app.getProfile(true);
    if (!profile?.is_active || profile.role !== 'teacher') {
      await app.getClient().auth.signOut();
      throw new Error('This is not an active teacher account.');
    }
    setNotice('Sending a secure sign-in link to your work email...');
    await requestStaffEmailCode(app);
    showTeacherVerification();
    setNotice(`A secure sign-in link was sent to ${teacherState.email}.`, 'isSuccess');
  }

  teacherLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const app = window.CampGridsApp;
    if (!app.configured()) return setNotice(app.configurationMessage, 'isError');
    try {
      await beginTeacherLogin(app, new FormData(teacherLoginForm));
    } catch (error) {
      setNotice(error.message || 'We could not sign you in.', 'isError');
    }
  });

  teacherResendCode.addEventListener('click', async () => {
    const app = window.CampGridsApp;
    if (!teacherState.ticket || !app.configured()) return;
    try {
      setNotice('Sending a new verification email...');
      await requestStaffEmailCode(app);
      setNotice(`A new sign-in link was sent to ${teacherState.email}.`, 'isSuccess');
    } catch (error) {
      setNotice(error.message || 'We could not resend the verification email.', 'isError');
    }
  });

  teacherStartOver.addEventListener('click', async () => {
    if (window.CampGridsApp?.configured()) await window.CampGridsApp.getClient().auth.signOut();
    resetTeacherVerification();
    setNotice('');
  });

  resetTeacherVerification();
  redirectForSession().catch((error) => setNotice(error.message, 'isError'));
})();
