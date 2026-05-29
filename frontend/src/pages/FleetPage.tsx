import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi } from '../services/api';
import { demoData } from '../services/demoData';
import { Vehicle, Driver } from '../types';

const fuelLabel: Record<string, string> = { diesel: 'Diesel', petrol: 'Essence', electric: 'Électrique', hybrid: 'Hybride' };

export default function FleetPage() {
  const [tab, setTab] = useState<'vehicles'|'drivers'>('vehicles');
  const [search, setSearch] = useState('');

  const { data: apiVehicles, isError: errV } = useQuery<Vehicle[]>({ queryKey: ['vehicles'], queryFn: fleetApi.vehicles, retry: false });
  const { data: apiDrivers,  isError: errD } = useQuery<Driver[]>({ queryKey: ['drivers'],  queryFn: fleetApi.drivers,  retry: false });

  const vehicles: Vehicle[] = (errV || !apiVehicles?.length) ? (demoData.vehicles as unknown as Vehicle[]) : apiVehicles;
  const drivers:  Driver[]  = (errD || !apiDrivers?.length)  ? (demoData.drivers  as unknown as Driver[])  : apiDrivers;
  const usingDemo = errV || errD;

  const filteredV = vehicles.filter(v =>
    v.registration.toLowerCase().includes(search.toLowerCase()) ||
    (v.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.model ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredD = drivers.filter(d =>
    d.lastName.toLowerCase().includes(search.toLowerCase()) ||
    d.firstName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Flotte</h2>
        <div className="flex items-center gap-3">
          {usingDemo && <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">📊 Démo</span>}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..." className="border rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex gap-4 border-b pb-2">
        <button onClick={() => setTab('vehicles')} className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab==='vehicles' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
          Vehicules ({filteredV.length})
        </button>
        <button onClick={() => setTab('drivers')} className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab==='drivers' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
          Conducteurs ({filteredD.length})
        </button>
      </div>

      {tab === 'vehicles' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Immatriculation</th>
                <th className="px-4 py-3">Marque / Modèle</th>
                <th className="px-4 py-3">Année</th>
                <th className="px-4 py-3">Énergie</th>
                <th className="px-4 py-3">Kilométrage</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredV.map(v => (
                <tr key={v.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-700">{v.registration}</td>
                  <td className="px-4 py-3">{v.brand} {v.model}</td>
                  <td className="px-4 py-3 text-gray-500">{v.year}</td>
                  <td className="px-4 py-3">{v.fuelType ? (fuelLabel[v.fuelType] ?? v.fuelType) : '-'}</td>
                  <td className="px-4 py-3">{v.odometerKm.toLocaleString('fr-FR')} km</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'drivers' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Conducteur</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Score conduite</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredD.map(d => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{d.firstName} {d.lastName}</td>
                  <td className="px-4 py-3 text-gray-500">{d.email}</td>
                  <td className="px-4 py-3 text-gray-500">{d.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-200">
                        <div className={`h-1.5 rounded-full ${d.drivingScore >= 85 ? 'bg-green-500' : d.drivingScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${d.drivingScore}%` }} />
                      </div>
                      <span className="text-xs font-medium">{d.drivingScore}/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.status === 'active' ? 'Actif' : 'Inactif'}
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
