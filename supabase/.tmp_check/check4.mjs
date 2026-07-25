import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.iawufcwouhcitlwukolx',
  password: process.env.PGPASS,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const p = await client.query(`select id, role, phone, clinic_id, doctor_code, is_profile_complete from profiles`);
console.log('PROFILES:', JSON.stringify(p.rows, null, 2));
const c = await client.query(`select id, name, owner_id, solo_mode from clinics`);
console.log('CLINICS:', JSON.stringify(c.rows, null, 2));
const cm = await client.query(`select clinic_id, profile_id, member_role from clinic_members`);
console.log('CLINIC_MEMBERS:', JSON.stringify(cm.rows, null, 2));
await client.end();
