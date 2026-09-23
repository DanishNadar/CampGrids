(() => {
  const notice = document.getElementById('authNotice');
  const classLoginForm = document.getElementById('classLoginForm');
  const teacherLoginForm = document.getElementById('teacherLoginForm');
  const teacherSendCode = document.getElementById('teacherSendCode');
  const teacherVerificationStep = document.getElementById('teacherVerificationStep');
  const teacherResendCode = document.getElementById('teacherResendCode');
  const teacherStartOver = document.getElementById('teacherStartOver');
  const teacherCredentialFields = [...teacherLoginForm.querySelectorAll('[data-teacher-credential]')];
  // Presentation only: travels with the credential fields but contains no input.
  const teacherCredentialHint = teacherLoginForm.querySelector('[data-credential-hint]');
  const teacherVerificationCode = teacherLoginForm.elements.verificationCode;
  const teacherState = { email: '', ticket: '', passwordChangePending: false };
  let teacherResendTimer = null;

  const queuedCodeNotice = (email, fresh = false) => `${fresh ? 'A new' : 'A'} verification-code request was accepted for ${email}. Delivery can take a few minutes; check Inbox, Spam, and any organization quarantine before resending.`;

  function setNotice(message, state = '') {
    notice.textContent = message;
    notice.className = `formNotice ${state}`;
  }

  function startTeacherResendCooldown(seconds = 60) {
    window.clearTimeout(teacherResendTimer);
    const label = teacherResendCode.dataset.defaultLabel || teacherResendCode.textContent;
    teacherResendCode.dataset.defaultLabel = label;
    let remaining = seconds;
    const update = () => {
      teacherResendCode.disabled = remaining > 0;
      teacherResendCode.textContent = remaining > 0 ? `Resend in ${remaining}s` : label;
      if (remaining > 0) {
        remaining -= 1;
        teacherResendTimer = window.setTimeout(update, 1000);
      }
    };
    update();
  }

  function resetTeacherResendCooldown() {
    window.clearTimeout(teacherResendTimer);
    teacherResendTimer = null;
    teacherResendCode.disabled = false;
    teacherResendCode.textContent = teacherResendCode.dataset.defaultLabel || teacherResendCode.textContent;
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
    resetTeacherResendCooldown();
    teacherState.email = '';
    teacherState.ticket = '';
    teacherVerificationCode.value = '';
    teacherVerificationCode.disabled = true;
    teacherVerificationStep.hidden = true;
    teacherSendCode.hidden = false;
    teacherCredentialFields.forEach((field) => {
      field.hidden = false;
      const input = field.querySelector('input');
      if (input) input.disabled = false;
    });
  }

  function showTeacherVerification() {
    teacherCredentialFields.forEach((field) => {
      field.hidden = true;
      const input = field.querySelector('input');
      if (input) input.disabled = true;
    });
    teacherSendCode.hidden = true;
    teacherVerificationStep.hidden = false;
    teacherVerificationCode.disabled = false;
    teacherVerificationCode.focus();
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

  /* A provisioned account has no password at all, so this is the only way in the
     first time. The confirmation is deliberately the same whether or not an account
     exists, so the form cannot be used to discover who has one. */
  /* Genuine password recovery for an existing account, which is the only flow a
     browser may trigger. A never-activated account is re-invited by an
     administrator instead, so the two never share an email. */

  /* Auth refuses a second reset for the same address within 60 seconds. Without
     this the button invites a click that can only fail, and the failure reads as
     the link never having been sent. */
  function holdResetButton(button, seconds = 60) {
    const label = button.dataset.defaultLabel || button.textContent;
    button.dataset.defaultLabel = label;
    let left = seconds;
    const tick = () => {
      button.disabled = left > 0;
      button.textContent = left > 0 ? `Sent — retry in ${left}s` : label;
      if (left > 0) { left -= 1; window.setTimeout(tick, 1000); }
    };
    tick();
  }

  async function sendPasswordRecovery(app, email) {
    const redirectTo = new URL('reset-password.html', window.location.href).href;
    const { error } = await app.getClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error && /rate limit|too many requests|for security purposes/i.test(error.message || '')) {
      throw new Error('A link was requested very recently. Wait a minute and try again.');
    }
    if (error) throw error;
  }

  async function requestStaffEmailCode(app) {
    const { data: request, error } = await app.getClient().functions.invoke('request-staff-email-2fa', { body: {} });
    if (error) throw new Error(await functionErrorMessage(error, 'We could not send the verification code. Please try again.'));
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
    /* A pending password change is recorded on the profile, so it covers every role
       rather than only teachers. The code is requested before the replacement:
       a password someone else issued is a shared secret until it is replaced, so
       replacing it has to prove more than knowing it. complete_password_setup()
       refuses without a recent verified code for exactly that reason. */
    /* Consumes the temporary password. See admin-login.js for why one sign-in is
       the right lifetime for a credential someone else chose. */
    const { data: setupState, error: setupError } = await app.getClient().rpc('begin_password_setup');
    if (setupError) throw setupError;
    const setup = Array.isArray(setupState) ? setupState[0] : setupState;
    if (setup?.blocked) {
      await app.getClient().auth.signOut();
      throw new Error(setup.reason || 'That temporary password can no longer be used.');
    }
    teacherState.passwordChangePending = Boolean(setup?.change_required);

    setNotice('Sending a verification code to your work email...');
    await requestStaffEmailCode(app);
    showTeacherVerification();
    startTeacherResendCooldown();
    setNotice(queuedCodeNotice(teacherState.email), 'isSuccess');
  }


  /* Everything that means "there is no longer a signed-in session behind this
     page": the database guards, the Auth client, and an expired or rejected JWT.
     They arrive as plain messages from three different layers, so they are matched
     rather than typed. */
  function sessionLost(error) {
    const text = `${error?.name || ''} ${error?.message || ''} ${error?.code || ''}`;
    return /Sign in (with your password |)?before|Auth session missing|session_not_found|JWT expired|invalid claim|token is expired|refresh_token_not_found|Invalid Refresh Token|not authenticated|401/i.test(text);
  }

  async function teacherStillSignedIn(app) {
    let session = null;
    try { session = await app.getSession(); } catch (_) { session = null; }
    if (session) return true;
    returnToTeacherSignIn(app, 'Your sign-in timed out. Enter your work email and password again to continue.');
    return false;
  }

  function returnToTeacherSignIn(app, message) {
    const email = teacherState.email || String(new FormData(teacherLoginForm).get('email') || '');
    if (app?.configured?.()) { try { app.getClient().auth.signOut(); } catch (_) { /* already gone */ } }
    resetTeacherVerification();
    if (email && teacherLoginForm.elements.email) teacherLoginForm.elements.email.value = email;
    setNotice(message, 'isError');
    (teacherLoginForm.elements.password || teacherLoginForm.elements.email)?.focus();
  }

  async function verifyTeacherEmailCode(app) {
    const code = String(teacherVerificationCode.value || '').replace(/\D/g, '');
    if (!/^\d{6,8}$/.test(code)) throw new Error('Enter the verification code from your email.');
    if (!await teacherStillSignedIn(app)) return;
    setNotice('Verifying code...');
    const { error } = await app.getClient().auth.verifyOtp({ email: teacherState.email, token: code, type: 'email' });
    if (error) throw new Error(error.message || 'The verification code was not accepted.');
    const { data: verified, error: verifiedError } = await app.getClient().rpc('complete_staff_email_2fa', { p_ticket: teacherState.ticket });
    if (verifiedError || !verified) throw new Error('The email verification session could not be confirmed. Please request a new code.');
    const profile = await app.getProfile(true);
    if (profile?.role !== 'teacher' || !profile.is_active) {
      await app.getClient().auth.signOut();
      throw new Error('This is not an active teacher account.');
    }

    /* The mailbox is proven, so the issued password can now be replaced. */
    if (teacherState.passwordChangePending) {
      setNotice('Code accepted. Choose a personal password to finish.');
      window.location.replace('settings.html?password-reset=staff');
      return;
    }
    window.location.assign(app.dashboardHref('teacher'));
  }

  teacherLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const app = window.CampGridsApp;
    if (!app.configured()) return setNotice(app.configurationMessage, 'isError');
    try {
      if (teacherState.ticket) await verifyTeacherEmailCode(app);
      else await beginTeacherLogin(app, new FormData(teacherLoginForm));
    } catch (error) {
      if (sessionLost(error)) {
        returnToTeacherSignIn(app, 'Your sign-in timed out before the code was accepted. Enter your work email and password again to continue.');
        return;
      }
      setNotice(error.message || 'We could not sign you in.', 'isError');
    }
  });

  teacherResendCode.addEventListener('click', async () => {
    const app = window.CampGridsApp;
    if (!teacherState.ticket || !app.configured()) return;
    try {
      setNotice('Sending a new verification code...');
      await requestStaffEmailCode(app);
      teacherVerificationCode.value = '';
      teacherVerificationCode.focus();
      startTeacherResendCooldown();
      setNotice(queuedCodeNotice(teacherState.email, true), 'isSuccess');
    } catch (error) {
      if (sessionLost(error)) {
        returnToTeacherSignIn(app, 'Your sign-in timed out. Enter your work email and password again to continue.');
        return;
      }
      if (/wait 60 seconds/i.test(error.message || '')) startTeacherResendCooldown();
      setNotice(error.message || 'We could not resend the verification code.', 'isError');
    }
  });

  document.getElementById('teacherSetPassword')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const app = window.CampGridsApp;
    const identity = String(new FormData(teacherLoginForm).get('identity') || '').trim().toLowerCase();
    // The identity field also accepts a username, which cannot be emailed.
    if (!identity.includes('@')) {
      setNotice('Enter your work email address above first. A username cannot be emailed a link.', 'isError');
      return;
    }
    button.disabled = true;
    try {
      setNotice('Sending a set-password link...');
      await sendPasswordRecovery(app, identity);
      /* Deliberately not conditional on the account existing: saying so either way
         would turn this form into a way to discover who has an account. */
      setNotice(`A set-password link for ${identity} has been sent from MSI CampGrids. Delivery usually takes under a minute but can take several; look in Spam and any organization quarantine before requesting another. If your account is new and never had a password, ask an MSI administrator to resend your invitation instead.`, 'isSuccess');
      holdResetButton(button);
      return;
    } catch (error) {
      setNotice(error.message || 'The password reset link could not be sent.', 'isError');
      button.disabled = false;
    }
  });

  /* The usual way this happens is a tab left open. Checking when it is looked at
     again means the page has already recovered by the time anything is clicked. */
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!teacherState.ticket) return;
    const app = window.CampGridsApp;
    if (!app?.configured()) return;
    await teacherStillSignedIn(app);
  });

  teacherStartOver.addEventListener('click', async () => {
    if (window.CampGridsApp?.configured()) await window.CampGridsApp.getClient().auth.signOut();
    resetTeacherVerification();
    setNotice('');
  });

  resetTeacherVerification();
  redirectForSession().catch((error) => setNotice(error.message, 'isError'));
})();
