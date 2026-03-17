import { NextResponse } from 'next/server';
import { db } from '@/db';
import { routes as routesTable } from '@/db/schema';
import { desc, ilike, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getPagination } from '@/lib/pagination';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { limit, offset } = getPagination(request, 10, 50);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const qLike = q ? `%${q}%` : null;
  const where = qLike
    ? sql<boolean>`(
        ${ilike(routesTable.name, qLike)}
        or exists (
          select 1
          from communities c
          left join neighborhoods n on n.id = c.neighborhood_id
          where c.route_id = ${routesTable.id}
            and (c.name ilike ${qLike} or coalesce(n.name, '') ilike ${qLike})
        )
      )`
    : undefined;

  const result = await db.query.routes.findMany({
    with: {
      communities: {
        with: {
          properties: { with: { client: true } },
          neighborhood: true,
        },
      },
    },
    where,
    orderBy: [desc(routesTable.createdAt)],
    limit: limit + 1,
    offset,
  });
  const hasMore = result.length > limit;
  const data = hasMore ? result.slice(0, limit) : result;
  return NextResponse.json({
    data,
    meta: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + data.length : null,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await request.json();
  const [created] = await db.insert(routesTable).values(body).returning();
  return NextResponse.json(created, { status: 201 });
}
