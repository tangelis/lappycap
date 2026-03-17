import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const inspection = await db.query.inspections.findFirst({
    where: eq(inspections.id, id),
    with: {
      property: { with: { client: true } },
      inspector: true,
      items: true,
    },
  });

  if (!inspection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(inspection);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.overallNotes !== undefined) updates.overallNotes = body.overallNotes;
  if (body.status === 'COMPLETED') updates.completedAt = new Date();
  updates.updatedAt = new Date();

  const [updated] = await db.update(inspections)
    .set(updates)
    .where(eq(inspections.id, id))
    .returning();

  return NextResponse.json(updated);
}
