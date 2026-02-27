import { NextResponse } from 'next/server';
import { db } from '@/db';
import { propertyHvac } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const units = await db.query.propertyHvac.findMany({
    where: eq(propertyHvac.propertyId, id),
  });
  return NextResponse.json(units);
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
  const [created] = await db.insert(propertyHvac).values({ ...body, propertyId: id }).returning();
  return NextResponse.json(created, { status: 201 });
}
