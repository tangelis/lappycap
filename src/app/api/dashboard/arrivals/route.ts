import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lodging } from '@/db/schema';
import { gte, or, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get('limit') ?? 5);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 50) : 5;

  const now = new Date().toISOString().split('T')[0];

  const upcoming = await db.query.lodging.findMany({
    where: or(
      gte(lodging.arrival, now),
      and(gte(lodging.departure, now)),
    ),
    with: {
      property: { with: { client: true } },
      client: true,
    },
    orderBy: (l, { asc }) => [asc(l.arrival)],
    limit,
  });

  return NextResponse.json(upcoming);
}
