# Nest Home — Implementation Plan v1

> Generated 2026-02-27. Based on legacy "Annular Reef" analysis (27 tables, 58 views, 305 clients, 14K walksheets) and current MVP schema.

---

## Table of Contents

1. [Schema Changes](#1-schema-changes)
2. [API Routes](#2-api-routes)
3. [UI Pages & Components](#3-ui-pages--components)
4. [Migration Strategy](#4-migration-strategy)
5. [Priority Order](#5-priority-order)

---

## 1. Schema Changes

All new tables use the existing conventions: `uuid` PKs with `defaultRandom()`, `timestamp` for `created_at`/`updated_at`, foreign keys to `properties.id` or `inspections.id`.

### 1.1 New Enums

```ts
export const hurricaneResponsibilityEnum = pgEnum('hurricane_responsibility', [
  'NEST',        // Nest Home handles it
  'OWNER',       // Property owner handles it
  'VENDOR',      // Third-party vendor
  'SHARED',      // Split responsibility
]);

export const openCloseTypeEnum = pgEnum('open_close_type', ['OPEN', 'CLOSE']);

export const approvalStatusEnum = pgEnum('approval_status', [
  'DRAFT',
  'PENDING_REVIEW',
  'PENDING_SEND',
  'SENT',
  'ACKNOWLEDGED',
]);

export const vendorCategoryEnum = pgEnum('vendor_category', [
  'HVAC', 'PLUMBING', 'ELECTRICAL', 'PEST_CONTROL', 'LANDSCAPING',
  'POOL', 'ROOFING', 'GENERAL', 'LOCKSMITH', 'ALARM', 'OTHER',
]);

export const reminderFrequencyEnum = pgEnum('reminder_frequency', [
  'ONCE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY',
]);
```

### 1.2 Extend `properties` Table

Add columns to `properties`:

```ts
// Add to existing properties table
clientName: varchar('client_name', { length: 255 }),
clientEmail: varchar('client_email', { length: 255 }),
clientPhone: varchar('client_phone', { length: 20 }),
clientPhoneAlt: varchar('client_phone_alt', { length: 20 }),
emergencyContact: varchar('emergency_contact', { length: 255 }),
emergencyPhone: varchar('emergency_phone', { length: 20 }),
billingEmail: varchar('billing_email', { length: 255 }),
visitFrequency: varchar('visit_frequency', { length: 50 }), // 'weekly', 'biweekly', 'monthly'
ratePerVisit: varchar('rate_per_visit', { length: 20 }),     // stored as string to avoid float issues
neighborhoodId: uuid('neighborhood_id').references(() => neighborhoods.id),
```

### 1.3 Security Profiles (1:1 with property)

Legacy: `c_security` — 307 rows, one per client.

```ts
export const securityProfiles = pgTable('security_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull().unique(),
  alarmCompany: varchar('alarm_company', { length: 255 }),
  alarmCode: varchar('alarm_code', { length: 100 }),        // encrypted at app layer
  alarmNotes: text('alarm_notes'),
  keyLocation: text('key_location'),
  lockboxCode: varchar('lockbox_code', { length: 50 }),
  lockboxLocation: varchar('lockbox_location', { length: 255 }),
  gateCode: varchar('gate_code', { length: 100 }),
  garageCode: varchar('garage_code', { length: 100 }),
  wifiNetwork: varchar('wifi_network', { length: 255 }),
  wifiPassword: varchar('wifi_password', { length: 255 }),   // encrypted at app layer
  additionalNotes: text('additional_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 1.4 HVAC Units (1:N with property)

Legacy: `c_hvac` — 67 rows, multiple units per client.

```ts
import { integer } from 'drizzle-orm/pg-core';

export const hvacUnits = pgTable('hvac_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  unitLabel: varchar('unit_label', { length: 100 }).notNull(),   // "Upstairs Unit", "Main Floor"
  unitType: varchar('unit_type', { length: 50 }),                 // 'central', 'mini-split', 'window'
  brand: varchar('brand', { length: 100 }),
  modelNumber: varchar('model_number', { length: 100 }),
  thermostatLocation: varchar('thermostat_location', { length: 255 }),
  thermostatType: varchar('thermostat_type', { length: 100 }),    // 'Nest', 'Honeywell', 'Ecobee'
  setTempCool: integer('set_temp_cool'),                          // target cool temp °F
  setTempHeat: integer('set_temp_heat'),                          // target heat temp °F
  filterSize: varchar('filter_size', { length: 50 }),
  filterLocation: varchar('filter_location', { length: 255 }),
  lastFilterChange: date('last_filter_change'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 1.5 Plumbing Details (1:N with property)

Legacy: `c_plumbing` — 36 rows.

```ts
export const plumbingDetails = pgTable('plumbing_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(),      // 'main_shutoff', 'water_heater', 'meter', 'irrigation_shutoff', 'other'
  location: text('location').notNull(),
  brand: varchar('brand', { length: 100 }),
  modelNumber: varchar('model_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 1.6 Open/Close Procedures

Legacy: `c_open_close_std` (319 rows, 1:1) + `c_open_close_cus` (93 rows, 1:N).

Standard procedure is a fixed set of boolean fields. Custom items are free-form.

```ts
export const openCloseProcedures = pgTable('open_close_procedures', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull().unique(),
  // Standard OPEN items (booleans — does this property need this step?)
  openWaterOn: boolean('open_water_on').default(false),
  openBreakerOn: boolean('open_breaker_on').default(false),
  openIceMakerOn: boolean('open_ice_maker_on').default(false),
  openAcSet: boolean('open_ac_set').default(false),
  openHotWaterOn: boolean('open_hot_water_on').default(false),
  openNotes: text('open_notes'),
  // Standard CLOSE items
  closeWaterOff: boolean('close_water_off').default(false),
  closeBreakerOff: boolean('close_breaker_off').default(false),
  closeIceMakerOff: boolean('close_ice_maker_off').default(false),
  closeAcSet: boolean('close_ac_set').default(false),
  closeHotWaterOff: boolean('close_hot_water_off').default(false),
  closeNotes: text('close_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const openCloseCustomItems = pgTable('open_close_custom_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  type: openCloseTypeEnum('type').notNull(),   // OPEN or CLOSE
  label: varchar('label', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 1.7 Hurricane Prep

Legacy: `c_hurricanes` (319 rows, 1:1 responsibility flags) + `c_hurricane_checklist` (50 rows, 1:N items) + `w_hurricanes` (1,209 rows, per-walksheet completions).

```ts
export const hurricaneProfiles = pgTable('hurricane_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull().unique(),
  shuttersResponsibility: hurricaneResponsibilityEnum('shutters_responsibility').default('OWNER'),
  furnitureResponsibility: hurricaneResponsibilityEnum('furniture_responsibility').default('OWNER'),
  poolPrepResponsibility: hurricaneResponsibilityEnum('pool_prep_responsibility').default('OWNER'),
  plantPrepResponsibility: hurricaneResponsibilityEnum('plant_prep_responsibility').default('OWNER'),
  generalNotes: text('general_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const hurricaneChecklistItems = pgTable('hurricane_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  responsibility: hurricaneResponsibilityEnum('responsibility').default('NEST'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Per-inspection hurricane checklist completion (child of inspections)
export const inspectionHurricaneItems = pgTable('inspection_hurricane_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  checklistItemId: uuid('checklist_item_id').references(() => hurricaneChecklistItems.id),
  label: varchar('label', { length: 255 }).notNull(),   // snapshot of label at time of inspection
  completed: boolean('completed').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 1.8 Route Planning (Routes → Neighborhoods → Communities)

Legacy: `Routes` (7) → `Neighborhood_to_Community_map` (147) → `Neighborhood` (58) + `Community` (189).

```ts
export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }),   // hex color for UI map
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  hoaName: varchar('hoa_name', { length: 255 }),
  hoaManagerName: varchar('hoa_manager_name', { length: 255 }),
  hoaManagerPhone: varchar('hoa_manager_phone', { length: 20 }),
  hoaManagerEmail: varchar('hoa_manager_email', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const neighborhoods = pgTable('neighborhoods', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  communityId: uuid('community_id').references(() => communities.id),
  routeId: uuid('route_id').references(() => routes.id),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

Then `properties.neighborhoodId` links a property into the hierarchy: **Route → Neighborhood → Community → Property**.

### 1.9 Lodging / Arrivals

Legacy: `Lodging` — 830 rows.

```ts
export const lodging = pgTable('lodging', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  arrivalDate: date('arrival_date').notNull(),
  departureDate: date('departure_date'),
  guestName: varchar('guest_name', { length: 255 }),
  guestCount: integer('guest_count'),
  notes: text('notes'),
  openRequested: boolean('open_requested').default(false),
  closeRequested: boolean('close_requested').default(false),
  openCompletedAt: timestamp('open_completed_at'),
  closeCompletedAt: timestamp('close_completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 1.10 Vendor Management

Legacy: `c_vendors` — 48 rows.

```ts
export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  category: vendorCategoryEnum('category').notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 1.11 Inspector Notes (internal-only, per inspection)

Legacy: `w_inspectorNotes` — 5,463 rows.

```ts
export const inspectorNotes = pgTable('inspector_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').default(true).notNull(),  // never shown to clients
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 1.12 Inspection Attachments (photos)

Legacy: `w_attachments` — 262 rows with Google Drive IDs.

```ts
export const inspectionAttachments = pgTable('inspection_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }).notNull(),
  inspectionItemId: uuid('inspection_item_id').references(() => inspectionItems.id),  // optional: tie to specific checklist item
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),              // S3/R2 URL
  thumbnailUrl: text('thumbnail_url'),
  mimeType: varchar('mime_type', { length: 100 }),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 1.13 Reminders (future phase, included for completeness)

```ts
export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),  // null = global
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  dueDate: date('due_date').notNull(),
  frequency: reminderFrequencyEnum('frequency').default('ONCE'),
  includeInEmail: boolean('include_in_email').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 1.14 Relations to Add

```ts
export const propertiesRelations = relations(properties, ({ one, many }) => ({
  client: one(users, { fields: [properties.clientId], references: [users.id] }),
  neighborhood: one(neighborhoods, { fields: [properties.neighborhoodId], references: [neighborhoods.id] }),
  inspections: many(inspections),
  securityProfile: one(securityProfiles),   // via securityProfiles.propertyId unique
  openCloseProcedure: one(openCloseProcedures),
  hurricaneProfile: one(hurricaneProfiles),
  hvacUnits: many(hvacUnits),
  plumbingDetails: many(plumbingDetails),
  vendors: many(vendors),
  lodgings: many(lodging),
  openCloseCustomItems: many(openCloseCustomItems),
  hurricaneChecklistItems: many(hurricaneChecklistItems),
}));

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  property: one(properties, { fields: [inspections.propertyId], references: [properties.id] }),
  inspector: one(users, { fields: [inspections.inspectorId], references: [users.id] }),
  template: one(checklistTemplates, { fields: [inspections.templateId], references: [checklistTemplates.id] }),
  items: many(inspectionItems),
  inspectorNotes: many(inspectorNotes),
  attachments: many(inspectionAttachments),
  hurricaneItems: many(inspectionHurricaneItems),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  neighborhoods: many(neighborhoods),
}));

export const neighborhoodsRelations = relations(neighborhoods, ({ one, many }) => ({
  community: one(communities, { fields: [neighborhoods.communityId], references: [communities.id] }),
  route: one(routes, { fields: [neighborhoods.routeId], references: [routes.id] }),
  properties: many(properties),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
  neighborhoods: many(neighborhoods),
}));
```

---

## 2. API Routes

### 2.1 Property Sub-Resources

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/properties/[id]/security` | Get security profile |
| PUT | `/api/properties/[id]/security` | Create/update security profile |
| GET | `/api/properties/[id]/hvac` | List HVAC units |
| POST | `/api/properties/[id]/hvac` | Add HVAC unit |
| PUT | `/api/properties/[id]/hvac/[unitId]` | Update HVAC unit |
| DELETE | `/api/properties/[id]/hvac/[unitId]` | Remove HVAC unit |
| GET | `/api/properties/[id]/plumbing` | List plumbing details |
| POST | `/api/properties/[id]/plumbing` | Add plumbing detail |
| PUT | `/api/properties/[id]/plumbing/[itemId]` | Update plumbing detail |
| DELETE | `/api/properties/[id]/plumbing/[itemId]` | Remove plumbing detail |
| GET | `/api/properties/[id]/open-close` | Get open/close procedures + custom items |
| PUT | `/api/properties/[id]/open-close` | Update standard procedures |
| POST | `/api/properties/[id]/open-close/custom` | Add custom open/close item |
| DELETE | `/api/properties/[id]/open-close/custom/[itemId]` | Remove custom item |
| GET | `/api/properties/[id]/hurricane` | Get hurricane profile + checklist |
| PUT | `/api/properties/[id]/hurricane` | Update hurricane responsibilities |
| POST | `/api/properties/[id]/hurricane/checklist` | Add hurricane checklist item |
| DELETE | `/api/properties/[id]/hurricane/checklist/[itemId]` | Remove checklist item |
| GET | `/api/properties/[id]/vendors` | List vendors for property |
| POST | `/api/properties/[id]/vendors` | Add vendor |
| PUT | `/api/properties/[id]/vendors/[vendorId]` | Update vendor |
| DELETE | `/api/properties/[id]/vendors/[vendorId]` | Remove vendor |
| GET | `/api/properties/[id]/lodging` | List lodging entries |
| POST | `/api/properties/[id]/lodging` | Add lodging entry |
| PUT | `/api/properties/[id]/lodging/[lodgingId]` | Update lodging |
| DELETE | `/api/properties/[id]/lodging/[lodgingId]` | Remove lodging |

### 2.2 Inspection Sub-Resources

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/inspections/[id]/notes` | List inspector notes |
| POST | `/api/inspections/[id]/notes` | Add inspector note |
| DELETE | `/api/inspections/[id]/notes/[noteId]` | Remove note |
| GET | `/api/inspections/[id]/attachments` | List attachments |
| POST | `/api/inspections/[id]/attachments` | Upload attachment (multipart) |
| DELETE | `/api/inspections/[id]/attachments/[attachmentId]` | Remove attachment |
| GET | `/api/inspections/[id]/hurricane-items` | List hurricane completion items |
| POST | `/api/inspections/[id]/hurricane-items` | Populate from property checklist template |
| PUT | `/api/inspections/[id]/hurricane-items/[itemId]` | Toggle completion |

### 2.3 Route Planning

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/routes` | List all routes with nested neighborhoods + property counts |
| POST | `/api/routes` | Create route |
| PUT | `/api/routes/[id]` | Update route |
| DELETE | `/api/routes/[id]` | Delete route |
| GET | `/api/communities` | List communities |
| POST | `/api/communities` | Create community |
| PUT | `/api/communities/[id]` | Update community |
| DELETE | `/api/communities/[id]` | Delete community |
| GET | `/api/neighborhoods` | List neighborhoods |
| POST | `/api/neighborhoods` | Create neighborhood |
| PUT | `/api/neighborhoods/[id]` | Update neighborhood |
| DELETE | `/api/neighborhoods/[id]` | Delete neighborhood |

### 2.4 Dashboard Aggregation

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard/arrivals` | Upcoming arrivals/departures (next 14 days) |
| GET | `/api/dashboard/overdue` | Overdue inspections |
| GET | `/api/dashboard/route-summary` | Route → property counts + last-visited dates |
| GET | `/api/dashboard/hurricane-status` | Hurricane prep completion across all properties |

### 2.5 Portfolio Views (cross-property lookups)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/portfolio/hvac` | All HVAC units across all properties |
| GET | `/api/portfolio/plumbing` | All plumbing across all properties |
| GET | `/api/portfolio/security` | All security profiles (admin only) |
| GET | `/api/portfolio/vendors` | All vendors across all properties |

---

## 3. UI Pages & Components

### 3.1 New Pages

| Path | Description |
|------|-------------|
| `/properties/[id]/security` | Security profile editor (alarm, keys, WiFi, gate codes) |
| `/properties/[id]/systems` | HVAC + Plumbing tab view — add/edit/remove units |
| `/properties/[id]/procedures` | Open/close procedures — standard toggles + custom items |
| `/properties/[id]/hurricane` | Hurricane responsibilities + checklist editor |
| `/properties/[id]/vendors` | Vendor contact list with add/edit |
| `/properties/[id]/lodging` | Lodging timeline — arrivals/departures calendar view |
| `/routes` | Route manager — tree view: Route → Neighborhood → Properties |
| `/routes/[id]` | Route detail — map + property list, drag to reorder |
| `/communities` | Community/HOA directory |
| `/inspections/[id]/notes` | Inspector notes panel (drawer or tab in existing inspection view) |
| `/inspections/[id]/photos` | Photo gallery with upload + descriptions |
| `/inspections/[id]/hurricane` | Hurricane checklist completion (during inspection) |
| `/dashboard` | Enhanced dashboard with arrivals widget, overdue widget, route summary |
| `/portfolio/hvac` | Cross-property HVAC overview table |
| `/portfolio/plumbing` | Cross-property plumbing overview table |
| `/portfolio/security` | Cross-property security overview (admin only) |
| `/portfolio/vendors` | Cross-property vendor directory |

### 3.2 New Components

| Component | Purpose |
|-----------|---------|
| `PropertyTabs` | Tab navigation for property sub-pages (Details, Security, Systems, Procedures, Hurricane, Vendors, Lodging) |
| `SecurityForm` | Form for alarm codes, keys, WiFi, gate codes |
| `HvacUnitCard` | Card display for HVAC unit with edit/delete |
| `PlumbingItemCard` | Card for plumbing item |
| `OpenCloseChecklist` | Toggle list for standard procedures + custom items |
| `HurricaneResponsibilityGrid` | Grid of responsibility assignments |
| `HurricaneChecklistEditor` | Add/remove/reorder hurricane prep items |
| `VendorCard` | Vendor contact card with category badge |
| `LodgingCalendar` | Calendar/timeline view of arrivals and departures |
| `LodgingForm` | Add/edit lodging entry |
| `RouteTree` | Hierarchical tree: Route → Neighborhood → Property |
| `InspectorNotesDrawer` | Side drawer for adding internal notes during inspection |
| `PhotoUploader` | Drag-and-drop photo upload with description field |
| `PhotoGallery` | Grid view of inspection photos with lightbox |
| `ArrivalsWidget` | Dashboard widget showing next 14 days of arrivals/departures |
| `OverdueWidget` | Dashboard widget showing overdue inspections |
| `RouteSummaryWidget` | Dashboard widget showing route visit status |
| `PortfolioTable` | Reusable data table for portfolio views (sortable, filterable) |

---

## 4. Migration Strategy

### Principles

1. **New tables only** — Don't alter existing MVP tables (users, properties, inspections, inspection_items, checklist_templates, checklist_template_items) except to add FK columns.
2. **One column addition to `properties`** — Add `neighborhoodId` FK. All other property extensions go into dedicated child tables (security_profiles, hvac_units, etc.).
3. **Preserve `accessNotes`** — The existing `properties.accessNotes` field overlaps with security_profiles. Keep it as a free-text fallback; security_profiles provides structured data. Migration script can copy accessNotes → security_profiles.additional_notes.
4. **Drizzle migrations** — Each logical group gets its own migration file for clean rollback:
   - `0001_routes_neighborhoods_communities.sql`
   - `0002_security_profiles.sql`
   - `0003_hvac_plumbing.sql`
   - `0004_open_close_procedures.sql`
   - `0005_hurricane_prep.sql`
   - `0006_vendors.sql`
   - `0007_lodging.sql`
   - `0008_inspector_notes_attachments.sql`
   - `0009_reminders.sql` (future)

### Legacy Data Migration (Phase 5)

A separate `scripts/migrate-legacy.ts` script will:
1. Connect to legacy MySQL (read-only)
2. Map `Client` rows → `properties` + `users` (CLIENT role)
3. Map `c_security` → `security_profiles`
4. Map `c_hvac` → `hvac_units`
5. Map `c_plumbing` → `plumbing_details`
6. Map `c_open_close_std` → `open_close_procedures`
7. Map `c_open_close_cus` → `open_close_custom_items`
8. Map `c_hurricanes` → `hurricane_profiles`
9. Map `c_hurricane_checklist` → `hurricane_checklist_items`
10. Map `c_vendors` → `vendors`
11. Map `Lodging` → `lodging`
12. Map `Routes`, `Neighborhood`, `Community`, `Neighborhood_to_Community_map` → routes, neighborhoods, communities
13. Optionally: map `Walksheets` → inspections (historical data)

---

## 5. Priority Order

Based on what a homewatch inspector uses **daily**:

### Phase 1 — Core Property Data (Week 1-2)
> An inspector arriving at a property needs: alarm code, key location, gate code, WiFi password, HVAC settings, and water shutoff locations.

1. **Security Profiles** — schema + API + UI
2. **HVAC Units** — schema + API + UI
3. **Plumbing Details** — schema + API + UI
4. **Property Tabs** component to navigate between sub-pages

### Phase 2 — Inspection Workflow (Week 3-4)
> During an inspection: take photos, write internal notes, record findings.

5. **Inspection Attachments** (photo upload) — schema + API + UI
6. **Inspector Notes** — schema + API + UI
7. **Portfolio Views** (HVAC/Plumbing/Security/Vendors cross-property tables)

### Phase 3 — Route Planning (Week 5)
> Organizing which properties to visit on which days.

8. **Routes / Neighborhoods / Communities** — schema + API + UI
9. **Add `neighborhoodId` to properties** + UI for assignment
10. **Route Summary dashboard widget**

### Phase 4 — Property Operations (Week 6-7)
> Seasonal open/close procedures and vendor contacts.

11. **Open/Close Procedures** — schema + API + UI
12. **Vendor Management** — schema + API + UI
13. **Lodging / Arrivals** — schema + API + UI
14. **Arrivals dashboard widget**

### Phase 5 — Hurricane Prep (Week 8)
> Florida-specific. Critical during hurricane season (June–November).

15. **Hurricane Profiles + Checklists** — schema + API + UI
16. **Inspection Hurricane Items** (completion tracking during inspections)
17. **Hurricane Status dashboard widget**

### Phase 6 — Legacy Migration + Polish (Week 9-10)
18. **Legacy data migration script** (MySQL → PostgreSQL)
19. **Reminders system**
20. **Enhanced dashboard** with all widgets
21. **Search across all entities**

---

## Schema Summary

| New Table | Relation | Legacy Equivalent |
|-----------|----------|-------------------|
| `security_profiles` | 1:1 property | `c_security` |
| `hvac_units` | 1:N property | `c_hvac` |
| `plumbing_details` | 1:N property | `c_plumbing` |
| `open_close_procedures` | 1:1 property | `c_open_close_std` |
| `open_close_custom_items` | 1:N property | `c_open_close_cus` |
| `hurricane_profiles` | 1:1 property | `c_hurricanes` |
| `hurricane_checklist_items` | 1:N property | `c_hurricane_checklist` |
| `inspection_hurricane_items` | 1:N inspection | `w_hurricanes` |
| `routes` | top-level | `Routes` |
| `communities` | top-level | `Community` |
| `neighborhoods` | belongs to route + community | `Neighborhood` + map table |
| `lodging` | 1:N property | `Lodging` |
| `vendors` | 1:N property | `c_vendors` |
| `inspector_notes` | 1:N inspection | `w_inspectorNotes` |
| `inspection_attachments` | 1:N inspection | `w_attachments` |
| `reminders` | 1:N property (nullable) | `c_reminders` + `c_reminders_recurring` |

**Total: 16 new tables, 5 new enums, 1 column addition to `properties`.**

---

*This plan maps the full legacy feature set into the current Next.js + Drizzle architecture. Each phase is independently deployable. Phase 1 alone makes the app useful for daily operations.*
