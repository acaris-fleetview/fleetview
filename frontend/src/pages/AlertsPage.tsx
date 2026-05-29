import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FraudAlert } from '../types';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AlertsPage() {
  const { data: fraudAlerts = [], isLoading, isError: errAlerts } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts-all'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const open = fraudAlerts.filter(a => a.status === 'open');
  const acknowledged = fraudAlerts.filter(a => a.status === 'acknowledged');
  const resolved = fraudAlerts.filter(a => a.status === 'false_positive');

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Alertes</h2>

      {errAlerts && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
          Alertes non disponibles — connectez les APIs carburant pour voir les alertes fraude.
        </div>
      )}

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
        <h3 className="font-semibold text-gray-800 mb-3">Toutes les alertes fraude</h3>
        {isLoading ? (
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
                <th>Score risque</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {fraudAlerts.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-600">{fmtDate(a.createdAt)}</td>
                  <td>{a.alertType}</td>
                  <td className="text-gray-600 text-xs max-w-xs truncate">{a.description}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.riskScore >= 80 ? 'bg-red-100 text-red-700' : a.riskScore >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {a.riskScore}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'open' ? 'bg-red-100 text-red-700' : a.status === 'acknowledged' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
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
