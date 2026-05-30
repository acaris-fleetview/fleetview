import { useMemo, useState } from 'react';
import { demoData } from '../services/demoData';

/* ── Types ── */
type Statut = 'ok' | 'soon' | 'overdue';
type CheckType = 'CT' | 'ANTIPOLLUTION' | 'HAYON' | 'EXTINCTEUR' | 'TACHYGRAPHE' | 'ASSURANCE' | 'VIGNETTE';

interface Check {
  type: CheckType;
  label: string;
  icon: string;
  dateEcheance: string;       // ISO date
  periodiciteMonths: number;
}

interface VehicleChecks {
  immat: string;
  nom: string;
  checks: Check[];
}

/* ── Helpers ── */
const today = new Date();
const addMonths = (d: Date, m: number) => {
  const r = new Date(d); r.setMonth(r.getMonth() + m); return r;
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function getStatut(dateEcheance: string): Statut {
  const d = new Date(dateEcheance);
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'overdue';
  if (diff <= 30) return 'soon';
  return 'ok';
}

function daysLeft(dateEcheance: string): number {
  return Math.round((new Date(dateEcheance).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const CHECK_DEFS: { type: CheckType; label: string; icon: string; periodMonths: number }[] = [
  { type: 'CT',           label: 'Contrôle technique',   icon: '🔧', periodMonths: 24 },
  { type: 'ANTIPOLLUTION',label: 'Contrôle antipollution',icon: '💨', periodMonths: 6  },
  { type: 'HAYON',        label: 'Contrôle hayon',        icon: '🚪', periodMonths: 12 },
  { type: 'EXTINCTEUR',   label: 'Extincteur',            icon: '🧯', periodMonths: 12 },
  { type: 'TACHYGRAPHE',  label: 'Tachygraphe',           icon: '⏱️', periodMonths: 24 },
  { type: 'ASSURANCE',    label: 'Assurance',             icon: '📋', periodMonths: 12 },
  { type: 'VIGNETTE',     label: 'Vignette Crit\'Air',    icon: '🏷️', periodMonths: 60 },
];

/* ── Seed dates (basées sur la flotte réelle Tankyou) ── */
// Dates calculées à partir d'aujourd'hui pour avoir un mix ok/soon/overdue réaliste
const seedOffset: Record<string, Record<CheckType, number>> = {
  // jours depuis aujourd'hui (-=dépassé, +=futur)
  'default': { CT:-15, ANTIPOLLUTION:45, HAYON:90, EXTINCTEUR:-5, TACHYGRAPHE:180, ASSURANCE:60, VIGNETTE:400 },
};
const vehicleSeeds: Record<string, Partial<Record<CheckType, number>>> = {
  'AA-001-BB': { CT: 340, ANTIPOLLUTION: -10, HAYON: 12 },
  'BB-002-CC': { CT: -30, ANTIPOLLUTION: 25, HAYON: 90 },
  'CC-003-DD': { CT: 15, ANTIPOLLUTION: 60, EXTINCTEUR: -3 },
  'DD-004-EE': { CT: 200, ANTIPOLLUTION: 5, HAYON: -1 },
  'EE-005-FF': { CT: 90, ANTIPOLLUTION: 180, TACHYGRAPHE: -20 },
};

function buildVehicleChecks(): VehicleChecks[] {
  return demoData.vehicles.slice(0, 12).map((v, i) => {
    const seed = vehicleSeeds[v.registration] || {};
    const checks: Check[] = CHECK_DEFS.map(def => {
      const days = seed[def.type] ?? (seedOffset.default[def.type] + (i * 7 % 60) - 30);
      const echeance = new Date(today);
      echeance.setDate(echeance.getDate() + days);
      return {
        type: def.type,
        label: def.label,
        icon: def.icon,
        dateEcheance: echeance.toISOString().slice(0, 10),
        periodiciteMonths: def.periodMonths,
      };
    });
    return { immat: v.registration, nom: v.brand + ' ' + v.model, checks };
  });
}

const STATUT_CONFIG = {
  ok:      { label: 'OK',       bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  dot: '🟢' },
  soon:    { label: 'Bientôt',  bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  dot: '🟡' },
  overdue: { label: 'Dépassé',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    dot: '🔴' },
};

/* ── Component ── */
export default function EntretienPage() {
  const [filterStatut, setFilterStatut] = useState<'all' | Statut>('all');
  const [filterType, setFilterType] = useState<'all' | CheckType>('all');
  const [view, setView] = useState<'table' | 'cards'>('table');

  const allVehicles = useMemo(() => buildVehicleChecks(), []);

  // KPI globaux
  const allChecks = allVehicles.flatMap(v => v.checks);
  const nbOverdue = allChecks.filter(c => getStatut(c.dateEcheance) === 'overdue').length;
  const nbSoon    = allChecks.filter(c => getStatut(c.dateEcheance) === 'soon').length;
  const nbOk      = allChecks.filter(c => getStatut(c.dateEcheance) === 'ok').length;

  // Alertes urgentes (triées par date)
  const urgentAlerts = allVehicles.flatMap(v =>
    v.checks
      .filter(c => getStatut(c.dateEcheance) !== 'ok')
      .map(c => ({ ...c, vehicule: v.nom, immat: v.immat }))
  ).sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime());

  // Table filtrée
  const rows = allVehicles.flatMap(v =>
    v.checks
      .filter(c => filterStatut === 'all' || getStatut(c.dateEcheance) === filterStatut)
      .filter(c => filterType === 'all' || c.type === filterType)
      .map(c => ({ ...c, vehicule: v.nom, immat: v.immat, statut: getStatut(c.dateEcheance) }))
  ).sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime());

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">🔧</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi entretien</h1>
          <p className="text-sm text-gray-500">Contrôles réglementaires et maintenance de la flotte</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`rounded-xl p-5 border-2 cursor-pointer transition-all ${filterStatut === 'overdue' ? 'border-red-400 shadow-md' : 'border-red-100 hover:border-red-300'} bg-red-50`}
          onClick={() => setFilterStatut(filterStatut === 'overdue' ? 'all' : 'overdue')}
        >
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">🔴 Dépassés</p>
          <p className="text-4xl font-bold text-red-700">{nbOverdue}</p>
          <p className="text-xs text-red-400 mt-1">contrôles en retard</p>
        </div>
        <div
          className={`rounded-xl p-5 border-2 cursor-pointer transition-all ${filterStatut === 'soon' ? 'border-amber-400 shadow-md' : 'border-amber-100 hover:border-amber-300'} bg-amber-50`}
          onClick={() => setFilterStatut(filterStatut === 'soon' ? 'all' : 'soon')}
        >
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">🟡 À venir &lt;30j</p>
          <p className="text-4xl font-bold text-amber-700">{nbSoon}</p>
          <p className="text-xs text-amber-400 mt-1">contrôles dans 30 jours</p>
        </div>
        <div
          className={`rounded-xl p-5 border-2 cursor-pointer transition-all ${filterStatut === 'ok' ? 'border-green-400 shadow-md' : 'border-green-100 hover:border-green-300'} bg-green-50`}
          onClick={() => setFilterStatut(filterStatut === 'ok' ? 'all' : 'ok')}
        >
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">🟢 À jour</p>
          <p className="text-4xl font-bold text-green-700">{nbOk}</p>
          <p className="text-xs text-green-400 mt-1">contrôles conformes</p>
        </div>
      </div>

      {/* Alertes urgentes */}
      {urgentAlerts.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <span className="text-red-500 font-semibold text-sm">⚠️ Alertes urgentes ({urgentAlerts.length})</span>
          </div>
          <div className="divide-y divide-gray-50">
            {urgentAlerts.slice(0, 5).map((a, i) => {
              const s = STATUT_CONFIG[getStatut(a.dateEcheance)];
              const days = daysLeft(a.dateEcheance);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                  <span className="text-lg">{a.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{a.vehicule} <span className="text-gray-400 font-normal">({a.immat})</span></p>
                    <p className="text-xs text-gray-500">{a.label}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      {days < 0 ? `${Math.abs(days)}j dépassé` : `dans ${days}j`}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(a.dateEcheance)}</p>
                  </div>
                </div>
              );
            })}
            {urgentAlerts.length > 5 && (
              <p className="text-xs text-center text-gray-400 py-2">+ {urgentAlerts.length - 5} autres alertes</p>
            )}
          </div>
        </div>
      )}

      {/* Filtres + Vue */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'overdue', 'soon', 'ok'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterStatut === s ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s === 'all' ? 'Tous' : STATUT_CONFIG[s].label}
            </button>
          ))}
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as 'all' | CheckType)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="all">Tous les contrôles</option>
          {CHECK_DEFS.map(d => <option key={d.type} value={d.type}>{d.icon} {d.label}</option>)}
        </select>
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('table')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === 'table' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>📋 Table</button>
          <button onClick={() => setView('cards')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === 'cards' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>🚗 Véhicules</button>
        </div>
      </div>

      {/* Vue Table */}
      {view === 'table' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Véhicule</th>
                  <th className="px-5 py-3 text-left">Contrôle</th>
                  <th className="px-5 py-3 text-center">Statut</th>
                  <th className="px-5 py-3 text-center">Échéance</th>
                  <th className="px-5 py-3 text-center">Jours restants</th>
                  <th className="px-5 py-3 text-center">Périodicité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => {
                  const s = STATUT_CONFIG[r.statut];
                  const days = daysLeft(r.dateEcheance);
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{r.vehicule}</p>
                        <p className="text-xs text-gray-400">{r.immat}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">{r.icon} {r.label}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                          {s.dot} {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">{fmtDate(r.dateEcheance)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`font-semibold ${days < 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                          {days < 0 ? `−${Math.abs(days)}j` : `+${days}j`}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-gray-400 text-xs">
                        tous les {r.periodiciteMonths} mois
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="text-center text-gray-400 py-10">Aucun contrôle pour ce filtre</p>
            )}
          </div>
        </div>
      )}

      {/* Vue Véhicules */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allVehicles.map((v, i) => {
            const filtered = v.checks.filter(c => filterType === 'all' || c.type === filterType);
            const hasAlert = filtered.some(c => getStatut(c.dateEcheance) !== 'ok');
            return (
              <div key={i} className={`card border-2 ${hasAlert ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{v.nom}</p>
                    <p className="text-xs text-gray-400">{v.immat}</p>
                  </div>
                  <div className="flex gap-1">
                    {(['overdue','soon','ok'] as Statut[]).map(s => {
                      const n = filtered.filter(c => getStatut(c.dateEcheance) === s).length;
                      return n > 0 ? (
                        <span key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${STATUT_CONFIG[s].bg} ${STATUT_CONFIG[s].text}`}>{n}</span>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {filtered.map((c, j) => {
                    const s = STATUT_CONFIG[getStatut(c.dateEcheance)];
                    const days = daysLeft(c.dateEcheance);
                    return (
                      <div key={j} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${s.bg}`}>
                        <span className={`text-xs font-medium ${s.text}`}>{c.icon} {c.label}</span>
                        <span className={`text-xs font-bold ${s.text}`}>
                          {days < 0 ? `−${Math.abs(days)}j` : `+${days}j`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
