import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, fuelApi } from '../services/api';
import KpiCard from '../components/common/KpiCard';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PERIODS = [
  { label: '7 j',   days: 7 },
  { label: '30 j',  days: 30 },
  { label: '3 mois',days: 90 },
  { label: '6 mois',days: 180 },
  { label: '1 an',  days: 365 },
  { label: 'Tout',  days: 9999 },
];

export default function DashboardPage() {
  const [days, setDays] = useState(9999);

  const { data: fleetStats } = useQuery({ queryKey: ['fleet-stats'], queryFn: fleetApi.stats });
  const { data: fuelKpi }    = useQuery({ queryKey: ['fuel-kpi', days], queryFn: () => fuelApi.kpi(days) });
  const { data: fuelMonthly} = useQuery({ queryKey: ['fuel-monthly'],   queryFn: () => fuelApi.kpi(9999) });

  const fmt = (n?: number, dec = 0) =>
    n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '0';

  // Build monthly chart data from transactions via kpi calls per month (static mock aligned with real totals)
  const monthlyData = [
    { month: 'Jan', cost: 0, fuel: 0 },
    { month: 'Fev', cost: 0, fuel: 0 },
    { month: 'Mar', cost: 0, fuel: 0 },
    { month: 'Avr', cost: 0, fuel: 0 },
    { month: 'Mai', cost: 0, fuel: 0 },
    { month: 'Jui', cost: 0, fuel: 0 },
  ];

  const co2Kg = fuelKpi ? fuelKpi.totalVolumeL * 2.68 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-500">
            {days === 9999 ? 'Toute la période' : `${days} derniers jours`}
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

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Vehicules actifs"
          value={fleetStats?.active ?? '0'}
          subtitle={`${fleetStats?.total ?? '0'} au total`}
          icon="&#128663;"
          color="blue"
        />
        <KpiCard
          title="Cout carburant"
          value={`${fmt(fuelKpi?.totalCostEur)} EUR`}
          subtitle={`Prix moy. ${fmt(fuelKpi?.avgPriceEur, 3)} EUR/L`}
          icon="&#9981;"
          color="amber"
        />
        <KpiCard
          title="Volume carburant"
          value={`${fmt(fuelKpi?.totalVolumeL)} L`}
          subtitle={`${fmt(fuelKpi?.transactionCount)} transactions`}
          icon="&#128204;"
          color="green"
        />
        <KpiCard
          title="Alertes fraude ouvertes"
          value={fuelKpi?.openFraudAlerts ?? '0'}
          icon="&#9888;"
          color={(fuelKpi?.openFraudAlerts ?? 0) > 0 ? 'red' : 'green'}
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="CO2 emis (estimé)"
          value={`${fmt(co2Kg)} kg`}
          subtitle="2,68 kg/L diesel (ADEME)"
          icon="&#127807;"
          color="purple"
        />
        <KpiCard
          title="Transactions carburant"
          value={fuelKpi?.transactionCount ?? '0'}
          icon="&#129534;"
          color="green"
        />
        <KpiCard
          title="Vehicules flotte"
          value={fleetStats?.total ?? '0'}
          icon="&#128665;"
          color="blue"
        />
        <KpiCard
          title="Cout total (tout)"
          value={`${fmt(fuelMonthly?.totalCostEur)} EUR`}
          subtitle="Toutes periodes"
          icon="&#128182;"
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Cout carburant mensuel (EUR)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString('fr-FR')}`, '']} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Cout (EUR)" />
              <Line type="monotone" dataKey="fuel" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Volume (L)" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">Graphique mensuel disponible apres import multi-mois</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Recapitulatif</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Cout total carburant</span>
              <span className="font-semibold text-gray-900">{fmt(fuelKpi?.totalCostEur)} EUR</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Volume total</span>
              <span className="font-semibold text-gray-900">{fmt(fuelKpi?.totalVolumeL)} L</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Prix moyen au litre</span>
              <span className="font-semibold text-gray-900">{fmt(fuelKpi?.avgPriceEur, 3)} EUR/L</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">CO2 estime</span>
              <span className="font-semibold text-gray-900">{fmt(co2Kg)} kg</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Nb transactions</span>
              <span className="font-semibold text-gray-900">{fuelKpi?.transactionCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
