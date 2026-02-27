import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lodging } from '@/db/schema';
import { gte, or, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  });

  return NextResponse.json(upcoming);
}
