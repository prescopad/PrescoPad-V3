// send-otp-sms-hook — Supabase Auth "Send SMS Hook" Edge Function.
// Ports backend_python/app/services/otp_service.py send_otp_via_renflair so
// OTP delivery continues to go through Renflair (the real, already-paid-for
// SMS provider) instead of Twilio, which is only usable here as an
// unverifiable trial account. Configure this function's URL as the Send SMS
// Hook in Authentication > Hooks in the Supabase dashboard, with the same
// signing secret set as SEND_SMS_HOOK_SECRET below.
import { Webhook } from "standardwebhooks";

const RENFLAIR_BASE_URL = "https://sms.renflair.in/V1.php";
const RENFLAIR_API_KEY = Deno.env.get("RENFLAIR_API_KEY")!;
const HOOK_SECRET = Deno.env.get("SEND_SMS_HOOK_SECRET")!;

interface HookPayload {
  user: { phone?: string };
  sms: { otp: string };
}

async function sendViaRenflair(phone: string, otp: string): Promise<void> {
  // Renflair expects a bare 10-digit Indian number, same normalization as
  // otp_service.validate_indian_phone.
  let digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+91")) {
    digits = phone.slice(3).replace(/\D/g, "");
  } else if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10) {
    throw new Error(`Invalid phone number for Renflair: ${phone}`);
  }

  const params = new URLSearchParams({ API: RENFLAIR_API_KEY, PHONE: digits, OTP: otp });
  const maxRetries = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${RENFLAIR_BASE_URL}?${params.toString()}`, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();

      let status: string | undefined;
      let message = text;
      try {
        const json = JSON.parse(text);
        status = json.status;
        message = json.message ?? text;
      } catch {
        status = text.toUpperCase().includes("SUCCESS") ? "SUCCESS" : "ERROR";
      }

      if (status === "SUCCESS") return;
      throw new Error(message || "Renflair reported a non-success status");
    } catch (e) {
      lastError = e;
      if (attempt === maxRetries) break;
    }
  }
  throw new Error(`SMS delivery failed: ${(lastError as Error)?.message ?? "unknown error"}`);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  try {
    const wh = new Webhook(HOOK_SECRET);
    wh.verify(payload, headers);
  } catch {
    return jsonResponse({ error: { message: "Invalid webhook signature" } }, 401);
  }

  const body: HookPayload = JSON.parse(payload);
  const phone = body.user?.phone;
  const otp = body.sms?.otp;

  if (!phone || !otp) {
    return jsonResponse({ error: { message: "Missing phone or otp in hook payload" } }, 400);
  }

  try {
    await sendViaRenflair(phone.startsWith("+") ? phone : `+${phone}`, otp);
    return jsonResponse({}, 200);
  } catch (e) {
    return jsonResponse({ error: { http_code: 500, message: (e as Error).message } }, 500);
  }
});
