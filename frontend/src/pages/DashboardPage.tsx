import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, telemetryApi, fuelApi } from '../services/api';
import KpiCard from '../components/common/KpiCard';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const monthlyData = [
  { month: 'Jan', km: 18400, fuel: 1820, cost: 3200 },
  { month: 'Fév', km: 21200, fuel: 2100, cost: 3700 },
  { month: 'Mar', km: 19800, fuel: 1950, cost: 3450 },
  { month: 'Avr', km: 23100, fuel: 2280, cost: 4020 },
  { month: 'Mai', km: 22400, fuel: 2210, cost: 3890 },
  { month: 'Jui', km: 25600, fuel: 2530, cost: 4460 },
];

const CO2_PER_LITER = 2.68;

type Period = 'week' | 'month' | '3months' | 'year' | 'all' | 'custom';

function getPeriodDays(period: Period, customFrom: string, customTo: string): { days: number; from?: string; to?: string; label: string } {
  const now = new Date();
  const toStr = now.toISOString().split('T')[0];
  if (period === 'week')    return { days: 7,    label: '7 derniers jours' };
  if (period === 'month')   return { days: 30,   label: '30 derniers jours' };
  if (period === '3months') return { days: 90,   label: '90 derniers jours' };
  if (period === 'year')    return { days: 365,  label: '365 derniers jours' };
  if (period === 'all')     return { days: 9999, label: 'Toute la période' };
  if (period === 'custom' && customFrom && customTo) {
    const diff = Math.ceil((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000);
    return { days: diff, from: customFrom, to: customTo, label: customFrom + ' → ' + customTo };
  }
  return { days: 30, label: '30 derniers jours' };
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { days, label } = useMemo(() => getPeriodDays(period, customFrom, customTo), [period, customFrom, customTo]);

  const { data: fleetStats } = useQuery({ queryKey: ['fleet-stats'], queryFn: fleetApi.stats });
  const { data: telemKpi }   = useQuery({ queryKey: ['telem-kpi', days], queryFn: () => telemetryApi.kpi(days) });
  const { data: fuelKpi }    = useQuery({ queryKey: ['fuel-kpi', days],  queryFn: () => fuelApi.kpi(days) });

  const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '—';

  const consoL = telemKpi?.totalFuelL || fuelKpi?.totalVolumeL;
  const co2Kg = telemKpi?.totalCo2Kg || (fuelKpi?.totalVolumeL ? Math.round(fuelKpi.totalVolumeL * CO2_PER_LITER) : undefined);
  const co2Source = telemKpi?.totalCo2Kg ? '' : ' (estimé)';

  const periods: { key: Period; label: string }[] = [
    { key: 'week',    label: 'Semaine' },
    { key: 'month',   label: 'Mois' },
    { key: '3months', label: '3 mois' },
    { key: 'year',    label: 'Année' },
    { key: 'all',     label: 'Tout' },
    { key: 'custom',  label: 'Dates' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={'px-3 py-1 rounded-full text-xs font-medium border transition-colors ' + (period === p.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400')}>
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-1">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs" />
              <span className="text-gray-400 text-xs">→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Véhicules actifs" value={fleetStats?.active ?? '—'}
          subtitle={String(fleetStats?.total ?? '—') + ' au total'} icon="🚗" color="blue" />
        <KpiCard title="Kilomètres parcourus" value={fmt(telemKpi?.totalKm) + ' km'}
          subtitle={fmt(telemKpi?.tripCount) + ' trajets'} icon="📍" color="green" />
        <KpiCard title="Consommation carburant" value={fmt(consoL, 1) + ' L'}
          subtitle={fmt(fuelKpi?.totalCostEur) + ' €'} icon="⛽" color="amber" />
        <KpiCard title="Alertes fraude ouvertes" value={fuelKpi?.openFraudAlerts ?? '—'}
          icon="⚠️" color={fuelKpi?.openFraudAlerts > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={'CO₂ émis' + co2Source} value={fmt(co2Kg) + ' kg'}
          subtitle="2,68 kg CO₂/L gazole (ADEME)" icon="🌿" color="purple" />
        <KpiCard title="Score conduite moyen" value={fmt(telemKpi?.avgDrivingScore, 1) + ' / 100'}
          icon="⭐" color="blue" />
        <KpiCard title="Coût carburant" value={fmt(fuelKpi?.totalCostEur) + ' €'}
          subtitle={'Prix moy. ' + fmt(fuelKpi?.avgPriceEur, 3) + ' €/L'} icon="💶" color="amber" />
        <KpiCard title="Transactions carburant" value={fuelKpi?.transactionCount ?? '—'}
          icon="🧾" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Kilométrage mensuel</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR') + ' km', 'Km']} />
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
              <Tooltip formatter={(v) => [Number(v).toLocaleString('fr-FR') + ' €', 'Coût']} />
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
