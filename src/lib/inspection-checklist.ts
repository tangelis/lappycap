import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  checklistTemplateItems,
  hurricaneChecklist,
  inspectionItems,
  propertyCustomChecklist,
} from '@/db/schema';

type BuildChecklistArgs = {
  inspectionId: string;
  propertyId: string;
  templateId?: string | null;
};

type ItemDraft = {
  label: string;
  category: string | null;
  sortOrder: number;
};

export async function buildChecklistForInspection({
  inspectionId,
  propertyId,
  templateId,
}: BuildChecklistArgs): Promise<number> {
  const drafts: ItemDraft[] = [];

  if (templateId) {
    const templateItems = await db.query.checklistTemplateItems.findMany({
      where: eq(checklistTemplateItems.templateId, templateId),
      orderBy: [asc(checklistTemplateItems.sortOrder), asc(checklistTemplateItems.label)],
    });
    drafts.push(
      ...templateItems.map((item) => ({
        label: item.label,
        category: item.category,
        sortOrder: item.sortOrder ?? 0,
      }))
    );
  }

  const customItems = await db.query.propertyCustomChecklist.findMany({
    where: eq(propertyCustomChecklist.propertyId, propertyId),
    orderBy: [asc(propertyCustomChecklist.item)],
  });
  drafts.push(
    ...customItems.map((item, index) => ({
      label: item.item,
      category: 'Custom Services',
      sortOrder: 1000 + index,
    }))
  );

  const stormItems = await db.query.hurricaneChecklist.findMany({
    where: eq(hurricaneChecklist.propertyId, propertyId),
    orderBy: [asc(hurricaneChecklist.sortOrder), asc(hurricaneChecklist.item)],
  });
  drafts.push(
    ...stormItems.map((item, index) => ({
      label: item.item,
      category: 'Hurricane',
      sortOrder: 2000 + index,
    }))
  );

  const unique = new Set<string>();
  const deduped = drafts.filter((item) => {
    const key = `${(item.category ?? 'General').toLowerCase()}::${item.label.trim().toLowerCase()}`;
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  });

  if (deduped.length === 0) return 0;

  await db.insert(inspectionItems).values(
    deduped.map((item) => ({
      inspectionId,
      label: item.label,
      category: item.category,
      sortOrder: item.sortOrder,
      status: 'PENDING' as const,
    }))
  );

  return deduped.length;
}
