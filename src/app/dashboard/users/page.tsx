'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { SearchSortBar } from '@/components/SearchSortBar';
import { useAutoPagination } from '@/hooks/useAutoPagination';
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '@/hooks/useDebouncedValue';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

type SortKey = 'name' | 'email' | 'role' | 'updated';
const PAGE_SIZE = 30;

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    hasMore: boolean;
    nextOffset: number | null;
  };
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const loadUsers = useCallback(async (reset = false) => {
    if (loadingMore || (!hasMore && !reset)) return;
    const nextOffset = reset ? 0 : offset;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const r = await fetch(
        `/api/users?limit=${PAGE_SIZE}&offset=${nextOffset}&sort=${sortKey}&order=${sortOrder}&q=${encodeURIComponent(debouncedSearch.trim())}`
      );
      if (!r.ok) throw new Error(r.status === 403 ? 'Admin access required' : 'Failed to load users');
      const json = await r.json() as PaginatedResponse<UserRow>;
      const page = Array.isArray(json?.data) ? json.data : [];
      setUsers((prev) => (reset ? page : [...prev, ...page]));
      setHasMore(Boolean(json?.meta?.hasMore));
      setOffset(json?.meta?.nextOffset ?? nextOffset + page.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, sortKey, sortOrder, debouncedSearch]);

  useEffect(() => {
    if (status === 'authenticated') {
      setUsers([]);
      setOffset(0);
      setHasMore(true);
      void loadUsers(true);
    }
    // Intentionally reset only on auth/sort changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sortKey, sortOrder, debouncedSearch]);

  useAutoPagination({
    sentinelRef,
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: () => { void loadUsers(false); },
  });

  const filteredAndSorted = useMemo(() => users, [users]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const r = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }
      setUsers([]);
      setOffset(0);
      setHasMore(true);
      await loadUsers(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading && users.length === 0)) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  if (status === 'authenticated' && !isAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-amber-800 font-medium">User management is available to administrators only.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <SearchSortBar
        searchPlaceholder="Search by name, email, role, or phone..."
        searchValue={search}
        onSearchChange={setSearch}
        sortOptions={[
          { value: 'updated', label: 'Last updated' },
          { value: 'name', label: 'Name' },
          { value: 'email', label: 'Email' },
          { value: 'role', label: 'Role' },
        ]}
        sortValue={sortKey}
        onSortChange={(v) => setSortKey(v as SortKey)}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
        resultCount={filteredAndSorted.length}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">👤</p>
            <p>{debouncedSearch.trim() ? 'No users match your search.' : 'No users found.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSorted.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'INSPECTOR' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={updatingId === u.id}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="INSPECTOR">INSPECTOR</option>
                      <option value="CLIENT">CLIENT</option>
                    </select>
                    {updatingId === u.id && <span className="ml-2 text-xs text-gray-400">Saving...</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      <div ref={sentinelRef} className="h-6" />
      {(loadingMore || hasMore) && (
        <div className="text-center py-4 text-sm text-gray-400">
          {loadingMore ? 'Loading more users...' : 'Scroll for more'}
        </div>
      )}
    </div>
  );
}
