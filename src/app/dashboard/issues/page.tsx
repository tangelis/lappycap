'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OpenIssueRow {
  itemId: string;
  itemLabel: string;
  itemCategory: string | null;
  itemNotes: string | null;
  inspectionId: string;
  inspectionStatus: string;
  scheduledDate: string | null;
  propertyId: string;
  propertyAddress: string | null;
}

export default function OpenIssuesPage() {
  const [issues, setIssues] = useState<OpenIssueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/open-issues')
      .then((r) => r.json())
      .then((data) => setIssues(Array.isArray(data) ? data : []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Open issues</h1>
        <Link
          href="/dashboard/inspections"
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Inspections →
        </Link>
      </div>
      <p className="text-gray-600 mb-6">
        Checklist items marked as Issue. Open the inspection to update the item to OK or N/A and add notes.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {issues.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="text-4xl mb-2">✅</p>
            <p>No open issues.</p>
            <Link href="/dashboard/inspections" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
              Go to Inspections
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Property</th>
                  <th className="px-6 py-3 text-left">Item</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Notes</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {issues.map((row) => (
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
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{row.itemNotes ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.scheduledDate ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/inspections/${row.inspectionId}`}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
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
    </div>
  );
}
