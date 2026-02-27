'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ propertyId: '', scheduledDate: '' });

  const fetchData = () => {
    Promise.all([
      fetch('/api/inspections').then((r) => r.json()),
      fetch('/api/properties').then((r) => r.json()),
    ]).then(([insps, props]) => {
      setInspections(Array.isArray(insps) ? insps : []);
      setProperties(Array.isArray(props) ? props : []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ propertyId: '', scheduledDate: '' });
    fetchData();
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
        {inspections.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No inspections yet. Schedule one above.</p>
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
              {inspections.map((insp) => {
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
