'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SearchSortBar } from '@/components/SearchSortBar';
import { useAutoPagination } from '@/hooks/useAutoPagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface InspectionItem {
  id: string;
  status: string;
}

interface Inspection {
  id: string;
  status: string;
  scheduledDate: string | null;
  completedAt: string | null;
  overallNotes: string | null;
  property: { id: string; address: string; city: string };
  inspector: { name: string };
  items: InspectionItem[];
}

interface Property {
  id: string;
  address: string;
  city: string;
}

type SortKey = 'date' | 'status' | 'property' | 'inspector';
const PAGE_SIZE = 30;

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [form, setForm] = useState({ propertyId: '', scheduledDate: '' });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadInspections = useCallback(async (reset = false) => {
    if (loadingMore || (!hasMore && !reset)) return;
    const nextOffset = reset ? 0 : offset;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/inspections?limit=${PAGE_SIZE}&offset=${nextOffset}&sort=${sortKey}&order=${sortOrder}&q=${encodeURIComponent(debouncedSearch.trim())}`
      );
      const json = await res.json() as PaginatedResponse<Inspection>;
      const page = Array.isArray(json?.data) ? json.data : [];
      setInspections((prev) => (reset ? page : [...prev, ...page]));
      setHasMore(Boolean(json?.meta?.hasMore));
      setOffset(json?.meta?.nextOffset ?? nextOffset + page.length);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, sortKey, sortOrder, debouncedSearch]);

  useEffect(() => {
    fetch('/api/properties?limit=500&offset=0&sort=address&order=asc')
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json?.data) ? json.data : [];
        setProperties(data);
      })
      .catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    setInspections([]);
    setOffset(0);
    setHasMore(true);
    void loadInspections(true);
    // Intentionally reset only on sort changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortOrder, debouncedSearch]);

  useAutoPagination({
    sentinelRef,
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: () => { void loadInspections(false); },
  });

  const filteredAndSorted = useMemo(() => inspections, [inspections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ propertyId: '', scheduledDate: '' });
    setInspections([]);
    setOffset(0);
    setHasMore(true);
    void loadInspections(true);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inspections</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ New Inspection'}
        </button>
      </div>

      <SearchSortBar
        searchPlaceholder="Search by property, inspector, or status..."
        searchValue={search}
        onSearchChange={setSearch}
        sortOptions={[
          { value: 'date', label: 'Scheduled Date' },
          { value: 'status', label: 'Status' },
          { value: 'property', label: 'Property' },
          { value: 'inspector', label: 'Inspector' },
        ]}
        sortValue={sortKey}
        onSortChange={(v) => setSortKey(v as SortKey)}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
        resultCount={filteredAndSorted.length}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <select
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                required
              >
                <option value="">Select a property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}, {p.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium">
            Schedule Inspection
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>{debouncedSearch.trim() ? 'No inspections match your search.' : 'No inspections yet. Schedule one above.'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left">Inspector</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Progress</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSorted.map((insp) => {
                const done = insp.items.filter((i) => i.status !== 'PENDING').length;
                const total = insp.items.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <tr key={insp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {insp.property.address}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{insp.inspector.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{insp.scheduledDate || '—'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={insp.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{done}/{total}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/inspections/${insp.id}`}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div ref={sentinelRef} className="h-6" />
      {(loadingMore || hasMore) && (
        <div className="text-center py-4 text-sm text-gray-400">
          {loadingMore ? 'Loading more inspections...' : 'Scroll for more'}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
