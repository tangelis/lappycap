import { NextResponse } from 'next/server';
import { db } from '@/db';
import { checklistTemplates } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const full = searchParams.get('full') === '1';

  if (full) {
    const list = await db.query.checklistTemplates.findMany({
      columns: { id: true, name: true, description: true },
      orderBy: [asc(checklistTemplates.name)],
      with: { items: { columns: { id: true } } },
    });
    const withCount = list.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      itemCount: t.items.length,
    }));
    return NextResponse.json(withCount);
  }

  const list = await db.query.checklistTemplates.findMany({
    columns: { id: true, name: true },
    orderBy: [asc(checklistTemplates.name)],
  });
  return NextResponse.json(list);
}

/** POST create template (Admin only) */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : 'New Checklist';
  const description = typeof body.description === 'string' ? body.description.trim() || null : null;

  const [template] = await db
    .insert(checklistTemplates)
    .values({ name, description })
    .returning();

  return NextResponse.json(template, { status: 201 });
}
