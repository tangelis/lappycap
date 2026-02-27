import { NextResponse } from 'next/server';
import { db } from '@/db';
import { propertyHurricane, hurricaneChecklist } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const profile = await db.query.propertyHurricane.findFirst({
    where: eq(propertyHurricane.propertyId, id),
  });
  const checklist = await db.query.hurricaneChecklist.findMany({
    where: eq(hurricaneChecklist.propertyId, id),
    orderBy: (h, { asc }) => [asc(h.sortOrder)],
  });

  return NextResponse.json({ profile, checklist });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const existing = await db.query.propertyHurricane.findFirst({
    where: eq(propertyHurricane.propertyId, id),
  });

  if (existing) {
    const [updated] = await db.update(propertyHurricane)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(propertyHurricane.propertyId, id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db.insert(propertyHurricane)
      .values({ ...body, propertyId: id })
      .returning();
    return NextResponse.json(created, { status: 201 });
  }
}
