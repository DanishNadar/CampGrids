import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const fail = (message: string, status = 400) => new Response(JSON.stringify({ error: message }), { status, headers });
const usernameValue = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const classCodeValue = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return fail("POST only", 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return fail("Server configuration is incomplete", 500);

  const { username: requestedUsername, classCode: requestedClassCode, redirectTo } = await request.json();
  const username = usernameValue(requestedUsername);
  const classCode = classCodeValue(requestedClassCode);
  if (!username || !classCode) return fail("Enter a class code and student username.");

  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email")
    .eq("username", username)
    .eq("role", "student")
    .eq("is_active", true)
    .maybeSingle();
  if (profileError || !profile) return fail("The class code or student username is not recognized.", 401);

  const { data: classData, error: classError } = await admin
    .from("classes")
    .select("id")
    .eq("code", classCode)
    .eq("status", "active")
    .maybeSingle();
  if (classError || !classData) return fail("The class code or student username is not recognized.", 401);

  const { data: enrollment, error: enrollmentError } = await admin
    .from("class_enrollments")
    .select("class_id")
    .eq("class_id", classData.id)
    .eq("student_id", profile.id)
    .is("exited_at", null)
    .maybeSingle();
  if (enrollmentError || !enrollment) return fail("The class code or student username is not recognized.", 401);

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
    options: { redirectTo: typeof redirectTo === "string" ? redirectTo : undefined },
  });
  if (linkError || !linkData.properties.action_link) return fail("We could not start your class sign-in. Please try again.", 500);

  await admin.from("student_activity_events").insert({
    student_id: profile.id,
    class_id: enrollment.class_id,
    event_type: "signed_in",
    metadata: { source: "class_login" },
  });

  return new Response(JSON.stringify({ actionLink: linkData.properties.action_link, classId: enrollment.class_id }), { headers });
});
