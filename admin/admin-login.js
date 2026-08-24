(() => {
  const form = document.getElementById('adminLoginForm');
  const notice = document.getElementById('adminNotice');
  const setNotice = (message, state = '') => { notice.textContent = message; notice.className = `formNotice ${state}`; };
  const normalizeUsername = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const app = window.CampGridsApp;
    if (!app.configured()) return setNotice(app.configurationMessage, 'isError');
    const data = new FormData(form); const username = normalizeUsername(data.get('identity'));
    if (!username) return setNotice('Enter your administrator username.', 'isError');
    try {
      setNotice('Signing in…');
      const result = await app.getClient().rpc('resolve_login_email', { p_login_identifier: username });
      if (result.error || !result.data) throw new Error('We could not sign you in with those credentials.');
      const email = result.data;
      const { error } = await app.getClient().auth.signInWithPassword({ email, password: String(data.get('password') || '') });
      if (error) throw error;
      const profile = await app.getProfile(true);
      if (profile?.role !== 'admin' || !profile.is_active) {
        await app.getClient().auth.signOut();
        throw new Error('This account does not have MSI administrator access.');
      }
      window.location.assign('../dashboard.html');
    } catch (error) { setNotice(error.message || 'We could not sign you in.', 'isError'); }
  });
})();
