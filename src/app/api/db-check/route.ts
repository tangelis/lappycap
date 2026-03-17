import { NextResponse } from 'next/server';
import { pool } from '@/db';
import { getDbErrorMessage } from '@/lib/db-error';

/**
 * GET /api/db-check
 * Lightweight check that the database is reachable. Used by the login page
 * to show a clear error when Postgres is down or misconfigured.
 */
export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = getDbErrorMessage(err);
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
