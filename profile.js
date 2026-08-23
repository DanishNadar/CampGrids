(() => {
  const host = document.getElementById('profilePage');
  const app = window.CampGridsApp;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const roleName = (role) => role === 'admin' ? 'MSI administrator' : `${role?.[0]?.toUpperCase() || ''}${role?.slice(1) || ''}`;

  function notice(message, type = '') {
    const node = document.getElementById('profileNotice');
    if (!node) return;
    node.textContent = message;
    node.className = `workspaceNotice ${type}`;
  }

  async function render() {
    if (!app.configured()) {
      host.innerHTML = `<section class="loadingState"><p class="eyebrow">Setup required</p><h1>Connect Supabase to open a profile.</h1><p>${escapeHtml(app.configurationMessage)}</p></section>`;
      return;
    }
    if (!await app.getSession()) { window.location.replace('auth.html'); return; }
    const profile = await app.getProfile(true);
    const client = app.getClient();
    let classes = [];
    if (profile.role === 'student') {
      const { data, error } = await client.from('class_enrollments').select('classes(name, code)').eq('student_id', profile.id).is('exited_at', null);
      if (error) throw error;
      classes = data || [];
    }
    host.innerHTML = `
      <header class="workspaceHeader"><div><p class="eyebrow">My CampGrids profile</p><h1>${escapeHtml(`${profile.first_name} ${profile.last_name}`)}</h1><p>${escapeHtml(roleName(profile.role))} account</p></div><a class="secondaryButton" href="${app.dashboardHref(profile.role)}">Open workspace</a></header>
      <p id="profileNotice" class="workspaceNotice" role="status" aria-live="polite"></p>
      <section class="profileGrid">
        <article class="toolCard profileIdentity"><span class="profileAvatar">${escapeHtml(`${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase())}</span><div><p class="eyebrow">Account</p><h2>${escapeHtml(`${profile.first_name} ${profile.last_name}`)}</h2><p>${escapeHtml(roleName(profile.role))}</p></div><dl><div><dt>Email</dt><dd>${escapeHtml(profile.email || 'Not available')}</dd></div><div><dt>Username</dt><dd>${escapeHtml(profile.username || 'Not assigned')}</dd></div></dl></article>
        <article class="toolCard"><p class="eyebrow">Personal details</p><h2>Update your name</h2><form id="profileForm" class="stackForm"><div class="formTwoCols"><label class="fieldLabel">First name<input name="firstName" required value="${escapeHtml(profile.first_name)}"></label><label class="fieldLabel">Last name<input name="lastName" required value="${escapeHtml(profile.last_name)}"></label></div><button class="primaryButton" type="submit">Save profile</button></form></article>
      </section>
      ${profile.role === 'student' ? `<section class="profileClasses"><p class="eyebrow">My active classes</p><h2>Class access</h2>${classes.length ? `<div class="classChipList">${classes.map((entry) => `<span class="classChip"><b>${escapeHtml(entry.classes?.name || 'CampGrids class')}</b><small>${escapeHtml(entry.classes?.code || '')}</small></span>`).join('')}</div>` : '<p class="emptyCopy">You are not enrolled in an active class yet.</p>'}</section>` : ''}`;
    document.getElementById('profileForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const { error } = await client.from('profiles').update({ first_name: String(data.get('firstName')).trim(), last_name: String(data.get('lastName')).trim() }).eq('id', profile.id);
      if (error) return notice(error.message, 'isError');
      await app.getProfile(true);
      await app.updateAccountNavigation();
      await render();
      notice('Your profile has been updated.', 'isSuccess');
    });
  }
  render().catch((error) => { host.innerHTML = `<section class="loadingState"><p class="eyebrow">Profile unavailable</p><h1>${escapeHtml(error.message)}</h1></section>`; });
})();
