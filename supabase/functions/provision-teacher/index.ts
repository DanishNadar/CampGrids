import { createClient } from "npm:@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json" };
const fail = (message: string, status = 400) => new Response(JSON.stringify({ error: message }), { status, headers });
const text = (value: unknown) => String(value ?? "").trim();
const usernameValue = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");

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
  const { data: isAdmin, error: roleError } = await caller.rpc("is_admin");
  if (roleError || !isAdmin) return fail("Complete email two-factor verification before creating teacher accounts.", 403);

  const { firstName: firstNameValue, lastName: lastNameValue, email: emailValue, username: usernameInput, password: passwordValue, title: titleValue } = await request.json();
  const firstName = text(firstNameValue);
  const lastName = text(lastNameValue);
  const email = text(emailValue).toLowerCase();
  const username = usernameValue(usernameInput);
  const password = String(passwordValue ?? "");
  if (!firstName || !lastName || !email.includes("@") || username.length < 3 || password.length < 10) {
    return fail("First name, last name, work email, a three-character username, and a 10-character password are required.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "teacher", username, first_name: firstName, last_name: lastName },
  });
  if (createError || !created.user) return fail(createError?.message ?? "The teacher account could not be created.", 409);

  const { error: roleUpdateError } = await admin.from("profiles")
    .update({ role: "teacher" })
    .eq("id", created.user.id);
  const { error: studentProfileDeleteError } = await admin.from("student_profiles")
    .delete()
    .eq("user_id", created.user.id);
  const { error: teacherProfileError } = await admin.from("teacher_profiles").insert({
    user_id: created.user.id,
    title: text(titleValue) || null,
    approved_at: new Date().toISOString(),
    approved_by: callerData.user.id,
  });
  if (roleUpdateError || studentProfileDeleteError || teacherProfileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return fail("The teacher account profile could not be completed.", 500);
  }

  await caller.rpc("record_audit_event", {
    p_action: "teacher_account_created",
    p_entity_type: "profile",
    p_entity_id: created.user.id,
    p_metadata: { email, username },
  });
  return new Response(JSON.stringify({ teacher: { id: created.user.id, name: `${firstName} ${lastName}`, email, username } }), { headers });
});
