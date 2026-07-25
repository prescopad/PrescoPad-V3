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
const users = await client.query(`select id, phone, created_at, raw_user_meta_data from auth.users order by created_at desc limit 10`);
console.log('auth.users count/rows:', JSON.stringify(users.rows, null, 2));
const triggers = await client.query(`select tgname, tgenabled from pg_trigger where tgrelid = 'auth.users'::regclass`);
console.log('triggers on auth.users:', JSON.stringify(triggers.rows));
await client.end();
