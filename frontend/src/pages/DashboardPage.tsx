import { useQuery } from '@tanstack/react-query';
import { fleetApi, telemetryApi, fuelApi } from '../services/api';
import KpiCard from '../components/common/KpiCard';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Mock trend data for charts (replaced by real data once history is available)
const monthlyData = [
  { month: 'Jan', km: 18400, fuel: 1820, cost: 3200 },
  { month: 'Fév', km: 21200, fuel: 2100, cost: 3700 },
  { month: 'Mar', km: 19800, fuel: 1950, cost: 3450 },
  { month: 'Avr', km: 23100, fuel: 2280, cost: 4020 },
  { month: 'Mai', km: 22400, fuel: 2210, cost: 3890 },
  { month: 'Jui', km: 25600, fuel: 2530, cost: 4460 },
];

export default function DashboardPage() {
  const { data: fleetStats } = useQuery({ queryKey: ['fleet-stats'], queryFn: fleetApi.stats });
  const { data: telemKpi }   = useQuery({ queryKey: ['telem-kpi'], queryFn: () => telemetryApi.kpi(30) });
  const { data: fuelKpi }    = useQuery({ queryKey: ['fuel-kpi'],  queryFn: () => fuelApi.kpi(30) });

  const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '—';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-sm text-gray-500">30 derniers jours</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Véhicules actifs" value={fleetStats?.active ?? '—'}
          subtitle={`${fleetStats?.total ?? '—'} au total`} icon="🚗" color="blue" />
        <KpiCard title="Kilomètres parcourus" value={`${fmt(telemKpi?.totalKm)} km`}
          subtitle={`${fmt(telemKpi?.tripCount)} trajets`} icon="📍" color="green" />
        <KpiCard title="Consommation carburant" value={`${fmt(telemKpi?.totalFuelL)} L`}
          subtitle={`${fmt(fuelKpi?.totalCostEur)} €`} icon="⛽" color="amber" />
        <KpiCard title="Alertes fraude ouvertes" value={fuelKpi?.openFraudAlerts ?? '—'}
          icon="⚠️" color={fuelKpi?.openFraudAlerts > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="CO₂ émis" value={`${fmt(telemKpi?.totalCo2Kg)} kg`}
          icon="🌿" color="purple" />
        <KpiCard title="Score conduite moyen" value={`${fmt(telemKpi?.avgDrivingScore, 1)} / 100`}
          icon="⭐" color="blue" />
        <KpiCard title="Coût carburant" value={`${fmt(fuelKpi?.totalCostEur)} €`}
          subtitle={`Prix moy. ${fmt(fuelKpi?.avgPriceEur, 3)} €/L`} icon="💶" color="amber" />
        <KpiCard title="Transactions carburant" value={fuelKpi?.transactionCount ?? '—'}
          icon="🧾" color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Kilométrage mensuel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString('fr-FR')} km`, 'Km']} />
              <Bar dataKey="km" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Coût carburant mensuel (€)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString('fr-FR')} €`, 'Coût']} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Coût (€)" />
              <Line type="monotone" dataKey="fuel" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Volume (L)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
