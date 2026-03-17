import { NextResponse } from 'next/server';
import { db } from '@/db';
import { checklistTemplates, checklistTemplateItems } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

type SessionUser = { role: string };

function requireAdmin(session: unknown): boolean {
  const user = session as { user?: SessionUser };
  return user?.user?.role === 'ADMIN';
}

/** GET one template with items (for edit page) */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const template = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.id, id),
    with: {
      items: {
        orderBy: [asc(checklistTemplateItems.sortOrder), asc(checklistTemplateItems.label)],
      },
    },
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(template);
}

/** PATCH template (name, description) and replace items */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const template = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.id, id),
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (typeof body.name === 'string' && body.name.trim()) {
    await db.update(checklistTemplates).set({ name: body.name.trim() }).where(eq(checklistTemplates.id, id));
  }
  if (body.description !== undefined) {
    await db.update(checklistTemplates).set({ description: body.description === '' ? null : body.description }).where(eq(checklistTemplates.id, id));
  }

  if (Array.isArray(body.items)) {
    const existing = await db.query.checklistTemplateItems.findMany({
      where: eq(checklistTemplateItems.templateId, id),
      columns: { id: true },
    });
    const existingIds = new Set(existing.map((r) => r.id));
    const incomingIds = new Set((body.items as { id?: string }[]).filter((i) => i.id).map((i) => i.id));

    for (const idToDelete of existingIds) {
      if (!incomingIds.has(idToDelete)) {
        await db.delete(checklistTemplateItems).where(eq(checklistTemplateItems.id, idToDelete));
      }
    }

    let sortOrder = 0;
    for (const item of body.items as { id?: string; label: string; category?: string | null; sortOrder?: number }[]) {
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!label) continue;
      const category = item.category === '' || item.category === null ? null : (item.category ?? null);
      const order = typeof item.sortOrder === 'number' ? item.sortOrder : sortOrder;
      sortOrder = order + 1;

      if (item.id && existingIds.has(item.id)) {
        await db
          .update(checklistTemplateItems)
          .set({ label, category, sortOrder: order })
          .where(eq(checklistTemplateItems.id, item.id));
      } else {
        await db.insert(checklistTemplateItems).values({
          templateId: id,
          label,
          category,
          sortOrder: order,
        });
      }
    }
  }

  const updated = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.id, id),
    with: {
      items: { orderBy: [asc(checklistTemplateItems.sortOrder), asc(checklistTemplateItems.label)] },
    },
  });
  return NextResponse.json(updated);
}

/** DELETE template (cascades to items) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const template = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.id, id),
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
  return NextResponse.json({ ok: true });
}
