import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FuelTransaction, FraudAlert, KpiFuel } from '../types';
import KpiCard from '../components/common/KpiCard';

const fmt = (n?: number, dec = 0) =>
  n != null ? Number(n).toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '-';

const fmtDate = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

type SourceFilter = 'all' | 'tankyou' | 'total';
type PeriodFilter = '7' | '30' | '90' | 'custom';

const PERIOD_DAYS: Record<Exclude<PeriodFilter, 'custom'>, number> = {
  '7': 7,
  '30': 30,
  '90': 90,
};

export default function FuelPage() {
  const [tab, setTab] = useState<'transactions' | 'fraud'>('transactions');
  const [source, setSource] = useState<SourceFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to, kpiDays } = useMemo(() => {
    if (period === 'custom') {
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
        kpiDays: 9999,
      };
    }
    const days = PERIOD_DAYS[period];
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return { from: fromDate.toISOString(), to: undefined, kpiDays: days };
  }, [period, customFrom, customTo]);

  const provider = source === 'all' ? undefined : source;

  const {
    data: kpi,
    isError: errKpi,
  } = useQuery<KpiFuel>({
    queryKey: ['fuel-kpi', kpiDays],
    queryFn: () => fuelApi.kpi(kpiDays),
    retry: false,
  });

  const {
    data: transactions = [],
    isLoading: loadingTx,
    isError: errTx,
  } = useQuery<FuelTransaction[]>({
    queryKey: ['fuel-transactions', from, to, provider],
    queryFn: () => fuelApi.transactions(from, to, undefined, provider),
    retry: false,
  });

  const {
    data: fraudAlerts = [],
    isLoading: loadingFraud,
    isError: errFraud,
  } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const hasError = errKpi || errTx || errFraud;

  const statusBadge = (s: FuelTransaction['fraudStatus']) => {
    if (s === 'confirmed_fraud') return { cls: 'bg-red-100 text-red-700', label: 'Fraude' };
    if (s === 'suspect') return { cls: 'bg-orange-100 text-orange-700', label: 'Suspect' };
    return { cls: 'bg-green-100 text-green-700', label: 'OK' };
  };

  const riskBadge = (score: number) => {
    if (score >= 0.7) return 'bg-red-100 text-red-700';
    if (score >= 0.4) return 'bg-orange-100 text-orange-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>

      {hasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Les donnees carburant ne sont pas encore disponibles (API non connectee).
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <div className="flex gap-1">
            {([
              ['all', 'Tous'],
              ['tankyou', 'Tank You'],
              ['total', 'Total'],
            ] as [SourceFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSource(val)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  source === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Periode</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as PeriodFilter)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="custom">Personnalisee</option>
          </select>
        </div>

        {period === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Volume total" value={`${fmt(kpi?.totalVolumeL)} L`} icon="⛽" color="blue" />
        <KpiCard title="Prix moyen" value={`${fmt(kpi?.avgPriceEur, 3)} €/L`} icon="💶" color="green" />
        <KpiCard title="Cout total" value={`${fmt(kpi?.totalCostEur)} €`} icon="🧾" color="orange" />
        <KpiCard title="Alertes fraude" value={String(kpi?.openFraudAlerts ?? 0)} icon="⚠️" color="red" />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex gap-4 mb-4 border-b pb-2">
          <button
            onClick={() => setTab('transactions')}
            className={`px-4 py-1 rounded-full text-sm font-medium ${
              tab === 'transactions' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setTab('fraud')}
            className={`px-4 py-1 rounded-full text-sm font-medium ${
              tab === 'fraud' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Alertes fraude {kpi?.openFraudAlerts ? `(${kpi.openFraudAlerts})` : ''}
          </button>
        </div>

        {tab === 'transactions' &&
          (loadingTx ? (
            <p className="text-gray-400 text-sm">Chargement...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-400 text-sm italic">
              Aucune transaction.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Date</th>
                  <th>Source</th>
                  <th>Station</th>
                  <th>Volume</th>
                  <th>Prix/L</th>
                  <th>Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const badge = statusBadge(t.fraudStatus);
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 text-gray-600">{fmtDate(t.transactedAt)}</td>
                      <td className="capitalize">{t.provider}</td>
                      <td className="text-gray-600">{t.stationName ?? '-'}</td>
                      <td>{fmt(t.volumeL, 1)} L</td>
                      <td>{fmt(t.unitPriceEur, 3)} €</td>
                      <td className="font-medium">{fmt(t.totalEur, 2)} €</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}

        {tab === 'fraud' &&
          (loadingFraud ? (
            <p className="text-gray-400 text-sm">Chargement...</p>
          ) : fraudAlerts.length === 0 ? (
            <p className="text-gray-400 text-sm italic">Aucune alerte fraude detectee.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Score</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {fraudAlerts.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 text-gray-600">{fmtDate(a.createdAt)}</td>
                    <td>{a.alertType}</td>
                    <td className="text-gray-600">{a.description}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${riskBadge(a.riskScore)}`}>
                        {fmt(a.riskScore * 100)}%
                      </span>
                    </td>
                    <td className="capitalize">{a.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>
    </div>
  );
}
