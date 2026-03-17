import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspectionItems, inspections, properties } from '@/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/** GET list of all checklist items with status ISSUE (for Open Issues page). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const issues = await db
    .select({
      itemId: inspectionItems.id,
      itemLabel: inspectionItems.label,
      itemCategory: inspectionItems.category,
      itemNotes: inspectionItems.notes,
      inspectionId: inspections.id,
      inspectionStatus: inspections.status,
      scheduledDate: inspections.scheduledDate,
      propertyId: inspections.propertyId,
    })
    .from(inspectionItems)
    .innerJoin(inspections, eq(inspectionItems.inspectionId, inspections.id))
    .where(eq(inspectionItems.status, 'ISSUE'))
    .orderBy(desc(inspections.scheduledDate), desc(inspections.updatedAt));

  const propertyIds = [...new Set(issues.map((i) => i.propertyId))];
  if (propertyIds.length === 0) {
    return NextResponse.json(
      issues.map((i) => ({
        ...i,
        propertyAddress: null,
      }))
    );
  }

  const props = await db.query.properties.findMany({
    columns: { id: true, address: true },
    where: inArray(properties.id, propertyIds),
  });
  const addressById = new Map(props.map((p) => [p.id, p.address]));

  const withAddress = issues.map((i) => ({
    itemId: i.itemId,
    itemLabel: i.itemLabel,
    itemCategory: i.itemCategory,
    itemNotes: i.itemNotes,
    inspectionId: i.inspectionId,
    inspectionStatus: i.inspectionStatus,
    scheduledDate: i.scheduledDate,
    propertyId: i.propertyId,
    propertyAddress: addressById.get(i.propertyId) ?? null,
  }));

  return NextResponse.json(withAddress);
}
