# Feature Brief: Nest Home MVP

## 1. Problem Statement
Seasonal residents (snowbirds) often leave their properties unattended for months. Homewatch companies provide professional inspection services to ensure these properties remain secure, functional, and well-maintained. Currently, many companies rely on paper checklists or fragmented digital tools, making it difficult to scale operations and provide professional, transparent reporting to homeowners.

**Nest Home** aims to solve this by providing a dedicated SaaS platform for homewatch companies to manage their clients, properties, inspections, and reporting in one place.

## 2. Requirements

### Must-Have (MVP)
- **Property Profiles:** Detailed management of client properties, including address, contact info, key access details, and specific maintenance instructions.
- **Checklist-based Inspections:** Customizable or template-driven digital checklists for property walkthroughs (e.g., HVAC check, leak detection, security status).
- **Photo Uploads:** Ability to attach photos to inspection items or general reports to document property state.
- **Client Status Dashboard:** A portal or report view for homeowners to see the latest inspection status, photos, and any flagged issues.
- **User Roles:** Simple roles for Company Admins (manage everything) and Inspectors (perform walkthroughs).

### Nice-to-Have (Post-MVP)
- **Invoicing & Billing:** Integration with Stripe or QuickBooks for service fees.
- **Scheduling:** Calendar view for recurring inspections.
- **Service Request Tracking:** Workflow for coordinating repairs with 3rd-party vendors.
- **Offline Mode:** Mobile-friendly inspection tool for areas with poor connectivity.

## 3. Technical Approach

### Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database:** SQLite (for rapid MVP development and low-cost hosting) or PostgreSQL (if scaling to multi-tenant SaaS immediately). Recommendation: **PostgreSQL** (via Supabase or Neon) for better multi-user concurrency.
- **ORM:** Drizzle ORM (Type-safe, lightweight).
- **Authentication:** NextAuth.js or Clerk.
- **Storage:** AWS S3 or R2 for inspection photo uploads.

### Data Model Sketch
- `users`: id, email, name, role (ADMIN, INSPECTOR, CLIENT)
- `properties`: id, address, client_id, instructions
- `inspections`: id, property_id, inspector_id, status (SCHEDULED, COMPLETED), date
- `inspection_items`: id, inspection_id, label, status (OK, ISSUE, N/A), notes, photo_url

## 4. Next Actions
1. [ ] Create a detailed `spec.md` for the property and inspection data structures.
2. [ ] Design the UI/UX for the mobile-first inspection checklist.
3. [ ] Set up the database schema using Drizzle.

## 5. Success Criteria
- A company admin can create a property and assign it to a client.
- An inspector can complete a digital checklist on their phone at the property.
- A homeowner receives a professional report (PDF or web link) with photos immediately after the inspection.
