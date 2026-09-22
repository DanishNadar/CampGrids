(() => {
  const host = document.getElementById('settingsPage');
  const app = window.CampGridsApp;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

  function notice(message, type = '') {
    const node = document.getElementById('settingsNotice');
    if (!node) return;
    node.textContent = message;
    node.className = `workspaceNotice ${type}`;
  }

  async function render() {
    if (!app.configured()) {
      host.innerHTML = `<section class="loadingState"><p class="eyebrow">Setup required</p><h1>Connect Supabase to open settings.</h1><p>${escapeHtml(app.configurationMessage)}</p></section>`;
      return;
    }
    /* Arriving from the emailed set-password link, the token is in the URL fragment
       and supabase-js exchanges it for a session asynchronously. Checking once can
       therefore miss it and bounce a legitimate arrival back to sign-in, so when a
       recovery token is present the check is retried briefly. */
    const arrivingFromEmail = /type=recovery|access_token=/.test(window.location.hash || '');
    let session = await app.getSession();
    if (!session && arrivingFromEmail) {
      for (let attempt = 0; attempt < 20 && !session; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        session = await app.getSession();
      }
    }
    if (!session) { window.location.replace('auth.html'); return; }
    const profile = await app.getProfile(true);
    /* Shown when the account still has no password of its own. 'password-setup=1' is
       what provisioning now sends; the older 'password-reset' values are kept so links
       already in someone's inbox keep working. The pending flag is also honoured on its
       own, so the panel appears even if the query string was lost along the way. */
    const params = new URLSearchParams(window.location.search);
    const resetKind = params.get('password-reset');
    const { data: stateRows } = await app.getClient().rpc('my_password_state');
    const pendingState = Array.isArray(stateRows) ? stateRows[0] : stateRows;
    const passwordReset = params.get('password-setup') === '1'
      || resetKind === 'teacher' || resetKind === 'staff'
      || arrivingFromEmail
      || Boolean(pendingState?.change_required);
    const passwordPanel = passwordReset ? `
      <article class="toolCard"><p class="eyebrow">First sign-in</p><h2>Choose your password</h2><p class="helperText">This account was created without a password. Choose one now; it is the only way to sign in, and you will not be asked again. After saving you will sign in once with it and complete email verification.</p><form id="teacherPasswordSetupForm" class="stackForm"><label class="fieldLabel">New password<input name="password" type="password" autocomplete="new-password" minlength="12" required></label><label class="fieldLabel">Confirm new password<input name="confirmation" type="password" autocomplete="new-password" minlength="12" required></label><button class="primaryButton" type="submit">Save password and continue</button></form></article>` : '';
    host.innerHTML = `
      <header class="workspaceHeader"><div><p class="eyebrow">My settings</p><h1>Personalize your account.</h1><p>Make changes to your personal CampGrids information here.</p></div><a class="secondaryButton" href="profile.html">Back to profile</a></header>
      <p id="settingsNotice" class="workspaceNotice" role="status" aria-live="polite"></p><br>
      <section class="settingsGrid">${passwordPanel}<article class="toolCard"><p class="eyebrow">Personal details</p><h2>Your display name</h2><p class="helperText">This name is shown in your profile and the navigation bar. Your login username and role are MSI-managed.</p><form id="settingsForm" class="stackForm"><div class="formTwoCols"><label class="fieldLabel">First name<input name="firstName" required value="${escapeHtml(profile.first_name)}"></label><label class="fieldLabel">Last name<input name="lastName" required value="${escapeHtml(profile.last_name)}"></label></div><button class="primaryButton" type="submit">Save settings</button></form></article></section>`;
    document.getElementById('settingsForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { error } = await app.getClient().from('profiles').update({ first_name: String(form.get('firstName')).trim(), last_name: String(form.get('lastName')).trim() }).eq('id', profile.id);
      if (error) return notice(error.message, 'isError');
      await app.getProfile(true);
      await app.updateAccountNavigation();
      notice('Settings saved.', 'isSuccess');
    });
    document.getElementById('teacherPasswordSetupForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const password = String(form.get('password') || '');
      const confirmation = String(form.get('confirmation') || '');
      if (password.length < 12) return notice('Use a password with at least 12 characters.', 'isError');
      if (password !== confirmation) return notice('The passwords do not match.', 'isError');
      const { error: passwordError } = await app.getClient().auth.updateUser({ password });
      if (passwordError) return notice(passwordError.message, 'isError');
      const { error: completeError } = await app.getClient().rpc('complete_password_setup');
      if (completeError) return notice(completeError.message, 'isError');
      const wasAdmin = profile.role === 'admin';
      await app.getClient().auth.signOut();
      notice('Password saved. Sign in again with your new password to finish email verification.', 'isSuccess');
      window.setTimeout(() => window.location.replace(wasAdmin ? 'admin/' : 'auth.html'), 1200);
    });
  }
  render().catch((error) => { host.innerHTML = `<section class="loadingState"><p class="eyebrow">Settings unavailable</p><h1>${escapeHtml(error.message)}</h1></section>`; });
})();
