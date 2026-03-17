import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspections, inspectionItems, checklistTemplateItems } from '@/db/schema';
import { asc, desc, eq, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getPagination } from '@/lib/pagination';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const { limit, offset } = getPagination(request, 30, 100);
  const q = searchParams.get('q')?.trim();
  const sort = searchParams.get('sort') ?? 'date';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const dir = order === 'asc' ? asc : desc;
  const qLike = q ? `%${q}%` : null;
  const where = qLike
    ? or(
        sql<boolean>`${inspections.status}::text ilike ${qLike}`,
        sql<boolean>`exists (
          select 1
          from properties p
          where p.id = ${inspections.propertyId}
            and (p.address ilike ${qLike} or p.city ilike ${qLike})
        )`,
        sql<boolean>`exists (
          select 1
          from users u
          where u.id = ${inspections.inspectorId}
            and u.name ilike ${qLike}
        )`
      )
    : undefined;

  const result = await db.query.inspections.findMany({
    with: {
      property: true,
      inspector: true,
      items: true,
    },
    orderBy:
      sort === 'status'
        ? [dir(inspections.status), desc(inspections.createdAt)]
        : [dir(inspections.scheduledDate), desc(inspections.createdAt)],
    where,
    limit: limit + 1,
    offset,
  });

  const hasMore = result.length > limit;
  const data = hasMore ? result.slice(0, limit) : result;
  return NextResponse.json({
    data,
    meta: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + data.length : null,
    },
  });
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
