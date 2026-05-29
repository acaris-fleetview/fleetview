import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { demoData } from '../services/demoData';
import { FuelTransaction, FraudAlert } from '../types';
import KpiCard from '../components/common/KpiCard';

const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '-';
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function FuelPage() {
  const [tab, setTab] = useState<'transactions'|'fraud'>('transactions');

  const { data: kpi,          isError: errKpi   } = useQuery({ queryKey: ['fuel-kpi'],    queryFn: () => fuelApi.kpi(30),       retry: false });
  const { data: apiTx,        isError: errTx    } = useQuery({ queryKey: ['fuel-tx'],     queryFn: fuelApi.transactions,        retry: false });
  const { data: apiFraud,     isError: errFraud } = useQuery({ queryKey: ['fraud-alerts'], queryFn: fuelApi.fraudAlerts,        retry: false });

  const kpiData   = errKpi   ? demoData.kpiFuel                                      : (kpi   ?? demoData.kpiFuel);
  const transactions: FuelTransaction[] = (errTx    || !apiTx?.length)    ? (demoData.fuelTransactions as unknown as FuelTransaction[]) : apiTx;
  const fraudAlerts: FraudAlert[]       = (errFraud || !apiFraud?.length)  ? (demoData.fraudAlerts      as unknown as FraudAlert[])      : apiFraud;
  const usingDemo = errKpi || errTx || errFraud;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>
        {usingDemo && <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">📊 Données de démonstration</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Volume total (30j)" value={`${fmt(kpiData?.totalVolumeL)} L`} icon="fuel" color="blue" />
        <KpiCard title="Prix moyen" value={`${fmt(kpiData?.avgPriceEur, 3)} €/L`} icon="euro" color="green" />
        <KpiCard title="Coût total (30j)" value={`${fmt(kpiData?.totalCostEur)} €`} icon="receipt" color="orange" />
        <KpiCard title="Alertes fraude" value={String(kpiData?.openFraudAlerts ?? 0)} icon="alert" color="red" />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex gap-4 mb-4 border-b pb-2">
          <button onClick={() => setTab('transactions')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab==='transactions' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            Transactions ({transactions.length})
          </button>
          <button onClick={() => setTab('fraud')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab==='fraud' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            Alertes fraude ({fraudAlerts.length})
          </button>
        </div>

        {tab === 'transactions' && (
          transactions.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune transaction.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pr-4">Véhicule</th>
                  <th className="pr-4">Station</th>
                  <th className="pr-4">Volume</th>
                  <th className="pr-4">Prix/L</th>
                  <th className="pr-4">Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{fmtDate(t.transactedAt)}</td>
                    <td className="pr-4 font-mono text-xs">{t.vehicleId || '-'}</td>
                    <td className="pr-4 text-gray-600 text-xs">{t.stationName || '-'}</td>
                    <td className="pr-4">{fmt(t.volumeL, 1)} L</td>
                    <td className="pr-4">{fmt(t.unitPriceEur, 3)} €</td>
                    <td className="pr-4 font-medium">{fmt(t.totalEur)} €</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${t.fraudStatus !== 'clear' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {t.fraudStatus !== 'clear' ? 'Suspect' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length > 50 && <p className="text-xs text-gray-400 mt-2 text-center">Affichage des 50 premières sur {transactions.length} transactions</p>}
          </div>
        )}

        {tab === 'fraud' && (
          fraudAlerts.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune alerte fraude.</p> :
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b text-xs uppercase">
                <th className="pb-2 pr-4">Date</th>
                <th className="pr-4">Type</th>
                <th className="pr-4">Description</th>
                <th className="pr-4">Score risque</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {fraudAlerts.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                  <td className="pr-4 text-xs">{a.alertType}</td>
                  <td className="pr-4 text-gray-600 text-xs max-w-xs truncate">{a.description}</td>
                  <td className="pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.riskScore >= 80 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{a.riskScore}</span>
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.status === 'open' ? 'Ouverte' : 'Reconnue'}
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
