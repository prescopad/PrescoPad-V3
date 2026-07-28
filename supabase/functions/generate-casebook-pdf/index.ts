// generate-casebook-pdf — Edge Function.
// Renders a patient's full prescription history as one consolidated, downloadable case-summary PDF.
import { createClient } from "@supabase/supabase-js";
import { renderCasebookPdf, type CasebookVisit } from "../_shared/casebookPdf.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function fetchImageBytes(url: string | null | undefined): Promise<Uint8Array | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

function parseList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
        }
      } catch {
        // Fallback to split
      }
    }
    return trimmed.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function parseJsonbArray(val: unknown): Record<string, unknown>[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  let patientId: string;
  try {
    const body = await req.json();
    patientId = body.patientId ?? body.patient_id;
    if (!patientId) throw new Error("patientId is required");
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400 });
  }

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: patient, error: patientError } = await callerClient
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) {
    return new Response(JSON.stringify({ error: "Patient not found or not accessible" }), { status: 404 });
  }

  const { data: clinic } = await callerClient
    .from("clinics")
    .select("name, logo_url")
    .eq("id", patient.clinic_id)
    .single();

  const { data: prescriptions } = await callerClient
    .from("prescriptions")
    .select("created_at, diagnosis, symptoms, medicines, lab_tests, advice, referred_to, follow_up_date")
    .eq("patient_id", patientId)
    .eq("status", "finalized")
    .order("created_at", { ascending: false });

  const visits: CasebookVisit[] = (prescriptions ?? []).map((rx) => {
    const symptomsList = parseList(rx.symptoms);

    const medicinesList = parseJsonbArray(rx.medicines)
      .map((m: Record<string, unknown>) => {
        const name = (m.medicineName || m.medicine_name || m.name) as string;
        if (!name) return "";
        const parts = [
          name,
          m.type as string,
          (m.dosage || m.frequency) as string,
          m.duration ? `for ${m.duration}` : "",
          m.timing as string,
        ].filter(Boolean);
        return parts.join(" | ");
      })
      .filter(Boolean);

    const labTestsList = parseJsonbArray(rx.lab_tests)
      .map((t: Record<string, unknown>) => (t.testName || t.test_name || t.name) as string)
      .filter(Boolean);

    return {
      date: rx.created_at,
      diagnosis: rx.diagnosis ?? undefined,
      symptoms: symptomsList.length > 0 ? symptomsList : undefined,
      medicines: medicinesList,
      labTests: labTestsList.length > 0 ? labTestsList : undefined,
      advice: rx.advice ?? undefined,
      referredTo: rx.referred_to ?? undefined,
      followUpDate: rx.follow_up_date ?? undefined,
    };
  });

  const logoBytes = await fetchImageBytes(Deno.env.get("PRESCOPAD_LOGO_URL"));

  const pdfBytes = await renderCasebookPdf({
    clinicName: clinic?.name || "PrescoPad Clinic",
    patientName: patient.name,
    patientAge: patient.age,
    patientGender: patient.gender,
    bloodGroup: patient.blood_group ?? undefined,
    allergies: patient.allergies ?? undefined,
    caseSummary: patient.case_summary ?? undefined,
    visits,
    logoPngBytes: logoBytes,
  });

  const timestamp = new Date().getTime();
  const storagePath = `${patient.clinic_id}/${patient.id}/${timestamp}.pdf`;
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { error: uploadError } = await adminClient.storage
    .from("casebook-pdfs")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return new Response(JSON.stringify({ error: `PDF upload failed: ${uploadError.message}` }), { status: 500 });
  }

  await adminClient.from("casebook_shares").insert({
    patient_id: patient.id,
    clinic_id: patient.clinic_id,
    storage_path: storagePath,
  });

  const { data: signed, error: signError } = await adminClient.storage
    .from("casebook-pdfs")
    .createSignedUrl(storagePath, 600);

  if (signError || !signed) {
    return new Response(JSON.stringify({ error: "Failed to create signed URL" }), { status: 500 });
  }

  return new Response(JSON.stringify({ url: signed.signedUrl, path: storagePath }), {
    headers: { "Content-Type": "application/json" },
  });
});
