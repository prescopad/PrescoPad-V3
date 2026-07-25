// purge-stale-drafts — Edge Function invoked by an external scheduler
// (GitHub Actions cron / cron-job.org), since pg_cron requires a paid
// Supabase add-on. Replaces backend_python/app/main.py
// _purge_stale_drafts_loop (deleted draft prescriptions >24h old, every 6h).
//
// Authorization: a shared secret header, NOT a Supabase user JWT — this is
// meant to be called by a scheduler with no user session. Set
// PURGE_CRON_SECRET via `supabase secrets set` and configure the scheduler
// to send it as `X-Cron-Secret`.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("PURGE_CRON_SECRET");

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get("X-Cron-Secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await admin.rpc("purge_stale_drafts");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ deleted: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
