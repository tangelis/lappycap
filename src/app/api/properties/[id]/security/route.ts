import { NextResponse } from 'next/server';
import { db } from '@/db';
import { propertySecurity } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const security = await db.query.propertySecurity.findFirst({
    where: eq(propertySecurity.propertyId, id),
  });

  return NextResponse.json(security || null);
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

  const existing = await db.query.propertySecurity.findFirst({
    where: eq(propertySecurity.propertyId, id),
  });

  if (existing) {
    const [updated] = await db.update(propertySecurity)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(propertySecurity.propertyId, id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db.insert(propertySecurity)
      .values({ ...body, propertyId: id })
      .returning();
    return NextResponse.json(created, { status: 201 });
  }
}
