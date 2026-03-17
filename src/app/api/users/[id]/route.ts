import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

type UserRole = 'ADMIN' | 'INSPECTOR' | 'CLIENT';

/**
 * PATCH /api/users/[id] — Update user (Admin only). Supports role, name, phone.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { role: string };
  if (currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const updateData: { role?: UserRole; name?: string; phone?: string | null; updatedAt: Date } = { updatedAt: new Date() };
  if (typeof body.role === 'string' && ['ADMIN', 'INSPECTOR', 'CLIENT'].includes(body.role)) {
    updateData.role = body.role as UserRole;
  }
  if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
  if (body.phone !== undefined) updateData.phone = body.phone === '' || body.phone === null ? null : String(body.phone);

  if (!updateData.role && updateData.name === undefined && updateData.phone === undefined) {
    return NextResponse.json({ error: 'No valid fields to update (role, name, or phone)' }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, phone: users.phone, updatedAt: users.updatedAt });

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
