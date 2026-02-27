'use client';

import { useEffect, useState } from 'react';

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
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    address: '',
    city: '',
    state: 'FL',
    zip: '',
    accessNotes: '',
    specialInstructions: '',
  });

  const fetchProperties = () => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then((data) => {
        setProperties(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchProperties(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ address: '', city: '', state: 'FL', zip: '', accessNotes: '', specialInstructions: '' });
    fetchProperties();
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
        {properties.map((prop) => (
          <div key={prop.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
          </div>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🏠</p>
          <p>No properties yet. Add your first one above.</p>
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
