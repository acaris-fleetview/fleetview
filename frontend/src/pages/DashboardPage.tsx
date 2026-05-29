import { useQuery } from '@tanstack/react-query';
import { fleetApi, telemetryApi, fuelApi } from '../services/api';
import { demoData } from '../services/demoData';
import KpiCard from '../components/common/KpiCard';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function DashboardPage() {
  const { data: fleetStats, isError: errFleet } = useQuery({ queryKey: ['fleet-stats'], queryFn: fleetApi.stats, retry: false });
  const { data: telemKpi,   isError: errTelem } = useQuery({ queryKey: ['telem-kpi'], queryFn: () => telemetryApi.kpi(30), retry: false });
  const { data: fuelKpi,    isError: errFuel  } = useQuery({ queryKey: ['fuel-kpi'],  queryFn: () => fuelApi.kpi(30), retry: false });

  // Fallback sur données de démo si API non connectée
  const stats  = errFleet ? demoData.fleetStats  : (fleetStats ?? demoData.fleetStats);
  const telem  = errTelem ? demoData.telemKpi    : (telemKpi  ?? demoData.telemKpi);
  const fuel   = errFuel  ? demoData.kpiFuel     : (fuelKpi   ?? demoData.kpiFuel);
  const chartData = demoData.monthlyStats.map(m => ({ month: m.month, km: m.totalKm, fuel: m.totalFuelL, cost: m.totalCostEur }));

  const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '—';
  const usingDemo = errFleet || errTelem || errFuel;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-500">30 derniers jours</p>
        </div>
        {usingDemo && (
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
            📊 Données de démonstration
          </span>
        )}
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Véhicules actifs" value={stats?.active ?? '—'}
          subtitle={`${stats?.total ?? '—'} au total`} icon="🚗" color="blue" />
        <KpiCard title="Kilomètres parcourus" value={`${fmt(telem?.totalKm)} km`}
          subtitle={`${fmt(telem?.tripCount)} trajets`} icon="📍" color="green" />
        <KpiCard title="Consommation carburant" value={`${fmt(telem?.totalFuelL)} L`}
          subtitle={`${fmt(fuel?.totalCostEur)} €`} icon="⛽" color="amber" />
        <KpiCard title="Alertes fraude ouvertes" value={fuel?.openFraudAlerts ?? '—'}
          icon="⚠️" color={(fuel?.openFraudAlerts ?? 0) > 0 ? 'red' : 'green'} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="CO₂ émis" value={`${fmt(telem?.totalCo2Kg)} kg`}
          icon="🌿" color="purple" />
        <KpiCard title="Score conduite moyen" value={`${fmt(telem?.avgDrivingScore, 1)} / 100`}
          icon="⭐" color="blue" />
        <KpiCard title="Coût carburant" value={`${fmt(fuel?.totalCostEur)} €`}
          subtitle={`Prix moy. ${fmt(fuel?.avgPriceEur, 3)} €/L`} icon="💶" color="amber" />
        <KpiCard title="Transactions carburant" value={fuel?.transactionCount ?? '—'}
          icon="🧾" color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Kilométrage mensuel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
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
            <LineChart data={chartData}>
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
