(() => {
  const form = document.getElementById('adminLoginForm');
  const notice = document.getElementById('adminNotice');
  const sendCodeButton = document.getElementById('adminSendCode');
  const verificationStep = document.getElementById('adminVerificationStep');
  const resendButton = document.getElementById('adminResendCode');
  const startOverButton = document.getElementById('adminStartOver');
  const credentialFields = [...form.querySelectorAll('[data-admin-credential]')];
  const state = { email: '', ticket: '' };
  const setNotice = (message, stateName = '') => { notice.textContent = message; notice.className = `formNotice ${stateName}`; };
  const functionErrorMessage = async (error, fallback) => {
    try {
      const payload = await error?.context?.json?.();
      return payload?.error || payload?.message || error?.message || fallback;
    } catch (_) {
      return error?.message || fallback;
    }
  };

  function resetVerificationForm() {
    state.email = '';
    state.ticket = '';
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
  }

  async function requestEmailCode(app) {
    const redirectTo = new URL('/verify.html', window.location.origin).href;
    const { data: request, error } = await app.getClient().functions.invoke('request-staff-email-2fa', { body: { redirectTo } });
    if (error) throw new Error(await functionErrorMessage(error, 'We could not send the verification email. Please try again.'));
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
    setNotice('Sending a secure sign-in link to your MSI email...');
    await requestEmailCode(app);
    showVerificationForm();
    setNotice(`A secure sign-in link was sent to ${state.email}.`, 'isSuccess');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const app = window.CampGridsApp;
    if (!app.configured()) return setNotice(app.configurationMessage, 'isError');
    try {
      await beginAdminLogin(app, new FormData(form));
    } catch (error) {
      setNotice(error.message || 'We could not sign you in.', 'isError');
    }
  });

  resendButton.addEventListener('click', async () => {
    const app = window.CampGridsApp;
    if (!state.ticket || !app.configured()) return;
    try {
      setNotice('Sending a new verification email...');
      await requestEmailCode(app);
      setNotice(`A new sign-in link was sent to ${state.email}.`, 'isSuccess');
    } catch (error) {
      setNotice(error.message || 'We could not resend the verification email.', 'isError');
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
