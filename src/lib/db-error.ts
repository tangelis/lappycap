/**
 * Map database/connection errors to user-friendly messages for login and API.
 */

const CONNECTION_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

export function getDbErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    const message = (err as NodeJS.ErrnoException).message ?? '';
    if (code && CONNECTION_CODES.has(code)) {
      return 'Database is unreachable. Check DATABASE_URL: host (use 127.0.0.1 or host.containers.internal if in a container), port 5433, user lamppost, password, and database nesthome.';
    }
    if (message.includes('timeout') || message.includes('TIMEDOUT')) {
      return 'Database connection timed out. Check that Postgres is running and reachable.';
    }
    if (message.includes('password') || message.includes('authentication')) {
      return 'Database authentication failed. Check DATABASE_URL: user lamppost and password lamppost123.';
    }
    if (message.includes('does not exist') || message.includes('database')) {
      return 'Database nesthome not found. Run: deploy/restore-nesthome-backup.sh to restore.';
    }
    // Generic for other DB errors (avoid leaking schema/details)
    return 'A database error occurred. Try again or contact support.';
  }
  return 'An unexpected error occurred.';
}
