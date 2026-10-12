/* Send a native Supabase invitation for a new administrator.
 *
 *   node scripts/provisionAdmin.mjs --email admin@example.org --first-name Ada --last-name Lovelace --department Tech --allowed-domains example.org
 *
 * This deliberately follows the same passwordless invitation flow as teachers:
 * Supabase sends the branded Invite user email through the project's configured
 * SMTP provider, and the recipient chooses their own password through its
 * one-time link. There is no temporary password to copy, email, or accidentally
 * expose in a demo recording.
 */

import { env } from './lib/env.mjs';

function arg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? '' : String(process.argv[index + 1] || '').trim();
}

function fail(message) { console.error(message); process.exit(1); }
function clean(value) { return String(value || '').trim(); }
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const email = clean(arg('--email')).toLowerCase();
const firstName = clean(arg('--first-name'));
const lastName = clean(arg('--last-name'));
const department = clean(arg('--department')) || 'MSI Camps';
const origin = clean(arg('--origin')) || 'https://camp-grids.vercel.app';
const allowedDomains = clean(arg('--allowed-domains'))
  .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);

if (process.argv.includes('--password')) {
  fail('This flow never accepts or emails a password. The recipient chooses one from the one-time invitation email.');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Pass --email <new administrator email>.');
if (!firstName || !lastName) fail('Pass both --first-name and --last-name.');
if (!allowedDomains.length) fail('Pass --allowed-domains <approved-domain>, for example --allowed-domains msichicago.org.');
const domain = email.split('@')[1];
if (!allowedDomains.includes(domain)) {
  fail(`Refusing to invite ${domain}. It is not in --allowed-domains (${allowedDomains.join(', ')}).`);
}

let inviteRedirectTo;
try {
  inviteRedirectTo = new URL('account-setup.html', origin.endsWith('/') ? origin : `${origin}/`).href;
} catch {
  fail('--origin must be an absolute URL, for example https://camp-grids.vercel.app');
}

const supabaseUrl = await env('SUPABASE_URL');
const serviceRole = await env('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRole) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.');

const api = async (path, init = {}) => {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = JSON.parse(text);
      message = payload.message || payload.msg || payload.error || message;
    } catch { /* Keep the HTTP status when the response was not JSON. */ }
    throw new Error(message);
  }
  if (!text) return null; // A successful PostgREST write normally returns 204.
  try { return JSON.parse(text); } catch { throw new Error('Supabase returned an unreadable response.'); }
};

let invitedUserId = '';
try {
  /* GoTrue's native invite endpoint both creates the Auth user and sends the
     project's "Invite user" email. `redirect_to` is a request header in the
     GoTrue API; account-setup.html is allowlisted by setupSupabase.mjs. */
  const invited = await api('/auth/v1/invite', {
    method: 'POST',
    headers: { redirect_to: inviteRedirectTo },
    body: JSON.stringify({ email, data: { first_name: firstName, last_name: lastName } }),
  });
  invitedUserId = clean(invited?.id || invited?.user?.id);
  if (!invitedUserId) throw new Error('Supabase accepted the invitation but did not return the new user id.');

  /* The Auth trigger creates the default student profile synchronously in normal
     operation. Retry briefly so this remains reliable if the database is busy. */
  let profile = null;
  for (let attempt = 0; attempt < 5 && !profile; attempt += 1) {
    profile = await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(invitedUserId)}&select=id`, {
      headers: { Prefer: 'return=representation' },
    });
    if (!profile?.[0]) { profile = null; await pause(150); }
  }
  if (!profile) throw new Error('The invitation was created but the CampGrids profile was not ready.');

  const updated = await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(invitedUserId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email,
      role: 'admin',
      is_active: true,
      must_change_password: true,
      temporary_password_issued_at: null,
      temporary_password_first_used_at: null,
      password_invite_sent_at: new Date().toISOString(),
    }),
  });
  if (!updated?.[0]) throw new Error('The invitation was created but the administrator profile could not be updated.');

  await api(`/rest/v1/student_profiles?user_id=eq.${encodeURIComponent(invitedUserId)}`, { method: 'DELETE' });
  await api('/rest/v1/admin_profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: invitedUserId, department }),
  });
  await api('/rest/v1/audit_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      actor_id: null,
      action: 'admin_account_invited',
      entity_type: 'admin',
      entity_id: invitedUserId,
      metadata: { email, department, provisioned_by: 'provisionAdmin.mjs' },
    }),
  });

  console.log(`Administrator invitation accepted by Supabase for ${email}.`);
  console.log('The recipient should open the "Your MSI staff account is ready" email, choose a password, then sign in at /admin/.');
} catch (error) {
  /* Native invitations must never silently change an existing account. If the
     email has already been activated, Auth refuses the invite; use a fresh demo
     address or the normal password-reset flow instead. */
  if (invitedUserId) {
    try { await api(`/auth/v1/admin/users/${encodeURIComponent(invitedUserId)}`, { method: 'DELETE' }); } catch { /* Report the primary failure below. */ }
  }
  const message = error?.message || 'Unknown error';
  if (/already.*(registered|exists)/i.test(message)) {
    console.error(`Administrator invitation was not sent: ${email} already has a CampGrids Auth account.`);
    console.error('For the demo, use a new unused address. For an activated account, use the normal Forgot password flow.');
  } else {
    console.error(`Administrator invitation failed: ${message}`);
  }
  process.exit(1);
}
