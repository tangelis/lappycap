'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
}

export default function ChecklistsPage() {
  const { data: session, status } = useSession();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    setError('');
    fetch('/api/checklist-templates?full=1')
      .then((r) => {
        if (r.status === 403) throw new Error('Admin only');
        return r.json();
      })
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [status]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete checklist "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/checklist-templates/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Delete failed');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Could not delete checklist');
    } finally {
      setDeletingId(null);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (session?.user && (session.user as { role?: string }).role !== 'ADMIN') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-amber-800">
        <p className="font-medium">Admin only</p>
        <p className="text-sm mt-1">Only administrators can manage checklist templates.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Checklist templates</h1>
        <Link
          href="/dashboard/checklists/new"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          + Add checklist
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {templates.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="text-4xl mb-2">📝</p>
            <p>No checklist templates yet.</p>
            <Link href="/dashboard/checklists/new" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
              Create your first template
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{t.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{t.description || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.itemCount}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/checklists/${t.id}`}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mr-3"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id, t.name)}
                      disabled={deletingId === t.id}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      {deletingId === t.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
