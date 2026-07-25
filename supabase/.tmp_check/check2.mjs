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
const meds = await client.query(`select count(*) from medicines_catalog`);
const tests = await client.query(`select count(*) from lab_tests_catalog`);
const profiles = await client.query(`select count(*) from profiles`);
const clinics = await client.query(`select count(*) from clinics`);
console.log('medicines_catalog:', meds.rows[0].count);
console.log('lab_tests_catalog:', tests.rows[0].count);
console.log('profiles:', profiles.rows[0].count);
console.log('clinics:', clinics.rows[0].count);
await client.end();
