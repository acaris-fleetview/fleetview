import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';
import { FraudAlert } from '../types';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmt = (n?: number) => n != null ? n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-';

export default function AlertsPage() {
  const { data: fraudAlerts = [], isLoading, isError: errAlerts } = useQuery<FraudAlert[]>({
    queryKey: ['fraud-alerts-all'],
    queryFn: () => fuelApi.fraudAlerts(),
    retry: false,
  });

  const open = fraudAlerts.filter((a: any) => a.status === 'open');
  const acknowledged = fraudAlerts.filter((a: any) => a.status === 'acknowledged');
  const closed = fraudAlerts.filter((a: any) => a.status === 'closed');

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
          <p className="text-3xl font-bold text-green-600">{closed.length}</p>
          <p className="text-sm text-gray-500 mt-1">Resolues</p>
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
                <th>Vehicule</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Gravite</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {fraudAlerts.map((a: any) => (
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
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'open' ? 'bg-red-100 text-red-700' : a.status === 'acknowledged' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {a.status === 'open' ? 'Ouverte' : a.status === 'acknowledged' ? 'Reconnue' : 'Resolue'}
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
