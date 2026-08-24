(() => {
  const form = document.getElementById('adminLoginForm');
  const notice = document.getElementById('adminNotice');
  const sendCodeButton = document.getElementById('adminSendCode');
  const verificationStep = document.getElementById('adminVerificationStep');
  const resendButton = document.getElementById('adminResendCode');
  const startOverButton = document.getElementById('adminStartOver');
  const credentialFields = [...form.querySelectorAll('[data-admin-credential]')];
  const verificationCode = form.elements.verificationCode;
  const state = { email: '', ticket: '' };
  let resendTimer = null;
  const setNotice = (message, stateName = '') => { notice.textContent = message; notice.className = `formNotice ${stateName}`; };
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
      field.querySelector('input').disabled = false;
    });
  }

  function showVerificationForm() {
    credentialFields.forEach((field) => {
      field.hidden = true;
      field.querySelector('input').disabled = true;
    });
    sendCodeButton.hidden = true;
    verificationStep.hidden = false;
    verificationCode.disabled = false;
    verificationCode.focus();
  }

  async function requestEmailCode(app) {
    const { data: request, error } = await app.getClient().functions.invoke('request-staff-email-2fa', { body: {} });
    if (error) throw new Error(await functionErrorMessage(error, 'We could not send the verification code. Please try again.'));
    if (request?.error) throw new Error(request.error);
    if (!request?.email || !request?.ticket) throw new Error('We could not start email verification. Please try again.');
    state.email = request.email;
    state.ticket = request.ticket;
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
    setNotice('Sending a verification code to your MSI email...');
    await requestEmailCode(app);
    showVerificationForm();
    startResendCooldown();
    setNotice(`A verification code was accepted for delivery to ${state.email}. Check Inbox, Spam, and any organization quarantine.`, 'isSuccess');
  }

  async function finishAdminLogin(app) {
    const { data: verified, error: verifiedError } = await app.getClient().rpc('complete_staff_email_2fa', { p_ticket: state.ticket });
    if (verifiedError || !verified) throw new Error('The email verification session could not be confirmed. Please request a new code.');
    const profile = await app.getProfile(true);
    if (profile?.role !== 'admin' || !profile.is_active) {
      await app.getClient().auth.signOut();
      throw new Error('This account does not have MSI administrator access.');
    }
    window.location.assign('../dashboard.html');
  }

  async function verifyEmailCode(app) {
    const code = String(verificationCode.value || '').replace(/\D/g, '');
    if (!/^\d{6,8}$/.test(code)) throw new Error('Enter the verification code from your email.');
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
      setNotice(`A new verification code was accepted for delivery to ${state.email}. Check Inbox, Spam, and any organization quarantine.`, 'isSuccess');
    } catch (error) {
      if (/wait 60 seconds/i.test(error.message || '')) startResendCooldown();
      setNotice(error.message || 'We could not resend the verification code.', 'isError');
    }
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
