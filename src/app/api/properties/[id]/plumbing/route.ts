import { NextResponse } from 'next/server';
import { db } from '@/db';
import { propertyPlumbing } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const items = await db.query.propertyPlumbing.findMany({
    where: eq(propertyPlumbing.propertyId, id),
  });
  return NextResponse.json(items);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const [created] = await db.insert(propertyPlumbing).values({ ...body, propertyId: id }).returning();
  return NextResponse.json(created, { status: 201 });
}
