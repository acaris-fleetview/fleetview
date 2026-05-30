import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://fleetview-backend-production.up.railway.app/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  status?: string;
  notes?: string;
}

const statusOptions = ['active', 'inactive', 'archived'];
const statusLabel: Record<string, string> = { active: 'Actif', inactive: 'Inactif', archived: 'Archivé' };

const EMPTY_DRIVER: Partial<Driver> = { firstName: '', lastName: '', email: '', phone: '', licenseNumber: '', status: 'active' };

async function apiDrivers(): Promise<Driver[]> {
  const r = await fetch(`${API_BASE}/fleet/drivers`, { headers: authHeaders() });
  if (!r.ok) return [];
  return r.json();
}

export default function DriversPage() {
  const qc = useQueryClient();
  const { data: drivers = [], isLoading } = useQuery<Driver[]>({ queryKey: ['drivers'], queryFn: apiDrivers });

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'import' | null>(null);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [form, setForm] = useState<Partial<Driver>>(EMPTY_DRIVER);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const filtered = drivers.filter(d =>
    `${d.firstName} ${d.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (d.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.licenseNumber ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Driver>) => {
      const isEdit = !!selected;
      const url = isEdit ? `${API_BASE}/fleet/drivers/${selected!.id}` : `${API_BASE}/fleet/drivers`;
      const r = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); setModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API_BASE}/fleet/drivers/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) throw new Error('Erreur suppression');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); setModal(null); },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: Partial<Driver>[]) => {
      const results: Driver[] = [];
      for (const row of rows) {
        const r = await fetch(`${API_BASE}/fleet/drivers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(row) });
        if (r.ok) results.push(await r.json());
      }
      return results;
    },
    onSuccess: (data: Driver[]) => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setImportResult(`${data.length} conducteur(s) importé(s) avec succès.`);
    },
  });

  function openAdd() { setSelected(null); setForm(EMPTY_DRIVER); setModal('add'); }
  function openEdit(d: Driver) { setSelected(d); setForm({ ...d }); setModal('edit'); }
  function openDelete(d: Driver) { setSelected(d); setModal('delete'); }

  function handleCsvImport() {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
      return obj as Partial<Driver>;
    });
    importMutation.mutate(rows);
  }

  function isLicenseExpiringSoon(expiry?: string) {
    if (!expiry) return false;
    const diff = new Date(expiry).getTime() - Date.now();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000; // 60 days
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xl">👤</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conducteurs</h1>
          <p className="text-sm text-gray-500">{drivers.length} conducteur{drivers.length > 1 ? 's' : ''} enregistré{drivers.length > 1 ? 's' : ''}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setCsvText(''); setImportResult(null); setModal('import'); }}
            className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1">
            📥 Import CSV
          </button>
          <button onClick={openAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-1">
            + Ajouter un conducteur
          </button>
        </div>
      </div>

      {/* Search */}
      <input placeholder="Rechercher par nom, email, permis…" value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-md border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Nom', 'Contact', 'N° Permis', 'Expiration permis', 'Statut', 'Actions'].map(h => (
                <th key={h} className={`px-4 py-3 font-medium text-gray-600 ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chargement…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                <div className="text-3xl mb-2">👤</div>
                <p>Aucun conducteur trouvé</p>
                <button onClick={openAdd} className="mt-3 text-indigo-600 hover:underline text-sm">+ Ajouter le premier conducteur</button>
              </td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{d.firstName} {d.lastName}</td>
                <td className="px-4 py-3 text-gray-600">
                  {d.email && <div className="text-xs">{d.email}</div>}
                  {d.phone && <div className="text-xs text-gray-400">{d.phone}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-gray-700">{d.licenseNumber || '—'}</td>
                <td className="px-4 py-3">
                  {d.licenseExpiry ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isLicenseExpiringSoon(d.licenseExpiry) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isLicenseExpiringSoon(d.licenseExpiry) ? '⚠ ' : ''}
                      {new Date(d.licenseExpiry).toLocaleDateString('fr-FR')}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    d.status === 'active' ? 'bg-green-100 text-green-700' :
                    d.status === 'inactive' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>{statusLabel[d.status ?? ''] ?? d.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(d)} className="text-blue-600 hover:text-blue-800 text-xs mr-3">✏️ Modifier</button>
                  <button onClick={() => openDelete(d)} className="text-red-500 hover:text-red-700 text-xs">🗑 Supprimer</button>
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
              <h2 className="font-semibold text-gray-900">{modal === 'add' ? 'Ajouter un conducteur' : 'Modifier le conducteur'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                  <input required value={form.firstName ?? ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Jean" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                  <input required value={form.lastName ?? ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Dupont" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="jean.dupont@acaris.fr" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                  <input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="06 12 34 56 78" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Permis</label>
                  <input value={form.licenseNumber ?? ''} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="12AB34567" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expiration</label>
                  <input type="date" value={form.licenseExpiry ?? ''} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                <select value={form.status ?? 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {statusOptions.map(o => <option key={o} value={o}>{statusLabel[o]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Observations…" />
              </div>
              {saveMutation.isError && <p className="text-red-600 text-xs">{String(saveMutation.error)}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50">
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
              <h2 className="font-semibold text-gray-900 text-lg">Supprimer ce conducteur ?</h2>
              <p className="text-gray-600 text-sm mt-2"><strong>{selected.firstName} {selected.lastName}</strong></p>
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
              <h2 className="font-semibold text-gray-900">Import CSV — Conducteurs</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800">
                <p className="font-medium mb-1">Format attendu (première ligne = en-têtes) :</p>
                <code>firstName,lastName,email,phone,licenseNumber,licenseExpiry,status</code>
              </div>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={8}
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="firstName,lastName,email,phone,licenseNumber,licenseExpiry,status&#10;Jean,Dupont,jean@acaris.fr,0612345678,12AB34567,2027-06-30,active" />
              {importResult && <p className="text-green-700 text-sm font-medium">✓ {importResult}</p>}
              {importMutation.isError && <p className="text-red-600 text-xs">{String(importMutation.error)}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Fermer</button>
                <button onClick={handleCsvImport} disabled={!csvText.trim() || importMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50">
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
