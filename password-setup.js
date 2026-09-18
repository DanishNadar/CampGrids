/* The page a staff authentication email lands on.
 *
 * One module, two pages. account-setup.html is where an activation invitation goes
 * and reset-password.html is where a password recovery goes, and the copy differs
 * because the two situations differ: a brand-new teacher has never had a password
 * and must not be told to "reset" one.
 *
 * Which flow a page serves comes from data-flow on its own script tag, and the
 * token type in the URL is checked against it. Supabase marks an invitation link
 * type=invite and a recovery link type=recovery, so a link that arrives on the
 * wrong page is caught and explained rather than quietly handled as the other kind.
 */
(() => {
  const host = document.getElementById('passwordSetupHost');
  if (!host) return;
  const app = window.CampGridsApp;
  const flow = document.currentScript?.dataset.flow === 'reset-password' ? 'recovery' : 'invite';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]
  ));

  const COPY = {
    invite: {
      eyebrow: 'Account activation',
      heading: 'Set up your MSI account',
      lede: 'Choose a password to finish activating your account. It is the only way to sign in, and you will not be asked again.',
      submit: 'Activate my account',
      done: 'Password saved. Sign in with your work email and new password to finish activating your account.',
      expiredHeading: 'This activation link has expired',
      expiredLede: 'Activation links can be used once and expire after 24 hours. Ask an MSI administrator to resend your invitation.'
    },
    recovery: {
      eyebrow: 'Password reset',
      heading: 'Create a new password',
      lede: 'Choose a new password for your MSI account. Your old password stops working as soon as you save.',
      submit: 'Save new password',
      done: 'Password changed. Sign in with your new password.',
      expiredHeading: 'This reset link has expired',
      expiredLede: 'Reset links can be used once and expire after 60 minutes. Request a new one from the sign-in page.'
    }
  }[flow];

  function panel(eyebrow, heading, lede, actionHref, actionLabel) {
    return `<div class="formHeading"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 id="passwordSetupTitle">${escapeHtml(heading)}</h1><p>${escapeHtml(lede)}</p></div>
      ${actionHref ? `<p><a class="primaryButton" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a></p>` : ''}`;
  }

  function notice(message, kind = '') {
    const node = document.getElementById('passwordSetupNotice');
    if (node) { node.textContent = message; node.className = `formNotice ${kind}`; }
  }

  /* Reads the token type out of the URL fragment without consuming it. An invite
     and a recovery both arrive as a fragment; only the type tells them apart. */
  function linkType() {
    const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    return (hash.get('type') || search.get('type') || '').toLowerCase();
  }

  function linkError() {
    const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    return {
      code: hash.get('error_code') || search.get('error_code') || '',
      description: hash.get('error_description') || search.get('error_description') || ''
    };
  }

  function form() {
    return `<div class="formHeading"><p class="eyebrow">${escapeHtml(COPY.eyebrow)}</p><h1 id="passwordSetupTitle">${escapeHtml(COPY.heading)}</h1><p>${escapeHtml(COPY.lede)}</p></div>
      <form id="passwordSetupForm" class="authPanel" novalidate>
        <label class="fieldLabel">New password<input name="password" type="password" autocomplete="new-password" minlength="12" required></label>
        <label class="fieldLabel">Confirm new password<input name="confirmation" type="password" autocomplete="new-password" minlength="12" required></label>
        <button class="primaryButton" type="submit">${escapeHtml(COPY.submit)}</button>
      </form>
      <p id="passwordSetupNotice" class="formNotice" role="status" aria-live="polite"></p>`;
  }

  async function render() {
    if (!app?.configured()) {
      host.innerHTML = panel('Setup required', 'This site is not connected yet.', app?.configurationMessage || '');
      return;
    }

    /* An expired or already-used link comes back as an error in the fragment rather
       than as a session, so it is reported before anything else is attempted. */
    const failure = linkError();
    if (failure.code || failure.description) {
      const used = /expired|invalid|not_found/i.test(`${failure.code} ${failure.description}`);
      host.innerHTML = panel(
        COPY.eyebrow,
        used ? COPY.expiredHeading : 'This link could not be used',
        used ? COPY.expiredLede : failure.description.replace(/\+/g, ' '),
        flow === 'recovery' ? 'auth.html' : null,
        'Go to sign in'
      );
      return;
    }

    const type = linkType();
    /* A link of the other kind is refused rather than handled. Treating an invite as
       a recovery is the confusion this whole change exists to remove, and doing it
       silently would put a brand-new teacher back on a "reset" screen. */
    if (type && flow === 'invite' && type === 'recovery') {
      host.innerHTML = panel('Password reset', 'This is a password reset link', 'Open it on the password reset page instead.', 'reset-password.html', 'Continue to password reset');
      return;
    }
    if (type && flow === 'recovery' && type === 'invite') {
      host.innerHTML = panel('Account activation', 'This is an account activation link', 'Open it on the account setup page instead.', 'account-setup.html', 'Continue to account setup');
      return;
    }

    /* supabase-js exchanges the fragment for a session asynchronously, so a single
       check can miss it and would wrongly report an expired link. */
    let session = await app.getSession();
    const arriving = Boolean(type) || /access_token=/.test(window.location.hash || '');
    if (!session && arriving) {
      for (let attempt = 0; attempt < 20 && !session; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        session = await app.getSession();
      }
    }
    if (!session) {
      host.innerHTML = panel(
        COPY.eyebrow,
        COPY.expiredHeading,
        COPY.expiredLede,
        flow === 'recovery' ? 'auth.html' : null,
        'Go to sign in'
      );
      return;
    }

    host.innerHTML = form();
    document.getElementById('passwordSetupForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const data = new FormData(formElement);
      const password = String(data.get('password') || '');
      const confirmation = String(data.get('confirmation') || '');
      const submit = formElement.querySelector('button[type="submit"]');

      if (password.length < 12) return notice('Use a password with at least 12 characters.', 'isError');
      if (password !== confirmation) return notice('The passwords do not match.', 'isError');

      submit.disabled = true;
      notice('Saving...');
      /* updateUser is what actually sets the credential. The password is sent once,
         over TLS, and is never written anywhere by this application. */
      const { error } = await app.getClient().auth.updateUser({ password });
      if (error) { submit.disabled = false; return notice(error.message, 'isError'); }

      /* Clears must_change_password for whichever role this is. Failing here is not
         fatal to the password itself, so it is reported without discarding it. */
      const { error: completeError } = await app.getClient().rpc('complete_password_setup');
      if (completeError) notice(`Password saved, but the account flag could not be cleared: ${completeError.message}`, 'isWarning');

      const profile = await app.getProfile(true).catch(() => null);
      const target = profile?.role === 'admin' ? 'admin/' : 'auth.html';
      await app.getClient().auth.signOut();
      if (!completeError) notice(COPY.done, 'isSuccess');
      window.setTimeout(() => window.location.replace(target), 1400);
    });
  }

  render().catch((error) => {
    host.innerHTML = panel(COPY.eyebrow, 'Something went wrong', error?.message || 'Please try the link again.');
  });
})();
