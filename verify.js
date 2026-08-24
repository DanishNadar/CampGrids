(() => {
  const message = document.getElementById('verificationMessage');
  const notice = document.getElementById('verificationNotice');
  const ticket = new URL(window.location.href).searchParams.get('staff_ticket') || '';
  const showError = (text) => {
    message.textContent = 'We could not verify this sign-in';
    notice.textContent = text;
    notice.className = 'formNotice isError';
  };

  async function finishVerification() {
    const app = window.CampGridsApp;
    if (!app.configured()) throw new Error(app.configurationMessage);
    if (!/^[a-f0-9]{64}$/.test(ticket)) throw new Error('This sign-in link is invalid. Return to CampGrids and request a new one.');

    // Supabase consumes the URL fragment when its client is created. Give that
    // exchange a moment before reading the resulting email-verified session.
    const client = app.getClient();
    let { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      ({ data: { session }, error } = await client.auth.getSession());
      if (error) throw error;
    }
    if (!session) throw new Error('This link did not create a verified session. Request a new link and open it in this browser.');

    const { data: verified, error: verifyError } = await client.rpc('complete_staff_email_2fa', { p_ticket: ticket });
    if (verifyError || !verified) throw new Error(verifyError?.message || 'This sign-in link has expired or was already used. Request a new one.');
    window.history.replaceState({}, document.title, window.location.pathname);

    const profile = await app.getProfile(true);
    if (!profile?.is_active || !['teacher', 'admin'].includes(profile.role)) {
      await client.auth.signOut();
      throw new Error('This account is not an active CampGrids staff account.');
    }
    message.textContent = 'Verified — opening your workspace…';
    window.location.assign(app.dashboardHref(profile.role));
  }

  finishVerification().catch((error) => showError(error.message || 'Please request a new secure sign-in link.'));
})();
