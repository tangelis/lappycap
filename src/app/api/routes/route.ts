import { NextResponse } from 'next/server';
import { db } from '@/db';
import { routes as routesTable } from '@/db/schema';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await db.query.routes.findMany({
    with: {
      communities: {
        with: {
          properties: { with: { client: true } },
          neighborhood: true,
        },
      },
    },
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await request.json();
  const [created] = await db.insert(routesTable).values(body).returning();
  return NextResponse.json(created, { status: 201 });
}
