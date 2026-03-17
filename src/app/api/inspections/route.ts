import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspectionItems, inspections } from '@/db/schema';
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getPagination } from '@/lib/pagination';
import { buildChecklistForInspection } from '@/lib/inspection-checklist';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const { limit, offset } = getPagination(request, 30, 100);
  const q = searchParams.get('q')?.trim();
  const hasIssues = searchParams.get('hasIssues') === '1';
  const statusFilter = searchParams.get('status')?.trim();
  const sort = searchParams.get('sort') ?? 'date';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const dir = order === 'asc' ? asc : desc;
  const qLike = q ? `%${q}%` : null;
  const searchWhere = qLike
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
  const issuesWhere = hasIssues
    ? sql<boolean>`exists (
        select 1 from inspection_items ii
        where ii.inspection_id = ${inspections.id} and ii.status = 'ISSUE'
      )`
    : undefined;
  const statusWhere =
    statusFilter && ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(statusFilter)
      ? eq(inspections.status, statusFilter as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED')
      : undefined;
  const whereClauses = [searchWhere, issuesWhere, statusWhere].filter(Boolean);
  const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

  const result = await db.query.inspections.findMany({
    with: {
      property: true,
      inspector: true,
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
  const page = hasMore ? result.slice(0, limit) : result;

  const ids = page.map((inspection) => inspection.id);
  const progressRows = ids.length === 0
    ? []
    : await db
      .select({
        inspectionId: inspectionItems.inspectionId,
        total: sql<number>`count(*)`,
        done: sql<number>`sum(case when ${inspectionItems.status} <> 'PENDING' then 1 else 0 end)`,
      })
      .from(inspectionItems)
      .where(inArray(inspectionItems.inspectionId, ids))
      .groupBy(inspectionItems.inspectionId);

  const progressById = new Map(
    progressRows.map((row) => [
      row.inspectionId,
      { done: Number(row.done ?? 0), total: Number(row.total ?? 0) },
    ])
  );

  const data = page.map((inspection) => ({
    ...inspection,
    progress: progressById.get(inspection.id) ?? { done: 0, total: 0 },
  }));
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

  // Populate from existing DB sources (template + property-level checklist sources).
  await buildChecklistForInspection({
    inspectionId: inspection.id,
    propertyId: inspection.propertyId,
    templateId: body.templateId,
  });

  return NextResponse.json(inspection, { status: 201 });
}
