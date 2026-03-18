-- Add optional inspection_item_id to link attachments to a checklist item (for issue photos)
ALTER TABLE "inspection_attachments" ADD COLUMN IF NOT EXISTS "inspection_item_id" uuid REFERENCES "inspection_items"("id") ON DELETE CASCADE;
