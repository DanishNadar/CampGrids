import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const headers = { ...corsHeaders, "Content-Type": "application/json" };
const fail = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status, headers });

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return fail("POST only", 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !anon || !serviceRole || !authorization) return fail("Server configuration is incomplete", 500);

  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: callerData, error: callerError } = await caller.auth.getUser();
  if (callerError || !callerData.user) return fail("Open the administrator onboarding link before choosing a password.", 401);

  const body = await request.json().catch(() => ({}));
  const token = String(body?.token || "").trim();
  if (!/^[A-Za-z0-9_-]{40,}$/.test(token)) return fail("This administrator onboarding link is invalid.");

  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const now = new Date().toISOString();
  const { data: consumed, error: consumeError } = await admin
    .from("admin_onboarding_tokens")
    .update({ used_at: now })
    .eq("token_hash", await hash(token))
    .eq("user_id", callerData.user.id)
    .is("used_at", null)
    .gt("expires_at", now)
    .select("id")
    .maybeSingle();
  if (consumeError) return fail("The administrator onboarding link could not be verified.", 502);

  if (!consumed) {
    const { data: profile } = await admin.from("profiles")
      .select("admin_onboarding_verified_at")
      .eq("id", callerData.user.id).maybeSingle();
    const verifiedAt = profile?.admin_onboarding_verified_at ? new Date(profile.admin_onboarding_verified_at).getTime() : 0;
    if (!verifiedAt || Date.now() - verifiedAt > 30 * 60 * 1000) {
      return fail("This administrator onboarding link has expired or was already used. Ask IT to send a new one.", 410);
    }
  } else {
    const { error: profileError } = await admin.from("profiles")
      .update({ admin_onboarding_verified_at: now })
      .eq("id", callerData.user.id)
      .eq("role", "admin");
    if (profileError) return fail("The administrator account could not be prepared for password setup.", 502);
  }

  return new Response(JSON.stringify({ ready: true }), { headers });
});
