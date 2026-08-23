/* Shared Supabase client and small role-aware helpers used by the account,
   dashboard, and Grid pages. This file intentionally contains no secret: the
   Supabase anon key is protected by the database RLS policies. */
window.CampGridsApp = (() => {
  let client = null;
  let cachedProfile = null;

  const configured = () => Boolean(
    window.supabase &&
    window.CAMPGRIDS_SUPABASE_URL &&
    window.CAMPGRIDS_SUPABASE_ANON_KEY &&
    !window.CAMPGRIDS_SUPABASE_URL.includes('YOUR-PROJECT')
  );

  const configurationMessage = 'CampGrids is not connected yet. Add the Supabase project URL and anon key to supabase-config.js.';

  function getClient() {
    if (!configured()) throw new Error(configurationMessage);
    if (!client) {
      client = window.supabase.createClient(
        window.CAMPGRIDS_SUPABASE_URL,
        window.CAMPGRIDS_SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
      client.auth.onAuthStateChange(() => { cachedProfile = null; });
    }
    return client;
  }

  async function getSession() {
    if (!configured()) return null;
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getProfile(force = false) {
    if (!configured()) return null;
    if (cachedProfile && !force) return cachedProfile;
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await getClient()
      .from('profiles')
      .select('id, role, email, username, first_name, last_name, is_active')
      .eq('id', session.user.id)
      .single();
    if (error) throw error;
    cachedProfile = data;
    return data;
  }

  async function selectedClassId() {
    const saved = window.localStorage.getItem('campgrids-active-class');
    const profile = await getProfile();
    if (!profile || profile.role !== 'student') return null;
    const { data, error } = await getClient()
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', profile.id)
      .is('exited_at', null);
    if (error || !data?.length) return null;
    const valid = data.find((entry) => entry.class_id === saved);
    const classId = valid?.class_id || data[0].class_id;
    window.localStorage.setItem('campgrids-active-class', classId);
    return classId;
  }

  async function logStudentEvent(eventType, metadata = {}, classId = null, assignmentId = null) {
    try {
      const profile = await getProfile();
      if (!profile || profile.role !== 'student') return;
      const activeClass = classId || await selectedClassId();
      await getClient().rpc('log_student_event', {
        p_event_type: eventType,
        p_class_id: activeClass,
        p_assignment_id: assignmentId,
        p_metadata: metadata,
      });
    } catch (error) {
      // A public Grid resource should never fail to open because telemetry did.
      console.warn('CampGrids activity logging skipped:', error.message);
    }
  }

  async function logGridActivity(itemType, detail) {
    const eventType = itemType === 'video' ? 'video_opened' : 'resource_opened';
    return logStudentEvent(eventType, { source: 'public_grid', ...detail });
  }

  async function audit(action, entityType, entityId = null, metadata = {}) {
    try {
      if (!await getSession()) return;
      await getClient().rpc('record_audit_event', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_metadata: metadata,
      });
    } catch (error) {
      console.warn('CampGrids audit logging skipped:', error.message);
    }
  }

  function dashboardHref(role) {
    return role === 'student' ? 'dashboard.html#student' : 'dashboard.html';
  }

  async function updateAccountNavigation() {
    const link = document.getElementById('accountNavLink');
    if (!link || !configured()) return;
    try {
      const profile = await getProfile();
      const label = link.querySelector('.navLabel');
      if (!profile || !label) return;
      const name = `${profile.first_name} ${profile.last_name}`.trim();
      link.href = 'profile.html';
      link.title = `Open ${name}'s profile`;
      label.textContent = name || profile.username || 'My profile';
      let avatar = link.querySelector('.navProfileAvatar');
      if (!avatar) {
        avatar = document.createElement('span');
        avatar.className = 'navProfileAvatar';
        avatar.setAttribute('aria-hidden', 'true');
        link.prepend(avatar);
      }
      avatar.textContent = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'P';
    } catch (error) {
      console.warn('CampGrids account navigation could not be personalized:', error.message);
    }
  }

  return {
    configured,
    configurationMessage,
    getClient,
    getSession,
    getProfile,
    selectedClassId,
    logStudentEvent,
    logGridActivity,
    audit,
    dashboardHref,
    updateAccountNavigation,
  };
})();
