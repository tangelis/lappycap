import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspectionItems } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: inspectionId } = await params;
  const body = await request.json();

  // body.items = [{ id, status, notes, photoUrl }]
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 });
  }

  const results = [];
  for (const item of body.items) {
    const updates: Record<string, unknown> = {};
    if (item.status) updates.status = item.status;
    if (item.notes !== undefined) updates.notes = item.notes;
    if (item.photoUrl !== undefined) updates.photoUrl = item.photoUrl;

    const [updated] = await db.update(inspectionItems)
      .set(updates)
      .where(and(eq(inspectionItems.id, item.id), eq(inspectionItems.inspectionId, inspectionId)))
      .returning();
    if (updated) results.push(updated);
  }

  return NextResponse.json(results);
}
