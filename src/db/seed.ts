import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users, properties, checklistTemplates, checklistTemplateItems } from './schema';
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('🌱 Seeding database...');

  // Create admin
  const [admin] = await db.insert(users).values({
    email: 'ron@nesthome.com',
    name: 'Ron Lamb',
    passwordHash: hashPassword('nesthome123'),
    role: 'ADMIN',
    phone: '(561) 252-5393',
  }).returning();

  // Create inspector
  const [inspector] = await db.insert(users).values({
    email: 'inspector@nesthome.com',
    name: 'Mike Torres',
    passwordHash: hashPassword('nesthome123'),
    role: 'INSPECTOR',
    phone: '(561) 555-0100',
  }).returning();

  // Create a client (homeowner)
  const [client] = await db.insert(users).values({
    email: 'homeowner@example.com',
    name: 'Barbara Winters',
    passwordHash: hashPassword('nesthome123'),
    role: 'CLIENT',
    phone: '(212) 555-0200',
  }).returning();

  console.log('✅ Users created:', admin.name, inspector.name, client.name);

  // Create properties
  const [prop1] = await db.insert(properties).values({
    address: '1500 S Ocean Blvd',
    city: 'Lake Worth Beach',
    state: 'FL',
    zip: '33460',
    clientId: client.id,
    accessNotes: 'Gate code: 4521. Key under fake rock by back door.',
    specialInstructions: 'Check pool pump weekly. Water orchids on lanai.',
  }).returning();

  const [prop2] = await db.insert(properties).values({
    address: '800 Lucerne Ave',
    city: 'Lake Worth Beach',
    state: 'FL',
    zip: '33460',
    clientId: client.id,
    accessNotes: 'Lockbox on side gate: 1234',
    specialInstructions: 'AC must stay at 78°F. Check for roof leaks after storms.',
  }).returning();

  console.log('✅ Properties created:', prop1.address, prop2.address);

  // Create default checklist template
  const [template] = await db.insert(checklistTemplates).values({
    name: 'Standard Homewatch Inspection',
    description: 'Full property walkthrough checklist for seasonal residents',
  }).returning();

  const templateItems = [
    { label: 'Front door secure / no signs of entry', category: 'Security', sortOrder: '1' },
    { label: 'Windows closed and locked', category: 'Security', sortOrder: '2' },
    { label: 'Alarm system armed / functioning', category: 'Security', sortOrder: '3' },
    { label: 'AC running / thermostat at set temp', category: 'HVAC', sortOrder: '4' },
    { label: 'Air filter condition', category: 'HVAC', sortOrder: '5' },
    { label: 'No water leaks under sinks', category: 'Plumbing', sortOrder: '6' },
    { label: 'Toilets flushed / no running water', category: 'Plumbing', sortOrder: '7' },
    { label: 'Water heater functioning', category: 'Plumbing', sortOrder: '8' },
    { label: 'Refrigerator running / no odors', category: 'Appliances', sortOrder: '9' },
    { label: 'No pest activity or droppings', category: 'Interior', sortOrder: '10' },
    { label: 'Pool pump running / water level OK', category: 'Exterior', sortOrder: '11' },
    { label: 'Landscaping maintained / no overgrowth', category: 'Exterior', sortOrder: '12' },
    { label: 'Roof / gutters — no visible damage', category: 'Exterior', sortOrder: '13' },
    { label: 'Mailbox cleared', category: 'Exterior', sortOrder: '14' },
    { label: 'Garage door secure', category: 'Exterior', sortOrder: '15' },
  ];

  await db.insert(checklistTemplateItems).values(
    templateItems.map((item) => ({ ...item, templateId: template.id }))
  );

  console.log('✅ Checklist template created with', templateItems.length, 'items');
  console.log('');
  console.log('🏠 Seed complete!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:     ron@nesthome.com / nesthome123');
  console.log('  Inspector: inspector@nesthome.com / nesthome123');
  console.log('  Client:    homeowner@example.com / nesthome123');

  await pool.end();
}

seed().catch(console.error);
