#!/usr/bin/env node
// One-time MongoDB Atlas -> Supabase/Postgres data migration.
// Mirrors the plan's Track A section A.7.1 sequencing exactly:
//   1. auth.users (Admin API, phone_confirm: true) — capture Mongo _id -> uuid map
//   2. disable handle_new_user trigger (so this script controls provisioning,
//      not the trigger's fresh-signup defaults)
//   3. clinics -> clinic_members -> profiles -> wallets(skipped, dropped)
//      -> patients -> queue (+ rebuild queue_counters) -> prescriptions
//      -> prescription_shares (non-expired only) -> reference/child tables
//   4. no PDFs migrated (lazy-generated on first access)
//   5. re-enable the trigger
//   6. validation pass (row-count diff)
//
// Run:
//   MONGODB_URI=... MONGODB_DB_NAME=prescopad \
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node migrate_mongo_to_postgres.mjs [--dry-run]
//
// Requires: npm install mongodb @supabase/supabase-js  (run from this directory
// or point NODE_PATH at a shared node_modules).
//
// IMPORTANT: run ONCE, against a dry-run Supabase project first (per the plan's
// A.7.2 cutover guidance), before ever pointing this at the real production
// Supabase project. This script is NOT safely re-runnable — it does not
// upsert; running it twice will create duplicate rows or fail on unique
// constraints (profiles.role+phone, clinics, etc).

import { MongoClient, ObjectId } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'prescopad';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: MONGODB_URI, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function log(msg) {
  console.log(`[migrate]${DRY_RUN ? ' [dry-run]' : ''} ${msg}`);
}

function toISO(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

async function insertRows(table, rows, { skipInDryRun = true } = {}) {
  if (!rows.length) return;
  if (DRY_RUN && skipInDryRun) {
    log(`would insert ${rows.length} rows into ${table}`);
    return;
  }
  // Chunk to avoid oversized single requests.
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      throw new Error(`Insert into ${table} failed at offset ${i}: ${error.message}`);
    }
  }
  log(`inserted ${rows.length} rows into ${table}`);
}

