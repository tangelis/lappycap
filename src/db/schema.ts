import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  date,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'INSPECTOR', 'CLIENT']);
export const inspectionStatusEnum = pgEnum('inspection_status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const itemStatusEnum = pgEnum('item_status', ['OK', 'ISSUE', 'N_A', 'PENDING']);

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('INSPECTOR'),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Properties
export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull().default('FL'),
  zip: varchar('zip', { length: 10 }).notNull(),
  clientId: uuid('client_id').references(() => users.id),
  accessNotes: text('access_notes'), // gate codes, key locations, alarm codes
  specialInstructions: text('special_instructions'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Checklist Templates
export const checklistTemplates = pgTable('checklist_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const checklistTemplateItems = pgTable('checklist_template_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => checklistTemplates.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }), // HVAC, Plumbing, Security, Exterior, etc.
  sortOrder: varchar('sort_order', { length: 10 }).default('0'),
});

// Inspections
export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  inspectorId: uuid('inspector_id').references(() => users.id).notNull(),
  templateId: uuid('template_id').references(() => checklistTemplates.id),
  status: inspectionStatusEnum('status').notNull().default('SCHEDULED'),
  scheduledDate: date('scheduled_date'),
  completedAt: timestamp('completed_at'),
  overallNotes: text('overall_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Inspection Items (the actual checklist entries for a given inspection)
export const inspectionItems = pgTable('inspection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  status: itemStatusEnum('status').notNull().default('PENDING'),
  notes: text('notes'),
  photoUrl: text('photo_url'),
  sortOrder: varchar('sort_order', { length: 10 }).default('0'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  inspections: many(inspections),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  client: one(users, { fields: [properties.clientId], references: [users.id] }),
  inspections: many(inspections),
}));

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  property: one(properties, { fields: [inspections.propertyId], references: [properties.id] }),
  inspector: one(users, { fields: [inspections.inspectorId], references: [users.id] }),
  template: one(checklistTemplates, { fields: [inspections.templateId], references: [checklistTemplates.id] }),
  items: many(inspectionItems),
}));

export const inspectionItemsRelations = relations(inspectionItems, ({ one }) => ({
  inspection: one(inspections, { fields: [inspectionItems.inspectionId], references: [inspections.id] }),
}));

export const checklistTemplatesRelations = relations(checklistTemplates, ({ many }) => ({
  items: many(checklistTemplateItems),
}));

export const checklistTemplateItemsRelations = relations(checklistTemplateItems, ({ one }) => ({
  template: one(checklistTemplates, { fields: [checklistTemplateItems.templateId], references: [checklistTemplates.id] }),
}));
