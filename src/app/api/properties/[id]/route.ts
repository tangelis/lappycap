import { NextResponse } from 'next/server';
import { db } from '@/db';
import { properties } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, id),
    with: {
      client: true,
      community: { with: { neighborhood: true, route: true } },
      security: true,
      hvacUnits: true,
      plumbing: true,
      openClose: true,
      openCloseCustom: true,
      hurricane: true,
      hurricaneChecklist: true,
      vendors: true,
      lodgings: true,
      customChecklist: true,
    },
  });

  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(property);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(properties).set({ ...body, updatedAt: new Date() }).where(eq(properties.id, id)).returning();
  return NextResponse.json(updated);
}
