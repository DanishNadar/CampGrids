(() => {
  const notice = document.getElementById('authNotice');
  const classLoginForm = document.getElementById('classLoginForm');
  const teacherLoginForm = document.getElementById('teacherLoginForm');

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
    const classCode = String(form.get('classCode') || '').trim().toUpperCase();
    if (!username || !classCode) return setNotice('Enter your class code and student username.', 'isError');

    setNotice('Entering your class…');
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

  redirectForSession().catch((error) => setNotice(error.message, 'isError'));
})();
