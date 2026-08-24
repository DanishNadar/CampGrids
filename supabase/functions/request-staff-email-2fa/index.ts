import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const fail = (message: string, status = 400, extra: Record<string, unknown> = {}) => new Response(JSON.stringify({ error: message, ...extra }), { status, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return fail("POST only", 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!url || !anonKey || !serviceRole || !authorization) return fail("An authenticated staff session is required", 401);

  // The caller uses the password session from the browser. The database checks
  // its AMR before making a one-time ticket, while the service client only
  // sends the email OTP and is never exposed to the browser.
  const caller = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return fail("An authenticated staff session is required", 401);
  const logContext = { userId: userData.user.id };

  const { data, error } = await caller.rpc("begin_staff_email_2fa");
  const challenge = Array.isArray(data) ? data[0] : data;
  if (error || !challenge?.email || !challenge?.ticket) {
    console.error("Staff email verification request was rejected before delivery", { ...logContext, message: error?.message });
    return fail(error?.message || "We could not start email verification", 403);
  }
  console.log("Staff verification email requested", logContext);

  const service = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: otpError } = await service.auth.signInWithOtp({
    email: challenge.email,
    options: { shouldCreateUser: false },
  });
  if (otpError) {
    const rateLimited = otpError.status === 429 || /rate.?limit|too many|over_email_send_rate_limit/i.test(otpError.message || "");
    console.error("Staff email OTP delivery failed", { ...logContext, message: otpError.message, status: otpError.status, code: otpError.code });
    if (rateLimited) {
      // Supabase applies a per-recipient cooldown to /auth/v1/otp. Do not tell
      // staff that correctly configured Gmail SMTP has failed in this case.
      return fail("A verification code was just sent. Wait 60 seconds before requesting another one, then use the newest code in your inbox.", 429, { retryAfterSeconds: 60 });
    }
    // Keep SMTP diagnostic details in protected function logs, while the
    // browser receives an actionable message without provider internals.
    return fail("Gmail SMTP could not send the verification code. Confirm the SMTP host, port, sender address, and a newly generated Google App Password in Supabase, then try again.", 502);
  }

  // Auth accepted the request and SMTP did not reject it. Delivery to an inbox
  // can still be delayed, quarantined, or filtered by the receiving provider.
  console.log("Staff verification email accepted by Supabase Auth", logContext);
  return new Response(JSON.stringify({ email: challenge.email, ticket: challenge.ticket, delivery: "accepted" }), { status: 202, headers });
});
