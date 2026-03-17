'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SearchSortBar } from '@/components/SearchSortBar';
import { useAutoPagination } from '@/hooks/useAutoPagination';
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '@/hooks/useDebouncedValue';

interface Route {
  id: string;
  name: string;
  notes: string | null;
  communities: {
    id: string;
    name: string;
    companyName: string | null;
    managerName: string | null;
    phoneNumber: string | null;
    neighborhood: { name: string } | null;
    properties: {
      id: string;
      address: string;
      city: string;
      isActive: boolean;
      client: { name: string } | null;
    }[];
  }[];
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadRoutes = useCallback(async (reset = false) => {
    if (loadingMore || (!hasMore && !reset)) return;
    const nextOffset = reset ? 0 : offset;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`/api/routes?limit=10&offset=${nextOffset}&q=${encodeURIComponent(debouncedSearch.trim())}`);
      const json = await res.json() as {
        data?: Route[];
        meta?: { hasMore?: boolean; nextOffset?: number | null };
      };
      const page = Array.isArray(json?.data) ? json.data : [];
      setRoutes((prev) => (reset ? page : [...prev, ...page]));
      setHasMore(Boolean(json?.meta?.hasMore));
      setOffset(json?.meta?.nextOffset ?? nextOffset + page.length);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, debouncedSearch]);

  useEffect(() => {
    setRoutes([]);
    setOffset(0);
    setHasMore(true);
    void loadRoutes(true);
    // Intentionally reset only on search text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useAutoPagination({
    sentinelRef,
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: () => { void loadRoutes(false); },
  });

  const filteredRoutes = useMemo(() => routes, [routes]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const totalProperties = filteredRoutes.reduce((acc, r) => acc + r.communities.reduce((a, c) => a + c.properties.length, 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Route Planner</h1>
          <p className="text-sm text-gray-500">{filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} · {totalProperties} properties</p>
        </div>
      </div>

      <SearchSortBar
        searchPlaceholder="Search by route or community name..."
        searchValue={search}
        onSearchChange={setSearch}
        resultCount={filteredRoutes.length}
      />

      {filteredRoutes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🚗</p>
          <p>No routes configured yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRoutes.map((route) => {
            const propCount = route.communities.reduce((a, c) => a + c.properties.length, 0);
            return (
              <div key={route.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggle(route.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🚗</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-800">{route.name}</h3>
                      {route.notes && <p className="text-xs text-gray-500">{route.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{route.communities.length} communities · {propCount} properties</span>
                    <span className={`transition-transform ${expanded.has(route.id) ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </button>

                {expanded.has(route.id) && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    {route.communities.map((comm) => (
                      <div key={comm.id} className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">🏘️</span>
                          <h4 className="font-medium text-gray-700">{comm.name}</h4>
                          {comm.neighborhood && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                              {comm.neighborhood.name}
                            </span>
                          )}
                        </div>
                        {(comm.managerName || comm.phoneNumber) && (
                          <p className="text-xs text-gray-500 ml-6 mb-2">
                            {comm.managerName && `👤 ${comm.managerName}`}
                            {comm.phoneNumber && ` · 📞 ${comm.phoneNumber}`}
                          </p>
                        )}
                        <div className="ml-6 space-y-1">
                          {comm.properties.map((prop) => (
                            <Link
                              key={prop.id}
                              href={`/dashboard/properties/${prop.id}`}
                              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-emerald-50 transition-colors"
                            >
                              <div>
                                <span className="text-sm font-medium text-gray-800">{prop.address}</span>
                                <span className="text-xs text-gray-500 ml-2">{prop.city}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {prop.client && <span className="text-xs text-gray-500">{prop.client.name}</span>}
                                <span className={`w-2 h-2 rounded-full ${prop.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                              </div>
                            </Link>
                          ))}
                          {comm.properties.length === 0 && (
                            <p className="text-xs text-gray-400 py-2">No properties in this community</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div ref={sentinelRef} className="h-6" />
      {(loadingMore || hasMore) && (
        <div className="text-center py-4 text-sm text-gray-400">
          {loadingMore ? 'Loading more routes...' : 'Scroll for more'}
        </div>
      )}
    </div>
  );
}
