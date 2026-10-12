/* Completes the mailbox-proof portion of an administrator onboarding email.
 * The recovery session comes from Supabase's one-time link; the separate opaque
 * nonce is consumed by the Edge Function before a temporary password may change. */
(() => {
  const host = document.getElementById('adminOnboardingHost');
  if (!host) return;
  const app = window.CampGridsApp;
  const token = new URL(window.location.href).searchParams.get('onboarding') || '';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const panel = (heading, lede) => `<div class="formHeading"><p class="eyebrow">Administrator access</p><h1 id="adminOnboardingTitle">${escapeHtml(heading)}</h1><p>${escapeHtml(lede)}</p></div>`;
  const form = () => `${panel('Set your private password', 'Your mailbox has been verified. Choose a password only you know.')}
    <form id="adminOnboardingForm" class="authPanel" novalidate>
      <label class="fieldLabel">New password<input name="password" type="password" autocomplete="new-password" minlength="12" required></label>
      <label class="fieldLabel">Confirm new password<input name="confirmation" type="password" autocomplete="new-password" minlength="12" required></label>
      <button class="primaryButton" type="submit">Save my password</button>
    </form><p id="adminOnboardingNotice" class="formNotice" role="status" aria-live="polite"></p>`;

  async function sessionFromLink() {
    let session = await app.getSession();
    for (let attempt = 0; !session && attempt < 20; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      session = await app.getSession();
    }
    return session;
  }

  async function run() {
    if (!app?.configured()) { host.innerHTML = panel('Setup required', app?.configurationMessage || ''); return; }
    if (!/^[A-Za-z0-9_-]{40,}$/.test(token)) { host.innerHTML = panel('This link is incomplete', 'Ask an MSI administrator to send a new administrator onboarding email.'); return; }
    const session = await sessionFromLink();
    if (!session) { host.innerHTML = panel('This link has expired', 'Ask an MSI administrator to send a new administrator onboarding email.'); return; }
    const { data, error } = await app.getClient().functions.invoke('complete-admin-onboarding', { body: { token } });
    if (error || data?.error) { host.innerHTML = panel('This link cannot be used', data?.error || error?.message || 'Ask IT to send a new administrator onboarding email.'); return; }
    host.innerHTML = form();
    document.getElementById('adminOnboardingForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const password = String(values.get('password') || '');
      const confirmation = String(values.get('confirmation') || '');
      const notice = document.getElementById('adminOnboardingNotice');
      const button = event.currentTarget.querySelector('button');
      if (password.length < 12) { notice.textContent = 'Use a password with at least 12 characters.'; notice.className = 'formNotice isError'; return; }
      if (password !== confirmation) { notice.textContent = 'The passwords do not match.'; notice.className = 'formNotice isError'; return; }
      button.disabled = true; notice.textContent = 'Saving your password...';
      const { error: passwordError } = await app.getClient().auth.updateUser({ password });
      if (passwordError) { button.disabled = false; notice.textContent = passwordError.message; notice.className = 'formNotice isError'; return; }
      const { error: completeError } = await app.getClient().rpc('complete_password_setup');
      if (completeError) { notice.textContent = completeError.message; notice.className = 'formNotice isError'; return; }
      await app.getClient().auth.signOut();
      notice.textContent = 'Password saved. Sign in to the administrator workspace.'; notice.className = 'formNotice isSuccess';
      window.setTimeout(() => window.location.replace('admin/'), 1200);
    });
  }
  run().catch((error) => { host.innerHTML = panel('Something went wrong', error?.message || 'Ask IT to send a new administrator onboarding email.'); });
})();
