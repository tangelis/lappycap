import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspections, inspectionItems, checklistTemplateItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await db.query.inspections.findMany({
    with: {
      property: true,
      inspector: true,
      items: true,
    },
    orderBy: (inspections, { desc }) => [desc(inspections.createdAt)],
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  if (user.role === 'CLIENT') {
    return NextResponse.json({ error: 'Clients cannot create inspections' }, { status: 403 });
  }

  const body = await request.json();

  // Create inspection
  const [inspection] = await db.insert(inspections).values({
    propertyId: body.propertyId,
    inspectorId: user.id,
    templateId: body.templateId,
    status: 'SCHEDULED',
    scheduledDate: body.scheduledDate,
  }).returning();

  // If template provided, populate items from template
  if (body.templateId) {
    const templateItems = await db.query.checklistTemplateItems.findMany({
      where: eq(checklistTemplateItems.templateId, body.templateId),
    });

    if (templateItems.length > 0) {
      await db.insert(inspectionItems).values(
        templateItems.map((item) => ({
          inspectionId: inspection.id,
          label: item.label,
          category: item.category,
          sortOrder: item.sortOrder,
          status: 'PENDING' as const,
        }))
      );
    }
  }

  return NextResponse.json(inspection, { status: 201 });
}
