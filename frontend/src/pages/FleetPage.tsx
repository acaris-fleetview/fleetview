import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi } from '../services/api';
import { Vehicle, Driver } from '../types';

const statusLabel: Record<string, string> = { active: 'Actif', inactive: 'Inactif', archived: 'Archivé' };
const fuelLabel: Record<string, string> = { diesel: 'Diesel', essence: 'Essence', electric: 'Électrique', hybrid: 'Hybride' };

export default function FleetPage() {
  const [tab, setTab] = useState<'vehicles'|'drivers'>('vehicles');
  const [search, setSearch] = useState('');

  const { data: vehicles = [], isLoading: loadingV } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'], queryFn: fleetApi.vehicles
  });
  const { data: drivers = [], isLoading: loadingD } = useQuery<Driver[]>({
    queryKey: ['drivers'], queryFn: fleetApi.drivers
  });

  const filteredVehicles = vehicles.filter(v =>
    v.registration.toLowerCase().includes(search.toLowerCase()) ||
    `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDrivers = drivers.filter(d =>
    `${d.firstName} ${d.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion de la flotte</h2>
          <p className="text-sm text-gray-500">{vehicles.length} véhicules · {drivers.length} conducteurs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['vehicles','drivers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            {t === 'vehicles' ? `🚗 Véhicules (${vehicles.length})` : `👤 Conducteurs (${drivers.length})`}
          </button>
        ))}
      </div>

      <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-72 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {tab === 'vehicles' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Immatriculation','Marque / Modèle','Énergie','Kilométrage','Statut'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingV && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>}
              {filteredVehicles.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-800">{v.registration}</td>
                  <td className="px-4 py-3 text-gray-700">{v.brand} {v.model} {v.year ? `(${v.year})` : ''}</td>
                  <td className="px-4 py-3"><span className="badge-gray">{fuelLabel[v.fuelType || ''] || v.fuelType || '—'}</span></td>
                  <td className="px-4 py-3 text-gray-600">{Number(v.odometerKm).toLocaleString('fr-FR')} km</td>
                  <td className="px-4 py-3">
                    <span className={v.status === 'active' ? 'badge-success' : v.status === 'inactive' ? 'badge-warning' : 'badge-gray'}>
                      {statusLabel[v.status] || v.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loadingV && filteredVehicles.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun véhicule trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'drivers' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Conducteur','Email','Permis','Score conduite','Statut'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingD && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>}
              {filteredDrivers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.firstName} {d.lastName}</td>
                  <td className="px-4 py-3 text-gray-500">{d.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.licenseNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full"
                          style={{ width: `${d.drivingScore}%`, background: d.drivingScore > 80 ? '#22c55e' : d.drivingScore > 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="text-xs font-medium">{d.drivingScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={d.status === 'active' ? 'badge-success' : 'badge-gray'}>
                      {d.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
              {!loadingD && filteredDrivers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun conducteur trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
