# QA

## Quick QA (build + lint)

```bash
npm run qa
```

Runs `npm run build` and `npm run lint`. Use this before pushing or deploying.

## E2E (Playwright)

```bash
npx playwright test
```

- **Without env**: Playwright starts the dev server (default port 3000) and runs tests. Auth tests (login page, unauthenticated redirects) always run.
- **With existing app**: `PLAYWRIGHT_BASE_URL=http://localhost:3002 npx playwright test` to hit an app already running (e.g. in a container on 3002).
- **Authenticated UX tests**: Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` to run dashboard and list UX tests (search, sort, nav). After seeding, use e.g. `TEST_USER_EMAIL=ron@nesthome.com TEST_USER_PASSWORD=nesthome123` (see `src/db/seed.ts`). Ensure the database has been seeded so login succeeds.

Install browsers once: `npx playwright install chromium`

## Manual smoke test (local)

1. Start Postgres and app (see [deploy/README.md](../deploy/README.md)).
2. Open http://localhost:3002 (or your dev port).
3. Log in with an admin account.
4. **Dashboard** — Stats and recent inspections load.
5. **Properties** — Search (address, city, owner), sort by address/city/state/status, result count updates.
6. **Inspections** — Search (property, inspector, status), sort by date/status/property/inspector.
7. **Routes** — Search by route or community name.
8. **Users** (admin only) — List users, search, sort, change role via dropdown and save.
9. **Inspection detail** — Sticky header, Back to Inspections, keyboard 1=OK / 2=Issue / 3=N/A, “Mark all OK” per category, Save Progress / Complete.
