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
const userId = '78d915be-0a31-45f1-829e-a2ed9ac7cf9d';
const clinicId = 'a0175fc1-7fc4-4bbe-81de-043eda361c33';
await client.query(`delete from clinic_members where profile_id = $1`, [userId]);
await client.query(`update profiles set clinic_id = null where id = $1`, [userId]);
await client.query(`delete from clinics where id = $1`, [clinicId]);
await client.query(`delete from profiles where id = $1`, [userId]);
await client.query(`delete from auth.users where id = $1`, [userId]);
console.log('Test user, profile, clinic, and membership fully deleted.');
const check = await client.query(`select count(*) from auth.users`);
console.log('Remaining auth.users count:', check.rows[0].count);
await client.end();
