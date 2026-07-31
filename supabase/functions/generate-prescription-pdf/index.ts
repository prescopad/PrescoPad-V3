// generate-prescription-pdf — Edge Function
// Replaces backend_python/app/services/pdf_generator.py +
// GET /api/data/prescriptions/{id}/pdf (backend_python/app/routes/data.py).
//
// Fetches a prescription (+ clinic + doctor) using the CALLER's JWT so
// Postgres RLS enforces "must be a member of this prescription's clinic" —
// no separate authorization check needed here beyond that. Renders the PDF,
// uploads it to the private `prescription-pdfs` bucket (service-role client,
// since Storage writes have no client-facing INSERT policy), persists
// `pdf_storage_path` on the prescription row, and returns a short-lived
// signed URL.
import { createClient } from "@supabase/supabase-js";
import { renderPrescriptionPdf } from "../_shared/prescriptionPdf.ts";

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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  let prescriptionId: string;
  try {
    const body = await req.json();
    prescriptionId = body.prescriptionId ?? body.prescription_id;
    if (!prescriptionId) throw new Error("prescriptionId is required");
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400 });
  }

  const isServiceRole = authHeader.includes(SERVICE_ROLE_KEY);
  const callerClient = isServiceRole
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    : createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

  const { data: rx, error: rxError } = await callerClient
    .from("prescriptions")
    .select("*")
    .eq("id", prescriptionId)
    .single();

  if (rxError || !rx) {
    return new Response(JSON.stringify({ error: "Prescription not found or not accessible" }), { status: 404 });
  }

  const { data: clinic } = await callerClient
    .from("clinics")
    .select("*")
    .eq("id", rx.clinic_id)
    .single();

  const { data: doctor } = await callerClient
    .from("profiles")
    .select("*")
    .eq("id", rx.doctor_id)
    .single();

  const [logoRes, qrRes] = await Promise.all([
    fetchImageBytes(Deno.env.get("PRESCOPAD_LOGO_URL")),
    fetchImageBytes(clinic?.qr_code_url),
  ]);

  const medicines = Array.isArray(rx.medicines) ? rx.medicines : [];
  const labTests = Array.isArray(rx.lab_tests) ? rx.lab_tests : [];

  let consultationType: string | undefined;
  if (rx.consultation_type === "new") consultationType = "New Consultation";
  else if (rx.consultation_type === "follow_up") consultationType = "Follow-up";

  const rawCert = rx.attach_certificate ?? rx.attachCertificate;
  let certObj: any = undefined;
  if (rawCert) {
    try {
      certObj = typeof rawCert === "string" ? JSON.parse(rawCert) : rawCert;
    } catch {
      certObj = undefined;
    }
  }

  const rawReceipt = rx.attach_receipt ?? rx.attachReceipt;
  let receiptObj: any = undefined;
  if (rawReceipt) {
    try {
      receiptObj = typeof rawReceipt === "string" ? JSON.parse(rawReceipt) : rawReceipt;
    } catch {
      receiptObj = undefined;
    }
  }

  const pdfBytes = await renderPrescriptionPdf({
    clinicName: clinic?.name || "PrescoPad Clinic",
    clinicAddress: clinic?.address,
    clinicPhone: clinic?.phone,
    clinicEmail: clinic?.email,
    doctorName: doctor?.name || "Doctor",
    qualification: doctor?.specialty,
    regNumber: doctor?.reg_number,
    patientName: rx.patient_name || "",
    patientAge: rx.patient_age,
    patientGender: rx.patient_gender,
    date: new Date(rx.created_at),
    consultationType,
    symptoms: rx.symptoms || undefined,
    diagnosis: rx.diagnosis || undefined,
    medicines,
    labTests,
    advice: rx.advice || undefined,
    referredTo: rx.referred_to || undefined,
    followUpDate: rx.follow_up_date || undefined,
    signatureSvgPath: rx.signature || undefined,
    pdfHash: rx.pdf_hash || undefined,
    logoPngBytes: logoRes,
    qrPngBytes: qrRes,
    isMlc: rx.is_mlc || false,
    attachCertificate: certObj ? {
      clinicName: clinic?.name || "PrescoPad Clinic",
      doctorName: doctor?.name || "Doctor",
      regNumber: doctor?.reg_number || undefined,
      patientName: rx.patient_name || "Patient",
      patientAge: rx.patient_age || undefined,
      patientGender: rx.patient_gender || undefined,
      diagnosis: certObj.diagnosis || rx.diagnosis || "Acute Illness",
      restDays: String(certObj.restDays || certObj.rest_days || "3"),
      startDate: certObj.startDate || certObj.start_date || new Date(rx.created_at).toISOString().split("T")[0],
      fitnessStatus: (certObj.fitnessStatus || certObj.fitness_status || "unfit") === "fit" ? "fit" : "unfit",
    } : undefined,
    attachReceipt: receiptObj ? {
      clinicName: clinic?.name || "PrescoPad Clinic",
      doctorName: doctor?.name || "Doctor",
      patientName: rx.patient_name || "Patient",
      receiptNo: receiptObj.receiptNo || receiptObj.receipt_no || `REC-${rx.id.slice(-5).toUpperCase()}`,
      date: receiptObj.date || new Date(rx.created_at).toLocaleDateString("en-IN"),
      amount: Number(receiptObj.amount || rx.charge_amount || 500),
      paymentMode: receiptObj.paymentMode || receiptObj.payment_mode || "Cash",
      towards: receiptObj.towards || "Consultation & Treatment Fee",
    } : undefined,
  });


  const storagePath = `${rx.clinic_id}/${rx.id}.pdf`;
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { error: uploadError } = await adminClient.storage
    .from("prescription-pdfs")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return new Response(JSON.stringify({ error: `PDF upload failed: ${uploadError.message}` }), { status: 500 });
  }

  await adminClient.from("prescriptions").update({ pdf_storage_path: storagePath }).eq("id", rx.id);

  const { data: signed, error: signError } = await adminClient.storage
    .from("prescription-pdfs")
    .createSignedUrl(storagePath, 600);

  if (signError || !signed) {
    return new Response(JSON.stringify({ error: "Failed to create signed URL" }), { status: 500 });
  }

  return new Response(JSON.stringify({ url: signed.signedUrl, path: storagePath }), {
    headers: { "Content-Type": "application/json" },
  });
});