async function main() {
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(MONGODB_DB_NAME);
  log(`connected to MongoDB (${MONGODB_DB_NAME})`);

  // ── Step 1: auth.users, one per unique phone across doctors+assistants+admins ──
  const doctors = await db.collection('doctors').find({}).toArray();
  const assistants = await db.collection('assistants').find({}).toArray();
  const admins = await db.collection('admins').find({}).toArray();

  log(`found ${doctors.length} doctors, ${assistants.length} assistants, ${admins.length} admins`);

  // Detect the "phone exists as both doctor and assistant" edge case flagged
  // in the plan (A.3) — log and skip, do not silently overwrite.
  const doctorPhones = new Set(doctors.map((d) => d.phone));
  const assistantPhones = new Set(assistants.map((a) => a.phone));
  const dualRolePhones = [...doctorPhones].filter((p) => assistantPhones.has(p));
  if (dualRolePhones.length) {
    console.warn(`WARNING: ${dualRolePhones.length} phone(s) exist as BOTH doctor and assistant — skipping assistant record for these, keeping doctor role. Resolve manually if needed:`, dualRolePhones);
  }

  const mongoIdToUuid = new Map(); // mongo _id string -> supabase auth.users uuid
  const usersToProvision = [
    ...doctors.map((d) => ({ ...d, __role: 'doctor' })),
    ...assistants.filter((a) => !dualRolePhones.includes(a.phone)).map((a) => ({ ...a, __role: 'assistant' })),
    ...admins.map((a) => ({ ...a, __role: 'admin' })),
  ];

  for (const user of usersToProvision) {
    const mongoId = String(user._id);
    if (DRY_RUN) {
      log(`would create auth.users for phone=${user.phone} role=${user.__role}`);
      mongoIdToUuid.set(mongoId, `dry-run-${mongoId}`);
      continue;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      phone: user.phone,
      phone_confirm: true,
      user_metadata: { role: user.__role },
    });
    if (error) {
      // Most common cause: phone already exists (re-run, or genuinely
      // duplicate) — log and continue rather than aborting the whole batch.
      console.warn(`Failed to create auth user for phone=${user.phone}: ${error.message}`);
      continue;
    }
    mongoIdToUuid.set(mongoId, data.user.id);
  }
  log(`provisioned ${mongoIdToUuid.size} auth.users`);

  // ── Step 2: disable handle_new_user trigger so it doesn't double-provision ──
  if (!DRY_RUN) {
    const { error } = await supabase.rpc('migration_disable_new_user_trigger');
    if (error) {
      throw new Error(`Failed to disable on_auth_user_created trigger: ${error.message}. Apply migration 20260719000014_migration_trigger_toggle.sql first.`);
    }
    log('disabled on_auth_user_created trigger');
  }

  // ── Step 3a: clinics ──
  const mongoClinics = await db.collection('clinics').find({}).toArray();
  const clinicIdMap = new Map(); // mongo clinic _id string -> supabase uuid (we let Postgres gen_random_uuid())
  const clinicRows = mongoClinics.map((c) => {
    const newId = crypto.randomUUID();
    clinicIdMap.set(String(c._id), newId);
    return {
      id: newId,
      name: c.name || null,
      address: c.address || null,
      phone: c.phone || null,
      email: c.email || null,
      logo_url: c.logo_url || null,
      qr_code_url: c.qr_code_url || null,
      owner_id: c.owner_id ? mongoIdToUuid.get(String(c.owner_id)) || null : null,
      solo_mode: c.solo_mode !== false,
      created_at: toISO(c.created_at) || new Date().toISOString(),
      updated_at: toISO(c.updated_at) || new Date().toISOString(),
    };
  });
  await insertRows('clinics', clinicRows);

  // ── Step 3b: profiles ──
  const profileRows = [];
  for (const user of usersToProvision) {
    const mongoId = String(user._id);
    const uuid = mongoIdToUuid.get(mongoId);
    if (!uuid) continue;
    profileRows.push({
      id: uuid,
      role: user.__role,
      phone: user.phone,
      name: user.name || null,
      specialty: user.specialty || user.qualification || null,
      reg_number: user.reg_number || null,
      experience_years: user.experience_years ?? null,
      address: user.address || null,
      city: user.city || null,
      signature_url: user.signature_url || null,
      clinic_id: user.clinic_id ? clinicIdMap.get(String(user.clinic_id)) || null : null,
      doctor_code: user.doctor_code || null,
      is_profile_complete: Boolean(user.is_profile_complete),
      is_active: user.is_active !== false,
      last_active_at: toISO(user.last_active_at),
      created_at: toISO(user.created_at) || new Date().toISOString(),
      updated_at: toISO(user.updated_at) || new Date().toISOString(),
    });
  }
  await insertRows('profiles', profileRows);

  // ── Step 3c: clinic_members — derive from owner_id + each user's clinic_id ──
  const clinicMemberRows = [];
  for (const c of mongoClinics) {
    const clinicUuid = clinicIdMap.get(String(c._id));
    if (c.owner_id) {
      const ownerUuid = mongoIdToUuid.get(String(c.owner_id));
      if (ownerUuid) clinicMemberRows.push({ clinic_id: clinicUuid, profile_id: ownerUuid, member_role: 'owner' });
    }
  }
  for (const user of usersToProvision) {
    if (user.__role !== 'assistant' || !user.clinic_id) continue;
    const uuid = mongoIdToUuid.get(String(user._id));
    const clinicUuid = clinicIdMap.get(String(user.clinic_id));
    if (uuid && clinicUuid) clinicMemberRows.push({ clinic_id: clinicUuid, profile_id: uuid, member_role: 'assistant' });
  }
  await insertRows('clinic_members', clinicMemberRows);

  // ── Step 3d: patients ──
  const mongoPatients = await db.collection('patients').find({}).toArray();
  const patientIdMap = new Map();
  const patientRows = mongoPatients.map((p) => {
    const newId = crypto.randomUUID();
    patientIdMap.set(String(p._id), newId);
    return {
      id: newId,
      clinic_id: clinicIdMap.get(String(p.clinic_id)) || null,
      name: p.name || '',
      age: p.age ?? null,
      gender: p.gender || null,
      weight: p.weight ?? null,
      phone: p.phone || null,
      address: p.address || null,
      blood_group: p.blood_group || null,
      allergies: p.allergies || null,
      case_summary: p.casebook_summary || null,
      case_summary_updated_at: toISO(p.casebook_summary_updated_at),
      is_deleted: Boolean(p.is_deleted),
      created_at: toISO(p.created_at) || new Date().toISOString(),
      updated_at: toISO(p.updated_at) || new Date().toISOString(),
    };
  }).filter((p) => p.clinic_id);
  await insertRows('patients', patientRows);

  // ── Step 3e: queue (+ rebuild queue_counters from max token_number) ──
  const mongoQueue = await db.collection('queue').find({}).toArray();
  const queueRows = mongoQueue.map((q) => ({
    id: crypto.randomUUID(),
    clinic_id: clinicIdMap.get(String(q.clinic_id)) || null,
    patient_id: patientIdMap.get(String(q.patient_id)) || null,
    status: q.status || 'waiting',
    added_by: q.added_by ? mongoIdToUuid.get(String(q.added_by)) || null : null,
    token_number: q.token_number ?? 0,
    notes: q.notes || null,
    consultation_type: q.consultation_type || null,
    added_at: toISO(q.added_at) || new Date().toISOString(),
    started_at: toISO(q.started_at),
    completed_at: toISO(q.completed_at),
    is_deleted: Boolean(q.is_deleted),
    updated_at: toISO(q.updated_at) || new Date().toISOString(),
  })).filter((q) => q.clinic_id && q.patient_id);
  await insertRows('queue', queueRows);

  // Rebuild queue_counters as a validation cross-check against the old
  // Mongo counters collection (per plan A.7.1) — max token_number per
  // clinic/day.
  const counterMap = new Map(); // `${clinicId}:${date}` -> max seq
  for (const q of queueRows) {
    const date = (q.added_at || '').slice(0, 10);
    if (!date) continue;
    const key = `${q.clinic_id}:${date}`;
    counterMap.set(key, Math.max(counterMap.get(key) || 0, q.token_number || 0));
  }
  const counterRows = [...counterMap.entries()].map(([key, seq]) => {
    const [clinic_id, date] = key.split(':');
    return { clinic_id, date, seq };
  });
  await insertRows('queue_counters', counterRows);

  // ── Step 3f: prescriptions ──
  const mongoPrescriptions = await db.collection('prescriptions').find({}).toArray();
  const prescriptionIdMap = new Map(); // mongo _id -> new RX- id (kept as-is if already RX- format)
  const prescriptionRows = mongoPrescriptions.map((rx) => {
    const rxId = typeof rx._id === 'string' && rx._id.startsWith('RX-') ? rx._id : `RX-MIGRATED-${String(rx._id)}`;
    prescriptionIdMap.set(String(rx._id), rxId);
    return {
      id: rxId,
      clinic_id: clinicIdMap.get(String(rx.clinic_id)) || null,
      doctor_id: rx.doctor_id ? mongoIdToUuid.get(String(rx.doctor_id)) || null : null,
      patient_id: rx.patient_id ? patientIdMap.get(String(rx.patient_id)) || null : null,
      patient_name: rx.patient_name || null,
      patient_age: rx.patient_age ?? null,
      patient_gender: rx.patient_gender || null,
      patient_phone: rx.patient_phone || null,
      consultation_type: rx.consultation_type || null,
      chief_complaint: rx.chief_complaint || null,
      diagnosis: rx.diagnosis || null,
      advice: rx.advice || null,
      follow_up_date: rx.follow_up_date ? String(rx.follow_up_date).slice(0, 10) : null,
      symptoms: rx.symptoms || [],
      vitals: rx.vitals || null,
      referred_to: rx.referred_to || null,
      medicines: rx.medicines || [],
      lab_tests: rx.lab_tests || [],
      status: rx.status || 'draft',
      charge_amount: null, // no historical data for this new column
      signature: rx.signature || null,
      pdf_hash: rx.pdf_hash || null,
      pdf_storage_path: null, // lazily generated on first access post-migration
      finalized_at: toISO(rx.finalized_at),
      is_deleted: Boolean(rx.is_deleted),
      created_at: toISO(rx.created_at) || new Date().toISOString(),
      updated_at: toISO(rx.updated_at) || new Date().toISOString(),
    };
  }).filter((rx) => rx.clinic_id && rx.doctor_id);
  await insertRows('prescriptions', prescriptionRows);

  // ── Step 3g: prescription_shares — only non-expired tokens ──
  const now = new Date();
  const shareRows = mongoPrescriptions
    .filter((rx) => rx.share_token && rx.share_token_expires_at && new Date(rx.share_token_expires_at) > now)
    .map((rx) => ({
      id: crypto.randomUUID(),
      prescription_id: prescriptionIdMap.get(String(rx._id)),
      clinic_id: clinicIdMap.get(String(rx.clinic_id)),
      share_token: rx.share_token,
      expires_at: toISO(rx.share_token_expires_at),
      download_count: rx.share_download_count || 0,
      created_at: toISO(rx.created_at) || new Date().toISOString(),
    }))
    .filter((s) => s.prescription_id && s.clinic_id);
  await insertRows('prescription_shares', shareRows);

  // ── Step 3h: reference/child collections ──
  const mongoTemplates = await db.collection('prescription_templates').find({}).toArray();
  await insertRows('prescription_templates', mongoTemplates.map((t) => ({
    id: crypto.randomUUID(),
    clinic_id: clinicIdMap.get(String(t.clinic_id)) || null,
    doctor_id: t.doctor_id ? mongoIdToUuid.get(String(t.doctor_id)) || null : null,
    name: t.name || '',
    data: {
      diagnosis: t.diagnosis || null,
      advice: t.advice || null,
      symptoms: t.symptoms || [],
      referred_to: t.referred_to || null,
      medicines: t.medicines || [],
      lab_tests: t.lab_tests || [],
    },
    created_at: toISO(t.created_at) || new Date().toISOString(),
    updated_at: toISO(t.updated_at) || new Date().toISOString(),
  })).filter((t) => t.clinic_id && t.doctor_id));

  const mongoCustomMeds = await db.collection('custom_medicines').find({}).toArray();
  await insertRows('custom_medicines', mongoCustomMeds.map((m) => ({
    id: crypto.randomUUID(),
    clinic_id: clinicIdMap.get(String(m.clinic_id)) || null,
    name: m.name || '',
    type: m.type || null,
    strength: m.strength || null,
    manufacturer: m.manufacturer || null,
    usage_count: m.usage_count || 0,
    created_at: toISO(m.created_at) || new Date().toISOString(),
  })).filter((m) => m.clinic_id));

  const mongoCustomTests = await db.collection('custom_lab_tests').find({}).toArray();
  await insertRows('custom_lab_tests', mongoCustomTests.map((t) => ({
    id: crypto.randomUUID(),
    clinic_id: clinicIdMap.get(String(t.clinic_id)) || null,
    name: t.name || '',
    category: t.category || null,
    usage_count: t.usage_count || 0,
    created_at: toISO(t.created_at) || new Date().toISOString(),
  })).filter((t) => t.clinic_id));

  const mongoConnectionRequests = await db.collection('connection_requests').find({}).toArray();
  await insertRows('connection_requests', mongoConnectionRequests.map((r) => ({
    id: crypto.randomUUID(),
    clinic_id: clinicIdMap.get(String(r.clinic_id)) || null,
    doctor_id: r.doctor_id ? mongoIdToUuid.get(String(r.doctor_id)) || null : null,
    requester_id: r.assistant_id ? mongoIdToUuid.get(String(r.assistant_id)) || null : null,
    requester_role: 'assistant',
    initiated_by: r.initiated_by || 'assistant',
    status: r.status || 'pending',
    created_at: toISO(r.created_at) || new Date().toISOString(),
    updated_at: toISO(r.updated_at) || new Date().toISOString(),
  })).filter((r) => r.doctor_id && r.requester_id));

  // Note: wallets/transactions are intentionally NOT migrated — dropped from
  // schema per the user's decision. notification_jobs/transcripts are
  // intentionally NOT migrated — notification_jobs has a 30-day TTL in Mongo
  // (stale by definition), and transcripts is vestigial/unused (confirmed
  // during exploration — no route ever wrote to it).

  // ── Step 5: re-enable the trigger ──
  if (!DRY_RUN) {
    const { error } = await supabase.rpc('migration_enable_new_user_trigger');
    if (error) {
      console.error(`WARNING: failed to re-enable on_auth_user_created trigger: ${error.message}. Re-enable manually before allowing new signups:`);
      console.error('  ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;');
    } else {
      log('re-enabled on_auth_user_created trigger');
    }
  }

  // ── Step 6: validation pass ──
  log('--- Validation: row counts (Mongo source vs. rows attempted) ---');
  log(`clinics: mongo=${mongoClinics.length} attempted=${clinicRows.length}`);
  log(`profiles: mongo=${usersToProvision.length} attempted=${profileRows.length}`);
  log(`patients: mongo=${mongoPatients.length} attempted=${patientRows.length} (dropped ${mongoPatients.length - patientRows.length} with missing clinic)`);
  log(`queue: mongo=${mongoQueue.length} attempted=${queueRows.length}`);
  log(`prescriptions: mongo=${mongoPrescriptions.length} attempted=${prescriptionRows.length}`);
  log(`prescription_shares (non-expired only): attempted=${shareRows.length}`);
  log('Spot-check these counts manually in the Supabase SQL Editor against the actual inserted rows before considering the migration complete.');

  await mongo.close();
  log('Done.');
}

main().catch((err) => {
  console.error('[migrate] FATAL:', err);
  process.exit(1);
});
