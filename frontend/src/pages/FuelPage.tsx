import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FuelTransaction, FraudAlert } from '../types';
import KpiCard from '../components/common/KpiCard';

const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '-';
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

type Period = 'week' | 'month' | 'year' | 'all' | 'custom';

function getPeriodDates(period: Period, customFrom: string, customTo: string): { from?: string; to?: string; days: number } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  if (period === 'week')   { const f = new Date(now); f.setDate(f.getDate()-7);        return { from: f.toISOString().split('T')[0], to, days: 7 }; }
  if (period === 'month')  { const f = new Date(now); f.setMonth(f.getMonth()-1);       return { from: f.toISOString().split('T')[0], to, days: 30 }; }
  if (period === 'year')   { const f = new Date(now); f.setFullYear(f.getFullYear()-1); return { from: f.toISOString().split('T')[0], to, days: 365 }; }
  if (period === 'custom') { return { from: customFrom || undefined, to: customTo || undefined, days: 0 }; }
  return { from: undefined, to: undefined, days: 0 };
}

export default function FuelPage() {
  const [tab, setTab] = useState<'transactions' | 'fraud'>('transactions');
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const { from, to, days } = useMemo(() => getPeriodDates(period, customFrom, customTo), [period, customFrom, customTo]);

  const { data: kpi } = useQuery({
    queryKey: ['fuel-kpi', days],
    queryFn: () => fuelApi.kpi(days || 9999),
    retry: false,
  });

  const { data: allTransactions = [], isLoading: loadingTx } = useQuery<FuelTransaction[]>({
    queryKey: ['fuel-transactions', from, to],
    queryFn: () => fuelApi.transactions(from, to),
    retry: false,
  });

  const { data: fraudAlerts = [], isLoading: loadingFraud } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const transactions = useMemo(() => {
    if (!vehicleFilter.trim()) return allTransactions;
    const f = vehicleFilter.trim().toLowerCase();
    return allTransactions.filter(t => (t.vehicleId || '').toLowerCase().includes(f));
  }, [allTransactions, vehicleFilter]);

  const periodLabel: Record<Period, string> = {
    week: '7j', month: '30j', year: '365j', all: 'Tout', custom: 'Perso'
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>

        <div className="flex items-center gap-2 flex-wrap">
          {(['week','month','year','all','custom'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={'px-3 py-1 rounded-full text-xs font-medium border transition-colors ' + (period === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400')}>
              {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : p === 'year' ? 'Année' : p === 'all' ? 'Tout' : 'Dates'}
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
        <KpiCard title={'Volume (' + periodLabel[period] + ')'} value={fmt(kpi?.totalVolumeL, 1) + ' L'} icon="⛽" color="blue" />
        <KpiCard title="Prix moyen" value={fmt(kpi?.avgPriceEur, 3) + ' €/L'} icon="💶" color="green" />
        <KpiCard title={'Coût (' + periodLabel[period] + ')'} value={fmt(kpi?.totalCostEur) + ' €'} icon="🧾" color="orange" />
        <KpiCard title="Alertes fraude" value={String(kpi?.openFraudAlerts ?? kpi?.fraudAlertsCount ?? 0)} icon="⚠️" color="red" />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4 border-b pb-2 flex-wrap gap-2">
          <div className="flex gap-3">
            <button onClick={() => setTab('transactions')}
              className={'px-4 py-1 rounded-full text-sm font-medium ' + (tab === 'transactions' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              Transactions ({transactions.length})
            </button>
            <button onClick={() => setTab('fraud')}
              className={'px-4 py-1 rounded-full text-sm font-medium ' + (tab === 'fraud' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              Alertes fraude
            </button>
          </div>
          {tab === 'transactions' && (
            <input type="text" placeholder="Filtrer par véhicule..." value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          )}
        </div>

        {tab === 'transactions' && (
          loadingTx ? <p className="text-gray-400 text-sm">Chargement...</p> :
          transactions.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune transaction sur cette période.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Véhicule</th>
                  <th className="pb-2 pr-4">Fournisseur</th>
                  <th className="pb-2 pr-4">Station</th>
                  <th className="pb-2 pr-4 text-right">Volume</th>
                  <th className="pb-2 pr-4 text-right">Prix/L</th>
                  <th className="pb-2 pr-4 text-right">Total</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{fmtDate(t.transactedAt)}</td>
                    <td className="pr-4 font-medium">{t.vehicleId || '-'}</td>
                    <td className="pr-4 text-gray-500">{t.provider || '-'}</td>
                    <td className="pr-4 text-gray-500">{t.stationName || '-'}</td>
                    <td className="pr-4 text-right">{fmt(Number(t.volumeL), 1)} L</td>
                    <td className="pr-4 text-right">{fmt(Number(t.unitPriceEur), 3)} €</td>
                    <td className="pr-4 text-right font-medium">{fmt(Number(t.totalEur))} €</td>
                    <td><span className={'px-2 py-0.5 rounded-full text-xs ' + (t.fraudStatus === 'clear' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{t.fraudStatus === 'clear' ? 'Normal' : 'Suspect'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'fraud' && (
          loadingFraud ? <p className="text-gray-400 text-sm">Chargement...</p> :
          fraudAlerts.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune alerte fraude détectée.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4 text-right">Score risque</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {fraudAlerts.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                    <td className="pr-4">{a.alertType}</td>
                    <td className="pr-4 text-gray-500">{a.description}</td>
                    <td className="pr-4 text-right font-medium">{a.riskScore}</td>
                    <td><span className={'px-2 py-0.5 rounded-full text-xs ' + (a.status === 'open' ? 'bg-red-100 text-red-700' : a.status === 'acknowledged' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600')}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
