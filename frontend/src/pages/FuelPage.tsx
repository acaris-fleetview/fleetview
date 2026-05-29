import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FuelTransaction, FraudAlert } from '../types';
import KpiCard from '../components/common/KpiCard';

const fmt = (n?: number, dec = 0) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: dec }) : '-';
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function FuelPage() {
  const [tab, setTab] = useState<'transactions'|'fraud'>('transactions');

  const { data: kpi, isLoading: loadingKpi, isError: errKpi } = useQuery({
    queryKey: ['fuel-kpi'],
    queryFn: () => fuelApi.kpi(30),
    retry: false,
  });
  const { data: transactions = [], isLoading: loadingTx, isError: errTx } = useQuery<FuelTransaction[]>({
    queryKey: ['fuel-transactions'],
    queryFn: () => fuelApi.transactions(),
    retry: false,
  });
  const { data: fraudAlerts = [], isLoading: loadingFraud, isError: errFraud } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const hasError = errKpi || errTx || errFraud;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>

      {hasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Les donnees carburant ne sont pas encore disponibles (API non connectee).
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Volume total (30j)" value={`${fmt(kpi?.totalVolumeL)} L`} icon="fuel" color="blue" />
        <KpiCard title="Prix moyen" value={`${fmt(kpi?.avgPriceEur, 3)} EUR/L`} icon="euro" color="green" />
        <KpiCard title="Cout total (30j)" value={`${fmt(kpi?.totalCostEur)} EUR`} icon="receipt" color="orange" />
        <KpiCard title="Alertes fraude" value={String(kpi?.fraudAlertsCount ?? 0)} icon="alert" color="red" />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex gap-4 mb-4 border-b pb-2">
          <button onClick={() => setTab('transactions')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'transactions' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Transactions</button>
          <button onClick={() => setTab('fraud')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'fraud' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Alertes fraude</button>
        </div>

        {tab === 'transactions' && (
          loadingTx ? <p className="text-gray-400 text-sm">Chargement...</p> :
          transactions.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune transaction. Connectez Tankyou ou Total Energies.</p> :
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Date</th>
                <th>Vehicule</th>
                <th>Station</th>
                <th>Volume</th>
                <th>Prix/L</th>
                <th>Total</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-600">{fmtDate(t.date)}</td>
                  <td>{t.vehiclePlate}</td>
                  <td className="text-gray-600">{t.stationName}</td>
                  <td>{fmt(t.volumeL, 1)} L</td>
                  <td>{fmt(t.pricePerL, 3)} EUR</td>
                  <td className="font-medium">{fmt(t.totalEur)} EUR</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${t.suspicious ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {t.suspicious ? 'Suspect' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'fraud' && (
          loadingFraud ? <p className="text-gray-400 text-sm">Chargement...</p> :
          fraudAlerts.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune alerte fraude.</p> :
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Date</th>
                <th>Vehicule</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Gravite</th>
              </tr>
            </thead>
            <tbody>
              {fraudAlerts.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-600">{fmtDate(a.date)}</td>
                  <td>{a.vehiclePlate}</td>
                  <td>{a.type}</td>
                  <td>{fmt(a.amountEur)} EUR</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.severity === 'high' ? 'bg-red-100 text-red-700' : a.severity === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {a.severity}
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
