'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
 
interface Summary {
  activeProperties: number;
  scheduledInspections: number;
  completedInspections: number;
  issueCount: number;
}

interface Arrival {
  id: string;
  arrival: string | null;
  departure: string | null;
  departureUnknown: boolean;
  status: string;
  property: { id: string; address: string; city: string; client: { name: string } | null };
}

interface Inspection {
  id: string;
  status: string;
  scheduledDate: string | null;
  completedAt: string | null;
  property: { id: string; address: string; city: string };
  inspector: { name: string };
  doneCount: number;
  totalCount: number;
}

interface OpenIssueRow {
  itemId: string;
  itemLabel: string;
  itemCategory: string | null;
  itemNotes: string | null;
  inspectionId: string;
  propertyId: string;
  propertyAddress: string | null;
  scheduledDate: string | null;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({
    activeProperties: 0,
    scheduledInspections: 0,
    completedInspections: 0,
    issueCount: 0,
  });
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [openIssues, setOpenIssues] = useState<OpenIssueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard?limit=5&issuesLimit=10')
      .then((r) => r.json())
      .then((data) => {
        const s = data?.summary;
        setSummary({
          activeProperties: Number(s?.activeProperties ?? 0),
          scheduledInspections: Number(s?.scheduledInspections ?? 0),
          completedInspections: Number(s?.completedInspections ?? 0),
          issueCount: Number(s?.issueCount ?? 0),
        });
        setInspections(Array.isArray(data?.recentInspections) ? data.recentInspections : []);
        setArrivals(Array.isArray(data?.arrivals) ? data.arrivals : []);
        setOpenIssues(Array.isArray(data?.openIssues) ? data.openIssues : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats grid — all major items are links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/properties" className="block">
          <StatCard label="Active Properties" value={summary.activeProperties} icon="🏠" color="emerald" loading={loading} />
        </Link>
        <Link href="/dashboard/inspections?status=SCHEDULED" className="block">
          <StatCard label="Scheduled" value={summary.scheduledInspections} icon="📅" color="blue" loading={loading} />
        </Link>
        <Link href="/dashboard/inspections?status=COMPLETED" className="block">
          <StatCard label="Completed" value={summary.completedInspections} icon="✅" color="green" loading={loading} />
        </Link>
        <Link href="/dashboard/issues" className="block">
          <StatCard label="Open Issues" value={summary.issueCount} icon="⚠️" color="amber" loading={loading} />
        </Link>
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
                  <p className="text-sm font-medium text-gray-800">
                    <Link href={`/dashboard/properties/${a.property.id}`} className="text-emerald-600 hover:underline">
                      {a.property.address}
                    </Link>
                  </p>
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

      {/* Open / Recent issues — above recent inspections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">⚠️ Open / Recent Issues</h2>
          <Link
            href="/dashboard/issues"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All →
          </Link>
        </div>
        {openIssues.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p>No open issues.</p>
            <Link href="/dashboard/issues" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
              Issues
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Property</th>
                  <th className="px-6 py-3 text-left">Item</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openIssues.map((row) => (
                  <tr key={row.itemId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      <Link
                        href={`/dashboard/properties/${row.propertyId}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {row.propertyAddress ?? '—'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">{row.itemLabel}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.itemCategory ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.scheduledDate ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <Link
                        href={`/dashboard/inspections/${row.inspectionId}`}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        View inspection →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left">Inspector</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Items</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inspections.slice(0, 5).map((insp) => (
                <tr key={insp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    <Link href={`/dashboard/properties/${insp.property.id}`} className="text-emerald-600 hover:underline">
                      {insp.property.address}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{insp.inspector.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {insp.scheduledDate || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={insp.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {insp.doneCount}/{insp.totalCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <Link href={`/dashboard/inspections/${insp.id}`} className="text-emerald-600 hover:text-emerald-700 font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, loading }: { label: string; value: number; icon: string; color: string; loading?: boolean }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{loading ? '—' : value}</p>
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
