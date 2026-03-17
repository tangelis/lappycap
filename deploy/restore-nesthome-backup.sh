#!/usr/bin/env bash
#
# Restore the nesthome database from backup.
# Backup: /home/tangel/.openclaw/workspace/all_postgres_databases_backup.sql
#
# Requires: psql. If Postgres runs in Docker/Podman:
#   PSQL_CMD="podman exec -i nesthome-postgres psql -U postgres" ./deploy/restore-nesthome-backup.sh
#   (Start the container first: podman start nesthome-postgres)
#
# Optional env: PGHOST, PGPORT, PGUSER, PGPASSWORD, BACKUP_FILE
# Optional flag: --drop  drop database nesthome first (so restore is idempotent)
#
set -euo pipefail

DROP_FIRST=
for arg in "$@"; do
  if [[ "$arg" == --drop ]]; then DROP_FIRST=1; break; fi
done

BACKUP_FILE="${BACKUP_FILE:-/home/tangel/.openclaw/workspace/all_postgres_databases_backup.sql}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

run_psql() {
  if [[ -n "${PSQL_CMD:-}" ]]; then
    eval "$PSQL_CMD" "$@"
  else
    export PGHOST="${PGHOST:-localhost}"
    export PGPORT="${PGPORT:-5432}"
    export PGUSER="${PGUSER:-postgres}"
    psql "$@"
  fi
}

if [[ -n "$DROP_FIRST" ]]; then
  echo "Dropping database nesthome (if exists)..."
  run_psql -v ON_ERROR_STOP=0 -c "DROP DATABASE IF EXISTS nesthome;" postgres || true
fi

# Remove nonstandard \restrict and \unrestrict so standard psql can run the dump
SANITIZE='grep -v "^\\\\restrict " | grep -v "^\\\\unrestrict "'

if [[ -n "${PSQL_CMD:-}" ]]; then
  echo "Restoring via: $PSQL_CMD"
  eval "$SANITIZE" < "$BACKUP_FILE" | eval "$PSQL_CMD"
else
  echo "Restoring via psql (PGHOST=${PGHOST:-localhost} PGPORT=${PGPORT:-5432} PGUSER=${PGUSER:-postgres})..."
  export PGHOST="${PGHOST:-localhost}"
  export PGPORT="${PGPORT:-5432}"
  export PGUSER="${PGUSER:-postgres}"
  eval "$SANITIZE" < "$BACKUP_FILE" | psql
fi

echo "Done. nest-legacy .env.local is set to database=nesthome."
