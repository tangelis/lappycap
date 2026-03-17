import { NextResponse } from 'next/server';
import { db } from '@/db';
import { properties } from '@/db/schema';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getPagination } from '@/lib/pagination';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  const { searchParams } = new URL(request.url);
  const { limit, offset } = getPagination(request, 30, 100);
  const q = searchParams.get('q')?.trim();
  const sort = searchParams.get('sort') ?? 'updated';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const dir = order === 'asc' ? asc : desc;
  const qLike = q ? `%${q}%` : null;

  const orderBy =
    sort === 'address'
      ? [dir(properties.address)]
      : sort === 'city'
        ? [dir(properties.city), dir(properties.address)]
        : sort === 'state'
          ? [dir(properties.state), dir(properties.city)]
          : sort === 'status'
            ? [dir(properties.isActive), dir(properties.updatedAt)]
            : [dir(properties.updatedAt)];

  const searchWhere = qLike
    ? or(
        ilike(properties.address, qLike),
        ilike(properties.city, qLike),
        ilike(properties.state, qLike),
        ilike(properties.zip, qLike),
        sql<boolean>`exists (
          select 1
          from users u
          where u.id = ${properties.clientId}
            and (u.name ilike ${qLike} or u.email ilike ${qLike})
        )`
      )
    : undefined;

  let result;
  if (user.role === 'CLIENT') {
    result = await db.query.properties.findMany({
      where: searchWhere ? and(eq(properties.clientId, user.id), searchWhere) : eq(properties.clientId, user.id),
      with: { client: true },
      orderBy,
      limit: limit + 1,
      offset,
    });
  } else {
    result = await db.query.properties.findMany({
      where: searchWhere,
      with: { client: true },
      orderBy,
      limit: limit + 1,
      offset,
    });
  }

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
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { role: string };
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await request.json();
  const [property] = await db.insert(properties).values({
    address: body.address,
    city: body.city,
    state: body.state || 'FL',
    zip: body.zip,
    clientId: body.clientId,
    accessNotes: body.accessNotes,
    specialInstructions: body.specialInstructions,
  }).returning();

  return NextResponse.json(property, { status: 201 });
}
