import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi } from '../services/api';
import { Vehicle, Driver } from '../types';

const statusLabel: Record<string, string> = { active: 'Actif', inactive: 'Inactif', archived: 'Archive' };
const fuelLabel: Record<string, string> = { diesel: 'Diesel', essence: 'Essence', electric: 'Electrique', hybrid: 'Hybride' };

export default function FleetPage() {
  const [tab, setTab] = useState<'vehicles'|'drivers'>('vehicles');
  const [search, setSearch] = useState('');

  const { data: vehicles = [], isLoading: loadingV, isError: errV } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: fleetApi.vehicles,
    retry: false,
  });
  const { data: drivers = [], isLoading: loadingD, isError: errD } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: fleetApi.drivers,
    retry: false,
  });

  const filteredVehicles = vehicles.filter(v =>
    v.registration.toLowerCase().includes(search.toLowerCase()) ||
    `${v.brand ?? ''} ${v.model ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDrivers = drivers.filter(d =>
    `${d.firstName} ${d.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const hasError = errV || errD;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Flotte</h2>
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {hasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Donnees non disponibles. Verifiez la connexion au backend.
        </div>
      )}

      <div className="flex gap-4 border-b pb-2">
        <button
          onClick={() => setTab('vehicles')}
          className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'vehicles' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Vehicules ({vehicles.length})
        </button>
        <button
          onClick={() => setTab('drivers')}
          className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'drivers' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Conducteurs ({drivers.length})
        </button>
      </div>

      {tab === 'vehicles' && (
        loadingV ? <p className="text-gray-400 text-sm">Chargement...</p> :
        filteredVehicles.length === 0 ? <p className="text-gray-400 text-sm italic">Aucun vehicule trouve.</p> :
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3">Immatriculation</th>
                <th className="px-4 py-3">Marque / Modele</th>
                <th className="px-4 py-3">Carburant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Kilometrage</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{v.registration}</td>
                  <td className="px-4 py-3">{v.brand ?? '-'} {v.model ?? ''}</td>
                  <td className="px-4 py-3">{v.fuelType ? (fuelLabel[v.fuelType] ?? v.fuelType) : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.odometerKm?.toLocaleString('fr-FR')} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'drivers' && (
        loadingD ? <p className="text-gray-400 text-sm">Chargement...</p> :
        filteredDrivers.length === 0 ? <p className="text-gray-400 text-sm italic">Aucun conducteur trouve.</p> :
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tel</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map(d => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.firstName} {d.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{d.email ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.phone ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[d.status] ?? d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
