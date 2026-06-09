import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FuelTransaction, FraudAlert } from '../types';
import KpiCard from '../components/common/KpiCard';

type Period = 'week' | 'month' | 'year' | 'all' | 'custom';
type SourceFilter = 'all' | 'tankyou' | 'total';

const fmt = (n?: number, dec = 0) =>
  n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '-';
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

function getPeriodDates(period: Period, customFrom?: string, customTo?: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  if (period === 'week') { const f = new Date(now); f.setDate(now.getDate() - 7); return { from: iso(f), to: iso(now) }; }
  if (period === 'month') { const f = new Date(now); f.setMonth(now.getMonth() - 1); return { from: iso(f), to: iso(now) }; }
  if (period === 'year') { const f = new Date(now); f.setFullYear(now.getFullYear() - 1); return { from: iso(f), to: iso(now) }; }
  if (period === 'custom') return { from: customFrom, to: customTo };
  return { from: undefined, to: undefined };
}

function matchesSource(provider: string | undefined, source: SourceFilter): boolean {
  if (source === 'all') return true;
  if (!provider) return false;
  const p = provider.toLowerCase();
  if (source === 'tankyou') return p.includes('tank') || p.includes('tankyou');
  if (source === 'total') return p.includes('total');
  return false;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Annee' },
  { key: 'all', label: 'Tout' },
  { key: 'custom', label: 'Dates' },
];

const SOURCES: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'tankyou', label: 'Tank You' },
  { key: 'total', label: 'Total' },
];

export default function FuelPage() {
  const [tab, setTab] = useState<'transactions' | 'fraud'>('transactions');
  const [source, setSource] = useState<SourceFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = getPeriodDates(period, customFrom, customTo);

  const { data: kpi } = useQuery({
    queryKey: ['fuel-kpi'],
    queryFn: () => fuelApi.kpi(30),
    retry: false,
  });
  const { data: transactions = [], isLoading: loadingTx } = useQuery<FuelTransaction[]>({
    queryKey: ['fuel-transactions', from, to],
    queryFn: () => fuelApi.transactions(from, to),
    retry: false,
  });
  const { data: fraudAlerts = [], isLoading: loadingFraud } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const filtered = useMemo(
    () => transactions.filter(t => matchesSource(t.provider, source)),
    [transactions, source]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' +
                (period === p.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-3 bg-white rounded-xl shadow px-4 py-3">
          <span className="text-sm text-gray-500">Du</span>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <span className="text-sm text-gray-500">au</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Volume (30j)" value={fmt(kpi?.totalVolumeL) + ' L'} icon="⛽" color="blue" />
        <KpiCard title="Prix moyen" value={fmt(kpi?.avgPriceEur, 2) + ' EUR/L'} icon="💶" color="green" />
        <KpiCard title="Cout (30j)" value={fmt(kpi?.totalCostEur) + ' EUR'} icon="🧾" color="amber" />
        <KpiCard title="Alertes fraude" value={String(kpi?.openFraudAlerts ?? 0)} icon="⚠️" color="red" />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div className="flex gap-2">
            <button onClick={() => setTab('transactions')}
              className={'px-4 py-1.5 rounded-full text-sm font-medium ' +
                (tab === 'transactions' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              Transactions {filtered.length > 0 ? '(' + filtered.length + ')' : ''}
            </button>
            <button onClick={() => setTab('fraud')}
              className={'px-4 py-1.5 rounded-full text-sm font-medium ' +
                (tab === 'fraud' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              Alertes fraude {kpi?.openFraudAlerts ? '(' + kpi.openFraudAlerts + ')' : ''}
            </button>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {SOURCES.map(s => (
              <button key={s.key} onClick={() => setSource(s.key)}
                className={'px-3 py-1 rounded-md text-xs font-medium transition-colors ' +
                  (source === s.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'transactions' && (
          loadingTx
            ? <p className="text-gray-400 text-sm py-4 text-center">Chargement...</p>
            : filtered.length === 0
              ? <p className="text-gray-400 text-sm italic py-4 text-center">Aucune transaction pour cette periode.</p>
              : <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs uppercase border-b">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="font-medium">Vehicule</th>
                      <th className="font-medium">Fournisseur</th>
                      <th className="font-medium">Station</th>
                      <th className="font-medium">Volume</th>
                      <th className="font-medium">Prix/L</th>
                      <th className="font-medium">Total</th>
                      <th className="font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 text-gray-600">{fmtDate(t.transactedAt)}</td>
                        <td className="font-medium">{t.vehicleId ?? '-'}</td>
                        <td className="text-gray-600">{t.provider ?? '-'}</td>
                        <td className="text-gray-500">{t.stationName ?? '-'}</td>
                        <td>{fmt(t.volumeL, 1)} L</td>
                        <td>{fmt(t.unitPriceEur, 3)} EUR</td>
                        <td className="font-semibold">{fmt(t.totalEur)} EUR</td>
                        <td>
                          <span className={'px-2 py-0.5 rounded-full text-xs ' +
                            (t.fraudStatus !== 'clear' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                            {t.fraudStatus !== 'clear' ? 'Suspect' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        )}

        {tab === 'fraud' && (
          loadingFraud
            ? <p className="text-gray-400 text-sm py-4 text-center">Chargement...</p>
            : fraudAlerts.length === 0
              ? <p className="text-gray-400 text-sm italic py-4 text-center">Aucune alerte fraude detectee.</p>
              : <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs uppercase border-b">
                      <th className="pb-2 font-medium">Transaction</th>
                      <th className="font-medium">Type</th>
                      <th className="font-medium">Score</th>
                      <th className="font-medium">Description</th>
                      <th className="font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fraudAlerts.map(a => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 text-gray-500 text-xs">{a.transactionId}</td>
                        <td>{a.alertType}</td>
                        <td>
                          <span className={'px-2 py-0.5 rounded-full text-xs ' +
                            (a.riskScore >= 80 ? 'bg-red-100 text-red-700' : a.riskScore >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700')}>
                            {a.riskScore}
                          </span>
                        </td>
                        <td className="text-gray-600 text-xs max-w-xs truncate">{a.description}</td>
                        <td>
                          <span className={'px-2 py-0.5 rounded-full text-xs ' +
                            (a.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        )}
      </div>
    </div>
  );
}