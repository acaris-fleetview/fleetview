import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fleetApi, telemetryApi, fuelApi } from '../services/api';
import { demoData } from '../services/demoData';
import KpiCard from '../components/common/KpiCard';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

type Period = '7j' | '30j' | '3m' | '6m' | '1an' | 'total';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7j',    label: '7 jours' },
  { key: '30j',   label: '30 jours' },
  { key: '3m',    label: '3 mois' },
  { key: '6m',    label: '6 mois' },
  { key: '1an',   label: '1 an' },
  { key: 'total', label: 'Total' },
];

/** Retourne le nombre de mois à afficher selon la période */
function monthsForPeriod(p: Period): number {
  switch (p) {
    case '7j':  return 1;
    case '30j': return 1;
    case '3m':  return 3;
    case '6m':  return 6;
    case '1an': return 12;
    case 'total': return 999;
  }
}

/** Fraction de mois pour les périodes <30j */
function dayFraction(p: Period): number {
  if (p === '7j')  return 7 / 30;
  if (p === '30j') return 1;
  return 1;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30j');

  // ---- API calls (days param pour l'API) ----
  const apiDays = period === '7j' ? 7 : period === '30j' ? 30 : period === '3m' ? 90 : period === '6m' ? 180 : period === '1an' ? 365 : 3650;

  const { data: fleetStats, isError: errFleet } = useQuery({ queryKey: ['fleet-stats'], queryFn: fleetApi.stats, retry: false });
  const { data: telemKpi,   isError: errTelem } = useQuery({ queryKey: ['telem-kpi', apiDays], queryFn: () => telemetryApi.kpi(apiDays), retry: false });
  const { data: fuelKpi,    isError: errFuel  } = useQuery({ queryKey: ['fuel-kpi',  apiDays], queryFn: () => fuelApi.kpi(apiDays), retry: false });

  const stats = errFleet ? demoData.fleetStats : (fleetStats ?? demoData.fleetStats);

  // ---- Filtrage des données mensuelles selon période ----
  const filteredMonths = useMemo(() => {
    const all = [...demoData.monthlyStats]; // already sorted oldest→newest in file? sort just in case
    const sorted = all.slice().sort((a, b) => a.month.localeCompare(b.month));
    const n = monthsForPeriod(period);
    return sorted.slice(-Math.min(n, sorted.length));
  }, [period]);

  // ---- KPIs agrégés depuis données réelles filtrées ----
  const computedKpi = useMemo(() => {
    const frac = dayFraction(period);
    if (filteredMonths.length === 0) return demoData.telemKpi;
    if (filteredMonths.length === 1 && frac < 1) {
      const m = filteredMonths[0];
      return {
        totalKm:        Math.round(m.totalKm * frac),
        tripCount:      Math.round(m.tripCount * frac),
        totalFuelL:     Math.round(m.totalFuelL * frac * 10) / 10,
        totalCo2Kg:     Math.round(m.totalCo2Kg * frac),
        avgDrivingScore: m.avgDrivingScore,
      };
    }
    return {
      totalKm:        filteredMonths.reduce((s, m) => s + m.totalKm, 0),
      tripCount:      filteredMonths.reduce((s, m) => s + m.tripCount, 0),
      totalFuelL:     Math.round(filteredMonths.reduce((s, m) => s + m.totalFuelL, 0) * 10) / 10,
      totalCo2Kg:     filteredMonths.reduce((s, m) => s + m.totalCo2Kg, 0),
      avgDrivingScore: Math.round(filteredMonths.reduce((s, m) => s + m.avgDrivingScore, 0) / filteredMonths.length),
    };
  }, [filteredMonths, period]);

  const computedFuel = useMemo(() => {
    const frac = dayFraction(period);
    if (filteredMonths.length === 0) return demoData.kpiFuel;
    if (filteredMonths.length === 1 && frac < 1) {
      const m = filteredMonths[0];
      return {
        totalCostEur:     Math.round(m.totalCostEur * frac * 100) / 100,
        totalVolumeL:     Math.round(m.totalFuelL * frac * 10) / 10,
        transactionCount: Math.round(m.tripCount * frac),
        avgPriceEur:      demoData.kpiFuel.avgPriceEur,
        openFraudAlerts:  demoData.kpiFuel.openFraudAlerts,
      };
    }
    const totalCost = filteredMonths.reduce((s, m) => s + m.totalCostEur, 0);
    const totalVol  = filteredMonths.reduce((s, m) => s + m.totalFuelL, 0);
    return {
      totalCostEur:     Math.round(totalCost * 100) / 100,
      totalVolumeL:     Math.round(totalVol * 10) / 10,
      transactionCount: filteredMonths.reduce((s, m) => s + m.tripCount, 0),
      avgPriceEur:      totalVol > 0 ? Math.round((totalCost / totalVol) * 1000) / 1000 : demoData.kpiFuel.avgPriceEur,
      openFraudAlerts:  demoData.kpiFuel.openFraudAlerts,
    };
  }, [filteredMonths, period]);

  const telem = errTelem ? computedKpi : (telemKpi ?? computedKpi);
  const fuel  = errFuel  ? computedFuel : (fuelKpi  ?? computedFuel);

  const chartData = filteredMonths.map(m => ({ month: m.month, km: m.totalKm, fuel: m.totalFuelL, cost: m.totalCostEur }));

  const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '—';
  const usingDemo = errFleet || errTelem || errFuel;

  return (
    <div className="p-6 space-y-6">
      {/* Header + sélecteur de période */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-500">
            {PERIODS.find(p => p.key === period)?.label}
            {period === '7j' && ' — 7 derniers jours'}
            {period === '30j' && ' — 30 derniers jours'}
            {period === '3m' && ' — 3 derniers mois'}
            {period === '6m' && ' — 6 derniers mois'}
            {period === '1an' && ' — 12 derniers mois'}
            {period === 'total' && ' — toutes les données disponibles'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {usingDemo && (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
              📊 Données réelles Tankyou
            </span>
          )}
          {/* Boutons de période */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === p.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
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
          <h3 className="font-semibold text-gray-800 mb-4">Kilométrage — {PERIODS.find(p => p.key === period)?.label}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString('fr-FR')} km`, 'Km']} />
              <Bar dataKey="km" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Carburant — {PERIODS.find(p => p.key === period)?.label}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => [
                name === 'Coût (€)' ? `${Number(v).toLocaleString('fr-FR')} €` : `${Number(v).toLocaleString('fr-FR')} L`,
                name
              ]} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Coût (€)" />
              <Line type="monotone" dataKey="fuel" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Volume (L)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
