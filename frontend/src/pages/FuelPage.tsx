import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FuelTransaction, FraudAlert } from '../types';
import KpiCard from '../components/common/KpiCard';

type Period = 'week' | 'month' | 'year' | 'all' | 'custom';
type SourceFilter = 'all' | 'tankyou' | 'total';

const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '-';
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function getPeriodDates(period: Period, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (period === 'week') {
    const from = new Date(now); from.setDate(now.getDate() - 7);
    return { from: iso(from), to: iso(now) };
  }
  if (period === 'month') {
    const from = new Date(now); from.setMonth(now.getMonth() - 1);
    return { from: iso(from), to: iso(now) };
  }
  if (period === 'year') {
    const from = new Date(now); from.setFullYear(now.getFullYear() - 1);
    return { from: iso(from), to: iso(now) };
  }
  if (period === 'custom') return { from: customFrom, to: customTo };
  return {};
}

function matchesSource(provider: string | undefined, source: SourceFilter): boolean {
  if (source === 'all') return true;
  if (!provider) return false;
  const p = provider.toLowerCase();
  if (source === 'tankyou') return p.includes('tank') || p.includes('tankyou');
  if (source === 'total') return p.includes('total');
  return false;
}

export default function FuelPage() {
  const [tab, setTab] = useState<'transactions'|'fraud'>('transactions');
  const [source, setSource] = useState<SourceFilter>('all');
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = getPeriodDates(period, customFrom, customTo);

  const { data: kpi, isLoading: loadingKpi, isError: errKpi } = useQuery({
    queryKey: ['fuel-kpi'],
    queryFn: () => fuelApi.kpi(30),
    retry: false,
  });
  const { data: transactions = [], isLoading: loadingTx, isError: errTx } = useQuery<FuelTransaction[]>({
    queryKey: ['fuel-transactions', from, to],
    queryFn: () => fuelApi.transactions(from, to),
    retry: false,
  });
  const { data: fraudAlerts = [], isLoading: loadingFraud, isError: errFraud } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const filteredTransactions = useMemo(() =>
    transactions.filter(t => matchesSource(t.provider, source)),
    [transactions, source]
  );

  const hasError = errKpi || errTx || errFraud;

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week', label: 'Semaine' },
    { key: 'month', label: 'Mois' },
    { key: 'year', label: 'Année' },
    { key: 'all', label: 'Tout' },
    { key: 'custom', label: 'Personnalisé' },
  ];

  const SOURCES: { key: SourceFilter; label: string }[] = [
    { key: 'all', label: 'Toutes sources' },
    { key: 'tankyou', label: 'Tank You' },
    { key: 'total', label: 'Total' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>

      {hasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Les données carburant ne sont pas encore disponibles (API non connectée). Les KPIs s'afficheront une fois Tankyou / Total Energies configuré.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Volume total (30j)" value={`${fmt(kpi?.totalVolumeL)} L`} icon="⛽" color="blue" />
        <KpiCard title="Prix moyen" value={`${fmt(kpi?.avgPriceEur, 3)} €/L`} icon="💶" color="green" />
        <KpiCard title="Coût total (30j)" value={`${fmt(kpi?.totalCostEur)} €`} icon="🧾" color="orange" />
        <KpiCard title="Alertes fraude" value={String(kpi?.openFraudAlerts ?? 0)} icon="⚠️" color="red" />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 w-20">Source</span>
          {SOURCES.map(s => (
            <button
              key={s.key}
              onClick={() => setSource(s.key)}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${source === s.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 w-20">Période</span>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${period === p.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pl-24">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Du</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Au</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex gap-4 mb-4 border-b pb-2">
          <button onClick={() => setTab('transactions')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'transactions' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            Transactions {filteredTransactions.length > 0 ? `(${filteredTransactions.length})` : ''}
          </button>
          <button onClick={() => setTab('fraud')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'fraud' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            Alertes fraude {kpi?.openFraudAlerts ? `(${kpi.openFraudAlerts})` : ''}
          </button>
        </div>

        {tab === 'transactions' && (
          loadingTx ? <p className="text-gray-400 text-sm">Chargement...</p> :
          filteredTransactions.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune transaction — connectez Tankyou ou Total Energies pour voir les données.</p> :
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Date</th><th>Véhicule</th><th>Station</th><th>Volume</th><th>Prix/L</th><th>Total</th><th>Source</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-600">{fmtDate(t.transactedAt)}</td>
                  <td>{t.vehicleId ?? '-'}</td>
                  <td className="text-gray-600">{t.stationName ?? '-'}</td>
                  <td>{fmt(t.volumeL, 1)} L</td>
                  <td>{fmt(t.unitPriceEur, 3)} €</td>
                  <td className="font-medium">{fmt(t.totalEur)} €</td>
                  <td className="text-gray-500 text-xs">{t.provider ?? '-'}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${t.fraudStatus !== 'clear' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{t.fraudStatus !== 'clear' ? 'Suspect' : 'OK'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'fraud' && (
          loadingFraud ? <p className="text-gray-400 text-sm">Chargement...</p> :
          fraudAlerts.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune alerte fraude détectée.</p> :
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Transaction</th><th>Type</th><th>Score</th><th>Description</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {fraudAlerts.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-600 text-xs">{a.transactionId}</td>
                  <td>{a.alertType}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${a.riskScore >= 80 ? 'bg-red-100 text-red-700' : a.riskScore >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.riskScore}</span></td>
                  <td className="text-gray-600 text-xs max-w-xs truncate">{a.description}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}