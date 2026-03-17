import { NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { buildChecklistForInspection } from '@/lib/inspection-checklist';

type SessionUser = {
  id: string;
  role: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== 'BACKFILL_INSPECTION_CHECKLISTS') {
    return NextResponse.json(
      {
        error: 'Confirmation token required',
        hint: 'Send { "confirm": "BACKFILL_INSPECTION_CHECKLISTS" }',
      },
      { status: 400 }
    );
  }

  const allInspections = await db.query.inspections.findMany({
    columns: {
      id: true,
      propertyId: true,
      templateId: true,
    },
    with: {
      items: {
        columns: { id: true },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const missing = allInspections.filter((inspection) => inspection.items.length === 0);
  let insertedItems = 0;

  for (const inspection of missing) {
    const count = await buildChecklistForInspection({
      inspectionId: inspection.id,
      propertyId: inspection.propertyId,
      templateId: inspection.templateId,
    });
    insertedItems += count;
  }

  return NextResponse.json({
    ok: true,
    scannedInspections: allInspections.length,
    backfilledInspections: missing.length,
    insertedItems,
  });
}
