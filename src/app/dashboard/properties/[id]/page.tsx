'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  weeklyRate: number | null;
  accessNotes: string | null;
  specialInstructions: string | null;
  isActive: boolean;
  client: { name: string; email: string; phone: string } | null;
  community: { name: string; neighborhood: { name: string } | null; route: { name: string } | null } | null;
  security: SecurityProfile | null;
  hvacUnits: HvacUnit[];
  plumbing: PlumbingItem[];
  openClose: OpenCloseStd | null;
  openCloseCustom: { id: string; type: string; item: string; value: string | null }[];
  hurricane: { responsibilityInTown: string; responsibilityOutTown: string; notes: string | null } | null;
  hurricaneChecklist: { id: string; item: string; notes: string | null; sortOrder: number }[];
  vendors: Vendor[];
  lodgings: LodgingEntry[];
  customChecklist: { id: string; item: string; notes: string | null }[];
}

interface SecurityProfile {
  alarmCode: string | null;
  alarmPassword: string | null;
  primaryAlarmPanelLocation: string | null;
  keyNumber: string | null;
  keyBinName: string | null;
  garageDoorKeypadCode: string | null;
  frontDoorKeylessEntryCode: string | null;
  lockBoxCode: string | null;
  lockBoxLocation: string | null;
  specialEntryInstructions: string | null;
  communityGateCode: string | null;
  modemLocation: string | null;
  wifiPassword: string | null;
}

interface HvacUnit {
  id: string;
  hvacId: string | null;
  airHandlerLocation: string | null;
  compressorLocation: string | null;
  thermostatSettingAway: number | null;
  thermostatSettingHome: number | null;
  acFilterLocation: string | null;
  acFilterDimensions: string | null;
}

interface PlumbingItem {
  id: string;
  systemId: string | null;
  mainShutoffLocation: string | null;
  cityMeterLocation: string | null;
  waterHeaterLocation: string | null;
  waterHeaterShutoffLocation: string | null;
  description: string | null;
}

interface OpenCloseStd {
  openWaterValve: boolean;
  openWaterHeaterBreaker: boolean;
  openIceMakers: boolean;
  openInstaHot: boolean;
  closeWaterValve: boolean;
  closeWaterHeaterBreaker: boolean;
  closeIceMakers: boolean;
  closeEmptyIceMakers: boolean;
  closeInstaHot: boolean;
}

interface Vendor {
  id: string;
  type: string;
  name: string;
  phone: string | null;
  notes: string | null;
}

interface LodgingEntry {
  id: string;
  arrival: string | null;
  departure: string | null;
  departureUnknown: boolean;
  clientNotes: string | null;
  nestNotes: string | null;
  status: string;
  client: { name: string } | null;
}

const TABS = ['Overview', 'Security', 'HVAC', 'Plumbing', 'Open/Close', 'Hurricane', 'Vendors', 'Lodging'] as const;
type Tab = typeof TABS[number];

