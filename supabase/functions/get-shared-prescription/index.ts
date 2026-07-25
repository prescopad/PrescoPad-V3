// get-shared-prescription — public, no-JWT Edge Function.
// Replaces GET /rx/{share_token} in backend_python/app/main.py
// (download_prescription + _check_ip_rate_limit / _TOKEN_ACCESS_COUNTS).
//
// An anonymous patient calling this has no auth.uid(), so it always uses the
// service-role client (bypassing RLS) — the share_token itself, plus the
// per-token download_count and expires_at columns on prescription_shares,
// are the only authorization/rate-limit mechanism, mirroring the original
// route's design.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_DOWNLOADS_PER_TOKEN = 20;
const MAX_PER_IP_PER_HOUR = 30;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const shareToken = url.searchParams.get("token");
  if (!shareToken) {
    return new Response(JSON.stringify({ error: "Missing token" }), { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const { data: rateLimitOk } = await admin.rpc("check_and_increment_share_rate_limit", {
    p_ip: clientIp,
    p_max_per_hour: MAX_PER_IP_PER_HOUR,
  });
  if (rateLimitOk === false) {
    return new Response(JSON.stringify({ error: "Too many requests, try again later" }), { status: 429 });
  }

  const { data: share, error: shareError } = await admin
    .from("prescription_shares")
    .select("*")
    .eq("share_token", shareToken)
    .single();

  if (shareError || !share) {
    return new Response(JSON.stringify({ error: "Invalid or expired link" }), { status: 404 });
  }

  if (new Date(share.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "This link has expired" }), { status: 410 });
  }

  if (share.download_count >= MAX_DOWNLOADS_PER_TOKEN) {
    return new Response(JSON.stringify({ error: "Download limit reached for this link" }), { status: 429 });
  }

  const { data: rx } = await admin
    .from("prescriptions")
    .select("id, pdf_storage_path, clinic_id")
    .eq("id", share.prescription_id)
    .single();

  if (!rx) {
    return new Response(JSON.stringify({ error: "Prescription not found" }), { status: 404 });
  }

  let storagePath = rx.pdf_storage_path as string | null;

  // Lazy-generation fallback: no PDF has been persisted for this prescription
  // yet (e.g. a historical prescription migrated before this system existed).
  // Delegate to generate-prescription-pdf using our own service-role
  // Authorization so it bypasses the RLS-scoped-caller path.
  if (!storagePath) {
    const genRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-prescription-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ prescriptionId: rx.id }),
    });
    if (!genRes.ok) {
      const errDetail = await genRes.text();
      console.error("generate-prescription-pdf failed:", genRes.status, errDetail);
      return new Response(JSON.stringify({ error: "Failed to generate PDF", details: errDetail }), { status: 500 });
    }
    const genBody = await genRes.json();
    storagePath = genBody.path;
  }

  const { data: signed, error: signError } = await admin.storage
    .from("prescription-pdfs")
    .createSignedUrl(storagePath!, 600);

  if (signError || !signed) {
    return new Response(JSON.stringify({ error: "Failed to create signed URL" }), { status: 500 });
  }

  await admin
    .from("prescription_shares")
    .update({ download_count: share.download_count + 1 })
    .eq("id", share.id);

  const wantsJson = url.searchParams.get("format") === "json" || req.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return Response.redirect(signed.signedUrl, 302);
});
