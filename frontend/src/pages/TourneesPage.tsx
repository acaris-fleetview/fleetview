import { useState, useEffect } from 'react';
import KpiCard from '../components/common/KpiCard';

interface Round {
  id?: string;
  nom?: string;
  name?: string;
  depot?: number;
  pdl?: number;
  customerOrdersCount?: number;
  statut?: string;
  status?: string;
  km?: number;
  distanceKm?: number;
  kg?: number;
  weightKg?: number;
  m3?: number;
  volumeM3?: number;
}

interface NormalizedRound {
  nom: string;
  depot: number;
  pdl: number;
  statut: string;
  km: number;
  kg: number;
  m3: number;
}

function normalizeRound(r: Round): NormalizedRound {
  const statusRaw = r.statut ?? r.status ?? '';
  const statut = statusRaw === 'completed' || statusRaw === 'Terminee' || statusRaw === 'Terminée' ? 'Terminée' : 'En cours';
  return {
    nom:   r.nom ?? r.name ?? '—',
    depot: r.depot ?? 0,
    pdl:   r.pdl ?? r.customerOrdersCount ?? 0,
    statut,
    km:    r.km ?? r.distanceKm ?? 0,
    kg:    r.kg ?? r.weightKg ?? 0,
    m3:    r.m3 ?? r.volumeM3 ?? 0,
  };
}

export default function TourneesPage() {
  const [tournees, setTournees] = useState<NormalizedRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [anomaliesCount, setAnomaliesCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    setError(false);
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`/api/v1/connectors/mts1/rounds?date=${selectedDate}`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .catch(() => null),
      fetch(`/api/v1/connectors/mts1/anomalies`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ])
      .then(([rounds, anomalies]) => {
        if (Array.isArray(rounds)) {
          setTournees(rounds.map(normalizeRound));
        } else {
          setError(true);
        }
        if (Array.isArray(anomalies)) {
          setAnomaliesCount(anomalies.length);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const totalKm   = tournees.reduce((s, t) => s + t.km, 0);
  const totalPdl  = tournees.reduce((s, t) => s + t.pdl, 0);
  const enCours   = tournees.filter(t => t.statut === 'En cours').length;
  const terminees = tournees.filter(t => t.statut === 'Terminée').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🚚</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournées MTS-1</h1>
          <p className="text-sm text-gray-500">Livraisons du jour</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          {loading ? (
            <span className="text-xs text-gray-400 animate-pulse">Chargement…</span>
          ) : error ? (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">⚠ API MTS-1 indisponible</span>
          ) : tournees.length > 0 ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">● Live MTS-1</span>
          ) : null}
          <a href="https://console.mts-1.com/rounds" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors">
            Ouvrir MTS-1 ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Tournées" value={loading ? '…' : tournees.length} subtitle="ce jour" icon="🗺️" color="orange" />
        <KpiCard title="En cours" value={loading ? '…' : enCours} subtitle={`${terminees} terminée${terminees > 1 ? 's' : ''}`} icon="🔄" color="blue" />
        <KpiCard title="Points de livraison" value={loading ? '…' : totalPdl} subtitle="total du jour" icon="📦" color="green" />
        <KpiCard title="Distance totale" value={loading ? '…' : `${totalKm.toFixed(0)} km`} subtitle="journée" icon="📏" color="purple" />
      </div>

      {!loading && (error || tournees.length === 0) && (
        <div className="card p-8 text-center text-gray-400">
          {error ? (
            <>
              <p className="text-4xl mb-3">⚠️</p>
              <p className="font-medium text-gray-600">Connexion MTS-1 indisponible</p>
              <p className="text-sm mt-1">Le token API doit être renouvelé. Contactez le support MTS-1.</p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">🚚</p>
              <p className="font-medium text-gray-600">Aucune tournée pour cette date</p>
              <p className="text-sm mt-1">Sélectionnez une autre date ou vérifiez MTS-1 directement.</p>
            </>
          )}
        </div>
      )}

      {!loading && tournees.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Tournées du {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{enCours} en cours</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{terminees} terminées</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Véhicule</th>
                  <th className="px-6 py-3 text-center">Dépôts</th>
                  <th className="px-6 py-3 text-center">PDL</th>
                  <th className="px-6 py-3 text-center">Statut</th>
                  <th className="px-6 py-3 text-right">Distance</th>
                  <th className="px-6 py-3 text-right">Poids</th>
                  <th className="px-6 py-3 text-right">Cubage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tournees.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{t.nom}</td>
                    <td className="px-6 py-3 text-center text-gray-600">{t.depot}</td>
                    <td className="px-6 py-3 text-center font-semibold text-gray-800">{t.pdl}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${t.statut === 'Terminée' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {t.statut === 'Terminée' ? '✓' : '●'} {t.statut}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">{t.km.toFixed(2)} km</td>
                    <td className="px-6 py-3 text-right text-gray-600">{t.kg} kg</td>
                    <td className="px-6 py-3 text-right text-gray-600">{t.m3.toFixed(2)} m³</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-700 text-xs">
                  <td className="px-6 py-3">Total</td>
                  <td className="px-6 py-3 text-center">{tournees.reduce((s,t)=>s+t.depot,0)}</td>
                  <td className="px-6 py-3 text-center">{totalPdl}</td>
                  <td className="px-6 py-3"></td>
                  <td className="px-6 py-3 text-right">{totalKm.toFixed(2)} km</td>
                  <td className="px-6 py-3 text-right">{tournees.reduce((s,t)=>s+t.kg,0).toFixed(1)} kg</td>
                  <td className="px-6 py-3 text-right">{tournees.reduce((s,t)=>s+t.m3,0).toFixed(2)} m³</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {anomaliesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800">{anomaliesCount} anomalie{anomaliesCount > 1 ? 's' : ''} terrain non traitée{anomaliesCount > 1 ? 's' : ''}</p>
            <p className="text-sm text-amber-600 mt-0.5">
              <a href="https://console.mts-1.com/customerOrdersWarning" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800">Voir les anomalies sur MTS-1</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
