import { NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get('limit') ?? 5);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 50) : 5;

  const rows = await db.query.inspections.findMany({
    with: {
      property: true,
      inspector: true,
      items: true,
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit,
  });

  const data = rows.map((row) => ({
    id: row.id,
    status: row.status,
    scheduledDate: row.scheduledDate,
    completedAt: row.completedAt,
    property: {
      address: row.property.address,
      city: row.property.city,
    },
    inspector: {
      name: row.inspector.name,
    },
    doneCount: row.items.filter((i) => i.status !== 'PENDING').length,
    totalCount: row.items.length,
  }));

  return NextResponse.json(data);
}
