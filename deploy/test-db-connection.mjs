#!/usr/bin/env node
/**
 * Test DB connection from host. Usage: node deploy/test-db-connection.mjs
 * Uses DATABASE_URL from .env.local (load with dotenv or pass inline).
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
let url = process.env.DATABASE_URL;
if (!url && existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  const m = env.match(/DATABASE_URL=(\S+)/);
  if (m) url = m[1].replace(/^["']|["']$/g, '');
}
if (!url) {
  console.error('No DATABASE_URL in env or .env.local');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
pool.query('SELECT 1 as ok, current_database() as db')
  .then((r) => { console.log('OK:', r.rows[0]); pool.end(); })
  .catch((e) => { console.error('FAIL:', e.message || e.code || e); pool.end(); process.exit(1); });
