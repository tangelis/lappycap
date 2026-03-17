'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SearchSortBar } from '@/components/SearchSortBar';
import { useAutoPagination } from '@/hooks/useAutoPagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  accessNotes: string | null;
  specialInstructions: string | null;
  isActive: boolean;
  client: Client | null;
  updatedAt?: string;
}

type SortKey = 'updated' | 'address' | 'city' | 'state' | 'status';
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

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebouncedValue(search, 200);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    address: '',
    city: '',
    state: 'FL',
    zip: '',
    accessNotes: '',
    specialInstructions: '',
  });

  const loadProperties = useCallback(async (reset = false) => {
    if (loadingMore || (!hasMore && !reset)) return;
    const nextOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(
        `/api/properties?limit=${PAGE_SIZE}&offset=${nextOffset}&sort=${sortKey}&order=${sortOrder}&q=${encodeURIComponent(debouncedSearch.trim())}`
      );
      const json = await res.json() as PaginatedResponse<Property>;
      const page = Array.isArray(json?.data) ? json.data : [];
      setProperties((prev) => (reset ? page : [...prev, ...page]));
      setHasMore(Boolean(json?.meta?.hasMore));
      setOffset(json?.meta?.nextOffset ?? nextOffset + page.length);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, sortKey, sortOrder, debouncedSearch]);

  useEffect(() => {
    setProperties([]);
    setOffset(0);
    setHasMore(true);
    void loadProperties(true);
    // Intentionally reset only on sort changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortOrder, debouncedSearch]);

  useAutoPagination({
    sentinelRef,
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: () => { void loadProperties(false); },
  });

  const filteredAndSorted = useMemo(() => properties, [properties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ address: '', city: '', state: 'FL', zip: '', accessNotes: '', specialInstructions: '' });
    setProperties([]);
    setOffset(0);
    setHasMore(true);
    void loadProperties(true);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Properties</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Property'}
        </button>
      </div>

      <SearchSortBar
        searchPlaceholder="Search by address, city, state, zip, or owner..."
        searchValue={search}
        onSearchChange={setSearch}
        sortOptions={[
          { value: 'updated', label: 'Last updated' },
          { value: 'address', label: 'Address' },
          { value: 'city', label: 'City' },
          { value: 'state', label: 'State' },
          { value: 'status', label: 'Status' },
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
            <Input label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
            <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
            <Input label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <Input label="ZIP" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} required />
          </div>
          <TextArea label="Access Notes (gate codes, key locations)" value={form.accessNotes} onChange={(v) => setForm({ ...form, accessNotes: v })} />
          <TextArea label="Special Instructions" value={form.specialInstructions} onChange={(v) => setForm({ ...form, specialInstructions: v })} />
          <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium">
            Save Property
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSorted.map((prop) => (
          <Link key={prop.id} href={`/dashboard/properties/${prop.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow block">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{prop.address}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs ${prop.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {prop.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">{prop.city}, {prop.state} {prop.zip}</p>
            {prop.client && (
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Owner:</span> {prop.client.name}
              </p>
            )}
            {prop.accessNotes && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                <span className="font-medium">🔑 Access:</span> {prop.accessNotes}
              </div>
            )}
            {prop.specialInstructions && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <span className="font-medium">📝 Notes:</span> {prop.specialInstructions}
              </div>
            )}
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} className="h-6" />
      {(loadingMore || hasMore) && (
        <div className="text-center py-4 text-sm text-gray-400">
          {loadingMore ? 'Loading more properties...' : 'Scroll for more'}
        </div>
      )}

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🏠</p>
          <p>{debouncedSearch.trim() ? 'No properties match your search.' : 'No properties yet. Add your first one above.'}</p>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
        required={required}
      />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
        rows={2}
      />
    </div>
  );
}
