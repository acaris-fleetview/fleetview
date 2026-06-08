import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, fuelApi } from '../services/api';
import KpiCard from '../components/common/KpiCard';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PERIODS = [
  { label: '7 j',    days: 7 },
  { label: '30 j',   days: 30 },
  { label: '3 mois', days: 90 },
  { label: '6 mois', days: 180 },
  { label: '1 an',   days: 365 },
  { label: 'Tout',   days: 9999 },
];

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Aout',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

interface FuelTx {
  transactedAt: string;
  totalEur: string;
  volumeL: string;
}

export default function DashboardPage() {
  const [days, setDays] = useState(9999);

  const { data: fleetStats } = useQuery({ queryKey: ['fleet-stats'], queryFn: fleetApi.stats });
  const { data: fuelKpi }    = useQuery({ queryKey: ['fuel-kpi', days], queryFn: () => fuelApi.kpi(days) });

  // Fetch ALL transactions for monthly chart (limit 200 is enough for 1 year)
  const { data: allTxs }  = useQuery<FuelTx[]>({
    queryKey: ['fuel-txs-all'],
    queryFn: () => fuelApi.transactions(),
    staleTime: 5 * 60_000,
  });

  // MTS-1 KM — try the endpoint, silently fail if not ready
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: mts1Km } = useQuery<{ totalKm: number; roundCount: number }>({
    queryKey: ['mts1-km', currentMonth],
    queryFn: () =>
      fetch(`/api/v1/connectors/mts1/km?month=${currentMonth}`, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('access_token') },
      }).then(r => { if (!r.ok) throw new Error('not ready'); return r.json(); }),
    staleTime: 10 * 60_000,
    retry: false,
  });

  // Build monthly chart data from real transactions
  const monthlyData = useMemo(() => {
    if (!allTxs?.length) return [];
    const byMonth: Record<string, { cost: number; volume: number; count: number }> = {};
    for (const tx of allTxs) {
      const m = tx.transactedAt?.slice(0, 7);
      if (!m) continue;
      if (!byMonth[m]) byMonth[m] = { cost: 0, volume: 0, count: 0 };
      byMonth[m].cost   += parseFloat(tx.totalEur   || '0');
      byMonth[m].volume += parseFloat(tx.volumeL    || '0');
      byMonth[m].count++;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month: MONTH_LABELS[month.slice(5, 7)] || month.slice(5, 7),
        cost:   Math.round(d.cost),
        volume: Math.round(d.volume),
        count:  d.count,
      }));
  }, [allTxs]);

  const fmt = (n?: number, dec = 0) =>
    n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '0';

  const co2Kg = fuelKpi ? fuelKpi.totalVolumeL * 2.68 : 0;
  const totalKm = mts1Km?.totalKm ?? null;
  const roundCount = mts1Km?.roundCount ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-500">
            {days === 9999 ? 'Toute la periode' : `${days} derniers jours`}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === p.days
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row — 4 cartes distinctes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Cout carburant"
          value={`${fmt(fuelKpi?.totalCostEur)} EUR`}
          subtitle={`Prix moy. ${fmt(fuelKpi?.avgPriceEur, 3)} EUR/L`}
          icon="&#9981;"
          color="amber"
        />
        <KpiCard
          title="Volume consomme"
          value={`${fmt(fuelKpi?.totalVolumeL)} L`}
          subtitle={`${fuelKpi?.transactionCount ?? 0} transactions`}
          icon="&#128204;"
          color="green"
        />
        <KpiCard
          title="KM parcourus (mois)"
          value={totalKm !== null ? `${fmt(totalKm)} km` : '— km'}
          subtitle={totalKm !== null ? `${roundCount} tournees MTS-1` : 'En attente Railway...'}
          icon="&#128665;"
          color="blue"
        />
        <KpiCard
          title="CO2 emis (estime)"
          value={`${fmt(co2Kg)} kg`}
          subtitle="2,68 kg/L diesel (ADEME)"
          icon="&#127807;"
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique cout mensuel réel */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Cout carburant mensuel (EUR)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString('fr-FR')} EUR`, 'Cout']}
                />
                <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cout (EUR)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              Chargement...
            </div>
          )}
        </div>

        {/* Graphique volume mensuel réel */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Volume carburant mensuel (L)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString('fr-FR')} L`, 'Volume']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Volume (L)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              Chargement...
            </div>
          )}
        </div>
      </div>

      {/* Recapitulatif */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Recapitulatif par mois</h3>
        {monthlyData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Mois</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Cout (EUR)</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Volume (L)</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Transactions</th>
                  <th className="text-right py-2 text-gray-500 font-medium">CO2 (kg)</th>
                </tr>
              </thead>
              <tbody>
                {[...monthlyData].reverse().map(row => (
                  <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800">{row.month}</td>
                    <td className="py-2 text-right text-gray-900">{row.cost.toLocaleString('fr-FR')} EUR</td>
                    <td className="py-2 text-right text-gray-700">{row.volume.toLocaleString('fr-FR')} L</td>
                    <td className="py-2 text-right text-gray-500">{row.count}</td>
                    <td className="py-2 text-right text-green-700">{Math.round(row.volume * 2.68).toLocaleString('fr-FR')} kg</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td className="py-2 text-gray-800">Total</td>
                  <td className="py-2 text-right text-amber-700">
                    {monthlyData.reduce((s, r) => s + r.cost, 0).toLocaleString('fr-FR')} EUR
                  </td>
                  <td className="py-2 text-right text-blue-700">
                    {monthlyData.reduce((s, r) => s + r.volume, 0).toLocaleString('fr-FR')} L
                  </td>
                  <td className="py-2 text-right text-gray-500">
                    {monthlyData.reduce((s, r) => s + r.count, 0)}
                  </td>
                  <td className="py-2 text-right text-green-700">
                    {Math.round(monthlyData.reduce((s, r) => s + r.volume, 0) * 2.68).toLocaleString('fr-FR')} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Chargement des donnees...</p>
        )}
      </div>
    </div>
  );
}
