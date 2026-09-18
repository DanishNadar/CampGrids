import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type TeacherRow = {
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
};

// This function is called from the administrator's browser. Without a successful
// preflight response, the browser blocks the POST before inviteUserByEmail ever
// runs, which looks exactly like "no invitation email was sent." Keep these in
// sync with the Supabase client rather than maintaining a brittle header list.
const headers = { ...corsHeaders, "Content-Type": "application/json" };
const fail = (message: string, status = 400) => new Response(JSON.stringify({ error: message }), { status, headers });
const clean = (value: unknown) => String(value ?? "").trim();
// The site sends the set-password link back to this page, which must be in the
// project's Redirect URLs allowlist. The caller supplies it so the same function
// works from a local server and from production.
const setPasswordPath = "account-setup.html";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return fail("POST only", 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !anon || !serviceRole || !authorization) return fail("Server configuration is incomplete", 500);

  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: callerData, error: callerError } = await caller.auth.getUser();
  if (callerError || !callerData.user) return fail("Sign in is required", 401);
  const { data: isAdmin, error: adminError } = await caller.rpc("is_admin");
  if (adminError || !isAdmin) return fail("Complete email two-factor verification before provisioning teacher accounts.", 403);

  const payload = await request.json();
  /* Two shapes are accepted. { action: "resend", email } re-invites one existing
     account; anything else is a provisioning batch. Resend is served here because
     re-inviting is an admin API call and the browser holds only the anon key - the
     browser's only option is the recovery API, and reaching for it is what sent
     "Reset your password" to teachers who had never had one. */
  const isResend = clean(payload.action) === "resend";
  const resendEmail = clean(payload.email).toLowerCase();
  const filename = clean(payload.filename);
  const teachers = payload.teachers;

  if (isResend) {
    if (!resendEmail || !resendEmail.includes("@")) return fail("A valid email address is required to resend an invitation.");
  } else {
    if (!filename.toLowerCase().endsWith(".csv")) return fail("Use the teacher CSV template.");
    if (!Array.isArray(teachers) || teachers.length === 0) return fail("Upload at least one teacher.");
    if (teachers.length > 250) return fail("Upload no more than 250 teachers at one time.");
  }

  /* Where the emailed set-password link should land. The caller passes its own origin
     so the same deployed function serves a local server and production; SITE_URL is
     the fallback, and an unparseable value is rejected rather than silently emailing
     a link that goes nowhere. This URL must be in the project's Redirect URLs. */
  let inviteRedirectTo: string;
  try {
    const origin = clean(payload.siteOrigin) || Deno.env.get("SITE_URL") || "";
    inviteRedirectTo = new URL(setPasswordPath, origin).href;
  } catch {
    return fail("The site origin for the set-password link is missing or invalid. Pass siteOrigin, or set SITE_URL on the function.");
  }

  if (isResend) {
    /* inviteUserByEmail re-sends the invitation for an account that has not been
       activated. If Auth reports the address as already registered, the account has
       a password already and an invitation is the wrong message for it - the person
       wants password recovery, which they can request themselves from the sign-in
       page. Never silently substitute one for the other here. */
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(resendEmail, {
      redirectTo: inviteRedirectTo,
    });
    if (inviteError) {
      const already = /already|registered|exists/i.test(inviteError.message || "");
      return fail(
        already
          ? "That account has already been activated. Ask them to use Forgot your password on the sign-in page instead."
          : `The invitation could not be resent: ${inviteError.message}`,
        already ? 409 : 502,
      );
    }
    return new Response(JSON.stringify({ resent: true, email: resendEmail }), { headers });
  }

  const results: Array<Record<string, string>> = [];
  const errors: Array<Record<string, string>> = [];
  for (let index = 0; index < teachers.length; index += 1) {
    const row = teachers[index] as TeacherRow;
    const firstName = clean(row.firstName);
    const lastName = clean(row.lastName);
    const email = clean(row.email).toLowerCase();
    const title = clean(row.title);
    if (!firstName || !lastName || !email.includes("@")) {
      errors.push({ row: String(index + 1), message: "First name, last name, and work email are required" });
      continue;
    }

    const { data: username, error: usernameError } = await caller.rpc("allocate_teacher_username", {
      p_first_name: firstName,
      p_last_name: lastName,
    });
    if (usernameError || !username) {
      errors.push({ row: String(index + 1), message: usernameError?.message ?? "Could not allocate a teacher username" });
      continue;
    }

    // No password is ever generated. inviteUserByEmail creates the account with no
    // password and emails the link the teacher uses to choose one, so a credential
    // never has to travel through a CSV, a chat message, or a spreadsheet.
    const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, username },
      redirectTo: inviteRedirectTo,
    });
    if (createError || !created.user) {
      errors.push({ row: String(index + 1), message: createError?.message ?? "Could not create the teacher account" });
      continue;
    }

    const { error: profileError } = await admin.from("profiles").update({
      first_name: firstName,
      last_name: lastName,
      username,
      role: "teacher",
      is_active: true,
      must_change_password: true,
      temporary_password_issued_at: null,
      password_invite_sent_at: new Date().toISOString(),
    }).eq("id", created.user.id);
    const { error: studentDeleteError } = await admin.from("student_profiles").delete().eq("user_id", created.user.id);
    const { error: teacherProfileError } = await admin.from("teacher_profiles").insert({
      user_id: created.user.id,
      title: title || null,
      approved_at: new Date().toISOString(),
      approved_by: callerData.user.id,
      must_change_password: true,
      temporary_password_issued_at: null,
    });
    if (profileError || studentDeleteError || teacherProfileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      errors.push({ row: String(index + 1), message: "The teacher profile could not be completed" });
      continue;
    }
    results.push({ firstName, lastName, email, username, title, invited: true });
  }

  await caller.rpc("record_audit_event", {
    p_action: "teachers_imported",
    p_entity_type: "teacher_csv",
    p_entity_id: null,
    p_metadata: { filename, created: results.length, failed: errors.length },
  });
  return new Response(JSON.stringify({ teachers: results, errors }), { headers });
});
