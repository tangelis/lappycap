import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  users, properties, checklistTemplates, checklistTemplateItems,
  routes, neighborhoods, communities,
  propertySecurity, propertyHvac, propertyPlumbing,
  propertyOpenClose, propertyOpenCloseCustom,
  propertyHurricane, hurricaneChecklist,
  vendors, lodging, propertyCustomChecklist,
} from './schema';
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('🌱 Seeding Nest Home database (legacy-grade)...\n');

  // ─── USERS ───
  const [admin] = await db.insert(users).values({
    email: 'ron@nesthome.com',
    name: 'Ron Lamb',
    passwordHash: hashPassword('nesthome123'),
    role: 'ADMIN',
    phone: '(561) 252-5393',
  }).returning();

  const [inspector1] = await db.insert(users).values({
    email: 'inspector@nesthome.com',
    name: 'Mike Torres',
    passwordHash: hashPassword('nesthome123'),
    role: 'INSPECTOR',
    phone: '(561) 555-0100',
  }).returning();

  const [inspector2] = await db.insert(users).values({
    email: 'sarah@nesthome.com',
    name: 'Sarah Chen',
    passwordHash: hashPassword('nesthome123'),
    role: 'INSPECTOR',
    phone: '(561) 555-0101',
  }).returning();

  const [client1] = await db.insert(users).values({
    email: 'bwinters@example.com',
    name: 'Barbara Winters',
    passwordHash: hashPassword('nesthome123'),
    role: 'CLIENT',
    phone: '(212) 555-0200',
  }).returning();

  const [client2] = await db.insert(users).values({
    email: 'jmcallister@example.com',
    name: 'Jim McAllister',
    passwordHash: hashPassword('nesthome123'),
    role: 'CLIENT',
    phone: '(617) 555-0300',
  }).returning();

  const [client3] = await db.insert(users).values({
    email: 'dpetrova@example.com',
    name: 'Diana Petrova',
    passwordHash: hashPassword('nesthome123'),
    role: 'CLIENT',
    phone: '(312) 555-0400',
  }).returning();

  console.log('✅ 6 users created (1 admin, 2 inspectors, 3 clients)');

  // ─── ROUTES ───
  const [route1] = await db.insert(routes).values({ name: 'Route A — Coastal', notes: 'Ocean Blvd corridor, start south end' }).returning();
  const [route2] = await db.insert(routes).values({ name: 'Route B — Downtown', notes: 'Lake Worth downtown & Lucerne' }).returning();
  const [route3] = await db.insert(routes).values({ name: 'Route C — West Side', notes: 'West of I-95, Lantana border' }).returning();

  console.log('✅ 3 routes created');

  // ─── NEIGHBORHOODS ───
  const [nb1] = await db.insert(neighborhoods).values({ name: 'South End' }).returning();
  const [nb2] = await db.insert(neighborhoods).values({ name: 'Downtown' }).returning();
  const [nb3] = await db.insert(neighborhoods).values({ name: 'College Park' }).returning();

  console.log('✅ 3 neighborhoods created');

  // ─── COMMUNITIES ───
  const [comm1] = await db.insert(communities).values({
    name: 'Ocean Ridge Estates',
    companyName: 'Ocean Ridge HOA',
    managerName: 'Patricia Moore',
    phoneNumber: '(561) 555-8000',
    neighborhoodId: nb1.id,
    routeId: route1.id,
    routePosition: 1,
  }).returning();

  const [comm2] = await db.insert(communities).values({
    name: 'Lucerne Lakes',
    companyName: 'Lucerne Lakes Mgmt',
    managerName: 'Carlos Reyes',
    phoneNumber: '(561) 555-8001',
    neighborhoodId: nb2.id,
    routeId: route2.id,
    routePosition: 1,
  }).returning();

  const [comm3] = await db.insert(communities).values({
    name: 'Palm Cove',
    companyName: 'Palm Cove Association',
    managerName: 'Linda Walsh',
    phoneNumber: '(561) 555-8002',
    neighborhoodId: nb3.id,
    routeId: route3.id,
    routePosition: 1,
  }).returning();

  console.log('✅ 3 communities created');

  // ─── PROPERTIES ───
  const [prop1] = await db.insert(properties).values({
    address: '1500 S Ocean Blvd',
    city: 'Lake Worth Beach',
    state: 'FL',
    zip: '33460',
    clientId: client1.id,
    communityId: comm1.id,
    routePosition: 1,
    weeklyRate: 75,
    accessNotes: 'Gate code: 4521. Key under fake rock by back door.',
    specialInstructions: 'Check pool pump weekly. Water orchids on lanai.',
  }).returning();

  const [prop2] = await db.insert(properties).values({
    address: '800 Lucerne Ave',
    city: 'Lake Worth Beach',
    state: 'FL',
    zip: '33460',
    clientId: client1.id,
    communityId: comm2.id,
    routePosition: 2,
    weeklyRate: 65,
    accessNotes: 'Lockbox on side gate: 1234',
    specialInstructions: 'AC must stay at 78°F. Check for roof leaks after storms.',
  }).returning();

  const [prop3] = await db.insert(properties).values({
    address: '2200 N Federal Hwy, Unit 305',
    city: 'Lake Worth Beach',
    state: 'FL',
    zip: '33460',
    clientId: client2.id,
    communityId: comm2.id,
    routePosition: 3,
    weeklyRate: 55,
    accessNotes: 'Building concierge has key. Call ahead: (561) 555-9000',
    specialInstructions: 'Condo — no exterior maintenance. Focus on interior + HVAC.',
  }).returning();

  const [prop4] = await db.insert(properties).values({
    address: '445 Palm Cove Dr',
    city: 'Lake Worth Beach',
    state: 'FL',
    zip: '33460',
    clientId: client3.id,
    communityId: comm3.id,
    routePosition: 1,
    weeklyRate: 85,
    accessNotes: 'Gate remote in lockbox by garage. Lockbox code: 7890. Alarm: 1234#',
    specialInstructions: 'Two AC units — check both. Pool service comes Tuesdays.',
  }).returning();

  console.log('✅ 4 properties created');

  // ─── SECURITY PROFILES ───
  await db.insert(propertySecurity).values([
    {
      propertyId: prop1.id,
      keyNumber: 'K-101',
      keyBinName: 'Bin A',
      alarmCode: '4521',
      alarmPassword: 'ocean2020',
      primaryAlarmPanelLocation: 'Front hallway closet',
      garageDoorKeypadCode: '1234',
      lockBoxCode: '4521',
      lockBoxLocation: 'Back door, under fake rock',
      specialEntryInstructions: 'Disarm alarm within 30 seconds of entry.',
      communityGateCode: '0000#',
      modemLocation: 'Office closet, 2nd shelf',
      wifiPassword: 'OceanBreeze2024',
    },
    {
      propertyId: prop2.id,
      keyNumber: 'K-102',
      keyBinName: 'Bin A',
      alarmCode: '9876',
      primaryAlarmPanelLocation: 'Kitchen pantry',
      lockBoxCode: '1234',
      lockBoxLocation: 'Side gate',
      communityGateCode: '5555#',
      wifiPassword: 'LucerneLake99',
    },
    {
      propertyId: prop3.id,
      keyNumber: 'K-305',
      keyBinName: 'Bin B',
      specialEntryInstructions: 'Check in with concierge. No alarm system.',
      modemLocation: 'Living room entertainment center',
      wifiPassword: 'FederalHwy305',
    },
    {
      propertyId: prop4.id,
      keyNumber: 'K-445',
      keyBinName: 'Bin C',
      alarmCode: '1234',
      alarmPassword: 'palmcove',
      primaryAlarmPanelLocation: 'Garage entry door, right side',
      garageDoorKeypadCode: '7890',
      lockBoxCode: '7890',
      lockBoxLocation: 'By garage side door',
      specialEntryInstructions: 'Enter through garage. Disarm alarm immediately — 15 second window.',
      communityGateCode: '3333#',
      modemLocation: 'Master bedroom closet',
      wifiPassword: 'PalmCove445!',
    },
  ]);

  console.log('✅ 4 security profiles created');

  // ─── HVAC ───
  await db.insert(propertyHvac).values([
    {
      propertyId: prop1.id,
      hvacId: 'Main Unit',
      airHandlerLocation: 'Garage, north wall',
      compressorLocation: 'East side of house',
      thermostatSettingAway: 78,
      thermostatSettingHome: 74,
      humidistatSettingAway: '58%',
      humidistatSettingHome: '55%',
      acFilterLocation: 'Garage ceiling return',
      acFilterDimensions: '20x25x1',
    },
    {
      propertyId: prop4.id,
      hvacId: 'Unit A — Downstairs',
      airHandlerLocation: 'Utility closet, hallway',
      compressorLocation: 'West side, by pool equipment',
      thermostatSettingAway: 78,
      thermostatSettingHome: 73,
      acFilterLocation: 'Hallway return',
      acFilterDimensions: '16x25x1',
    },
    {
      propertyId: prop4.id,
      hvacId: 'Unit B — Upstairs',
      airHandlerLocation: 'Attic access, master closet',
      compressorLocation: 'West side, by pool equipment',
      thermostatSettingAway: 79,
      thermostatSettingHome: 74,
      acFilterLocation: 'Master bedroom ceiling return',
      acFilterDimensions: '20x20x1',
    },
  ]);

  console.log('✅ 3 HVAC units created');

  // ─── PLUMBING ───
  await db.insert(propertyPlumbing).values([
    {
      propertyId: prop1.id,
      systemId: 'Main',
      mainShutoffLocation: 'Front of house, left of door in ground box',
      cityMeterLocation: 'Street curb, east side',
      waterHeaterLocation: 'Garage, south wall',
      waterHeaterShutoffLocation: 'Above water heater',
      description: '50-gal electric water heater, installed 2021',
    },
    {
      propertyId: prop4.id,
      systemId: 'Main',
      mainShutoffLocation: 'Side of garage, ground level blue handle',
      cityMeterLocation: 'Front sidewalk',
      waterHeaterLocation: 'Garage utility area',
      waterHeaterShutoffLocation: 'Red valve above heater',
      description: 'Tankless on-demand, Rinnai. Annual flush needed.',
    },
  ]);

  console.log('✅ 2 plumbing profiles created');

  // ─── OPEN/CLOSE PROCEDURES ───
  await db.insert(propertyOpenClose).values([
    {
      propertyId: prop1.id,
      openWaterValve: true,
      openWaterHeaterBreaker: true,
      openIceMakers: true,
      openInstaHot: false,
      closeWaterValve: true,
      closeWaterHeaterBreaker: true,
      closeIceMakers: true,
      closeEmptyIceMakers: true,
      closeInstaHot: false,
    },
    {
      propertyId: prop4.id,
      openWaterValve: true,
      openWaterHeaterBreaker: true,
      openIceMakers: true,
      openInstaHot: true,
      closeWaterValve: true,
      closeWaterHeaterBreaker: true,
      closeIceMakers: true,
      closeEmptyIceMakers: true,
      closeInstaHot: true,
    },
  ]);

  await db.insert(propertyOpenCloseCustom).values([
    { propertyId: prop1.id, type: 'OPEN', item: 'Turn on pool pump', value: 'Timer on garage wall' },
    { propertyId: prop1.id, type: 'OPEN', item: 'Open hurricane shutters', value: 'Crank in garage' },
    { propertyId: prop1.id, type: 'CLOSE', item: 'Set pool pump to low', value: 'Timer → "Away" mode' },
    { propertyId: prop1.id, type: 'CLOSE', item: 'Close hurricane shutters', value: 'Only during season' },
    { propertyId: prop4.id, type: 'OPEN', item: 'Start irrigation system', value: 'Controller in garage' },
    { propertyId: prop4.id, type: 'CLOSE', item: 'Winterize irrigation', value: 'Drain and shutoff' },
  ]);

  console.log('✅ Open/close procedures created');

  // ─── HURRICANE PREP ───
  await db.insert(propertyHurricane).values([
    {
      propertyId: prop1.id,
      responsibilityInTown: 'CLIENT_IN_TOWN',
      responsibilityOutTown: 'NEST_HOME',
      notes: 'Full hurricane shutters installed. Pool furniture stored in garage.',
    },
    {
      propertyId: prop4.id,
      responsibilityInTown: 'SHARED',
      responsibilityOutTown: 'NEST_HOME',
      notes: 'Impact windows — no shutters needed. Secure patio furniture and pool equipment.',
    },
  ]);

  await db.insert(hurricaneChecklist).values([
    { propertyId: prop1.id, item: 'Close all hurricane shutters', sortOrder: 1 },
    { propertyId: prop1.id, item: 'Secure pool furniture in garage', sortOrder: 2 },
    { propertyId: prop1.id, item: 'Fill bathtubs with water', sortOrder: 3 },
    { propertyId: prop1.id, item: 'Turn off pool pump breaker', sortOrder: 4 },
    { propertyId: prop1.id, item: 'Set AC to 72°F', sortOrder: 5 },
    { propertyId: prop1.id, item: 'Photograph all rooms for insurance', sortOrder: 6 },
    { propertyId: prop4.id, item: 'Secure all patio furniture', sortOrder: 1 },
    { propertyId: prop4.id, item: 'Move pool equipment to garage', sortOrder: 2 },
    { propertyId: prop4.id, item: 'Verify impact windows locked', sortOrder: 3 },
    { propertyId: prop4.id, item: 'Turn off irrigation system', sortOrder: 4 },
    { propertyId: prop4.id, item: 'Set both AC units to 72°F', sortOrder: 5 },
  ]);

  console.log('✅ Hurricane prep created');

  // ─── VENDORS ───
  await db.insert(vendors).values([
    { propertyId: prop1.id, type: 'POOL', name: 'Blue Wave Pool Service', phone: '(561) 555-7001', notes: 'Weekly service, Thursdays' },
    { propertyId: prop1.id, type: 'LANDSCAPING', name: 'Green Thumb Landscaping', phone: '(561) 555-7002', notes: 'Bi-weekly, Mondays' },
    { propertyId: prop1.id, type: 'PEST_CONTROL', name: 'Bug Off Pest Control', phone: '(561) 555-7003', notes: 'Quarterly treatment' },
    { propertyId: prop1.id, type: 'HVAC', name: 'Cool Air Services', phone: '(561) 555-7004', notes: 'Annual maintenance contract' },
    { propertyId: prop4.id, type: 'POOL', name: 'Crystal Clear Pools', phone: '(561) 555-7010', notes: 'Tuesdays' },
    { propertyId: prop4.id, type: 'SECURITY', name: 'ADT Home Security', phone: '(800) 555-7011', notes: 'Account #445-PC' },
    { propertyId: prop4.id, type: 'PLUMBING', name: 'Reliable Plumbing', phone: '(561) 555-7012', notes: 'Annual tankless flush' },
  ]);

  console.log('✅ 7 vendors created');

  // ─── LODGING ───
  await db.insert(lodging).values([
    {
      propertyId: prop1.id,
      clientId: client1.id,
      arrival: '2026-03-15',
      departure: '2026-04-30',
      clientNotes: 'Bringing the grandkids this year. Need extra towels.',
      nestNotes: 'Prepare home for arrival by 3/14. Full open procedure.',
      status: 'UPCOMING',
    },
    {
      propertyId: prop3.id,
      clientId: client2.id,
      arrival: '2026-03-01',
      departure: '2026-03-20',
      clientNotes: 'Quick visit, working remote.',
      status: 'UPCOMING',
    },
    {
      propertyId: prop4.id,
      clientId: client3.id,
      arrival: '2026-04-01',
      departureUnknown: true,
      clientNotes: 'May stay through summer. Will confirm departure later.',
      nestNotes: 'Open procedure needed. Both AC units.',
      status: 'UPCOMING',
    },
  ]);

  console.log('✅ 3 lodging records created');

  // ─── CUSTOM CHECKLIST ITEMS ───
  await db.insert(propertyCustomChecklist).values([
    { propertyId: prop1.id, item: 'Check pool chemical levels', notes: 'Log pH and chlorine' },
    { propertyId: prop1.id, item: 'Run all faucets for 2 minutes', notes: 'Prevent P-trap dry-out' },
    { propertyId: prop1.id, item: 'Check lanai screen for tears', notes: 'Wind damage common' },
    { propertyId: prop4.id, item: 'Check both thermostats match settings', notes: 'Upstairs drifts' },
    { propertyId: prop4.id, item: 'Verify irrigation timer schedule', notes: 'Check controller in garage' },
  ]);

  console.log('✅ 5 custom checklist items created');

  // ─── CHECKLIST TEMPLATES ───
  const [template] = await db.insert(checklistTemplates).values({
    name: 'Standard Homewatch Inspection',
    description: 'Full property walkthrough for seasonal residents',
  }).returning();

  const [hurricaneTemplate] = await db.insert(checklistTemplates).values({
    name: 'Hurricane Preparation',
    description: 'Pre-storm property securing checklist',
  }).returning();

  await db.insert(checklistTemplateItems).values([
    { templateId: template.id, label: 'Front door secure / no signs of entry', category: 'Security', sortOrder: 1 },
    { templateId: template.id, label: 'Windows closed and locked', category: 'Security', sortOrder: 2 },
    { templateId: template.id, label: 'Alarm system armed / functioning', category: 'Security', sortOrder: 3 },
    { templateId: template.id, label: 'AC running / thermostat at set temp', category: 'HVAC', sortOrder: 4 },
    { templateId: template.id, label: 'Air filter condition', category: 'HVAC', sortOrder: 5 },
    { templateId: template.id, label: 'Record HVAC temperature readings', category: 'HVAC', sortOrder: 6 },
    { templateId: template.id, label: 'Record humidity readings', category: 'HVAC', sortOrder: 7 },
    { templateId: template.id, label: 'No water leaks under sinks', category: 'Plumbing', sortOrder: 8 },
    { templateId: template.id, label: 'Toilets flushed / no running water', category: 'Plumbing', sortOrder: 9 },
    { templateId: template.id, label: 'Water heater functioning', category: 'Plumbing', sortOrder: 10 },
    { templateId: template.id, label: 'Run all faucets briefly', category: 'Plumbing', sortOrder: 11 },
    { templateId: template.id, label: 'Refrigerator running / no odors', category: 'Appliances', sortOrder: 12 },
    { templateId: template.id, label: 'No pest activity or droppings', category: 'Interior', sortOrder: 13 },
    { templateId: template.id, label: 'Pool pump running / water level OK', category: 'Exterior', sortOrder: 14 },
    { templateId: template.id, label: 'Landscaping maintained / no overgrowth', category: 'Exterior', sortOrder: 15 },
    { templateId: template.id, label: 'Roof / gutters — no visible damage', category: 'Exterior', sortOrder: 16 },
    { templateId: template.id, label: 'Mailbox cleared', category: 'Exterior', sortOrder: 17 },
    { templateId: template.id, label: 'Garage door secure', category: 'Exterior', sortOrder: 18 },
    // Hurricane template
    { templateId: hurricaneTemplate.id, label: 'Secure all outdoor furniture', category: 'Exterior', sortOrder: 1 },
    { templateId: hurricaneTemplate.id, label: 'Close hurricane shutters / verify impact windows', category: 'Exterior', sortOrder: 2 },
    { templateId: hurricaneTemplate.id, label: 'Move pool equipment to sheltered area', category: 'Exterior', sortOrder: 3 },
    { templateId: hurricaneTemplate.id, label: 'Turn off pool pump breaker', category: 'Electrical', sortOrder: 4 },
    { templateId: hurricaneTemplate.id, label: 'Set AC to 72°F', category: 'HVAC', sortOrder: 5 },
    { templateId: hurricaneTemplate.id, label: 'Fill bathtubs with water', category: 'Plumbing', sortOrder: 6 },
    { templateId: hurricaneTemplate.id, label: 'Photograph all rooms for insurance', category: 'Documentation', sortOrder: 7 },
    { templateId: hurricaneTemplate.id, label: 'Verify emergency contacts current', category: 'Admin', sortOrder: 8 },
  ]);

  console.log('✅ 2 checklist templates with 26 items created');

  // ─── DONE ───
  console.log('\n🏠 Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:      ron@nesthome.com / nesthome123');
  console.log('  Inspector:  inspector@nesthome.com / nesthome123');
  console.log('  Inspector:  sarah@nesthome.com / nesthome123');
  console.log('  Client:     bwinters@example.com / nesthome123');
  console.log('  Client:     jmcallister@example.com / nesthome123');
  console.log('  Client:     dpetrova@example.com / nesthome123');

  await pool.end();
}

seed().catch(console.error);
