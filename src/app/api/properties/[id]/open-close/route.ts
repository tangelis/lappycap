import { NextResponse } from 'next/server';
import { db } from '@/db';
import { propertyOpenClose, propertyOpenCloseCustom } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const standard = await db.query.propertyOpenClose.findFirst({
    where: eq(propertyOpenClose.propertyId, id),
  });
  const custom = await db.query.propertyOpenCloseCustom.findMany({
    where: eq(propertyOpenCloseCustom.propertyId, id),
  });

  return NextResponse.json({ standard, custom });
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

  const existing = await db.query.propertyOpenClose.findFirst({
    where: eq(propertyOpenClose.propertyId, id),
  });

  if (existing) {
    const [updated] = await db.update(propertyOpenClose)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(propertyOpenClose.propertyId, id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db.insert(propertyOpenClose)
      .values({ ...body, propertyId: id })
      .returning();
    return NextResponse.json(created, { status: 201 });
  }
}
