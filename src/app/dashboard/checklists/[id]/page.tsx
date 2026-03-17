'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface TemplateItem {
  id: string;
  label: string;
  category: string | null;
  sortOrder: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  items: TemplateItem[];
}

export default function EditChecklistPage() {
  const params = useParams();
  const id = params.id as string;
  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id === 'new') return;
    setError('');
    fetch(`/api/checklist-templates/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setTemplate(data);
        setName(data.name ?? '');
        setDescription(data.description ?? '');
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => setError('Checklist not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateItem = useCallback((index: number, field: 'label' | 'category' | 'sortOrder', value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: '', label: '', category: null, sortOrder: prev.length }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveItem = useCallback((index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    setItems((prev) => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }, [items.length]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const r = await fetch(`/api/checklist-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || template?.name,
          description: description.trim() || null,
          items: items.filter((i) => i.label.trim()).map((i, idx) => ({
            id: i.id || undefined,
            label: i.label.trim(),
            category: i.category?.trim() || null,
            sortOrder: idx,
          })),
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      const updated = await r.json();
      setTemplate(updated);
      setItems(updated.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!template && id !== 'new') {
    return (
      <div>
        <Link href="/dashboard/checklists" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-4 inline-block">← Back</Link>
        <p className="text-red-600">{error || 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/checklists" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-4 inline-block">
        ← Back to checklists
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit checklist</h1>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Items</h2>
            <button type="button" onClick={addItem} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              + Add item
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                No items. Add items that inspectors will check off during an inspection.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.id || index} className="px-6 py-3 flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(index, 'label', e.target.value)}
                    placeholder="Item label"
                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <input
                    type="text"
                    value={item.category ?? ''}
                    onChange={(e) => updateItem(index, 'category', e.target.value || '')}
                    placeholder="Category (e.g. HVAC)"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50" aria-label="Move up">↑</button>
                    <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50" aria-label="Move down">↓</button>
                    <button type="button" onClick={() => removeItem(index)} className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50" aria-label="Remove">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link href="/dashboard/checklists" className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
