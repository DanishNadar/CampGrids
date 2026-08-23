(() => {
  const notice = document.getElementById('authNotice');
  const classLoginForm = document.getElementById('classLoginForm');
  const teacherLoginForm = document.getElementById('teacherLoginForm');
  const registerForm = document.getElementById('registerForm');

  function setNotice(message, state = '') {
    notice.textContent = message;
    notice.className = `formNotice ${state}`;
  }

  function normalizeUsername(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function setActiveTab(tab) {
    classLoginForm.hidden = tab !== 'class';
    teacherLoginForm.hidden = tab !== 'teacher';
    registerForm.hidden = tab !== 'register';
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
    const profile = await window.CampGridsApp.getProfile();
    if (profile) window.location.assign(window.CampGridsApp.dashboardHref(profile.role));
  }

  classLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.CampGridsApp.configured()) return setNotice(window.CampGridsApp.configurationMessage, 'isError');
    const form = new FormData(classLoginForm);
    const username = normalizeUsername(form.get('username'));
    const password = String(form.get('password') || '');
    const classCode = String(form.get('classCode') || '').trim().toUpperCase();
    if (!username || !password || !classCode) return setNotice('Enter your class code, username, and password.', 'isError');

    setNotice('Entering your class…');
    try {
      const { error } = await window.CampGridsApp.getClient().auth.signInWithPassword({ email: `${username}@students.campgrids.local`, password });
      if (error) throw error;
      const profile = await window.CampGridsApp.getProfile(true);
      if (!profile?.is_active) throw new Error('This account is inactive. Please contact an MSI administrator.');
      if (profile.role !== 'student') throw new Error('This is not a student account.');
      const { data: classId, error: classError } = await window.CampGridsApp.getClient().rpc('verify_student_class_code', { p_class_code: classCode });
      if (classError || !classId) {
        await window.CampGridsApp.getClient().auth.signOut();
        throw new Error('That class code is not connected to this student account.');
      }
      window.localStorage.setItem('campgrids-active-class', classId);
      await window.CampGridsApp.logStudentEvent('signed_in', { source: 'class_login', class_code: classCode }, classId);
      window.location.assign(window.CampGridsApp.dashboardHref('student'));
    } catch (error) {
      setNotice(error.message || 'We could not sign you in.', 'isError');
    }
  });

  teacherLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.CampGridsApp.configured()) return setNotice(window.CampGridsApp.configurationMessage, 'isError');
    const form = new FormData(teacherLoginForm); const identity = String(form.get('identity') || '').trim();
    try {
      setNotice('Signing you in…');
      let email = identity.toLowerCase();
      if (!identity.includes('@')) {
        const { data, error } = await window.CampGridsApp.getClient().rpc('resolve_login_email', { p_login_identifier: identity });
        if (error || !data) throw new Error('We could not find that teacher username. Try your email address instead.');
        email = data;
      }
      const { error } = await window.CampGridsApp.getClient().auth.signInWithPassword({ email, password: String(form.get('password') || '') });
      if (error) throw error;
      const profile = await window.CampGridsApp.getProfile(true);
      if (!profile?.is_active || profile.role !== 'teacher') {
        await window.CampGridsApp.getClient().auth.signOut();
        throw new Error('This is not an active teacher account.');
      }
      window.location.assign(window.CampGridsApp.dashboardHref('teacher'));
    } catch (error) { setNotice(error.message || 'We could not sign you in.', 'isError'); }
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
        options: {
          /* Send confirmation back to this CampGrids account page instead of
             falling back to an unrelated project configured as Site URL. */
          emailRedirectTo: new URL('auth.html', window.location.href).href,
          data: {
            role: 'teacher', username,
            first_name: String(form.get('firstName')).trim(),
            last_name: String(form.get('lastName')).trim(),
          }
        },
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
