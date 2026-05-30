import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://fleetview-backend-production.up.railway.app/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

interface Vehicle {
  id: string;
  registration: string;
  brand?: string;
  model?: string;
  year?: number;
  fuelType?: string;
  odometerKm?: number;
  status?: string;
  vin?: string;
  notes?: string;
}

const fuelOptions = ['diesel', 'essence', 'electric', 'hybrid'];
const statusOptions = ['active', 'inactive', 'archived'];
const fuelLabel: Record<string, string> = { diesel: 'Diesel', essence: 'Essence', electric: 'Électrique', hybrid: 'Hybride' };
const statusLabel: Record<string, string> = { active: 'Actif', inactive: 'Inactif', archived: 'Archivé' };

const EMPTY_VEHICLE: Partial<Vehicle> = { registration: '', brand: '', model: '', fuelType: 'diesel', status: 'active', odometerKm: 0 };

async function apiVehicles(): Promise<Vehicle[]> {
  const r = await fetch(`${API_BASE}/fleet/vehicles`, { headers: authHeaders() });
  if (!r.ok) return [];
  return r.json();
}

export default function FleetPage() {
  const qc = useQueryClient();
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({ queryKey: ['vehicles'], queryFn: apiVehicles });

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'import' | null>(null);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<Partial<Vehicle>>(EMPTY_VEHICLE);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const filtered = vehicles.filter(v =>
    v.registration.toLowerCase().includes(search.toLowerCase()) ||
    `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      const isEdit = !!selected;
      const url = isEdit ? `${API_BASE}/fleet/vehicles/${selected!.id}` : `${API_BASE}/fleet/vehicles`;
      const r = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API_BASE}/fleet/vehicles/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) throw new Error('Erreur suppression');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setModal(null); },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: Partial<Vehicle>[]) => {
      const r = await fetch(`${API_BASE}/fleet/vehicles/import`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ rows }) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (data: Vehicle[]) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setImportResult(`${data.length} véhicule(s) importé(s) avec succès.`);
    },
  });

  function openAdd() { setSelected(null); setForm(EMPTY_VEHICLE); setModal('add'); }
  function openEdit(v: Vehicle) { setSelected(v); setForm({ ...v }); setModal('edit'); }
  function openDelete(v: Vehicle) { setSelected(v); setModal('delete'); }

  function handleCsvImport() {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
      return obj as Partial<Vehicle>;
    });
    importMutation.mutate(rows);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🚗</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flotte de véhicules</h1>
          <p className="text-sm text-gray-500">{vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} enregistré{vehicles.length > 1 ? 's' : ''}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setCsvText(''); setImportResult(null); setModal('import'); }}
            className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1">
            📥 Import CSV
          </button>
          <button onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-1">
            + Ajouter un véhicule
          </button>
        </div>
      </div>

      {/* Search */}
      <input placeholder="Rechercher par immatriculation, marque, modèle…" value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-md border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Immatriculation', 'Marque / Modèle', 'Énergie', 'Kilométrage', 'Statut', 'Actions'].map(h => (
                <th key={h} className={`px-4 py-3 font-medium text-gray-600 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                <div className="text-3xl mb-2">🚗</div>
                <p>Aucun véhicule trouvé</p>
                <button onClick={openAdd} className="mt-3 text-blue-600 hover:underline text-sm">+ Ajouter le premier véhicule</button>
              </td></tr>
            )}
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-blue-800">{v.registration}</td>
                <td className="px-4 py-3 text-gray-700">{v.brand} {v.model}{v.year ? ` (${v.year})` : ''}</td>
                <td className="px-4 py-3 text-gray-600">{fuelLabel[v.fuelType ?? ''] ?? v.fuelType ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{Number(v.odometerKm ?? 0).toLocaleString('fr-FR')} km</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    v.status === 'active' ? 'bg-green-100 text-green-700' :
                    v.status === 'inactive' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>{statusLabel[v.status ?? ''] ?? v.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(v)} className="text-blue-600 hover:text-blue-800 text-xs mr-3">✏️ Modifier</button>
                  <button onClick={() => openDelete(v)} className="text-red-500 hover:text-red-700 text-xs">🗑 Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{modal === 'add' ? 'Ajouter un véhicule' : 'Modifier le véhicule'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}
              className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Immatriculation *</label>
                  <input required value={form.registration ?? ''} onChange={e => setForm(f => ({ ...f, registration: e.target.value.toUpperCase() }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" placeholder="AB-123-CD" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">VIN</label>
                  <input value={form.vin ?? ''} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Numéro de châssis" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marque</label>
                  <input value={form.brand ?? ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ex: Renault" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Modèle</label>
                  <input value={form.model ?? ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ex: Master" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
                  <input type="number" value={form.year ?? ''} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="2022" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Énergie</label>
                  <select value={form.fuelType ?? 'diesel'} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {fuelOptions.map(o => <option key={o} value={o}>{fuelLabel[o]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kilométrage</label>
                  <input type="number" value={form.odometerKm ?? 0} onChange={e => setForm(f => ({ ...f, odometerKm: Number(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                  <select value={form.status ?? 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {statusOptions.map(o => <option key={o} value={o}>{statusLabel[o]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Observations, équipements…" />
              </div>
              {saveMutation.isError && <p className="text-red-600 text-xs">{String(saveMutation.error)}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
                  {saveMutation.isPending ? 'Enregistrement…' : (modal === 'add' ? 'Ajouter' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🗑</div>
              <h2 className="font-semibold text-gray-900 text-lg">Supprimer ce véhicule ?</h2>
              <p className="text-gray-600 text-sm mt-2">
                Véhicule <strong className="font-mono">{selected.registration}</strong> — {selected.brand} {selected.model}
              </p>
              <p className="text-red-600 text-xs mt-1">Cette action est irréversible.</p>
            </div>
            {deleteMutation.isError && <p className="text-red-600 text-xs text-center mt-2">{String(deleteMutation.error)}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={() => deleteMutation.mutate(selected.id)} disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-50">
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {modal === 'import' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Import CSV — Véhicules</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">Format attendu (première ligne = en-têtes) :</p>
                <code>registration,brand,model,year,fuelType,odometerKm,status</code>
                <p className="mt-1">Ex: <code>AB-123-CD,Renault,Master,2022,diesel,45000,active</code></p>
              </div>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={8}
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="registration,brand,model,year,fuelType,odometerKm,status&#10;AB-123-CD,Renault,Master,2022,diesel,45000,active" />
              {importResult && <p className="text-green-700 text-sm font-medium">✓ {importResult}</p>}
              {importMutation.isError && <p className="text-red-600 text-xs">{String(importMutation.error)}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Fermer</button>
                <button onClick={handleCsvImport} disabled={!csvText.trim() || importMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
                  {importMutation.isPending ? 'Import…' : 'Importer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
