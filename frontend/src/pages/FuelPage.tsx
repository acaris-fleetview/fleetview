import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Fuel, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { fuelApi } from '../api/fuelApi';
import type { FuelTransaction } from '../types/fuel';

type PeriodFilter = '7d' | '30d' | '90d' | 'all';
type SourceFilter = 'all' | 'tankyou' | 'total';

function matchesSource(provider: string | undefined, source: SourceFilter): boolean {
  if (source === 'all') return true;
  const p = (provider || '').toLowerCase();
  if (source === 'tankyou') return p.includes('tank') || p.includes('tankyou') || p.includes('tank you');
  if (source === 'total') return p.includes('total');
  return true;
}

function getPeriodDays(period: PeriodFilter): number | null {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return null;
  }
}

export default function FuelPage() {
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [activeTab, setActiveTab] = useState<'transactions' | 'fraud'>('transactions');

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['fuel-transactions'],
    queryFn: () => fuelApi.getTransactions(),
  });

  const vehicles = useMemo(() => {
    const set = new Set(transactions.map((t: FuelTransaction) => t.vehicleId || t.licensePlate || ''));
    return Array.from(set).filter(Boolean).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const days = getPeriodDays(periodFilter);
    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;

    return transactions.filter((t: FuelTransaction) => {
      if (vehicleFilter !== 'all' && t.vehicleId !== vehicleFilter && t.licensePlate !== vehicleFilter) return false;
      if (cutoff && new Date(t.date) < cutoff) return false;
      if (!matchesSource(t.provider, sourceFilter)) return false;
      return true;
    });
  }, [transactions, vehicleFilter, periodFilter, sourceFilter]);

  const fraudTransactions = useMemo(() => {
    return filteredTransactions.filter((t: FuelTransaction) => t.isFraud || t.fraudFlag);
  }, [filteredTransactions]);

  const kpis = useMemo(() => {
    const volume = filteredTransactions.reduce((sum: number, t: FuelTransaction) => sum + (t.volume || 0), 0);
    const cost = filteredTransactions.reduce((sum: number, t: FuelTransaction) => sum + (t.amount || 0), 0);
    const avgPrice = volume > 0 ? cost / volume : 0;
    return { volume, cost, avgPrice, count: filteredTransactions.length };
  }, [filteredTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Erreur lors du chargement des données carburant.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Fuel className="w-6 h-6 text-blue-600" />
          Carburant
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        {/* Row 1: Vehicle + Period */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Véhicule :</span>
            <select
              value={vehicleFilter}
              onChange={e => setVehicleFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous</option>
              {vehicles.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Période :</span>
            <div className="flex gap-1">
              {(['7d', '30d', '90d', 'all'] as PeriodFilter[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    periodFilter === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : p === '90d' ? '90 jours' : 'Tout'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Source filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Source :</span>
          <div className="flex gap-1">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                sourceFilter === 'all'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setSourceFilter('tankyou')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                sourceFilter === 'tankyou'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Tank You
            </button>
            <button
              onClick={() => setSourceFilter('total')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                sourceFilter === 'total'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Total
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500">Volume</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.volume.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} L</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Coût total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.cost.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-500">Prix moyen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.avgPrice.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/L</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-500">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.count}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Transactions ({filteredTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('fraud')}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'fraud'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Fraudes ({fraudTransactions.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'transactions' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Véhicule</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Station</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Volume (L)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Montant (€)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Prix/L (€)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">Aucune transaction</td>
                  </tr>
                ) : (
                  filteredTransactions.map((t: FuelTransaction, i: number) => (
                    <tr key={t.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{t.licensePlate || t.vehicleId || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          matchesSource(t.provider, 'tankyou') && !matchesSource(t.provider, 'total')
                            ? 'bg-emerald-100 text-emerald-700'
                            : matchesSource(t.provider, 'total') && !matchesSource(t.provider, 'tankyou')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {t.provider || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{t.station || t.location || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{(t.volume || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{(t.amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {t.volume && t.amount ? (t.amount / t.volume).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'fraud' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Véhicule</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Motif</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Montant (€)</th>
                </tr>
              </thead>
              <tbody>
                {fraudTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">Aucune fraude détectée</td>
                  </tr>
                ) : (
                  fraudTransactions.map((t: FuelTransaction, i: number) => (
                    <tr key={t.id || i} className="border-b border-gray-100 hover:bg-red-50">
                      <td className="px-4 py-2.5 text-gray-700">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{t.licensePlate || t.vehicleId || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{t.provider || '—'}</td>
                      <td className="px-4 py-2.5 text-red-600">{t.fraudReason || 'Fraude détectée'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-700">{(t.amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
