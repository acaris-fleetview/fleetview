import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { demoData } from '../services/demoData';
import { FraudAlert } from '../types';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AlertsPage() {
  const { data: apiFraud, isError: errAlerts } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts-all'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const fraudAlerts: FraudAlert[] = (errAlerts || !apiFraud?.length)
    ? (demoData.fraudAlerts as unknown as FraudAlert[])
    : apiFraud;
  const usingDemo = errAlerts || !apiFraud?.length;

  const open         = fraudAlerts.filter(a => a.status === 'open');
  const acknowledged = fraudAlerts.filter(a => a.status === 'acknowledged');
  const resolved     = fraudAlerts.filter(a => a.status === 'false_positive');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Alertes</h2>
        {usingDemo && <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">📊 Données de démonstration</span>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-600">{open.length}</p>
          <p className="text-sm text-gray-500 mt-1">Alertes ouvertes</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-amber-500">{acknowledged.length}</p>
          <p className="text-sm text-gray-500 mt-1">Reconnues</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{resolved.length}</p>
          <p className="text-sm text-gray-500 mt-1">Faux positifs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-gray-800 mb-3">{'Toutes les alertes fraude (' + fraudAlerts.length + ')'}</h3>
        {fraudAlerts.length === 0 ? (
          <p className="text-gray-400 text-sm italic">Aucune alerte fraude détectée.</p>
        ) : (
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
                    <span className={'px-2 py-0.5 rounded-full text-xs ' + (a.riskScore >= 80 ? 'bg-red-100 text-red-700' : a.riskScore >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700')}>
                      {a.riskScore}
                    </span>
                  </td>
                  <td>
                    <span className={'px-2 py-0.5 rounded-full text-xs ' + (a.status === 'open' ? 'bg-red-100 text-red-700' : a.status === 'acknowledged' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>
                      {a.status === 'open' ? 'Ouverte' : a.status === 'acknowledged' ? 'Reconnue' : 'Faux positif'}
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
