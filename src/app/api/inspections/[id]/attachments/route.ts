import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/db';
import { inspectionAttachments, inspections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: inspectionId } = await params;

  const inspection = await db.query.inspections.findFirst({
    where: eq(inspections.id, inspectionId),
    columns: { id: true },
  });
  if (!inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const itemId = (formData.get('itemId') as string) || null;
  const description = (formData.get('description') as string) || null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file or empty file' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use image or PDF.' }, { status: 400 });
  }

  const ext = path.extname(file.name) || (file.type.startsWith('image/') ? '.jpg' : '.bin');
  const basename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'inspections', inspectionId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, basename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const fileUrl = `/uploads/inspections/${inspectionId}/${basename}`;

  const [attachment] = await db.insert(inspectionAttachments).values({
    inspectionId,
    inspectionItemId: itemId || undefined,
    fileUrl,
    fileName: file.name,
    description: description || undefined,
  }).returning();

  return NextResponse.json(attachment);
}
