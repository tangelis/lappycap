'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
}

interface Arrival {
  id: string;
  arrival: string | null;
  departure: string | null;
  departureUnknown: boolean;
  status: string;
  property: { address: string; city: string; client: { name: string } | null };
}

interface Inspection {
  id: string;
  status: string;
  scheduledDate: string;
  completedAt: string | null;
  property: { address: string; city: string };
  inspector: { name: string };
  items: { id: string; status: string }[];
}

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/properties').then((r) => r.json()),
      fetch('/api/inspections').then((r) => r.json()),
      fetch('/api/dashboard/arrivals').then((r) => r.json()).catch(() => []),
    ]).then(([props, insps, arrs]) => {
      setProperties(Array.isArray(props) ? props : []);
      setInspections(Array.isArray(insps) ? insps : []);
      setArrivals(Array.isArray(arrs) ? arrs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  const activeProperties = properties.filter((p) => p.isActive).length;
  const completedInspections = inspections.filter((i) => i.status === 'COMPLETED').length;
  const scheduledInspections = inspections.filter((i) => i.status === 'SCHEDULED').length;
  const issueCount = inspections.reduce(
    (acc, i) => acc + i.items.filter((item) => item.status === 'ISSUE').length,
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Properties" value={activeProperties} icon="🏠" color="emerald" />
        <StatCard label="Scheduled" value={scheduledInspections} icon="📅" color="blue" />
        <StatCard label="Completed" value={completedInspections} icon="✅" color="green" />
        <StatCard label="Open Issues" value={issueCount} icon="⚠️" color="amber" />
      </div>

      {/* Upcoming Arrivals */}
      {arrivals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">✈️ Upcoming Arrivals & Departures</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {arrivals.slice(0, 5).map((a) => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.property.address}</p>
                  <p className="text-xs text-gray-500">
                    {a.property.client?.name} · {a.arrival || '?'} → {a.departureUnknown ? 'TBD' : (a.departure || '?')}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  a.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700' :
                  a.status === 'IN_RESIDENCE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{a.status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent inspections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent Inspections</h2>
          <Link
            href="/dashboard/inspections"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All →
          </Link>
        </div>

        {inspections.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No inspections yet.</p>
            <Link
              href="/dashboard/inspections"
              className="text-emerald-600 hover:underline text-sm mt-2 inline-block"
            >
              Schedule your first inspection
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left">Inspector</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inspections.slice(0, 5).map((insp) => (
                <tr key={insp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {insp.property.address}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{insp.inspector.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {insp.scheduledDate || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={insp.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {insp.items.filter((i) => i.status !== 'PENDING').length}/{insp.items.length}
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

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <span className={`text-2xl p-3 rounded-lg ${colorMap[color]}`}>{icon}</span>
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
