import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inspectionItems, inspections, properties } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [activePropertiesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.isActive, true));

  const [scheduledRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspections)
    .where(eq(inspections.status, 'SCHEDULED'));

  const [completedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspections)
    .where(eq(inspections.status, 'COMPLETED'));

  const [issuesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspectionItems)
    .where(eq(inspectionItems.status, 'ISSUE'));

  return NextResponse.json({
    activeProperties: Number(activePropertiesRow?.count ?? 0),
    scheduledInspections: Number(scheduledRow?.count ?? 0),
    completedInspections: Number(completedRow?.count ?? 0),
    issueCount: Number(issuesRow?.count ?? 0),
  });
}
