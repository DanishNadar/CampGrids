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
    if (!await app.getSession()) { window.location.replace('auth.html'); return; }
    const profile = await app.getProfile(true);
    host.innerHTML = `
      <header class="workspaceHeader"><div><p class="eyebrow">My settings</p><h1>Personalize your account.</h1><p>Make changes to your personal CampGrids information here.</p></div><a class="secondaryButton" href="profile.html">Back to profile</a></header>
      <p id="settingsNotice" class="workspaceNotice" role="status" aria-live="polite"></p>
      <section class="settingsGrid"><article class="toolCard"><p class="eyebrow">Personal details</p><h2>Your display name</h2><p class="helperText">This name is shown in your profile and the navigation bar. Your login username and role are MSI-managed.</p><form id="settingsForm" class="stackForm"><div class="formTwoCols"><label class="fieldLabel">First name<input name="firstName" required value="${escapeHtml(profile.first_name)}"></label><label class="fieldLabel">Last name<input name="lastName" required value="${escapeHtml(profile.last_name)}"></label></div><button class="primaryButton" type="submit">Save settings</button></form></article></section>`;
    document.getElementById('settingsForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { error } = await app.getClient().from('profiles').update({ first_name: String(form.get('firstName')).trim(), last_name: String(form.get('lastName')).trim() }).eq('id', profile.id);
      if (error) return notice(error.message, 'isError');
      await app.getProfile(true);
      await app.updateAccountNavigation();
      notice('Settings saved.', 'isSuccess');
    });
  }
  render().catch((error) => { host.innerHTML = `<section class="loadingState"><p class="eyebrow">Settings unavailable</p><h1>${escapeHtml(error.message)}</h1></section>`; });
})();
