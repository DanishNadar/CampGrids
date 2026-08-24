import { createClient } from "npm:@supabase/supabase-js@2";

type TeacherRow = {
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
};

const headers = { "Content-Type": "application/json" };
const fail = (message: string, status = 400) => new Response(JSON.stringify({ error: message }), { status, headers });
const clean = (value: unknown) => String(value ?? "").trim();
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function createTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  let token = "";
  for (const byte of bytes) token += alphabet[byte % alphabet.length];
  return `Camp-${token.slice(0, 7)}-${token.slice(7)}!`;
}

Deno.serve(async (request) => {
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
  const filename = clean(payload.filename);
  const teachers = payload.teachers;
  if (!filename.toLowerCase().endsWith(".csv")) return fail("Use the teacher CSV template.");
  if (!Array.isArray(teachers) || teachers.length === 0) return fail("Upload at least one teacher.");
  if (teachers.length > 250) return fail("Upload no more than 250 teachers at one time.");

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

    const temporaryPassword = createTemporaryPassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
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
    }).eq("id", created.user.id);
    const { error: studentDeleteError } = await admin.from("student_profiles").delete().eq("user_id", created.user.id);
    const { error: teacherProfileError } = await admin.from("teacher_profiles").insert({
      user_id: created.user.id,
      title: title || null,
      approved_at: new Date().toISOString(),
      approved_by: callerData.user.id,
      must_change_password: true,
      temporary_password_issued_at: new Date().toISOString(),
    });
    if (profileError || studentDeleteError || teacherProfileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      errors.push({ row: String(index + 1), message: "The teacher profile could not be completed" });
      continue;
    }
    results.push({ firstName, lastName, email, username, temporaryPassword, title });
  }

  await caller.rpc("record_audit_event", {
    p_action: "teachers_imported",
    p_entity_type: "teacher_csv",
    p_entity_id: null,
    p_metadata: { filename, created: results.length, failed: errors.length },
  });
  return new Response(JSON.stringify({ teachers: results, errors }), { headers });
});
