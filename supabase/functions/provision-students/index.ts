import { createClient } from "npm:@supabase/supabase-js@2";

type StudentRow = {
  firstName: string;
  lastName: string;
  grade?: string;
  guardianName?: string;
  guardianEmail?: string;
};

const headers = { "Content-Type": "application/json" };
const fail = (message: string, status = 400) => new Response(JSON.stringify({ error: message }), { status, headers });
const normalized = (value: unknown) => String(value ?? "").trim();

Deno.serve(async (request) => {
  if (request.method !== "POST") return fail("POST only", 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !anon || !serviceRole || !authorization) return fail("Server configuration is incomplete", 500);

  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return fail("Sign in is required", 401);

  const { data: isAdmin, error: callerProfileError } = await caller.rpc("is_admin");
  if (callerProfileError || !isAdmin) return fail("Complete email two-factor verification before uploading camper rosters.", 403);

  const { classId, filename, students } = await request.json();
  if (!classId || !Array.isArray(students) || students.length === 0) return fail("A class and at least one student are required");
  if (students.length > 250) return fail("Upload no more than 250 students at one time");
  if (!normalized(filename).toLowerCase().endsWith(".csv")) return fail("Use the standardized CSV roster file.");

  const { data: allowed, error: permissionError } = await caller.rpc("is_teacher_of", { p_class_id: classId });
  if (permissionError || !allowed) return fail("You do not manage this class", 403);

  const results: Array<Record<string, string>> = [];
  const errors: Array<Record<string, string>> = [];
  for (let index = 0; index < students.length; index += 1) {
    const row = students[index] as StudentRow;
    const firstName = normalized(row.firstName);
    const lastName = normalized(row.lastName);
    if (!firstName || !lastName) {
      errors.push({ row: String(index + 1), message: "First and last name are required" });
      continue;
    }
    const { data: username, error: usernameError } = await caller.rpc("allocate_student_username", {
      p_class_id: classId, p_first_name: firstName, p_last_name: lastName,
    });
    if (usernameError || !username) {
      errors.push({ row: String(index + 1), message: usernameError?.message ?? "Could not create a username" });
      continue;
    }
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: `${username}@students.campgrids.local`,
      email_confirm: true,
      user_metadata: {
        role: "student", username, first_name: firstName, last_name: lastName,
        grade: normalized(row.grade), guardian_name: normalized(row.guardianName), guardian_email: normalized(row.guardianEmail),
      },
    });
    if (createError || !created.user) {
      errors.push({ row: String(index + 1), message: createError?.message ?? "Could not create student account" });
      continue;
    }
    const { error: enrollmentError } = await admin.from("class_enrollments").insert({ class_id: classId, student_id: created.user.id });
    if (enrollmentError) {
      await admin.auth.admin.deleteUser(created.user.id);
      errors.push({ row: String(index + 1), message: enrollmentError.message });
      continue;
    }
    results.push({ firstName, lastName, username, grade: normalized(row.grade) });
  }

  await admin.from("import_batches").insert({
    class_id: classId,
    uploaded_by: userData.user.id,
    original_filename: normalized(filename) || "roster.csv",
    row_count: students.length,
    created_count: results.length,
    failed_count: errors.length,
    errors,
  });
  await caller.rpc("record_audit_event", {
    p_action: "students_imported", p_entity_type: "class", p_entity_id: classId,
    p_metadata: { filename: normalized(filename), created: results.length, failed: errors.length },
  });
  return new Response(JSON.stringify({ students: results, errors }), { headers });
});
