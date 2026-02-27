import { NextResponse } from 'next/server';
import { db } from '@/db';
import { properties, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };

  let result;
  if (user.role === 'CLIENT') {
    result = await db.query.properties.findMany({
      where: eq(properties.clientId, user.id),
      with: { client: true },
    });
  } else {
    result = await db.query.properties.findMany({
      with: { client: true },
    });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { role: string };
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await request.json();
  const [property] = await db.insert(properties).values({
    address: body.address,
    city: body.city,
    state: body.state || 'FL',
    zip: body.zip,
    clientId: body.clientId,
    accessNotes: body.accessNotes,
    specialInstructions: body.specialInstructions,
  }).returning();

  return NextResponse.json(property, { status: 201 });
}
