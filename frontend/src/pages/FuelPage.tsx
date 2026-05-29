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
              <h2 className="text-2xl font-bold text-gray-900">Carburant</h2>h2>
        
          {hasError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                            Les données carburant ne sont pas encore disponibles (API non connectee). Les KPIs s'afficheront une fois Tankyou / Total Energies configure.
                  </div>div>
              )}
        
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <KpiCard title="Volume total (30j)" value={`${fmt(kpi?.totalVolumeL)} L`} icon="⛽" color="blue" />
                      <KpiCard title="Prix moyen" value={`${fmt(kpi?.avgPriceEur, 3)} €/L`} icon="💶" color="green" />
                      <KpiCard title="Coût total (30j)" value={`${fmt(kpi?.totalCostEur)} €`} icon="🧾" color="orange" />
                      <KpiCard title="Alertes fraude" value={String(kpi?.fraudAlertsCount ?? 0)} icon="⚠️" color="red" />
              </div>div>
        
              <div className="bg-white rounded-xl shadow p-4">
                      <div className="flex gap-4 mb-4 border-b pb-2">
                                <button onClick={() => setTab('transactions')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'transactions' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Transactions</button>button>
                                <button onClick={() => setTab('fraud')} className={`px-4 py-1 rounded-full text-sm font-medium ${tab === 'fraud' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Alertes fraude {kpi?.fraudAlertsCount ? `(${kpi.fraudAlertsCount})` : ''}</button>button>
                      </div>div>
              
                {tab === 'transactions' && (
                    loadingTx ? <p className="text-gray-400 text-sm">Chargement...</p>p> :
                    transactions.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune transaction — connectez Tankyou ou Total Energies pour voir les donnees.</p>p> :
                    <table className="w-full text-sm">
                                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Date</th>th><th>Véhicule</th>th><th>Station</th>th><th>Volume</th>th><th>Prix/L</th>th><th>Total</th>th><th>Statut</th>th></tr>tr></thead>thead>
                                <tbody>{transactions.map(t => (
                                    <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="py-2 text-gray-600">{fmtDate(t.date)}</td>td>
                                                    <td>{t.vehiclePlate}</td>td>
                                                    <td className="text-gray-600">{t.stationName}</td>td>
                                                    <td>{fmt(t.volumeL, 1)} L</td>td>
                                                    <td>{fmt(t.pricePerL, 3)} €</td>td>
                                                    <td className="font-medium">{fmt(t.totalEur)} €</td>td>
                                                    <td><span className={`px-2 py-0.5 rounded-full text-xs ${t.suspicious ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{t.suspicious ? 'Suspect' : 'OK'}</span>span></td>td>
                                    </tr>tr>
                                  ))}</tbody>tbody>
                    </table>table>
                      )}
              
                {tab === 'fraud' && (
                    loadingFraud ? <p className="text-gray-400 text-sm">Chargement...</p>p> :
                    fraudAlerts.length === 0 ? <p className="text-gray-400 text-sm italic">Aucune alerte fraude detectee.</p>p> :
                    <table className="w-full text-sm">
                                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Date</th>th><th>Véhicule</th>th><th>Type</th>th><th>Montant</th>th><th>Gravite</th>th></tr>tr></thead>thead>
                                <tbody>{fraudAlerts.map(a => (
                                    <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="py-2 text-gray-600">{fmtDate(a.date)}</td>td>
                                                    <td>{a.vehiclePlate}</td>td>
                                                    <td>{a.type}</td>td>
                                                    <td>{fmt(a.amountEur)} €</td>td>
                                                    <td><span className={`px-2 py-0.5 rounded-full text-xs ${a.severity === 'high' ? 'bg-red-100 text-red-700' : a.severity === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.severity}</span>span></td>td>
                                    </tr>tr>
                                  ))}</tbody>tbody>
                    </table>table>
                      )}
              </div>div>
        </div>div>
      );
}</div>
