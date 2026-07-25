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

try {
  await client.connect();
  const tables = await client.query(`select table_name from information_schema.tables where table_schema='public' order by table_name`);
  console.log('TABLES:', tables.rows.map(r => r.table_name).join(', '));
  const funcs = await client.query(`select routine_name from information_schema.routines where routine_schema='public' and routine_type='FUNCTION' order by routine_name`);
  console.log('FUNCTIONS:', funcs.rows.map(r => r.routine_name).join(', '));
  const buckets = await client.query(`select id from storage.buckets`).catch(e => ({rows: [{error: e.message}]}));
  console.log('BUCKETS:', JSON.stringify(buckets.rows));
  const policies = await client.query(`select count(*) from pg_policies where schemaname='public'`);
  console.log('POLICY_COUNT:', policies.rows[0].count);
} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await client.end();
}
