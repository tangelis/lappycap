# Nest-legacy deploy and DB

## Run app on the host (recommended)

1. **Start Postgres** (host port 5433):
   ```bash
   cd /home/tangel/src/nest-legacy
   podman compose -f deploy/docker-compose.postgres.yml up -d
   ```

2. **Test connection from host** (run this in a terminal on your machine, not inside a container):
   ```bash
   cd /home/tangel/src/nest-legacy
   DATABASE_URL='postgresql://lamppost:lamppost123@127.0.0.1:5433/nesthome' node -e "require('pg').Pool({connectionString:process.env.DATABASE_URL}).query('SELECT 1').then(r=>console.log('OK',r.rows[0])).catch(e=>console.error('FAIL',e.message))"
   ```
   Or: `node deploy/test-db-connection.mjs` (must run from host so 127.0.0.1 reaches the container).

3. **`.env.local`** is set to `127.0.0.1:5433` for app-on-host.

4. **Run migrations** (if the DB was created before the inspection_item_id column existed):
   ```bash
   cd /home/tangel/src/nest-legacy
   npx drizzle-kit push
   ```
   Or apply `drizzle/0000_add_inspection_item_attachments.sql` manually.

5. **Run the app on the host**:
   ```bash
   cd /home/tangel/src/nest-legacy
   PORT=3001 npm run dev
   ```
   Open http://localhost:3001 and log in (obtain credentials from your team or GCP Secret Manager for the deployed app).

If the app or test runs inside a container/IDE, 127.0.0.1 is that environment’s loopback, so use `host.containers.internal` in DATABASE_URL instead of 127.0.0.1 (and run Postgres on the host).

## Login and DB errors

The app calls `/api/db-check` before showing the login form. If the database is unreachable, the login page shows a specific error message instead of a generic failure. See `src/lib/db-error.ts` for copy.