export default function PropertyDetailPage() {
  const params = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then((r) => r.json())
      .then((data) => { setProperty(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!property) return <div className="text-center py-12 text-red-500">Property not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/properties" className="text-sm text-emerald-600 hover:underline mb-2 inline-block">← Back to Properties</Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{property.address}</h1>
            <p className="text-gray-500">{property.city}, {property.state} {property.zip}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              {property.client && <span>🏠 {property.client.name}</span>}
              {property.community && <span>📍 {property.community.name}</span>}
              {property.community?.route && <span>🚗 {property.community.route.name}</span>}
              {property.weeklyRate && <span>💰 ${property.weeklyRate}/week</span>}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${property.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {property.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && <OverviewTab property={property} />}
      {activeTab === 'Security' && <SecurityTab security={property.security} />}
      {activeTab === 'HVAC' && <HvacTab units={property.hvacUnits} />}
      {activeTab === 'Plumbing' && <PlumbingTab items={property.plumbing} />}
      {activeTab === 'Open/Close' && <OpenCloseTab standard={property.openClose} custom={property.openCloseCustom} />}
      {activeTab === 'Hurricane' && <HurricaneTab hurricane={property.hurricane} checklist={property.hurricaneChecklist} />}
      {activeTab === 'Vendors' && <VendorsTab vendors={property.vendors} />}
      {activeTab === 'Lodging' && <LodgingTab lodgings={property.lodgings} />}
    </div>
  );
}

function Card({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
      <h3 className="font-semibold text-gray-700 mb-4">{icon} {title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function OverviewTab({ property }: { property: Property }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Contact" icon="👤">
        {property.client ? (
          <>
            <InfoRow label="Name" value={property.client.name} />
            <InfoRow label="Email" value={property.client.email} />
            <InfoRow label="Phone" value={property.client.phone} />
          </>
        ) : <p className="text-sm text-gray-400">No client assigned</p>}
      </Card>
      <Card title="Location" icon="📍">
        <InfoRow label="Community" value={property.community?.name} />
        <InfoRow label="Neighborhood" value={property.community?.neighborhood?.name} />
        <InfoRow label="Route" value={property.community?.route?.name} />
      </Card>
      {property.accessNotes && (
        <Card title="Access Notes" icon="🔑">
          <p className="text-sm text-gray-700">{property.accessNotes}</p>
        </Card>
      )}
      {property.specialInstructions && (
        <Card title="Special Instructions" icon="📝">
          <p className="text-sm text-gray-700">{property.specialInstructions}</p>
        </Card>
      )}
      {property.customChecklist.length > 0 && (
        <Card title="Custom Checklist Items" icon="✅">
          {property.customChecklist.map((item) => (
            <div key={item.id} className="py-2 border-b border-gray-50 last:border-0">
              <p className="text-sm font-medium text-gray-800">{item.item}</p>
              {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function SecurityTab({ security }: { security: SecurityProfile | null }) {
  if (!security) return <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🔐</p><p>No security profile configured</p></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Alarm" icon="🚨">
        <InfoRow label="Alarm Code" value={security.alarmCode} />
        <InfoRow label="Alarm Password" value={security.alarmPassword} />
        <InfoRow label="Panel Location" value={security.primaryAlarmPanelLocation} />
      </Card>
      <Card title="Keys & Entry" icon="🔑">
        <InfoRow label="Key Number" value={security.keyNumber} />
        <InfoRow label="Key Bin" value={security.keyBinName} />
        <InfoRow label="Lockbox Code" value={security.lockBoxCode} />
        <InfoRow label="Lockbox Location" value={security.lockBoxLocation} />
        <InfoRow label="Garage Keypad" value={security.garageDoorKeypadCode} />
        <InfoRow label="Front Door Code" value={security.frontDoorKeylessEntryCode} />
      </Card>
      <Card title="Community Access" icon="🏘️">
        <InfoRow label="Gate Code" value={security.communityGateCode} />
      </Card>
      <Card title="WiFi & Network" icon="📶">
        <InfoRow label="WiFi Password" value={security.wifiPassword} />
        <InfoRow label="Modem Location" value={security.modemLocation} />
      </Card>
      {security.specialEntryInstructions && (
        <div className="md:col-span-2">
          <Card title="Special Entry Instructions" icon="⚠️">
            <p className="text-sm text-gray-700">{security.specialEntryInstructions}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function HvacTab({ units }: { units: HvacUnit[] }) {
  if (units.length === 0) return <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">❄️</p><p>No HVAC units configured</p></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {units.map((unit) => (
        <Card key={unit.id} title={unit.hvacId || 'HVAC Unit'} icon="❄️">
          <InfoRow label="Air Handler" value={unit.airHandlerLocation} />
          <InfoRow label="Compressor" value={unit.compressorLocation} />
          <InfoRow label="Temp (Away)" value={unit.thermostatSettingAway ? `${unit.thermostatSettingAway}°F` : null} />
          <InfoRow label="Temp (Home)" value={unit.thermostatSettingHome ? `${unit.thermostatSettingHome}°F` : null} />
          <InfoRow label="Filter Location" value={unit.acFilterLocation} />
          <InfoRow label="Filter Size" value={unit.acFilterDimensions} />
        </Card>
      ))}
    </div>
  );
}

function PlumbingTab({ items }: { items: PlumbingItem[] }) {
  if (items.length === 0) return <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🔧</p><p>No plumbing details configured</p></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <Card key={item.id} title={item.systemId || 'Plumbing System'} icon="🔧">
          <InfoRow label="Main Shutoff" value={item.mainShutoffLocation} />
          <InfoRow label="City Meter" value={item.cityMeterLocation} />
          <InfoRow label="Water Heater" value={item.waterHeaterLocation} />
          <InfoRow label="Heater Shutoff" value={item.waterHeaterShutoffLocation} />
          {item.description && <p className="text-xs text-gray-500 mt-2">{item.description}</p>}
        </Card>
      ))}
    </div>
  );
}

function OpenCloseTab({ standard, custom }: { standard: OpenCloseStd | null; custom: { type: string; item: string; value: string | null }[] }) {
  const openCustom = custom.filter((c) => c.type === 'OPEN');
  const closeCustom = custom.filter((c) => c.type === 'CLOSE');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Open Procedures" icon="🔓">
        {standard ? (
          <>
            <CheckItem label="Turn on water valve" checked={standard.openWaterValve} />
            <CheckItem label="Water heater breaker ON" checked={standard.openWaterHeaterBreaker} />
            <CheckItem label="Turn on ice makers" checked={standard.openIceMakers} />
            <CheckItem label="Turn on InstaHot" checked={standard.openInstaHot} />
          </>
        ) : <p className="text-sm text-gray-400 mb-2">No standard procedures set</p>}
        {openCustom.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">CUSTOM</p>
            {openCustom.map((c, i) => (
              <div key={i} className="py-1">
                <p className="text-sm text-gray-700">{c.item}</p>
                {c.value && <p className="text-xs text-gray-500">{c.value}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Close Procedures" icon="🔒">
        {standard ? (
          <>
            <CheckItem label="Turn off water valve" checked={standard.closeWaterValve} />
            <CheckItem label="Water heater breaker OFF" checked={standard.closeWaterHeaterBreaker} />
            <CheckItem label="Turn off ice makers" checked={standard.closeIceMakers} />
            <CheckItem label="Empty ice makers" checked={standard.closeEmptyIceMakers} />
            <CheckItem label="Turn off InstaHot" checked={standard.closeInstaHot} />
          </>
        ) : <p className="text-sm text-gray-400 mb-2">No standard procedures set</p>}
        {closeCustom.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">CUSTOM</p>
            {closeCustom.map((c, i) => (
              <div key={i} className="py-1">
                <p className="text-sm text-gray-700">{c.item}</p>
                {c.value && <p className="text-xs text-gray-500">{c.value}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`text-sm ${checked ? 'text-emerald-600' : 'text-gray-300'}`}>{checked ? '✅' : '⬜'}</span>
      <span className={`text-sm ${checked ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

function HurricaneTab({ hurricane, checklist }: { hurricane: Property['hurricane']; checklist: Property['hurricaneChecklist'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Responsibility" icon="🌀">
        {hurricane ? (
          <>
            <InfoRow label="When Owner In-Town" value={hurricane.responsibilityInTown?.replace(/_/g, ' ')} />
            <InfoRow label="When Owner Away" value={hurricane.responsibilityOutTown?.replace(/_/g, ' ')} />
            {hurricane.notes && <p className="text-sm text-gray-600 mt-3">{hurricane.notes}</p>}
          </>
        ) : <p className="text-sm text-gray-400">No hurricane profile configured</p>}
      </Card>
      <Card title="Prep Checklist" icon="📋">
        {checklist.length > 0 ? (
          checklist.map((item) => (
            <div key={item.id} className="py-2 border-b border-gray-50 last:border-0">
              <p className="text-sm text-gray-700">{item.sortOrder}. {item.item}</p>
              {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
            </div>
          ))
        ) : <p className="text-sm text-gray-400">No checklist items</p>}
      </Card>
    </div>
  );
}

function VendorsTab({ vendors }: { vendors: Vendor[] }) {
  if (vendors.length === 0) return <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🛠️</p><p>No vendors configured</p></div>;

  const typeColors: Record<string, string> = {
    HVAC: 'bg-blue-100 text-blue-700',
    PLUMBING: 'bg-cyan-100 text-cyan-700',
    ELECTRICAL: 'bg-yellow-100 text-yellow-700',
    PEST_CONTROL: 'bg-red-100 text-red-700',
    LANDSCAPING: 'bg-green-100 text-green-700',
    POOL: 'bg-sky-100 text-sky-700',
    SECURITY: 'bg-purple-100 text-purple-700',
    GENERAL: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vendors.map((v) => (
        <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-800">{v.name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[v.type] || 'bg-gray-100 text-gray-600'}`}>
              {v.type.replace(/_/g, ' ')}
            </span>
          </div>
          {v.phone && <p className="text-sm text-gray-600">📞 {v.phone}</p>}
          {v.notes && <p className="text-xs text-gray-500 mt-2">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function LodgingTab({ lodgings }: { lodgings: LodgingEntry[] }) {
  if (lodgings.length === 0) return <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">✈️</p><p>No lodging records</p></div>;

  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-blue-100 text-blue-700',
    IN_RESIDENCE: 'bg-green-100 text-green-700',
    DEPARTED: 'bg-gray-100 text-gray-500',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-3">
      {lodgings.map((l) => (
        <div key={l.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-lg">✈️</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {l.arrival || '?'} → {l.departureUnknown ? 'TBD' : (l.departure || '?')}
                </p>
                {l.client && <p className="text-xs text-gray-500">{l.client.name}</p>}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status] || ''}`}>
              {l.status.replace(/_/g, ' ')}
            </span>
          </div>
          {l.clientNotes && <p className="text-sm text-gray-600">💬 {l.clientNotes}</p>}
          {l.nestNotes && <p className="text-sm text-amber-700 bg-amber-50 rounded p-2 mt-2 text-xs">🏠 Internal: {l.nestNotes}</p>}
        </div>
      ))}
    </div>
  );
}
