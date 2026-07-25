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
await client.query(`delete from clinic_members where profile_id = $1`, [userId]);
await client.query(`delete from clinics where owner_id = $1`, [userId]);
await client.query(`delete from profiles where id = $1`, [userId]);
await client.query(`delete from auth.users where id = $1`, [userId]);
console.log('Test user and associated clinic/membership deleted.');
const check = await client.query(`select count(*) from auth.users`);
console.log('Remaining auth.users count:', check.rows[0].count);
await client.end();
