import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { asc, desc, ilike, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getPagination } from '@/lib/pagination';

/**
 * GET /api/users — List all users (Admin only). Excludes password hashes. Ordered by most recently updated first.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { role: string };
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const { limit, offset } = getPagination(request, 30, 100);
  const q = searchParams.get('q')?.trim();
  const sort = searchParams.get('sort') ?? 'updated';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const dir = order === 'asc' ? asc : desc;
  const qLike = q ? `%${q}%` : null;
  const orderBy =
    sort === 'name'
      ? [dir(users.name)]
      : sort === 'email'
        ? [dir(users.email)]
        : sort === 'role'
          ? [dir(users.role), dir(users.name)]
          : [dir(users.updatedAt)];
  const where = qLike
    ? or(
        ilike(users.name, qLike),
        ilike(users.email, qLike),
        sql<boolean>`${users.role}::text ilike ${qLike}`,
        ilike(users.phone, qLike)
      )
    : undefined;

  const list = await db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
    where,
    orderBy,
    limit: limit + 1,
    offset,
  });

  const hasMore = list.length > limit;
  const data = hasMore ? list.slice(0, limit) : list;
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
