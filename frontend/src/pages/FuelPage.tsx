import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FuelTransaction, FraudAlert } from '../types';
import KpiCard from '../components/common/KpiCard';

const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '—';
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function FuelPage() {
  const [tab, setTab] = useState<'transactions'|'fraud'>('transactions');

  const { data: kpi } = useQuery({ queryKey: ['fuel-kpi'], queryFn: () => fuelApi.kpi(30) });
  const { data: transactions = [], isLoading: loadingTx } = useQuery<FuelTransaction[]>({
    queryKey: ['fuel-transactions'], queryFn: () => fuelApi.transactions()
  });
  const { data: fraudAlerts = [], isLoading: loadingFraud } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts'], queryFn: () => fuelApi.fraudAlerts()
  });

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Coût total (30j)" value={`${fmt(kpi?.totalCostEur)} €`} icon="💶" color="amber" />
        <KpiCard title="Volume total (30j)" value={`${fmt(kpi?.totalVolumeL)} L`} icon="⛽" color="blue" />
        <KpiCard title="Prix moyen" value={`${fmt(kpi?.avgPriceEur, 3)} €/L`} icon="📊" color="green" />
        <KpiCard title="Alertes fraude" value={kpi?.openFraudAlerts ?? '—'}
          icon="⚠️" color={kpi?.openFraudAlerts > 0 ? 'red' : 'green'} />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('transactions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${tab === 'transactions' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
          🧾 Transactions ({transactions.length})
        </button>
        <button onClick={() => setTab('fraud')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1
            ${tab === 'fraud' ? 'bg-red-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
          ⚠️ Alertes fraude
          {fraudAlerts.filter(a => a.status === 'open').length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {fraudAlerts.filter(a => a.status === 'open').length}
            </span>
          )}
        </button>
      </div>

      {tab === 'transactions' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Date','Véhicule','Fournisseur','Station','Volume','Montant','Statut'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingTx && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>}
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(tx.transactedAt)}</td>
                  <td className="px-4 py-3 font-mono text-blue-800 font-semibold">{tx.vehicleId?.slice(0, 8) || '—'}</td>
                  <td className="px-4 py-3"><span className="badge-gray capitalize">{tx.provider}</span></td>
                  <td className="px-4 py-3 text-gray-600">{tx.stationName || '—'}</td>
                  <td className="px-4 py-3 font-medium">{fmt(tx.volumeL, 1)} L</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{fmt(tx.totalEur, 2)} €</td>
                  <td className="px-4 py-3">
                    <span className={tx.fraudStatus === 'clear' ? 'badge-success' : tx.fraudStatus === 'suspect' ? 'badge-warning' : 'badge-danger'}>
                      {tx.fraudStatus === 'clear' ? 'Normal' : tx.fraudStatus === 'suspect' ? 'Suspect' : 'Fraude'}
                    </span>
                  </td>
                </tr>
              ))}
              {!loadingTx && transactions.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucune transaction</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'fraud' && (
        <div className="space-y-3">
          {loadingFraud && <p className="text-gray-400 text-center py-8">Chargement...</p>}
          {fraudAlerts.map(alert => (
            <div key={alert.id} className={`card border-l-4 ${alert.status === 'open' ? 'border-l-red-500' : 'border-l-gray-300'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{alert.alertType}</p>
                  <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{fmtDate(alert.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">Risque {fmt(alert.riskScore * 100, 0)}%</span>
                  <span className={alert.status === 'open' ? 'badge-danger' : alert.status === 'acknowledged' ? 'badge-warning' : 'badge-gray'}>
                    {alert.status === 'open' ? 'Ouvert' : alert.status === 'acknowledged' ? 'Reconnu' : 'Faux positif'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {!loadingFraud && fraudAlerts.length === 0 && (
            <div className="card text-center text-gray-400 py-8">✅ Aucune alerte fraude</div>
          )}
        </div>
      )}
    </div>
  );
}
