import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  users, properties, checklistTemplates, checklistTemplateItems,
  inspections, inspectionItems, inspectorNotes, inspectionAttachments,
  routes, neighborhoods, communities,
  propertySecurity, propertyHvac, propertyPlumbing,
  propertyOpenClose, propertyOpenCloseCustom,
  propertyHurricane, hurricaneChecklist,
  vendors, lodging, propertyCustomChecklist,
  auditLog,
} from './schema';
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper: random date in range
function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

// Helper: random item from array
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('🌱 Seeding Nest Home — Palm Beach County production data...\n');

  // ═══════════════════════════════════════════════════════════
  // USERS — 3 admins, 6 inspectors, 40 clients (seasonal snowbirds)
  // ═══════════════════════════════════════════════════════════

  const [admin1] = await db.insert(users).values({
    email: 'ron@nesthome.com', name: 'Ron Lamb', passwordHash: hashPassword('nesthome123'),
    role: 'ADMIN', phone: '(561) 252-5393',
  }).returning();

  const [admin2] = await db.insert(users).values({
    email: 'admin@nesthome.com', name: 'Donna Ramirez', passwordHash: hashPassword('nesthome123'),
    role: 'ADMIN', phone: '(561) 312-4400',
  }).returning();

  const [admin3] = await db.insert(users).values({
    email: 'tim@nesthome.com', name: 'Tim Angeli', passwordHash: hashPassword('nesthome123'),
    role: 'ADMIN', phone: '(561) 317-1720',
  }).returning();

  // Inspectors — local PBC residents
  const inspectorData = [
    { email: 'mike.torres@nesthome.com', name: 'Mike Torres', phone: '(561) 414-8821' },
    { email: 'sarah.chen@nesthome.com', name: 'Sarah Chen', phone: '(561) 276-3390' },
    { email: 'carlos.medina@nesthome.com', name: 'Carlos Medina', phone: '(561) 523-7045' },
    { email: 'janet.oconnor@nesthome.com', name: 'Janet O\'Connor', phone: '(561) 889-1155' },
    { email: 'david.wright@nesthome.com', name: 'David Wright', phone: '(561) 704-2218' },
    { email: 'maria.santos@nesthome.com', name: 'Maria Santos', phone: '(561) 632-9977' },
  ];
  const inspectors: any[] = [];
  for (const ins of inspectorData) {
    const [i] = await db.insert(users).values({
      ...ins, passwordHash: hashPassword('nesthome123'), role: 'INSPECTOR',
    }).returning();
    inspectors.push(i);
  }

  // Clients — snowbirds from northeast/midwest
  const clientData = [
    { email: 'bwinters@comcast.net', name: 'Barbara Winters', phone: '(212) 555-0201' },
    { email: 'jmcallister@aol.com', name: 'Jim McAllister', phone: '(617) 555-0302' },
    { email: 'dpetrova@gmail.com', name: 'Diana Petrova', phone: '(312) 555-0403' },
    { email: 'rmartin@yahoo.com', name: 'Robert Martin', phone: '(203) 884-7210' },
    { email: 'kcollins@comcast.net', name: 'Karen Collins', phone: '(781) 652-3388' },
    { email: 'staylor22@gmail.com', name: 'Steven Taylor', phone: '(914) 553-4190' },
    { email: 'janderson.cpa@aol.com', name: 'Janet Anderson', phone: '(847) 220-6655' },
    { email: 'mthompson@outlook.com', name: 'Michael Thompson', phone: '(216) 478-1192' },
    { email: 'nwhite.law@gmail.com', name: 'Nancy White', phone: '(973) 810-5543' },
    { email: 'pharris99@comcast.net', name: 'Patricia Harris', phone: '(860) 334-7821' },
    { email: 'dking@verizon.net', name: 'Donald King', phone: '(516) 209-6478' },
    { email: 'lscott.md@gmail.com', name: 'Linda Scott', phone: '(248) 773-2200' },
    { email: 'jgreen44@yahoo.com', name: 'James Green', phone: '(609) 451-8834' },
    { email: 'sbaker.ri@comcast.net', name: 'Susan Baker', phone: '(401) 338-9921' },
    { email: 'wnelson@gmail.com', name: 'William Nelson', phone: '(440) 665-3317' },
    { email: 'cmitchell@att.net', name: 'Carol Mitchell', phone: '(614) 892-5543' },
    { email: 'rperez.nyc@gmail.com', name: 'Richard Perez', phone: '(718) 230-4455' },
    { email: 'mroberts@comcast.net', name: 'Margaret Roberts', phone: '(508) 774-1188' },
    { email: 'jturnbull@outlook.com', name: 'John Turnbull', phone: '(412) 556-7700' },
    { email: 'edavis.ct@gmail.com', name: 'Elizabeth Davis', phone: '(203) 442-3698' },
    { email: 'gharcia@yahoo.com', name: 'George Garcia', phone: '(631) 889-2234' },
    { email: 'hwilson.chicago@aol.com', name: 'Helen Wilson', phone: '(312) 776-5501' },
    { email: 'fmoore@verizon.net', name: 'Frank Moore', phone: '(201) 334-8892' },
    { email: 'ajackson@comcast.net', name: 'Alice Jackson', phone: '(585) 221-6673' },
    { email: 'tlee.ohio@gmail.com', name: 'Thomas Lee', phone: '(513) 447-9980' },
    { email: 'rclark@att.net', name: 'Ruth Clark', phone: '(860) 558-1127' },
    { email: 'jlewis@outlook.com', name: 'Joseph Lewis', phone: '(716) 334-2256' },
    { email: 'mwalker@comcast.net', name: 'Marie Walker', phone: '(978) 665-4412' },
    { email: 'chall.dds@gmail.com', name: 'Charles Hall', phone: '(914) 887-3345' },
    { email: 'dyoung@yahoo.com', name: 'Dorothy Young', phone: '(315) 442-8891' },
    { email: 'rallen@comcast.net', name: 'Raymond Allen', phone: '(484) 773-0098' },
    { email: 'vhernandez@gmail.com', name: 'Virginia Hernandez', phone: '(203) 556-7734' },
    { email: 'wwright.cpa@aol.com', name: 'Walter Wright', phone: '(908) 221-4456' },
    { email: 'jlopez.ct@outlook.com', name: 'Jean Lopez', phone: '(860) 889-3321' },
    { email: 'ehill@verizon.net', name: 'Edward Hill', phone: '(610) 334-5567' },
    { email: 'bradams@gmail.com', name: 'Betty Adams', phone: '(774) 221-8890' },
    { email: 'hcampbell@comcast.net', name: 'Henry Campbell', phone: '(518) 447-6623' },
    { email: 'sperry@att.net', name: 'Shirley Perry', phone: '(856) 332-7789' },
    { email: 'aross.md@gmail.com', name: 'Arthur Ross', phone: '(248) 556-1134' },
    { email: 'mmorgan@yahoo.com', name: 'Martha Morgan', phone: '(315) 889-2256' },
  ];
  const clients: any[] = [];
  for (const cl of clientData) {
    const [c] = await db.insert(users).values({
      ...cl, passwordHash: hashPassword('nesthome123'), role: 'CLIENT',
    }).returning();
    clients.push(c);
  }

  console.log(`✅ ${3 + inspectors.length + clients.length} users (3 admin, ${inspectors.length} inspectors, ${clients.length} clients)`);

  // ═══════════════════════════════════════════════════════════
  // ROUTES — Inspector driving routes through PBC
  // ═══════════════════════════════════════════════════════════

  const routeData = [
    { name: 'Route 1 — Coastal South', notes: 'Ocean Ridge, Briny Breezes, Gulf Stream. Start at Woolbright Rd, head south on A1A.' },
    { name: 'Route 2 — Lake Worth / Lantana', notes: 'Lake Worth Beach neighborhoods, east of I-95. Includes downtown and College Park.' },
    { name: 'Route 3 — Boynton Beach', notes: 'Boynton Beach east of I-95. Canyon Lakes, Indian Spring, Leisureville.' },
    { name: 'Route 4 — Delray Beach', notes: 'Delray Beach west to Military Trail. Pineapple Grove, Tropic Isle, Lake Ida.' },
    { name: 'Route 5 — Highland Beach / Boca', notes: 'Highland Beach condos and north Boca Raton. A1A corridor.' },
    { name: 'Route 6 — West Boynton', notes: 'West of I-95 — Valencia, Aberdeen, Canyon Springs, Hagen Ranch area.' },
    { name: 'Route 7 — Wellington / Royal Palm', notes: 'Wellington, Royal Palm Beach. Equestrian country.' },
    { name: 'Route 8 — Palm Beach Island', notes: 'Town of Palm Beach. High-value properties, limited access.' },
  ];
  const routeObjs: any[] = [];
  for (const r of routeData) {
    const [obj] = await db.insert(routes).values(r).returning();
    routeObjs.push(obj);
  }
  console.log(`✅ ${routeObjs.length} routes`);

  // ═══════════════════════════════════════════════════════════
  // NEIGHBORHOODS — Real PBC areas
  // ═══════════════════════════════════════════════════════════

  const nbData = [
    'Ocean Ridge', 'Briny Breezes', 'Gulf Stream', 'Manalapan',
    'South End (Lake Worth)', 'College Park (Lake Worth)', 'Downtown Lake Worth',
    'Parrot Cove', 'Lake Osborne', 'Lantana',
    'Boynton Beach East', 'Leisureville', 'Indian Spring', 'Canyon Lakes',
    'Pineapple Grove', 'Tropic Isle', 'Lake Ida', 'Downtown Delray',
    'Highland Beach', 'North Boca Raton', 'Boca del Mar',
    'Aberdeen', 'Valencia', 'Canyon Springs',
    'Wellington', 'Royal Palm Beach', 'The Acreage',
    'Palm Beach Island', 'South of Southern',
  ];
  const nbObjs: any[] = [];
  for (const n of nbData) {
    const [obj] = await db.insert(neighborhoods).values({ name: n }).returning();
    nbObjs.push(obj);
  }
  console.log(`✅ ${nbObjs.length} neighborhoods`);

  // ═══════════════════════════════════════════════════════════
  // COMMUNITIES — HOAs, condo associations, neighborhoods
  // ═══════════════════════════════════════════════════════════

  const communityData = [
    // Route 1 — Coastal South
    { name: 'Ocean Hammock', company: 'Ocean Hammock HOA', manager: 'Patricia Moore', phone: '(561) 732-8100', nb: 0, route: 0, pos: 1 },
    { name: 'Crown Colony Club', company: 'Crown Colony Mgmt', manager: 'Thomas Wells', phone: '(561) 276-4500', nb: 2, route: 0, pos: 2 },
    { name: 'Briny Breezes Inc', company: 'Briny Breezes Corp', manager: 'Doris Fenton', phone: '(561) 272-5335', nb: 1, route: 0, pos: 3 },
    { name: 'Eau de Palm Beach', company: 'Eau Condo Assoc', manager: 'Carlos Reyes', phone: '(561) 540-4800', nb: 3, route: 0, pos: 4 },
    // Route 2 — Lake Worth / Lantana
    { name: 'South Palm Beach Heights', company: null, manager: null, phone: null, nb: 4, route: 1, pos: 1 },
    { name: 'College Park Estates', company: 'College Park HOA', manager: 'Linda Walsh', phone: '(561) 585-3200', nb: 5, route: 1, pos: 2 },
    { name: 'Lucerne Lakes', company: 'Lucerne Lakes Mgmt', manager: 'Nancy Brennan', phone: '(561) 547-6300', nb: 6, route: 1, pos: 3 },
    { name: 'Lake Worth Towers', company: 'LWT Condo Assoc', manager: 'Victor Santos', phone: '(561) 582-7171', nb: 6, route: 1, pos: 4 },
    { name: 'Moorings at Lantana', company: 'Moorings HOA', manager: 'Rebecca Hill', phone: '(561) 586-2100', nb: 9, route: 1, pos: 5 },
    // Route 3 — Boynton Beach
    { name: 'Leisureville', company: 'Leisureville Civic Assoc', manager: 'Frank DiMaggio', phone: '(561) 732-7474', nb: 11, route: 2, pos: 1 },
    { name: 'Indian Spring CC', company: 'Indian Spring HOA', manager: 'Janet Kowalski', phone: '(561) 732-6900', nb: 12, route: 2, pos: 2 },
    { name: 'Canyon Lakes', company: 'Canyon Lakes POA', manager: 'Steve Barnett', phone: '(561) 369-1515', nb: 13, route: 2, pos: 3 },
    { name: 'Marina Village', company: 'Marina Village Master', manager: 'Dawn Prescott', phone: '(561) 737-0500', nb: 10, route: 2, pos: 4 },
    // Route 4 — Delray Beach
    { name: 'Pineapple Grove Village', company: null, manager: null, phone: null, nb: 14, route: 3, pos: 1 },
    { name: 'Tropic Isle Estates', company: 'Tropic Isle HOA', manager: 'Paul Romano', phone: '(561) 274-2828', nb: 15, route: 3, pos: 2 },
    { name: 'Lake Ida Shores', company: null, manager: null, phone: null, nb: 16, route: 3, pos: 3 },
    { name: 'Delray Place', company: 'Delray Place Condo', manager: 'Marilyn Chase', phone: '(561) 276-0101', nb: 17, route: 3, pos: 4 },
    // Route 5 — Highland Beach / Boca
    { name: 'Toscana', company: 'Toscana Master HOA', manager: 'Angela Rossi', phone: '(561) 278-4900', nb: 18, route: 4, pos: 1 },
    { name: 'Boca Highland Beach Club', company: 'BHB Club HOA', manager: 'Martin Fisher', phone: '(561) 391-3600', nb: 18, route: 4, pos: 2 },
    { name: 'The Addison', company: 'Addison Condo Assoc', manager: 'Diane Kraft', phone: '(561) 393-2800', nb: 19, route: 4, pos: 3 },
    // Route 6 — West Boynton
    { name: 'Aberdeen Golf & CC', company: 'Aberdeen Master HOA', manager: 'Bruce Kellerman', phone: '(561) 742-4600', nb: 21, route: 5, pos: 1 },
    { name: 'Valencia at Boynton', company: 'Valencia HOA', manager: 'Lisa Patel', phone: '(561) 600-2500', nb: 22, route: 5, pos: 2 },
    { name: 'Canyon Springs', company: 'Canyon Springs HOA', manager: 'Mike Deluca', phone: '(561) 369-8800', nb: 23, route: 5, pos: 3 },
    // Route 7 — Wellington / Royal Palm
    { name: 'Olympia', company: 'Olympia Master HOA', manager: 'Richard Hartley', phone: '(561) 795-3100', nb: 24, route: 6, pos: 1 },
    { name: 'Madison Green', company: 'Madison Green HOA', manager: 'Teresa Banks', phone: '(561) 790-4400', nb: 25, route: 6, pos: 2 },
    { name: 'Crestwood', company: 'Crestwood HOA', manager: 'Robert Vance', phone: '(561) 798-2200', nb: 25, route: 6, pos: 3 },
    // Route 8 — Palm Beach Island
    { name: 'Palm Beach Towers', company: 'PB Towers Condo', manager: 'Charlotte DuPont', phone: '(561) 655-2800', nb: 27, route: 7, pos: 1 },
    { name: 'The Breakers Row', company: 'Breakers Row HOA', manager: 'William Ashford III', phone: '(561) 655-6611', nb: 27, route: 7, pos: 2 },
    { name: 'Evermore', company: 'Evermore at PB HOA', manager: 'Judith Crane', phone: '(561) 832-0099', nb: 27, route: 7, pos: 3 },
  ];
  const commObjs: any[] = [];
  for (const c of communityData) {
    const [obj] = await db.insert(communities).values({
      name: c.name,
      companyName: c.company,
      managerName: c.manager,
      phoneNumber: c.phone,
      neighborhoodId: nbObjs[c.nb].id,
      routeId: routeObjs[c.route].id,
      routePosition: c.pos,
    }).returning();
    commObjs.push(obj);
  }
  console.log(`✅ ${commObjs.length} communities`);

  // ═══════════════════════════════════════════════════════════
  // PROPERTIES — 40 properties across PBC (real-ish addresses)
  // ═══════════════════════════════════════════════════════════

  const propertyData = [
    // Route 1 — Coastal (0-3)
    { addr: '6711 N Ocean Blvd, Unit 11', city: 'Ocean Ridge', zip: '33435', client: 0, comm: 0, pos: 1, rate: 95, access: 'Guard gate — must be on list. Unit key in lockbox at door.', special: 'Oceanfront unit. Check balcony for salt damage monthly. AC filter change every 6 weeks.' },
    { addr: '6799 N Ocean Blvd, Unit 22A', city: 'Ocean Ridge', zip: '33435', client: 1, comm: 0, pos: 2, rate: 95, access: 'Guard gate. Concierge holds backup key.', special: 'Corner unit with wrap-around balcony. Check all sliding doors seal properly.' },
    { addr: '3456 N Ocean Blvd', city: 'Gulf Stream', zip: '33483', client: 2, comm: 1, pos: 1, rate: 125, access: 'Key under ceramic frog by pool equipment. Alarm: 1776#', special: 'Waterfront estate. Seawall inspection monthly. Pool heated year-round — check heater.' },
    { addr: '5000 Old Ocean Blvd', city: 'Ocean Ridge', zip: '33435', client: 3, comm: 1, pos: 2, rate: 110, access: 'Lockbox on mailbox post. Code: 7294', special: 'Intracoastal property. Check dock lines and boat lift monthly.' },
    // Route 2 — Lake Worth / Lantana (4-8)
    { addr: '1422 S Ocean Blvd, Unit 8', city: 'Lantana', zip: '33462', client: 4, comm: 4, pos: 1, rate: 75, access: 'Building entrance code: 5678. Unit key in main office.', special: 'Ground floor unit. Check for flooding after heavy rain.' },
    { addr: '819 N Lakeside Dr', city: 'Lake Worth Beach', zip: '33460', client: 5, comm: 5, pos: 1, rate: 70, access: 'Lockbox on porch railing. Code: 3344', special: 'Bungalow with detached garage. Check garage roof — had leaks 2024.' },
    { addr: '621 Lucerne Ave', city: 'Lake Worth Beach', zip: '33460', client: 6, comm: 6, pos: 1, rate: 60, access: 'Key with neighbor at 623 Lucerne (Mrs. DeSantis)', special: 'Historic downtown cottage. No pool. Focus interior + HVAC.' },
    { addr: '1500 S Federal Hwy, Unit 1204', city: 'Lake Worth Beach', zip: '33460', client: 7, comm: 7, pos: 1, rate: 65, access: 'Front desk has key. Photo ID required.', special: 'High-rise condo. Verify balcony drainage. AC filter in hallway closet.' },
    { addr: '314 W Ocean Ave', city: 'Lantana', zip: '33462', client: 8, comm: 8, pos: 1, rate: 70, access: 'Lockbox on back fence, code: 4411. Alarm code: 9922#', special: 'Near nature preserve. Check for wildlife intrusion (raccoons in attic — sealed 2025).' },
    // Route 3 — Boynton Beach (9-14)
    { addr: '1101 NW 2nd Ave', city: 'Boynton Beach', zip: '33426', client: 9, comm: 9, pos: 1, rate: 50, access: 'Community gate remote in lockbox at clubhouse. Code: 1818', special: '55+ community. Small patio garden — water twice weekly.' },
    { addr: '1203 SW 27th Ave', city: 'Boynton Beach', zip: '33426', client: 10, comm: 9, pos: 2, rate: 50, access: 'Key under mat (yes, really). No alarm.', special: 'Corner lot. Landscaping tends to overgrow fast — check bi-weekly.' },
    { addr: '9800 Goldenrod Way', city: 'Boynton Beach', zip: '33437', client: 11, comm: 10, pos: 1, rate: 65, access: 'Guard gate — need to be on list. Key in garage keypad box, code: 5511', special: 'Golf course property. Check irrigation system — complex timer in garage.' },
    { addr: '9720 Indian Spring Dr', city: 'Boynton Beach', zip: '33437', client: 12, comm: 10, pos: 2, rate: 65, access: 'Lockbox on side of house. Code: 2468', special: 'Screened lanai with outdoor kitchen. Check grill propane level.' },
    { addr: '11500 Canyon Lakes Blvd', city: 'Boynton Beach', zip: '33437', client: 13, comm: 11, pos: 1, rate: 70, access: 'Gate access card in lockbox. Alarm: 3579#', special: 'Lake view property. Check for erosion at lake bank. Two-story — check upstairs AC separately.' },
    { addr: '700 Marina Dr, Unit 302', city: 'Boynton Beach', zip: '33435', client: 14, comm: 12, pos: 1, rate: 80, access: 'Marina office holds key. Call ahead: (561) 737-0500', special: 'Waterfront condo with boat slip. Check slip lines monthly.' },
    // Route 4 — Delray Beach (15-21)
    { addr: '117 NE 2nd Ave', city: 'Delray Beach', zip: '33444', client: 15, comm: 13, pos: 1, rate: 85, access: 'Key under potted palm by back entrance', special: 'Downtown Delray townhome. No yard. Focus on interior, HVAC, plumbing.' },
    { addr: '720 Tropic Isle Dr', city: 'Delray Beach', zip: '33483', client: 16, comm: 14, pos: 1, rate: 90, access: 'Lockbox in planter by front door, code: 6622', special: 'Waterfront home with pool and dock. Check seawall, dock, and pool weekly.' },
    { addr: '805 Tropic Isle Dr', city: 'Delray Beach', zip: '33483', client: 17, comm: 14, pos: 2, rate: 90, access: 'Key with neighbor at 801 (the Castellanos). Alarm: 4456#', special: 'Similar to 720 — waterfront + pool + dock. Generator — test monthly.' },
    { addr: '2100 Lake Ida Rd', city: 'Delray Beach', zip: '33445', client: 18, comm: 15, pos: 1, rate: 75, access: 'Gate remote in lockbox. Code: 8833. Alarm code: 5500', special: 'Lake Ida estate. Large property — 30 min inspection minimum. Pool + guest house.' },
    { addr: '2250 Lake Ida Rd', city: 'Delray Beach', zip: '33445', client: 19, comm: 15, pos: 2, rate: 75, access: 'Lockbox on fence, code: 7744', special: 'Guest house has separate HVAC — check both systems.' },
    { addr: '900 SE 5th Ave, Unit 4', city: 'Delray Beach', zip: '33483', client: 20, comm: 16, pos: 1, rate: 70, access: 'HOA office has key. Unit 4, 2nd floor.', special: 'Small condo. Check washer/dryer vent — clogged twice in 2024.' },
    { addr: '950 SE 5th Ave, Unit 12', city: 'Delray Beach', zip: '33483', client: 21, comm: 16, pos: 2, rate: 70, access: 'Lockbox on unit door, code: 1990', special: 'Top floor unit. Roof leak risk — check ceiling after storms.' },
    // Route 5 — Highland Beach / Boca (22-26)
    { addr: '3740 S Ocean Blvd, Unit 1509', city: 'Highland Beach', zip: '33487', client: 22, comm: 17, pos: 1, rate: 100, access: 'Valet holds key. Must show ID + be on approved list.', special: 'Luxury oceanfront. White glove. Check all marble surfaces for etching.' },
    { addr: '3720 S Ocean Blvd, Unit 802', city: 'Highland Beach', zip: '33487', client: 23, comm: 17, pos: 2, rate: 100, access: 'Same as 1509 — valet + ID.', special: 'Pool cabana included. Check cabana locks and condition.' },
    { addr: '4200 N Ocean Blvd', city: 'Highland Beach', zip: '33487', client: 24, comm: 18, pos: 1, rate: 115, access: 'Guard gate. Key in garage entry keypad, code: 9012', special: 'Beachfront estate. Hurricane shutters — full manual crank system. 45 min to close all.' },
    { addr: '1200 S Ocean Blvd, Unit 16F', city: 'Boca Raton', zip: '33432', client: 25, comm: 19, pos: 1, rate: 90, access: 'Concierge desk. Must call building manager 24h ahead.', special: 'High-rise. Wine cooler must stay at 55°F. Art collection — photograph monthly for insurance.' },
    { addr: '1180 S Ocean Blvd, Unit 8C', city: 'Boca Raton', zip: '33432', client: 26, comm: 19, pos: 2, rate: 85, access: 'Concierge. Key fob in office safe, request by name.', special: 'Piano in living room — must stay covered when away. Dehumidifier runs 24/7.' },
    // Route 6 — West Boynton (27-31)
    { addr: '8800 Aberdeen Dr', city: 'Boynton Beach', zip: '33472', client: 27, comm: 20, pos: 1, rate: 65, access: 'Guard gate — resident list. Lockbox code: 2345', special: 'Golf community. Cart in garage — plug in charger on departure. Check garage door opener battery.' },
    { addr: '8920 Aberdeen Dr', city: 'Boynton Beach', zip: '33472', client: 28, comm: 20, pos: 2, rate: 65, access: 'Same gate. Key under decorative rock by garage side door.', special: 'Two-story. Check upstairs bathroom — had slow leak in 2025. Fixed but watch it.' },
    { addr: '10100 Valencia Way', city: 'Boynton Beach', zip: '33437', client: 29, comm: 21, pos: 1, rate: 60, access: 'Gate clicker in lockbox by entry. Code: 4477', special: 'Single story villa. Small pool. Landscaping included in HOA but check monthly.' },
    { addr: '10450 Canyon Springs Ct', city: 'Boynton Beach', zip: '33437', client: 30, comm: 22, pos: 1, rate: 60, access: 'Gate code: 3366#. Lockbox on garage handle, code: 8811', special: 'Cul-de-sac property. Backyard borders preserve — check fence for damage from fallen trees.' },
    { addr: '10510 Canyon Springs Ct', city: 'Boynton Beach', zip: '33437', client: 31, comm: 22, pos: 2, rate: 60, access: 'Same gate. Key with neighbor at 10450 (the Allens).', special: 'Similar layout. Screened pool. Check pool cage for tears — last replaced 2022.' },
    // Route 7 — Wellington / Royal Palm (32-35)
    { addr: '2700 Olympia Blvd', city: 'Wellington', zip: '33414', client: 32, comm: 23, pos: 1, rate: 80, access: 'Guard gate. Garage keypad: 5656', special: 'Equestrian area. Horse barn on property — coordinate with stable manager for barn check.' },
    { addr: '2800 Olympia Blvd', city: 'Wellington', zip: '33414', client: 33, comm: 23, pos: 2, rate: 75, access: 'Guard gate. Lockbox on side gate: 7788', special: 'Pool and large yard. Irrigation system on well water — check well pump monthly.' },
    { addr: '11400 Madison Green Dr', city: 'Royal Palm Beach', zip: '33411', client: 34, comm: 24, pos: 1, rate: 55, access: 'Community sticker on car or guard gate call-in. Key under pot.', special: 'Standard single-family. Clean community. Focus on interior + basic exterior.' },
    { addr: '100 Crestwood Blvd', city: 'Royal Palm Beach', zip: '33411', client: 35, comm: 25, pos: 1, rate: 55, access: 'Lockbox on front door: 3322', special: 'Townhome. HOA handles exterior. Interior only — check HVAC, plumbing, appliances.' },
    // Route 8 — Palm Beach Island (36-39)
    { addr: '44 Cocoanut Row, Unit 511', city: 'Palm Beach', zip: '33480', client: 36, comm: 26, pos: 1, rate: 150, access: 'Doorman building. Must be pre-approved by owner. Photo ID.', special: 'Premium unit. Full white-glove service. Check climate control, art, wine storage, all fixtures.' },
    { addr: '100 Royal Palm Way, Unit 305', city: 'Palm Beach', zip: '33480', client: 37, comm: 26, pos: 2, rate: 150, access: 'Same building protocol. Doorman + elevator key.', special: 'Owner has Baccarat crystal collection. Photograph display case monthly. Handle with care.' },
    { addr: '200 S County Rd', city: 'Palm Beach', zip: '33480', client: 38, comm: 27, pos: 1, rate: 200, access: 'Private gate. Code changes monthly — client emails new code. Alarm: owner cell is panic button.', special: 'Oceanfront estate. Staff quarters. Coordinate with caretaker Maria (305-555-0177). Generator test weekly.' },
    { addr: '300 Dunbar Rd', city: 'Palm Beach', zip: '33480', client: 39, comm: 28, pos: 1, rate: 175, access: 'Gate buzzer. Key in safe at guard house, combo: 42-18-36', special: 'Intracoastal mansion. Pool, dock, guest house, staff quarters. Allow 90 min for full inspection. Three AC zones.' },
  ];

  const propObjs: any[] = [];
  for (const p of propertyData) {
    const [obj] = await db.insert(properties).values({
      address: p.addr,
      city: p.city,
      state: 'FL',
      zip: p.zip,
      clientId: clients[p.client].id,
      communityId: commObjs[p.comm].id,
      routePosition: p.pos,
      weeklyRate: p.rate,
      accessNotes: p.access,
      specialInstructions: p.special,
    }).returning();
    propObjs.push(obj);
  }
  console.log(`✅ ${propObjs.length} properties across ${routeObjs.length} routes`);

  // ═══════════════════════════════════════════════════════════
  // SECURITY PROFILES — All 40 properties
  // ═══════════════════════════════════════════════════════════

  const alarmCodes = ['1776#', '4521', '9922#', '3579#', '4456#', '5500', '8833', '1234', '7890', '2468'];
  const wifiPasswords = ['OceanBreeze24!', 'GulfStream99', 'LakeWorth2025', 'Snowbird123', 'PalmBeach!', 'Lantana55', 'BoyntonBch22', 'DelrayLife!', 'HighlandBch', 'Wellington44'];
  const lockboxLocations = ['Front door frame', 'Side gate handle', 'Mailbox post', 'Garage side door', 'Back porch railing', 'Under mailbox', 'Planter by entry', 'Gate post'];
  const binNames = ['Bin A', 'Bin B', 'Bin C', 'Bin D', 'Bin E'];
  const modemLocations = ['Office closet', 'Master bedroom closet', 'Kitchen pantry', 'Living room entertainment center', 'Hallway linen closet', 'Garage shelf'];

  for (let i = 0; i < propObjs.length; i++) {
    await db.insert(propertySecurity).values({
      propertyId: propObjs[i].id,
      keyNumber: `K-${String(i + 100).padStart(3, '0')}`,
      keyBinName: binNames[i % binNames.length],
      alarmCode: i % 3 === 0 ? alarmCodes[i % alarmCodes.length] : null,
      alarmPassword: i % 3 === 0 ? `pass${i + 100}` : null,
      primaryAlarmPanelLocation: i % 3 === 0 ? pick(['Front hallway closet', 'Kitchen pantry', 'Garage entry wall', 'Master closet']) : null,
      lockBoxCode: String(1000 + i * 111),
      lockBoxLocation: lockboxLocations[i % lockboxLocations.length],
      communityGateCode: i < 4 ? null : `${1000 + i * 7}#`,
      modemLocation: modemLocations[i % modemLocations.length],
      wifiPassword: wifiPasswords[i % wifiPasswords.length],
    });
  }
  console.log(`✅ ${propObjs.length} security profiles`);

  // ═══════════════════════════════════════════════════════════
  // HVAC — Most properties have 1 unit, big ones have 2-3
  // ═══════════════════════════════════════════════════════════

  let hvacCount = 0;
  const filterSizes = ['20x25x1', '16x25x1', '20x20x1', '14x20x1', '16x20x1', '24x24x1'];
  for (let i = 0; i < propObjs.length; i++) {
    const units = i >= 36 ? 3 : (i >= 18 || i === 2 || i === 13) ? 2 : 1; // Palm Beach mansions get 3, big homes 2
    for (let u = 0; u < units; u++) {
      await db.insert(propertyHvac).values({
        propertyId: propObjs[i].id,
        hvacId: units === 1 ? 'Main Unit' : `Unit ${String.fromCharCode(65 + u)} — ${u === 0 ? 'Downstairs' : u === 1 ? 'Upstairs' : 'Guest House'}`,
        airHandlerLocation: pick(['Garage, north wall', 'Utility closet, hallway', 'Attic access, master closet', 'Mechanical room', 'Closet off laundry room']),
        compressorLocation: pick(['East side of house', 'West side, by pool equipment', 'North side, behind garage', 'Courtyard', 'Roof (commercial unit)']),
        thermostatSettingAway: 78,
        thermostatSettingHome: pick([72, 73, 74, 75]),
        humidistatSettingAway: '58%',
        humidistatSettingHome: '55%',
        acFilterLocation: pick(['Garage ceiling return', 'Hallway return', 'Master bedroom ceiling return', 'Utility closet return']),
        acFilterDimensions: filterSizes[i % filterSizes.length],
      });
      hvacCount++;
    }
  }
  console.log(`✅ ${hvacCount} HVAC units`);

  // ═══════════════════════════════════════════════════════════
  // PLUMBING — All properties
  // ═══════════════════════════════════════════════════════════

  for (let i = 0; i < propObjs.length; i++) {
    await db.insert(propertyPlumbing).values({
      propertyId: propObjs[i].id,
      systemId: 'Main',
      mainShutoffLocation: pick(['Front of house, left of door in ground box', 'Side of garage, ground level blue handle', 'Mechanical room', 'Under kitchen sink (condo)', 'Utility closet behind washer']),
      cityMeterLocation: pick(['Street curb, east side', 'Front sidewalk', 'Alley behind property', 'Building utility room']),
      waterHeaterLocation: pick(['Garage, south wall', 'Garage utility area', 'Utility closet', 'Laundry room', 'Mechanical room']),
      waterHeaterShutoffLocation: pick(['Above water heater', 'Red valve above heater', 'Wall-mounted to left of heater', 'Behind access panel']),
      description: pick([
        '50-gal electric water heater, installed 2021',
        '40-gal electric, replaced 2023',
        'Tankless on-demand, Rinnai. Annual flush needed.',
        '80-gal electric, commercial grade',
        '50-gal gas water heater, 2020',
        'Tankless Navien, installed 2024',
      ]),
    });
  }
  console.log(`✅ ${propObjs.length} plumbing profiles`);

  // ═══════════════════════════════════════════════════════════
  // OPEN/CLOSE PROCEDURES — Properties with pools or complex systems
  // ═══════════════════════════════════════════════════════════

  const propsWithOpenClose = [0, 2, 3, 4, 8, 9, 11, 13, 15, 16, 17, 18, 19, 22, 24, 27, 29, 30, 31, 32, 33, 36, 37, 38, 39];
  for (const idx of propsWithOpenClose) {
    await db.insert(propertyOpenClose).values({
      propertyId: propObjs[idx].id,
      openWaterValve: true,
      openWaterHeaterBreaker: true,
      openIceMakers: Math.random() > 0.3,
      openInstaHot: Math.random() > 0.6,
      closeWaterValve: true,
      closeWaterHeaterBreaker: true,
      closeIceMakers: true,
      closeEmptyIceMakers: true,
      closeInstaHot: Math.random() > 0.6,
    });
  }

  // Custom open/close items for select properties
  const customOC = [
    { idx: 2, type: 'OPEN' as const, item: 'Start pool heater', value: 'Panel in pool equipment area' },
    { idx: 2, type: 'OPEN' as const, item: 'Open hurricane shutters (if closed)', value: 'Electric — switch in garage' },
    { idx: 2, type: 'CLOSE' as const, item: 'Turn off pool heater', value: 'Save energy when away' },
    { idx: 2, type: 'CLOSE' as const, item: 'Set irrigation to "vacation" mode', value: 'Timer in garage, green button' },
    { idx: 18, type: 'OPEN' as const, item: 'Start guest house AC', value: 'Separate thermostat in guest house hallway' },
    { idx: 18, type: 'OPEN' as const, item: 'Open pool house', value: 'Key in lockbox by main house garage' },
    { idx: 18, type: 'CLOSE' as const, item: 'Lock guest house separately', value: 'Deadbolt + alarm panel inside' },
    { idx: 38, type: 'OPEN' as const, item: 'Notify caretaker Maria of arrival', value: '(305) 555-0177' },
    { idx: 38, type: 'OPEN' as const, item: 'Test generator', value: 'Generac panel in garage. Run for 15 min.' },
    { idx: 38, type: 'OPEN' as const, item: 'Start all 3 AC zones', value: 'Main, East Wing, Staff Quarters' },
    { idx: 38, type: 'CLOSE' as const, item: 'Turn off non-essential breakers', value: 'Panel in garage — labeled' },
    { idx: 38, type: 'CLOSE' as const, item: 'Set generator to auto-standby', value: 'Generac panel — toggle to AUTO' },
    { idx: 39, type: 'OPEN' as const, item: 'Start dock lights and boat lift', value: 'Breaker panel, dock sub-panel' },
    { idx: 39, type: 'CLOSE' as const, item: 'Secure boat lift — raise fully', value: 'Control panel at dock' },
    { idx: 32, type: 'OPEN' as const, item: 'Plug in golf cart charger', value: 'Garage outlet, left side' },
    { idx: 32, type: 'CLOSE' as const, item: 'Unplug golf cart charger', value: 'Fire risk if left plugged in long-term' },
  ];
  for (const c of customOC) {
    await db.insert(propertyOpenCloseCustom).values({
      propertyId: propObjs[c.idx].id, type: c.type, item: c.item, value: c.value,
    });
  }
  console.log(`✅ ${propsWithOpenClose.length} open/close procedures + ${customOC.length} custom items`);

  // ═══════════════════════════════════════════════════════════
  // HURRICANE PREP
  // ═══════════════════════════════════════════════════════════

  const hurricaneProps = [0, 1, 2, 3, 4, 8, 13, 16, 17, 18, 22, 24, 27, 32, 36, 38, 39];
  for (const idx of hurricaneProps) {
    await db.insert(propertyHurricane).values({
      propertyId: propObjs[idx].id,
      responsibilityInTown: pick(['CLIENT_IN_TOWN', 'SHARED']),
      responsibilityOutTown: 'NEST_HOME',
      notes: pick([
        'Full hurricane shutters installed. Pool furniture stored in garage.',
        'Impact windows — no shutters needed. Secure patio furniture and pool equipment.',
        'Accordion shutters — close from inside. Need access to all rooms.',
        'Electric roll-down shutters. Switch in garage labeled by room.',
        'Manual panel shutters. Stored in garage. Allow 2+ hours for full install.',
        'Impact windows throughout. Focus on outdoor items and generator.',
      ]),
    });

    const items = [
      'Secure all outdoor furniture',
      'Close hurricane shutters / verify impact windows',
      'Move pool equipment to sheltered area',
      'Turn off pool pump breaker',
      'Set AC to 72°F',
      'Fill bathtubs with water',
      'Photograph all rooms for insurance',
      'Clear yard of loose debris',
      'Check generator fuel level',
    ];
    for (let s = 0; s < items.length; s++) {
      await db.insert(hurricaneChecklist).values({
        propertyId: propObjs[idx].id, item: items[s], sortOrder: s + 1,
      });
    }
  }
  console.log(`✅ ${hurricaneProps.length} hurricane profiles with checklists`);

  // ═══════════════════════════════════════════════════════════
  // VENDORS — Real-sounding PBC service providers
  // ═══════════════════════════════════════════════════════════

  const vendorPool = [
    { type: 'POOL' as const, name: 'Blue Wave Pool Service', phone: '(561) 733-7665' },
    { type: 'POOL' as const, name: 'Crystal Clear Pools of PBC', phone: '(561) 369-4200' },
    { type: 'POOL' as const, name: 'Sunshine Pool Care', phone: '(561) 287-0045' },
    { type: 'LANDSCAPING' as const, name: 'Green Thumb Landscaping', phone: '(561) 588-3210' },
    { type: 'LANDSCAPING' as const, name: 'Tropical Cuts Lawn Care', phone: '(561) 722-1800' },
    { type: 'LANDSCAPING' as const, name: 'Palm Beach Lawn Pros', phone: '(561) 495-3377' },
    { type: 'PEST_CONTROL' as const, name: 'Nozzle Nolen Pest Control', phone: '(561) 832-4100' },
    { type: 'PEST_CONTROL' as const, name: 'Shoreline Environmental', phone: '(561) 907-8888' },
    { type: 'HVAC' as const, name: 'Cool Air Services', phone: '(561) 585-9191' },
    { type: 'HVAC' as const, name: 'Lindstrom Air Conditioning', phone: '(561) 395-7227' },
    { type: 'PLUMBING' as const, name: 'Reliable Plumbing PBC', phone: '(561) 736-8822' },
    { type: 'PLUMBING' as const, name: 'Buckeye Plumbing', phone: '(561) 368-5511' },
    { type: 'ELECTRICAL' as const, name: 'Strickland Electric', phone: '(561) 265-5600' },
    { type: 'ELECTRICAL' as const, name: 'East Coast Electric', phone: '(561) 588-2050' },
    { type: 'SECURITY' as const, name: 'ADT Security Services', phone: '(800) 716-3640' },
    { type: 'SECURITY' as const, name: 'Guardian Alarm PBC', phone: '(561) 848-1212' },
    { type: 'GENERAL' as const, name: 'Handyman Connection', phone: '(561) 997-7003' },
    { type: 'GENERAL' as const, name: 'Mr. Fix It PBC', phone: '(561) 512-6640' },
  ];

  let vendorCount = 0;
  for (let i = 0; i < propObjs.length; i++) {
    // Each property gets 2-5 vendors
    const numVendors = 2 + Math.floor(Math.random() * 4);
    const usedTypes = new Set<string>();
    for (let v = 0; v < numVendors; v++) {
      let vendor;
      let attempts = 0;
      do {
        vendor = pick(vendorPool);
        attempts++;
      } while (usedTypes.has(vendor.type) && attempts < 20);
      usedTypes.add(vendor.type);
      const schedules = ['Weekly, Mondays', 'Weekly, Thursdays', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annual contract', 'On call'];
      await db.insert(vendors).values({
        propertyId: propObjs[i].id,
        type: vendor.type,
        name: vendor.name,
        phone: vendor.phone,
        notes: pick(schedules),
      });
      vendorCount++;
    }
  }
  console.log(`✅ ${vendorCount} vendor assignments`);

  // ═══════════════════════════════════════════════════════════
  // LODGING — Seasonal arrivals/departures (snowbird season)
  // ═══════════════════════════════════════════════════════════

  const clientNoteOptions = [
    'Bringing the grandkids this year. Need extra towels.',
    'Working remote for a few weeks.',
    'Hosting dinner party March 22. Place needs to be spotless.',
    'Arriving late evening. Leave lights on.',
    'Need the house at 74°F when we arrive please.',
    'Allergies — make sure filters are fresh before arrival.',
    'Please stock fridge with basics from Publix. Will reimburse.',
    'Just the two of us. Standard open.',
    'Dog coming this year — check for any pest treatment chemicals that might be toxic.',
    'Coming down for tennis season. Need courts info.',
    null,
    null,
  ];

  let lodgingCount = 0;
  for (let i = 0; i < propObjs.length; i++) {
    // Most properties get 1-2 lodging records for the season
    const numStays = Math.random() > 0.3 ? 2 : 1;
    for (let s = 0; s < numStays; s++) {
      const arrival = randomDate(new Date('2025-11-01'), new Date('2026-04-15'));
      const daysStay = 14 + Math.floor(Math.random() * 120); // 2 weeks to 4 months
      const depDate = new Date(arrival);
      depDate.setDate(depDate.getDate() + daysStay);
      const depUnknown = Math.random() > 0.85;

      const now = new Date('2026-02-27');
      const arrDate = new Date(arrival);
      let status: 'UPCOMING' | 'IN_RESIDENCE' | 'DEPARTED' = 'UPCOMING';
      if (arrDate < now && depDate > now) status = 'IN_RESIDENCE';
      else if (depDate < now) status = 'DEPARTED';

      await db.insert(lodging).values({
        propertyId: propObjs[i].id,
        clientId: clients[i % clients.length].id,
        arrival,
        departure: depUnknown ? null : depDate.toISOString().split('T')[0],
        departureUnknown: depUnknown,
        clientNotes: pick(clientNoteOptions),
        nestNotes: status === 'UPCOMING' ? 'Prepare home for arrival. Full open procedure.' : null,
        status,
      });
      lodgingCount++;
    }
  }
  console.log(`✅ ${lodgingCount} lodging records`);

  // ═══════════════════════════════════════════════════════════
  // CUSTOM CHECKLIST ITEMS — Property-specific extras
  // ═══════════════════════════════════════════════════════════

  const customItems = [
    { idx: 0, item: 'Check balcony railing for salt corrosion', notes: 'Oceanfront — corrodes fast' },
    { idx: 0, item: 'Rinse outdoor shower head', notes: 'Salt buildup clogs it' },
    { idx: 2, item: 'Inspect seawall for cracks', notes: 'Photograph any changes' },
    { idx: 2, item: 'Check pool heater pilot light', notes: 'Gas heater — check flame color' },
    { idx: 2, item: 'Test dock lights', notes: 'Waterfront safety requirement' },
    { idx: 3, item: 'Check boat lift cable tension', notes: 'Intracoastal property' },
    { idx: 3, item: 'Inspect dock for loose boards', notes: 'Replacement boards in garage' },
    { idx: 8, item: 'Check attic access for wildlife', notes: 'Had raccoons in 2025' },
    { idx: 11, item: 'Test irrigation system all zones', notes: 'Complex timer — 8 zones' },
    { idx: 13, item: 'Check lake bank erosion', notes: 'Photograph from same angle each visit' },
    { idx: 13, item: 'Test upstairs AC independently', notes: 'Separate thermostat, upstairs hall' },
    { idx: 16, item: 'Check dock and seawall', notes: 'Waterfront property' },
    { idx: 16, item: 'Run generator for 15 minutes', notes: 'Log run time in notebook on generator' },
    { idx: 17, item: 'Check dock and seawall', notes: 'Same as 720 Tropic Isle' },
    { idx: 18, item: 'Check guest house separately', notes: 'Has own HVAC and plumbing' },
    { idx: 18, item: 'Run pool house dehumidifier check', notes: 'Tends to fail — monitor' },
    { idx: 22, item: 'Inspect marble floors for etching', notes: 'Use white cloth test' },
    { idx: 24, item: 'Test all hurricane shutter cranks', notes: '45 min for full test — schedule accordingly' },
    { idx: 25, item: 'Check wine cooler temperature (55°F)', notes: 'Owner is very particular about this' },
    { idx: 25, item: 'Photograph art collection', notes: 'Insurance requirement — monthly photos' },
    { idx: 26, item: 'Verify dehumidifier is running', notes: 'Piano protection — critical' },
    { idx: 32, item: 'Check golf cart battery water level', notes: 'Distilled water only — in garage cabinet' },
    { idx: 32, item: 'Verify stable manager contact', notes: 'Horse barn requires coordination' },
    { idx: 38, item: 'Coordinate with caretaker Maria', notes: '(305) 555-0177 — confirm before visit' },
    { idx: 38, item: 'Test generator (Generac)', notes: 'Run 15 min, log in maintenance book' },
    { idx: 38, item: 'Check staff quarters', notes: 'Separate building — own AC and plumbing' },
    { idx: 39, item: 'Inspect boat dock and lift', notes: 'Intracoastal — check for storm damage' },
    { idx: 39, item: 'Check guest house', notes: 'Has own entry — key on main ring' },
    { idx: 39, item: 'Verify all 3 AC zones running', notes: 'Main, East Wing, Guest' },
  ];

  for (const ci of customItems) {
    await db.insert(propertyCustomChecklist).values({
      propertyId: propObjs[ci.idx].id, item: ci.item, notes: ci.notes,
    });
  }
  console.log(`✅ ${customItems.length} custom checklist items`);

  // ═══════════════════════════════════════════════════════════
  // CHECKLIST TEMPLATES
  // ═══════════════════════════════════════════════════════════

  const [stdTemplate] = await db.insert(checklistTemplates).values({
    name: 'Standard Homewatch Inspection',
    description: 'Full property walkthrough for seasonal residents. Used for most weekly/bi-weekly visits.',
  }).returning();

  const [condoTemplate] = await db.insert(checklistTemplates).values({
    name: 'Condo Interior Only',
    description: 'For condo units where HOA handles exterior. Interior systems and appliances focus.',
  }).returning();

  const [hurricaneTemplate] = await db.insert(checklistTemplates).values({
    name: 'Hurricane Preparation',
    description: 'Pre-storm property securing checklist. Used when tropical storm/hurricane warning issued.',
  }).returning();

  const [openTemplate] = await db.insert(checklistTemplates).values({
    name: 'Seasonal Open / Arrival Prep',
    description: 'Prepare home for owner arrival after extended absence.',
  }).returning();

  const [closeTemplate] = await db.insert(checklistTemplates).values({
    name: 'Seasonal Close / Departure',
    description: 'Secure home after owner departure for extended absence.',
  }).returning();

  // Standard homewatch items
  const stdItems = [
    { label: 'Front door secure / no signs of entry', category: 'Security', sort: 1 },
    { label: 'Windows closed and locked', category: 'Security', sort: 2 },
    { label: 'Alarm system armed / functioning', category: 'Security', sort: 3 },
    { label: 'Garage door secure', category: 'Security', sort: 4 },
    { label: 'AC running / thermostat at set temp', category: 'HVAC', sort: 5 },
    { label: 'Record thermostat temperature reading', category: 'HVAC', sort: 6 },
    { label: 'Air filter condition (clean/dirty/replaced)', category: 'HVAC', sort: 7 },
    { label: 'Record humidity reading', category: 'HVAC', sort: 8 },
    { label: 'No water leaks under sinks (kitchen)', category: 'Plumbing', sort: 9 },
    { label: 'No water leaks under sinks (bathrooms)', category: 'Plumbing', sort: 10 },
    { label: 'Toilets flushed / no running water', category: 'Plumbing', sort: 11 },
    { label: 'Water heater functioning / no leaks', category: 'Plumbing', sort: 12 },
    { label: 'Run all faucets for 30 seconds', category: 'Plumbing', sort: 13 },
    { label: 'Refrigerator running / no odors', category: 'Appliances', sort: 14 },
    { label: 'Dishwasher / washer — no standing water', category: 'Appliances', sort: 15 },
    { label: 'No pest activity or droppings', category: 'Interior', sort: 16 },
    { label: 'Check for musty/mold smell', category: 'Interior', sort: 17 },
    { label: 'Light switches functional (spot check)', category: 'Interior', sort: 18 },
    { label: 'Pool pump running / water level OK', category: 'Exterior', sort: 19 },
    { label: 'Pool water color / clarity', category: 'Exterior', sort: 20 },
    { label: 'Landscaping maintained / no overgrowth', category: 'Exterior', sort: 21 },
    { label: 'Roof / gutters — no visible damage', category: 'Exterior', sort: 22 },
    { label: 'Mailbox cleared', category: 'Exterior', sort: 23 },
    { label: 'Lanai / patio screen condition', category: 'Exterior', sort: 24 },
    { label: 'Exterior lights functioning', category: 'Exterior', sort: 25 },
  ];
  for (const item of stdItems) {
    await db.insert(checklistTemplateItems).values({
      templateId: stdTemplate.id, label: item.label, category: item.category, sortOrder: item.sort,
    });
  }

  // Condo interior items
  const condoItems = [
    { label: 'Unit door lock functioning', category: 'Security', sort: 1 },
    { label: 'Windows closed and locked', category: 'Security', sort: 2 },
    { label: 'AC running / thermostat at set temp', category: 'HVAC', sort: 3 },
    { label: 'Record thermostat temperature', category: 'HVAC', sort: 4 },
    { label: 'Air filter condition', category: 'HVAC', sort: 5 },
    { label: 'Humidity level acceptable', category: 'HVAC', sort: 6 },
    { label: 'Kitchen sink / dishwasher — no leaks', category: 'Plumbing', sort: 7 },
    { label: 'Bathroom sinks / toilets — no leaks', category: 'Plumbing', sort: 8 },
    { label: 'Run faucets 30 seconds', category: 'Plumbing', sort: 9 },
    { label: 'Water heater functioning', category: 'Plumbing', sort: 10 },
    { label: 'Refrigerator running / no odors', category: 'Appliances', sort: 11 },
    { label: 'Washer/dryer — no issues', category: 'Appliances', sort: 12 },
    { label: 'No pest activity', category: 'Interior', sort: 13 },
    { label: 'Check for musty smell / moisture', category: 'Interior', sort: 14 },
    { label: 'Balcony door sealed / locked', category: 'Interior', sort: 15 },
    { label: 'Balcony drain clear', category: 'Interior', sort: 16 },
  ];
  for (const item of condoItems) {
    await db.insert(checklistTemplateItems).values({
      templateId: condoTemplate.id, label: item.label, category: item.category, sortOrder: item.sort,
    });
  }

  // Hurricane template items
  const hurItems = [
    { label: 'Secure all outdoor furniture', category: 'Exterior', sort: 1 },
    { label: 'Close hurricane shutters / verify impact windows', category: 'Exterior', sort: 2 },
    { label: 'Move pool equipment to sheltered area', category: 'Exterior', sort: 3 },
    { label: 'Clear yard of loose debris', category: 'Exterior', sort: 4 },
    { label: 'Turn off pool pump breaker', category: 'Electrical', sort: 5 },
    { label: 'Set AC to 72°F (all zones)', category: 'HVAC', sort: 6 },
    { label: 'Fill bathtubs with water', category: 'Plumbing', sort: 7 },
    { label: 'Check generator fuel / test run', category: 'Electrical', sort: 8 },
    { label: 'Photograph all rooms for insurance', category: 'Documentation', sort: 9 },
    { label: 'Verify emergency contacts current', category: 'Admin', sort: 10 },
    { label: 'Charge all battery backups / flashlights', category: 'Electrical', sort: 11 },
    { label: 'Secure boat (if applicable)', category: 'Exterior', sort: 12 },
  ];
  for (const item of hurItems) {
    await db.insert(checklistTemplateItems).values({
      templateId: hurricaneTemplate.id, label: item.label, category: item.category, sortOrder: item.sort,
    });
  }

  // Seasonal open items
  const openItems = [
    { label: 'Turn on main water valve', category: 'Plumbing', sort: 1 },
    { label: 'Turn on water heater breaker', category: 'Plumbing', sort: 2 },
    { label: 'Run all faucets 2 minutes (flush lines)', category: 'Plumbing', sort: 3 },
    { label: 'Check for leaks after water on', category: 'Plumbing', sort: 4 },
    { label: 'Turn on ice makers', category: 'Appliances', sort: 5 },
    { label: 'Set thermostats to "home" settings', category: 'HVAC', sort: 6 },
    { label: 'Replace AC filters', category: 'HVAC', sort: 7 },
    { label: 'Open hurricane shutters (if closed)', category: 'Exterior', sort: 8 },
    { label: 'Start pool pump / check chemicals', category: 'Exterior', sort: 9 },
    { label: 'Start irrigation system', category: 'Exterior', sort: 10 },
    { label: 'Check all light bulbs', category: 'Interior', sort: 11 },
    { label: 'General cleaning check', category: 'Interior', sort: 12 },
    { label: 'Stock basics if requested', category: 'Admin', sort: 13 },
    { label: 'Test garage door opener', category: 'Security', sort: 14 },
    { label: 'Confirm alarm code with client', category: 'Security', sort: 15 },
  ];
  for (const item of openItems) {
    await db.insert(checklistTemplateItems).values({
      templateId: openTemplate.id, label: item.label, category: item.category, sortOrder: item.sort,
    });
  }

  // Seasonal close items
  const closeItems = [
    { label: 'Turn off main water valve', category: 'Plumbing', sort: 1 },
    { label: 'Turn off water heater breaker', category: 'Plumbing', sort: 2 },
    { label: 'Turn off ice makers', category: 'Appliances', sort: 3 },
    { label: 'Empty ice maker bins', category: 'Appliances', sort: 4 },
    { label: 'Set thermostats to "away" settings (78°F)', category: 'HVAC', sort: 5 },
    { label: 'Clean or replace AC filters', category: 'HVAC', sort: 6 },
    { label: 'Set pool pump to away/low mode', category: 'Exterior', sort: 7 },
    { label: 'Set irrigation to vacation schedule', category: 'Exterior', sort: 8 },
    { label: 'Close and lock all windows', category: 'Security', sort: 9 },
    { label: 'Set alarm system', category: 'Security', sort: 10 },
    { label: 'Empty refrigerator of perishables', category: 'Appliances', sort: 11 },
    { label: 'Clean out trash cans', category: 'Interior', sort: 12 },
    { label: 'Unplug non-essential electronics', category: 'Electrical', sort: 13 },
    { label: 'Forward mail or hold', category: 'Admin', sort: 14 },
    { label: 'Photograph home condition', category: 'Documentation', sort: 15 },
  ];
  for (const item of closeItems) {
    await db.insert(checklistTemplateItems).values({
      templateId: closeTemplate.id, label: item.label, category: item.category, sortOrder: item.sort,
    });
  }

  console.log('✅ 5 checklist templates with items');

  // ═══════════════════════════════════════════════════════════
  // INSPECTIONS — Historical data (Oct 2025 - Feb 2026 season)
  // ═══════════════════════════════════════════════════════════

  const inspectionStatuses: ('COMPLETED' | 'SCHEDULED')[] = ['COMPLETED', 'SCHEDULED'];
  let inspCount = 0;
  let itemCount = 0;
  let noteCount = 0;

  // Generate 6-8 inspections per property (weekly during season)
  for (let p = 0; p < propObjs.length; p++) {
    const numInspections = 6 + Math.floor(Math.random() * 3);
    const startDate = new Date('2025-10-15');

    for (let n = 0; n < numInspections; n++) {
      const inspDate = new Date(startDate);
      inspDate.setDate(inspDate.getDate() + (n * 7) + Math.floor(Math.random() * 3));
      const isFuture = inspDate > new Date('2026-02-27');
      const status = isFuture ? 'SCHEDULED' : 'COMPLETED';
      const inspector = inspectors[p % inspectors.length];
      const isCondo = [6, 7, 20, 21, 22, 23, 25, 26, 34, 36, 37].includes(p);

      const [insp] = await db.insert(inspections).values({
        propertyId: propObjs[p].id,
        inspectorId: inspector.id,
        templateId: isCondo ? condoTemplate.id : stdTemplate.id,
        inspectionNumber: n + 1,
        status,
        scheduledDate: inspDate.toISOString().split('T')[0],
        completedAt: status === 'COMPLETED' ? inspDate : null,
        interiorOk: status === 'COMPLETED' ? Math.random() > 0.15 : false,
        exteriorOk: status === 'COMPLETED' ? Math.random() > 0.2 : false,
        hvacTemps: status === 'COMPLETED' ? `${74 + Math.floor(Math.random() * 5)}°F` : null,
        humidityReadings: status === 'COMPLETED' ? `${50 + Math.floor(Math.random() * 12)}%` : null,
        notesClientEyes: status === 'COMPLETED' && Math.random() > 0.6 ? pick([
          'All systems functioning normally. Property in great shape.',
          'Minor issue found — see details below. Nothing urgent.',
          'Property looks good. Pool water was slightly cloudy — vendor notified.',
          'Everything checked out. Left lights on as requested.',
          'AC filter replaced during this visit. All else normal.',
          'Found small water stain on ceiling in guest bath — monitoring.',
        ]) : null,
        overallNotes: status === 'COMPLETED' ? pick([
          'Routine inspection — no issues.',
          'Clean walkthrough. Everything in order.',
          'Minor landscape overgrowth noted. Vendor scheduled.',
          'All systems nominal. Quick visit.',
          'Thorough check. Replaced AC filter.',
          'Pool chemical levels off — called vendor.',
          null,
        ]) : null,
        weekNumber: n + 1,
      }).returning();
      inspCount++;

      // Add checklist items for completed inspections
      if (status === 'COMPLETED') {
        const items = isCondo ? condoItems : stdItems;
        for (const item of items) {
          const isIssue = Math.random() > 0.92; // ~8% issue rate
          await db.insert(inspectionItems).values({
            inspectionId: insp.id,
            label: item.label,
            category: item.category,
            status: isIssue ? 'ISSUE' : 'OK',
            notes: isIssue ? pick([
              'Needs attention — see photo',
              'Vendor called for repair',
              'Monitoring — not urgent yet',
              'Client notified',
              'Scheduled repair for next week',
            ]) : null,
            sortOrder: item.sort,
          });
          itemCount++;
        }

        // Inspector notes on ~30% of inspections
        if (Math.random() > 0.7) {
          await db.insert(inspectorNotes).values({
            inspectionId: insp.id,
            notes: pick([
              'Property showing signs of age — recommend exterior paint within 6 months.',
              'Met pool vendor on site. They flagged pump bearing noise. May need replacement.',
              'Neighbor mentioned seeing someone at the property last week — checked security, all fine.',
              'AC was set to 72 instead of 78. Reset to away settings.',
              'Found ant trail in kitchen. Left bait traps. Will check next visit.',
              'Garage door opener battery dying. Replaced with spare from truck.',
              'Landscaping crew missed last week — called to confirm next visit.',
              'Water pressure lower than normal. May need plumber to check main valve.',
              'Smoke detector chirping in hallway — replaced battery.',
              'Pool cage has small tear in screen panel #3. Not urgent but note for repair.',
            ]),
          });
          noteCount++;
        }
      }
    }
  }
  console.log(`✅ ${inspCount} inspections with ${itemCount} checklist items and ${noteCount} inspector notes`);

  // ═══════════════════════════════════════════════════════════
  // AUDIT LOG — Recent activity
  // ═══════════════════════════════════════════════════════════

  const auditEntries = [
    { user: admin1.id, action: 'LOGIN', details: 'Admin login from 98.190.xxx.xxx' },
    { user: admin1.id, action: 'PROPERTY_CREATE', details: 'Added property: 200 S County Rd, Palm Beach' },
    { user: admin2.id, action: 'LOGIN', details: 'Admin login from 73.114.xxx.xxx' },
    { user: admin2.id, action: 'USER_CREATE', details: 'Created inspector: Maria Santos' },
    { user: inspectors[0].id, action: 'LOGIN', details: 'Inspector login from mobile' },
    { user: inspectors[0].id, action: 'INSPECTION_COMPLETE', details: 'Completed inspection #7 for 6711 N Ocean Blvd Unit 11' },
    { user: inspectors[1].id, action: 'INSPECTION_COMPLETE', details: 'Completed inspection #5 for 720 Tropic Isle Dr' },
    { user: inspectors[2].id, action: 'LOGIN', details: 'Inspector login from 172.58.xxx.xxx' },
    { user: inspectors[2].id, action: 'INSPECTION_COMPLETE', details: 'Completed inspection #8 for 8800 Aberdeen Dr' },
    { user: admin1.id, action: 'LODGING_CREATE', details: 'Added arrival for Barbara Winters at 6711 N Ocean Blvd' },
    { user: admin1.id, action: 'VENDOR_UPDATE', details: 'Updated vendor phone for Blue Wave Pool Service' },
    { user: inspectors[3].id, action: 'INSPECTION_ISSUE', details: 'Flagged issue: water stain at 1500 S Federal Hwy Unit 1204' },
  ];
  for (const entry of auditEntries) {
    await db.insert(auditLog).values({
      userId: entry.user, action: entry.action, details: entry.details,
    });
  }
  console.log(`✅ ${auditEntries.length} audit log entries`);

  // ═══════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(50));
  console.log('🏠 Nest Home — Palm Beach County seed complete!');
  console.log('═'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Users:        ${3 + inspectors.length + clients.length} (3 admin, ${inspectors.length} inspectors, ${clients.length} clients)`);
  console.log(`   Routes:       ${routeObjs.length}`);
  console.log(`   Neighborhoods: ${nbObjs.length}`);
  console.log(`   Communities:  ${commObjs.length}`);
  console.log(`   Properties:   ${propObjs.length}`);
  console.log(`   HVAC Units:   ${hvacCount}`);
  console.log(`   Vendors:      ${vendorCount}`);
  console.log(`   Lodging:      ${lodgingCount}`);
  console.log(`   Inspections:  ${inspCount}`);
  console.log(`   Items:        ${itemCount}`);
  console.log(`   Notes:        ${noteCount}`);
  console.log(`\nLogin credentials (all passwords: nesthome123):`);
  console.log(`  Admin:     ron@nesthome.com`);
  console.log(`  Admin:     admin@nesthome.com`);
  console.log(`  Admin:     tim@nesthome.com`);
  console.log(`  Inspector: mike.torres@nesthome.com`);
  console.log(`  Inspector: sarah.chen@nesthome.com`);
  console.log(`  Inspector: carlos.medina@nesthome.com`);
  console.log(`  Inspector: janet.oconnor@nesthome.com`);
  console.log(`  Inspector: david.wright@nesthome.com`);
  console.log(`  Inspector: maria.santos@nesthome.com`);
  console.log(`  Clients:   40 accounts (bwinters@comcast.net, etc.)`);

  await pool.end();
}

seed().catch(console.error);
