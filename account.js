(() => {
  const notice = document.getElementById('authNotice');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginKind = document.getElementById('loginKind');
  const identityLabel = document.getElementById('identityLabel');
  const loginIdentity = document.getElementById('loginIdentity');

  function setNotice(message, state = '') {
    notice.textContent = message;
    notice.className = `formNotice ${state}`;
  }

  function normalizeUsername(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function setActiveTab(tab) {
    const signingIn = tab === 'login';
    loginForm.hidden = !signingIn;
    registerForm.hidden = signingIn;
    document.querySelectorAll('[data-auth-tab]').forEach((button) => {
      const active = button.dataset.authTab === tab;
      button.classList.toggle('isActive', active);
      button.setAttribute('aria-selected', String(active));
    });
    setNotice('');
  }

  loginKind.addEventListener('change', () => {
    const student = loginKind.value === 'student';
    identityLabel.textContent = student ? 'Student username' : 'Email address or staff username';
    loginIdentity.placeholder = student ? 'e.g. fyu' : 'name@msi.org or fannieyu';
  });
  document.querySelectorAll('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.authTab)));

  async function redirectForSession() {
    if (!window.CampGridsApp.configured()) return;
    const profile = await window.CampGridsApp.getProfile();
    if (profile) window.location.assign(window.CampGridsApp.dashboardHref(profile.role));
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.CampGridsApp.configured()) return setNotice(window.CampGridsApp.configurationMessage, 'isError');
    const form = new FormData(loginForm);
    const kind = form.get('kind');
    const enteredIdentity = String(form.get('identity') || '').trim();
    const password = String(form.get('password') || '');
    if (!enteredIdentity || !password) return setNotice('Enter your sign-in details.', 'isError');

    setNotice('Signing you in…');
    try {
      let email;
      if (kind === 'student') {
        const username = normalizeUsername(enteredIdentity);
        if (!username) throw new Error('Enter the student username using letters and numbers.');
        email = `${username}@students.campgrids.local`;
      } else if (enteredIdentity.includes('@')) {
        email = enteredIdentity.toLowerCase();
      } else {
        const { data, error } = await window.CampGridsApp.getClient().rpc('resolve_login_email', { p_login_identifier: enteredIdentity });
        if (error || !data) throw new Error('We could not find that staff username. Try your email address instead.');
        email = data;
      }
      const { error } = await window.CampGridsApp.getClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await window.CampGridsApp.getProfile(true);
      if (!profile?.is_active) throw new Error('This account is inactive. Please contact an MSI administrator.');
      if (kind === 'student' && profile.role !== 'student') throw new Error('Use the Teacher or MSI staff option for this account.');
      if (kind === 'staff' && profile.role === 'student') throw new Error('Use the Student option for this account.');
      await window.CampGridsApp.logStudentEvent('signed_in', { source: 'account_page' });
      window.location.assign(window.CampGridsApp.dashboardHref(profile.role));
    } catch (error) {
      setNotice(error.message || 'We could not sign you in.', 'isError');
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.CampGridsApp.configured()) return setNotice(window.CampGridsApp.configurationMessage, 'isError');
    const form = new FormData(registerForm);
    const username = normalizeUsername(form.get('username'));
    if (username.length < 3) return setNotice('Use at least three letters or numbers for the teacher username.', 'isError');
    setNotice('Creating your teacher account…');
    try {
      const { data, error } = await window.CampGridsApp.getClient().auth.signUp({
        email: String(form.get('email')).trim().toLowerCase(),
        password: String(form.get('password')),
        options: { data: {
          role: 'teacher', username,
          first_name: String(form.get('firstName')).trim(),
          last_name: String(form.get('lastName')).trim(),
        } },
      });
      if (error) throw error;
      if (data.session) {
        setNotice('Your teacher account is ready. Opening your dashboard…', 'isSuccess');
        window.setTimeout(() => window.location.assign('dashboard.html'), 650);
      } else {
        setNotice('Check your email to confirm the account, then sign in.', 'isSuccess');
      }
    } catch (error) {
      setNotice(error.message || 'We could not create the account.', 'isError');
    }
  });

  redirectForSession().catch((error) => setNotice(error.message, 'isError'));
})();
