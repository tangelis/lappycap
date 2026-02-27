import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  date,
  boolean,
  integer,
  doublePrecision,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ═══════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'INSPECTOR', 'CLIENT']);
export const inspectionStatusEnum = pgEnum('inspection_status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const itemStatusEnum = pgEnum('item_status', ['OK', 'ISSUE', 'N_A', 'PENDING']);
export const hurricaneResponsibilityEnum = pgEnum('hurricane_responsibility', ['CLIENT_IN_TOWN', 'CLIENT_OUT_TOWN', 'NEST_HOME', 'SHARED']);
export const openCloseTypeEnum = pgEnum('open_close_type', ['OPEN', 'CLOSE']);
export const vendorTypeEnum = pgEnum('vendor_type', ['HVAC', 'PLUMBING', 'ELECTRICAL', 'PEST_CONTROL', 'LANDSCAPING', 'POOL', 'SECURITY', 'GENERAL', 'OTHER']);
export const lodgingStatusEnum = pgEnum('lodging_status', ['UPCOMING', 'IN_RESIDENCE', 'DEPARTED', 'CANCELLED']);

// ═══════════════════════════════════════
// CORE: USERS
// ═══════════════════════════════════════

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

// ═══════════════════════════════════════
// GEOGRAPHY: ROUTES → NEIGHBORHOODS → COMMUNITIES
// ═══════════════════════════════════════

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const neighborhoods = pgTable('neighborhoods', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).unique().notNull(),
  companyName: varchar('company_name', { length: 255 }),
  managerName: varchar('manager_name', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  neighborhoodId: uuid('neighborhood_id').references(() => neighborhoods.id),
  routeId: uuid('route_id').references(() => routes.id),
  routePosition: doublePrecision('route_position'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// PROPERTIES
// ═══════════════════════════════════════

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull().default('FL'),
  zip: varchar('zip', { length: 10 }).notNull(),
  googleMapLink: varchar('google_map_link', { length: 500 }),
  clientId: uuid('client_id').references(() => users.id),
  communityId: uuid('community_id').references(() => communities.id),
  routePosition: doublePrecision('route_position'), // position within route
  weeklyRate: doublePrecision('weekly_rate'),
  accessNotes: text('access_notes'),
  specialInstructions: text('special_instructions'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// PROPERTY SYSTEMS: SECURITY
// ═══════════════════════════════════════

export const propertySecurity = pgTable('property_security', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull().unique(),
  keyNumber: varchar('key_number', { length: 255 }),
  keyBinName: varchar('key_bin_name', { length: 255 }),
  alarmCode: varchar('alarm_code', { length: 255 }),
  alarmPassword: varchar('alarm_password', { length: 255 }),
  primaryAlarmPanelLocation: varchar('primary_alarm_panel_location', { length: 255 }),
  garageDoorKeypadCode: varchar('garage_door_keypad_code', { length: 255 }),
  frontDoorKeylessEntryCode: varchar('front_door_keyless_entry_code', { length: 255 }),
  lockBoxCode: varchar('lock_box_code', { length: 255 }),
  lockBoxLocation: varchar('lock_box_location', { length: 255 }),
  specialEntryInstructions: text('special_entry_instructions'),
  communityGateCode: varchar('community_gate_code', { length: 255 }),
  modemLocation: varchar('modem_location', { length: 500 }),
  wifiPassword: varchar('wifi_password', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// PROPERTY SYSTEMS: HVAC
// ═══════════════════════════════════════

export const propertyHvac = pgTable('property_hvac', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  hvacId: varchar('hvac_id', { length: 255 }), // unit identifier (e.g. "Unit A — Upstairs")
  airHandlerLocation: varchar('air_handler_location', { length: 255 }),
  compressorLocation: varchar('compressor_location', { length: 255 }),
  thermostatSettingAway: doublePrecision('thermostat_setting_away'),
  thermostatSettingHome: doublePrecision('thermostat_setting_home'),
  humidistatSettingAway: varchar('humidistat_setting_away', { length: 255 }),
  humidistatSettingHome: varchar('humidistat_setting_home', { length: 255 }),
  acFilterLocation: varchar('ac_filter_location', { length: 255 }),
  acFilterDimensions: varchar('ac_filter_dimensions', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// PROPERTY SYSTEMS: PLUMBING
// ═══════════════════════════════════════

export const propertyPlumbing = pgTable('property_plumbing', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  systemId: varchar('system_id', { length: 255 }),
  mainShutoffLocation: varchar('main_shutoff_location', { length: 255 }),
  cityMeterLocation: varchar('city_meter_location', { length: 255 }),
  waterHeaterLocation: varchar('water_heater_location', { length: 255 }),
  waterHeaterShutoffLocation: varchar('water_heater_shutoff_location', { length: 255 }),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// PROPERTY SYSTEMS: OPEN/CLOSE PROCEDURES
// ═══════════════════════════════════════

export const propertyOpenClose = pgTable('property_open_close', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull().unique(),
  // Standard open procedures
  openWaterValve: boolean('open_water_valve').default(false),
  openWaterHeaterBreaker: boolean('open_water_heater_breaker').default(false),
  openIceMakers: boolean('open_ice_makers').default(false),
  openInstaHot: boolean('open_insta_hot').default(false),
  // Standard close procedures
  closeWaterValve: boolean('close_water_valve').default(false),
  closeWaterHeaterBreaker: boolean('close_water_heater_breaker').default(false),
  closeIceMakers: boolean('close_ice_makers').default(false),
  closeEmptyIceMakers: boolean('close_empty_ice_makers').default(false),
  closeInstaHot: boolean('close_insta_hot').default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Custom open/close items beyond the standard checklist
export const propertyOpenCloseCustom = pgTable('property_open_close_custom', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  type: openCloseTypeEnum('type').notNull(),
  item: varchar('item', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }),
});

// ═══════════════════════════════════════
// PROPERTY SYSTEMS: HURRICANE PREP
// ═══════════════════════════════════════

export const propertyHurricane = pgTable('property_hurricane', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull().unique(),
  responsibilityInTown: hurricaneResponsibilityEnum('responsibility_in_town').default('CLIENT_IN_TOWN'),
  responsibilityOutTown: hurricaneResponsibilityEnum('responsibility_out_town').default('NEST_HOME'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const hurricaneChecklist = pgTable('hurricane_checklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  item: text('item').notNull(),
  notes: text('notes'),
  sortOrder: integer('sort_order').default(0),
});

// ═══════════════════════════════════════
// VENDORS (per-property)
// ═══════════════════════════════════════

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  type: vendorTypeEnum('type').notNull().default('GENERAL'),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  notes: varchar('notes', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// LODGING / ARRIVALS & DEPARTURES
// ═══════════════════════════════════════

export const lodging = pgTable('lodging', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => users.id),
  arrival: date('arrival'),
  departure: date('departure'),
  departureUnknown: boolean('departure_unknown').default(false),
  clientNotes: text('client_notes'),
  nestNotes: text('nest_notes'), // internal notes
  status: lodgingStatusEnum('status').default('UPCOMING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// CHECKLIST TEMPLATES
// ═══════════════════════════════════════

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
  category: varchar('category', { length: 100 }),
  sortOrder: integer('sort_order').default(0),
});

// Custom per-property walksheet items (beyond templates)
export const propertyCustomChecklist = pgTable('property_custom_checklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  item: varchar('item', { length: 255 }).notNull(),
  notes: varchar('notes', { length: 255 }),
});

// ═══════════════════════════════════════
// INSPECTIONS (WALKSHEETS)
// ═══════════════════════════════════════

export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  inspectorId: uuid('inspector_id').references(() => users.id).notNull(),
  templateId: uuid('template_id').references(() => checklistTemplates.id),
  inspectionNumber: integer('inspection_number'),
  status: inspectionStatusEnum('status').notNull().default('SCHEDULED'),
  scheduledDate: date('scheduled_date'),
  completedAt: timestamp('completed_at'),
  interiorOk: boolean('interior_ok').default(false),
  exteriorOk: boolean('exterior_ok').default(false),
  preparedHomeArrival: boolean('prepared_home_arrival').default(false),
  closedHomeDeparture: boolean('closed_home_departure').default(false),
  hvacTemps: text('hvac_temps'), // JSON or comma-separated readings
  humidityReadings: text('humidity_readings'),
  notesClientEyes: text('notes_client_eyes'), // visible to client
  overallNotes: text('overall_notes'),
  weekNumber: integer('week_number'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Inspection Items (checklist entries)
export const inspectionItems = pgTable('inspection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  status: itemStatusEnum('status').notNull().default('PENDING'),
  notes: text('notes'),
  photoUrl: text('photo_url'),
  sortOrder: integer('sort_order').default(0),
});

// Inspector-only notes (not visible to clients)
export const inspectorNotes = pgTable('inspector_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  notes: text('notes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Walksheet attachments (photos/files)
export const inspectionAttachments = pgTable('inspection_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  description: varchar('description', { length: 255 }),
  fileUrl: text('file_url').notNull(),
  fileName: varchar('file_name', { length: 255 }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Additional/custom services completed per inspection
export const inspectionServices = pgTable('inspection_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  customChecklistId: uuid('custom_checklist_id').references(() => propertyCustomChecklist.id),
  item: text('item'),
  notes: text('notes'),
  serviceCompleted: boolean('service_completed').default(false),
});

// Hurricane checklist completions per inspection
export const inspectionHurricane = pgTable('inspection_hurricane', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  hurricaneChecklistId: uuid('hurricane_checklist_id').references(() => hurricaneChecklist.id),
  item: text('item'),
  notes: text('notes'),
  serviceCompleted: boolean('service_completed').default(false),
});

// ═══════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ═══════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  inspections: many(inspections),
  lodgings: many(lodging),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  communities: many(communities),
}));

export const neighborhoodsRelations = relations(neighborhoods, ({ many }) => ({
  communities: many(communities),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  neighborhood: one(neighborhoods, { fields: [communities.neighborhoodId], references: [neighborhoods.id] }),
  route: one(routes, { fields: [communities.routeId], references: [routes.id] }),
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  client: one(users, { fields: [properties.clientId], references: [users.id] }),
  community: one(communities, { fields: [properties.communityId], references: [communities.id] }),
  security: one(propertySecurity),
  openClose: one(propertyOpenClose),
  hurricane: one(propertyHurricane),
  hvacUnits: many(propertyHvac),
  plumbing: many(propertyPlumbing),
  openCloseCustom: many(propertyOpenCloseCustom),
  hurricaneChecklist: many(hurricaneChecklist),
  customChecklist: many(propertyCustomChecklist),
  vendors: many(vendors),
  lodgings: many(lodging),
  inspections: many(inspections),
}));

export const propertySecurityRelations = relations(propertySecurity, ({ one }) => ({
  property: one(properties, { fields: [propertySecurity.propertyId], references: [properties.id] }),
}));

export const propertyHvacRelations = relations(propertyHvac, ({ one }) => ({
  property: one(properties, { fields: [propertyHvac.propertyId], references: [properties.id] }),
}));

export const propertyPlumbingRelations = relations(propertyPlumbing, ({ one }) => ({
  property: one(properties, { fields: [propertyPlumbing.propertyId], references: [properties.id] }),
}));

export const propertyOpenCloseRelations = relations(propertyOpenClose, ({ one }) => ({
  property: one(properties, { fields: [propertyOpenClose.propertyId], references: [properties.id] }),
}));

export const propertyOpenCloseCustomRelations = relations(propertyOpenCloseCustom, ({ one }) => ({
  property: one(properties, { fields: [propertyOpenCloseCustom.propertyId], references: [properties.id] }),
}));

export const propertyHurricaneRelations = relations(propertyHurricane, ({ one }) => ({
  property: one(properties, { fields: [propertyHurricane.propertyId], references: [properties.id] }),
}));

export const hurricaneChecklistRelations = relations(hurricaneChecklist, ({ one }) => ({
  property: one(properties, { fields: [hurricaneChecklist.propertyId], references: [properties.id] }),
}));

export const vendorsRelations = relations(vendors, ({ one }) => ({
  property: one(properties, { fields: [vendors.propertyId], references: [properties.id] }),
}));

export const lodgingRelations = relations(lodging, ({ one }) => ({
  property: one(properties, { fields: [lodging.propertyId], references: [properties.id] }),
  client: one(users, { fields: [lodging.clientId], references: [users.id] }),
}));

export const checklistTemplatesRelations = relations(checklistTemplates, ({ many }) => ({
  items: many(checklistTemplateItems),
}));

export const checklistTemplateItemsRelations = relations(checklistTemplateItems, ({ one }) => ({
  template: one(checklistTemplates, { fields: [checklistTemplateItems.templateId], references: [checklistTemplates.id] }),
}));

export const propertyCustomChecklistRelations = relations(propertyCustomChecklist, ({ one }) => ({
  property: one(properties, { fields: [propertyCustomChecklist.propertyId], references: [properties.id] }),
}));

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  property: one(properties, { fields: [inspections.propertyId], references: [properties.id] }),
  inspector: one(users, { fields: [inspections.inspectorId], references: [users.id] }),
  template: one(checklistTemplates, { fields: [inspections.templateId], references: [checklistTemplates.id] }),
  items: many(inspectionItems),
  inspectorNotes: many(inspectorNotes),
  attachments: many(inspectionAttachments),
  services: many(inspectionServices),
  hurricaneItems: many(inspectionHurricane),
}));

export const inspectionItemsRelations = relations(inspectionItems, ({ one }) => ({
  inspection: one(inspections, { fields: [inspectionItems.inspectionId], references: [inspections.id] }),
}));

export const inspectorNotesRelations = relations(inspectorNotes, ({ one }) => ({
  inspection: one(inspections, { fields: [inspectorNotes.inspectionId], references: [inspections.id] }),
}));

export const inspectionAttachmentsRelations = relations(inspectionAttachments, ({ one }) => ({
  inspection: one(inspections, { fields: [inspectionAttachments.inspectionId], references: [inspections.id] }),
}));

export const inspectionServicesRelations = relations(inspectionServices, ({ one }) => ({
  inspection: one(inspections, { fields: [inspectionServices.inspectionId], references: [inspections.id] }),
  customChecklist: one(propertyCustomChecklist, { fields: [inspectionServices.customChecklistId], references: [propertyCustomChecklist.id] }),
}));

export const inspectionHurricaneRelations = relations(inspectionHurricane, ({ one }) => ({
  inspection: one(inspections, { fields: [inspectionHurricane.inspectionId], references: [inspections.id] }),
  hurricaneChecklist: one(hurricaneChecklist, { fields: [inspectionHurricane.hurricaneChecklistId], references: [hurricaneChecklist.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));
