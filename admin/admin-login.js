(() => {
  const form = document.getElementById('adminLoginForm');
  const notice = document.getElementById('adminNotice');
  const sendCodeButton = document.getElementById('adminSendCode');
  const verificationStep = document.getElementById('adminVerificationStep');
  const resendButton = document.getElementById('adminResendCode');
  const startOverButton = document.getElementById('adminStartOver');
  const credentialFields = [...form.querySelectorAll('[data-admin-credential]')];
  // Presentation only: shown and hidden with the credential fields, but it is not
  // one of them and holds no input.
  const credentialHint = form.querySelector('[data-credential-hint]');
  const verificationCode = form.elements.verificationCode;
  const state = { email: '', ticket: '', passwordChangePending: false };
  let resendTimer = null;
  const setNotice = (message, stateName = '') => { notice.textContent = message; notice.className = `formNotice ${stateName}`; };
  const queuedCodeNotice = (email, fresh = false) => `${fresh ? 'A new' : 'A'} verification-code request was accepted for ${email}. Delivery can take a few minutes; check Inbox, Spam, and any organization quarantine before resending.`;
  const functionErrorMessage = async (error, fallback) => {
    try {
      const payload = await error?.context?.json?.();
      return payload?.error || payload?.message || error?.message || fallback;
    } catch (_) {
      return error?.message || fallback;
    }
  };

  function startResendCooldown(seconds = 60) {
    window.clearTimeout(resendTimer);
    const label = resendButton.dataset.defaultLabel || resendButton.textContent;
    resendButton.dataset.defaultLabel = label;
    let remaining = seconds;
    const update = () => {
      resendButton.disabled = remaining > 0;
      resendButton.textContent = remaining > 0 ? `Resend in ${remaining}s` : label;
      if (remaining > 0) {
        remaining -= 1;
        resendTimer = window.setTimeout(update, 1000);
      }
    };
    update();
  }

  function resetResendCooldown() {
    window.clearTimeout(resendTimer);
    resendTimer = null;
    resendButton.disabled = false;
    resendButton.textContent = resendButton.dataset.defaultLabel || resendButton.textContent;
  }

  function resetVerificationForm() {
    resetResendCooldown();
    state.email = '';
    state.ticket = '';
    verificationCode.value = '';
    verificationCode.disabled = true;
    verificationStep.hidden = true;
    sendCodeButton.hidden = false;
    credentialFields.forEach((field) => {
      field.hidden = false;
      const input = field.querySelector('input');
      if (input) input.disabled = false;
    });
    if (credentialHint) credentialHint.hidden = false;
  }

  function showVerificationForm() {
    credentialFields.forEach((field) => {
      field.hidden = true;
      const input = field.querySelector('input');
      if (input) input.disabled = true;
    });
    if (credentialHint) credentialHint.hidden = true;
    sendCodeButton.hidden = true;
    verificationStep.hidden = false;
    verificationCode.disabled = false;
    verificationCode.focus();
  }


  /* Everything that means "there is no longer a signed-in session behind this
     page": the database guards, the Auth client, and an expired or rejected JWT.
     They arrive as plain messages from three different layers, so they are matched
     rather than typed. */
  function sessionLost(error) {
    const text = `${error?.name || ''} ${error?.message || ''} ${error?.code || ''}`;
    return /Sign in (with your password |)?before|Auth session missing|session_not_found|JWT expired|invalid claim|token is expired|refresh_token_not_found|Invalid Refresh Token|not authenticated|401/i.test(text);
  }

  /* Returns false when the session has gone, having already put the page back to
     the sign-in step. The email is carried across so only the password has to be
     typed again. */
  async function stillSignedIn(app) {
    let session = null;
    try { session = await app.getSession(); } catch (_) { session = null; }
    if (session) return true;
    returnToSignIn(app, 'Your sign-in timed out. Enter your administrator email and password again to continue.');
    return false;
  }

  /* One way back from every dead end: the credentials step, with a reason. */
  function returnToSignIn(app, message) {
    const email = state.email || String(new FormData(form).get('email') || '');
    if (app?.configured?.()) { try { app.getClient().auth.signOut(); } catch (_) { /* already gone */ } }
    resetVerificationForm();
    if (email && form.elements.email) form.elements.email.value = email;
    setNotice(message, 'isError');
    (form.elements.password || form.elements.email)?.focus();
  }

  async function requestEmailCode(app) {
    const { data: request, error } = await app.getClient().functions.invoke('request-staff-email-2fa', { body: {} });
    if (error) throw new Error(await functionErrorMessage(error, 'We could not send the verification code. Please try again.'));
    if (request?.error) throw new Error(request.error);
    if (!request?.email || !request?.ticket) throw new Error('We could not start email verification. Please try again.');
    state.email = request.email;
    state.ticket = request.ticket;
  }

  /* Same as the teacher entrance: a provisioned administrator has no password, so
     the emailed link is the only first way in. settings.html sits one level up. */
  /* Genuine password recovery for an existing administrator account. A
     never-activated account is re-invited from the dashboard instead. */

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
    const redirectTo = new URL('../reset-password.html', window.location.href).href;
    const { error } = await app.getClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error && /rate limit|too many requests|for security purposes/i.test(error.message || '')) {
      throw new Error('A link was requested very recently. Wait a minute and try again.');
    }
    if (error) throw error;
  }

  async function beginAdminLogin(app, data) {
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');
    if (!email || !email.includes('@') || !password) throw new Error('Enter your administrator email address and password.');
    setNotice('Checking your administrator account...');
    await app.getClient().auth.signOut();
    const { error: signInError } = await app.getClient().auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    const profile = await app.getProfile(true);
    if (!profile?.is_active) {
      await app.getClient().auth.signOut();
      throw new Error('This CampGrids account is inactive. Contact MSI IT for access.');
    }
    if (profile.role !== 'admin') {
      await app.getClient().auth.signOut();
      throw new Error(`The signed-in email (${email}) is not an MSI administrator account. Promote this exact email in Supabase before trying again.`);
    }
    /* An administrator holding a password IT issued has to replace it before
       anything else - but not before proving the mailbox is theirs. That password
       is known to whoever issued it and to anyone who saw it in transit, so if the
       code came afterwards, knowing the password alone would be enough to set a new
       one and take the account. complete_password_setup() refuses without a recent
       verified code, so the code is requested first and the replacement happens
       after it is accepted. */
    /* This call consumes the temporary password: a credential someone else chose
       is good for one sign-in, not for as long as its owner leaves it unchanged.
       A second attempt after the grace is refused here and the credential is
       removed from Auth, so the refusal is real rather than a screen. */
    const { data: setupState, error: setupError } = await app.getClient().rpc('begin_password_setup');
    if (setupError) throw setupError;
    const setup = Array.isArray(setupState) ? setupState[0] : setupState;
    if (setup?.blocked) {
      await app.getClient().auth.signOut();
      throw new Error(setup.reason || 'That temporary password can no longer be used.');
    }
    state.passwordChangePending = Boolean(setup?.change_required);

    setNotice('Sending a verification code to your MSI email...');
    await requestEmailCode(app);
    showVerificationForm();
    startResendCooldown();
    setNotice(queuedCodeNotice(state.email), 'isSuccess');
  }

  async function finishAdminLogin(app) {
    const { data: verified, error: verifiedError } = await app.getClient().rpc('complete_staff_email_2fa', { p_ticket: state.ticket });
    if (verifiedError || !verified) throw new Error('The email verification session could not be confirmed. Please request a new code.');
    const profile = await app.getProfile(true);
    if (profile?.role !== 'admin' || !profile.is_active) {
      await app.getClient().auth.signOut();
      throw new Error('This account does not have MSI administrator access.');
    }

    /* Now that the mailbox is proven, the issued password can be replaced. Until
       it is, must_change_password keeps is_staff_2fa_verified false and the
       workspace would refuse every query anyway. */
    if (state.passwordChangePending) {
      setNotice('Code accepted. Choose a personal password to finish.');
      window.location.replace('../settings.html?password-reset=staff');
      return;
    }
    window.location.assign('../dashboard.html');
  }

  async function verifyEmailCode(app) {
    const code = String(verificationCode.value || '').replace(/\D/g, '');
    if (!/^\d{6,8}$/.test(code)) throw new Error('Enter the verification code from your email.');
    if (!await stillSignedIn(app)) return;
    setNotice('Verifying code...');
    const { error } = await app.getClient().auth.verifyOtp({ email: state.email, token: code, type: 'email' });
    if (error) throw new Error(error.message || 'The verification code was not accepted.');
    await finishAdminLogin(app);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const app = window.CampGridsApp;
    if (!app.configured()) return setNotice(app.configurationMessage, 'isError');
    try {
      if (state.ticket) await verifyEmailCode(app);
      else await beginAdminLogin(app, new FormData(form));
    } catch (error) {
      if (sessionLost(error)) {
        returnToSignIn(app, 'Your sign-in timed out before the code was accepted. Enter your administrator email and password again to continue.');
        return;
      }
      setNotice(error.message || 'We could not sign you in.', 'isError');
    }
  });

  resendButton.addEventListener('click', async () => {
    const app = window.CampGridsApp;
    if (!state.ticket || !app.configured()) return;
    try {
      setNotice('Sending a new verification code...');
      await requestEmailCode(app);
      verificationCode.value = '';
      verificationCode.focus();
      startResendCooldown();
      setNotice(queuedCodeNotice(state.email, true), 'isSuccess');
    } catch (error) {
      if (sessionLost(error)) {
        returnToSignIn(app, 'Your sign-in timed out. Enter your administrator email and password again to continue.');
        return;
      }
      if (/wait 60 seconds/i.test(error.message || '')) startResendCooldown();
      setNotice(error.message || 'We could not resend the verification code.', 'isError');
    }
  });

  document.getElementById('adminSetPassword')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const app = window.CampGridsApp;
    const email = String(new FormData(form).get('email') || '').trim().toLowerCase();
    if (!email.includes('@')) {
      setNotice('Enter your administrator email address above first.', 'isError');
      return;
    }
    button.disabled = true;
    try {
      setNotice('Sending a set-password link...');
      await sendPasswordRecovery(app, email);
      /* Deliberately not conditional on the account existing: saying so either way
         would turn this form into a way to discover which addresses are
         administrators. */
      setNotice(`A set-password link for ${email} has been sent from MSI CampGrids. Delivery usually takes under a minute but can take several; look in Spam and any organization quarantine before requesting another.`, 'isSuccess');
      /* Returns rather than falling through: a finally that re-enables the button
         would immediately undo the cooldown it was just put into. */
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
    if (!state.ticket) return;
    const app = window.CampGridsApp;
    if (!app?.configured()) return;
    await stillSignedIn(app);
  });

  startOverButton.addEventListener('click', async () => {
    if (window.CampGridsApp?.configured()) await window.CampGridsApp.getClient().auth.signOut();
    resetVerificationForm();
    setNotice('');
  });

  // Older deployments used a GET fallback when their relative script path did
  // not resolve at /admin. Remove any legacy credentials from the address bar
  // as soon as the corrected script loads.
  const legacyUrl = new URL(window.location.href);
  const hadLegacyCredentials = legacyUrl.searchParams.delete('identity') || legacyUrl.searchParams.delete('password');
  if (hadLegacyCredentials) window.history.replaceState({}, document.title, `${legacyUrl.pathname}${legacyUrl.search}${legacyUrl.hash}`);

  resetVerificationForm();
})();
