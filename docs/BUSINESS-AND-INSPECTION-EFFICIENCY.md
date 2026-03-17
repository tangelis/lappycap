# Business Needs & Inspection Efficiency

## Business context

- **Inspectors** are in the field: they need quick access to today’s inspections, property access info, and a fast way to record checklist results (often one property after another).
- **Efficiency** means less time per inspection (keyboard, bulk actions, clear progress) and fewer mistakes (sticky context, save progress, clear issues count).
- **Managers** need lists that are easy to search and sort (by date, status, property, inspector) and user management for roles.

## What the app does for efficiency

### Inspection list (Inspections page)

- **Search** by property address, city, inspector name, or status.
- **Sort** by scheduled date (default: newest first), status, property, or inspector.
- **Result count** so you can see how many inspections match.

### Inspection detail (doing an inspection)

- **Sticky header** so property address, progress (e.g. 12/24), and issue count stay visible while scrolling the checklist.
- **Back to Inspections** link at the top so you can return to the list without using the main nav.
- **Keyboard shortcuts** (when not typing in an input):
  - **1** = mark focused (or first pending) item **OK**
  - **2** = mark **Issue**
  - **3** = mark **N/A**
- **Focus** by clicking a row; the shortcut applies to the focused row, or the first PENDING item if none is focused.
- **Mark all OK** per category so you can set a whole section to OK and then change only the exceptions (e.g. one Issue).
- **Save Progress** to persist items and overall notes without completing the inspection; **Complete Inspection** to mark done and go back to the list.

### Properties & routes

- **Properties**: search (address, city, state, zip, owner), sort (address, city, state, status), result count.
- **Routes**: search by route or community name to find the right route quickly.

### User management (admin)

- **Users** page: list, search (name, email, role, phone), sort, and change role (ADMIN / INSPECTOR / CLIENT) with immediate save.

## QA and UX tests

- **Build + lint**: `npm run qa`
- **E2E (Playwright)**: `npx playwright test`  
  - Auth: login page loads, unauthenticated redirects to login.  
  - With `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`: dashboard, inspections list (search/sort), properties list, routes list.
- **Manual**: Use inspection detail with keyboard (1/2/3), “Mark all OK”, sticky header, and Save Progress to confirm efficiency in real use.

## Possible next steps

- **Today’s inspections** filter or dashboard widget (by scheduled date = today).
- **Route order** on inspections list (e.g. sort by route position when on a route).
- **Auto-save** draft items on a timer (e.g. every 60s) to reduce risk of losing data.
- **Next / Previous inspection** links on the detail page when opened from the list (pass inspection ids or use “today” list).
