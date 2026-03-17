import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { buildChecklistForInspection } from '@/lib/inspection-checklist';

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

  if ((inspection.items?.length ?? 0) === 0) {
    await buildChecklistForInspection({
      inspectionId: inspection.id,
      propertyId: inspection.propertyId,
      templateId: inspection.templateId,
    });
    const reloaded = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
      with: {
        property: { with: { client: true } },
        inspector: true,
        items: true,
      },
    });
    return NextResponse.json(reloaded ?? inspection);
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
  if (body.notesClientEyes !== undefined) updates.notesClientEyes = body.notesClientEyes;
  if (body.interiorOk !== undefined) updates.interiorOk = body.interiorOk;
  if (body.exteriorOk !== undefined) updates.exteriorOk = body.exteriorOk;
  if (body.preparedHomeArrival !== undefined) updates.preparedHomeArrival = body.preparedHomeArrival;
  if (body.closedHomeDeparture !== undefined) updates.closedHomeDeparture = body.closedHomeDeparture;
  if (body.hvacTemps !== undefined) updates.hvacTemps = body.hvacTemps;
  if (body.humidityReadings !== undefined) updates.humidityReadings = body.humidityReadings;
  if (body.inspectionNumber !== undefined) updates.inspectionNumber = body.inspectionNumber;
  if (body.weekNumber !== undefined) updates.weekNumber = body.weekNumber;
  if (body.status === 'COMPLETED') updates.completedAt = new Date();
  updates.updatedAt = new Date();

  const [updated] = await db.update(inspections)
    .set(updates)
    .where(eq(inspections.id, id))
    .returning();

  return NextResponse.json(updated);
}
