export interface PaginationInput {
  limit: number;
  offset: number;
}

export function getPagination(request: Request, defaultLimit = 30, maxLimit = 100): PaginationInput {
  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get('limit') ?? defaultLimit);
  const rawOffset = Number(searchParams.get('offset') ?? 0);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), maxLimit)
    : defaultLimit;
  const offset = Number.isFinite(rawOffset)
    ? Math.max(Math.trunc(rawOffset), 0)
    : 0;
  return { limit, offset };
}
