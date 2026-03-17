'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface InspectionItem {
  id: string;
  label: string;
  category: string | null;
  status: 'OK' | 'ISSUE' | 'N_A' | 'PENDING';
  notes: string | null;
  photoUrl: string | null;
  sortOrder: string;
}

interface Inspection {
  id: string;
  status: string;
  scheduledDate: string | null;
  completedAt: string | null;
  overallNotes: string | null;
  property: {
    address: string;
    city: string;
    state: string;
    zip: string;
    accessNotes: string | null;
    specialInstructions: string | null;
    client: { name: string; email: string; phone: string } | null;
  };
  inspector: { name: string };
  items: InspectionItem[];
}

const STATUS_OPTIONS = ['PENDING', 'OK', 'ISSUE', 'N_A'] as const;
const STATUS_COLORS: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 border-green-300',
  ISSUE: 'bg-red-100 text-red-700 border-red-300',
  N_A: 'bg-gray-100 text-gray-500 border-gray-300',
  PENDING: 'bg-white text-gray-400 border-gray-200',
};

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/inspections/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setInspection(data);
        setItems(data.items || []);
        setOverallNotes(data.overallNotes || '');
        setLoading(false);
      });
  }, [params.id]);

  const updateItemStatus = (itemId: string, status: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: status as InspectionItem['status'] } : item))
    );
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    );
  };

  const markCategoryOk = useCallback((category: string) => {
    setItems((prev) =>
      prev.map((item) => {
        const cat = item.category || 'General';
        return cat === category ? { ...item, status: 'OK' as const } : item;
      })
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const targetId = focusedItemId ?? items.find((i) => i.status === 'PENDING')?.id;
      if (!targetId) return;
      const map: Record<string, 'OK' | 'ISSUE' | 'N_A'> = { '1': 'OK', '2': 'ISSUE', '3': 'N_A' };
      const status = map[e.key];
      if (status) {
        e.preventDefault();
        setItems((prev) =>
          prev.map((item) => (item.id === targetId ? { ...item, status } : item))
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedItemId, items]);

  const saveInspection = async (complete = false) => {
    setSaving(true);

    // Save items
    await fetch(`/api/inspections/${params.id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ id: i.id, status: i.status, notes: i.notes })),
      }),
    });

    // Update inspection status
    await fetch(`/api/inspections/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overallNotes,
        status: complete ? 'COMPLETED' : 'IN_PROGRESS',
      }),
    });

    setSaving(false);
    if (complete) {
      router.push('/dashboard/inspections');
    }
  };

  if (loading || !inspection) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  // Group items by category
  const categories = items.reduce<Record<string, InspectionItem[]>>((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const completedCount = items.filter((i) => i.status !== 'PENDING').length;
  const issueCount = items.filter((i) => i.status === 'ISSUE').length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sticky header: property + progress + back */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm -mx-4 px-4 py-3 mb-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard/inspections"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium shrink-0"
          >
            ← Back to Inspections
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-gray-700 truncate">{inspection.property.address}</span>
            <span className="text-sm text-gray-500 shrink-0">{completedCount}/{items.length}</span>
            {issueCount > 0 && (
              <span className="text-sm text-red-600 font-medium shrink-0">⚠️ {issueCount}</span>
            )}
            <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">1=OK 2=Issue 3=N/A</span>
          </div>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{inspection.property.address}</h1>
            <p className="text-gray-500">{inspection.property.city}, {inspection.property.state} {inspection.property.zip}</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-600">
              <span>👤 {inspection.inspector.name}</span>
              <span>📅 {inspection.scheduledDate || 'Not scheduled'}</span>
              {inspection.property.client && <span>🏠 Owner: {inspection.property.client.name}</span>}
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              inspection.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              inspection.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {inspection.status.replace('_', ' ')}
            </span>
            <p className="text-sm text-gray-500 mt-2">{completedCount}/{items.length} items checked</p>
            {issueCount > 0 && (
              <p className="text-sm text-red-600 font-medium">⚠️ {issueCount} issue{issueCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Access info */}
        {(inspection.property.accessNotes || inspection.property.specialInstructions) && (
          <div className="mt-4 flex gap-3">
            {inspection.property.accessNotes && (
              <div className="flex-1 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                <span className="font-medium">🔑 Access:</span> {inspection.property.accessNotes}
              </div>
            )}
            {inspection.property.specialInstructions && (
              <div className="flex-1 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <span className="font-medium">📝 Instructions:</span> {inspection.property.specialInstructions}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checklist by category */}
      {Object.entries(categories).map(([category, catItems]) => (
        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-700">{category}</h3>
            <button
              type="button"
              onClick={() => markCategoryOk(category)}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50"
            >
              Mark all OK
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {catItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setFocusedItemId(item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFocusedItemId(item.id); }}
                className={`px-6 py-4 ${focusedItemId === item.id ? 'ring-2 ring-emerald-400 ring-inset' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-800 font-medium">{item.label}</span>
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateItemStatus(item.id, s); }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                          item.status === s
                            ? STATUS_COLORS[s]
                            : 'bg-white text-gray-300 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {s === 'N_A' ? 'N/A' : s}
                      </button>
                    ))}
                  </div>
                </div>
                {(item.status === 'ISSUE' || item.notes) && (
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={item.notes || ''}
                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none mt-1"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Overall notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Overall Notes</label>
        <textarea
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
          rows={3}
          placeholder="General observations, recommendations..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end mb-8">
        <button
          onClick={() => saveInspection(false)}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Progress'}
        </button>
        <button
          onClick={() => saveInspection(true)}
          disabled={saving}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Completing...' : '✅ Complete Inspection'}
        </button>
      </div>
    </div>
  );
}
