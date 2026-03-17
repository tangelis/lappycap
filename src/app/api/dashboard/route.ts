import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspectionItems, inspections, lodging, properties } from '@/db/schema';
import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/** Single round-trip dashboard: summary + recent inspections + arrivals. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 5, 1), 50);

  const issuesLimit = Math.min(Math.max(Number(searchParams.get('issuesLimit')) || 10, 1), 50);
  const [summaryResult, recentRows, arrivalsRows, openIssuesRows] = await Promise.all([
    getSummary(),
    getRecentInspections(limit),
    getArrivals(limit),
    getOpenIssues(issuesLimit),
  ]);

  return NextResponse.json({
    summary: summaryResult,
    recentInspections: recentRows,
    arrivals: arrivalsRows,
    openIssues: openIssuesRows,
  });
}

async function getSummary() {
  const [activePropertiesRow, scheduledRow, completedRow, issuesRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(properties).where(eq(properties.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(inspections).where(eq(inspections.status, 'SCHEDULED')),
    db.select({ count: sql<number>`count(*)` }).from(inspections).where(eq(inspections.status, 'COMPLETED')),
    db.select({ count: sql<number>`count(*)` }).from(inspectionItems).where(eq(inspectionItems.status, 'ISSUE')),
  ]);

  return {
    activeProperties: Number(activePropertiesRow[0]?.count ?? 0),
    scheduledInspections: Number(scheduledRow[0]?.count ?? 0),
    completedInspections: Number(completedRow[0]?.count ?? 0),
    issueCount: Number(issuesRow[0]?.count ?? 0),
  };
}

async function getRecentInspections(limit: number) {
  const rows = await db.query.inspections.findMany({
    with: { property: true, inspector: true, items: true },
    orderBy: [desc(inspections.createdAt)],
    limit,
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    scheduledDate: row.scheduledDate,
    completedAt: row.completedAt,
    property: { id: row.property.id, address: row.property.address, city: row.property.city },
    inspector: { name: row.inspector.name },
    doneCount: row.items.filter((i) => i.status !== 'PENDING').length,
    totalCount: row.items.length,
  }));
}

async function getArrivals(limit: number) {
  const now = new Date().toISOString().split('T')[0];
  const upcoming = await db.query.lodging.findMany({
    where: or(gte(lodging.arrival, now), and(gte(lodging.departure, now))),
    with: { property: { with: { client: true } }, client: true },
    orderBy: (l, { asc }) => [asc(l.arrival)],
    limit,
  });

  return upcoming.map((l) => ({
    id: l.id,
    arrival: l.arrival,
    departure: l.departure,
    departureUnknown: l.departureUnknown ?? false,
    status: l.status,
    property: {
      id: l.property.id,
      address: l.property.address,
      city: l.property.city,
      client: l.property.client ? { name: l.property.client.name } : null,
    },
  }));
}

async function getOpenIssues(limit: number) {
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
    .orderBy(desc(inspections.scheduledDate), desc(inspections.updatedAt))
    .limit(limit);

  const propertyIds = [...new Set(issues.map((i) => i.propertyId))];
  if (propertyIds.length === 0) {
    return issues.map((i) => ({ ...i, propertyAddress: null }));
  }

  const props = await db.query.properties.findMany({
    columns: { id: true, address: true },
    where: inArray(properties.id, propertyIds),
  });
  const addressById = new Map(props.map((p) => [p.id, p.address]));

  return issues.map((i) => ({
    ...i,
    propertyAddress: addressById.get(i.propertyId) ?? null,
  }));
}
