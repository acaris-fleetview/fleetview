import { useQuery } from '@tanstack/react-query';
import { fuelApi } from '../services/api';

export default function AlertsPage() {
  const { data: fraudAlerts = [] } = useQuery({
    queryKey: ['fraud-alerts-all'], queryFn: () => fuelApi.fraudAlerts()
  });

  const open = fraudAlerts.filter((a: any) => a.status === 'open');

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Alertes</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-600">{open.length}</p>
          <p className="text-sm text-gray-500 mt-1">Alertes ouvertes</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-amber-500">{fraudAlerts.filter((a:any) => a.status === 'acknowledged').length}</p>
          <p className="text-sm text-gray-500 mt-1">Reconnues</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{fraudAlerts.filter((a:any) => a.status === 'false_positive').length}</p>
          <p className="text-sm text-gray-500 mt-1">Faux positifs</p>
        </div>
      </div>
      <div className="space-y-3">
        {open.length === 0 && (
          <div className="card text-center py-12 text-gray-400">✅ Aucune alerte ouverte</div>
        )}
        {fraudAlerts.map((a: any) => (
          <div key={a.id} className={`card border-l-4 ${a.status === 'open' ? 'border-l-red-500' : 'border-l-gray-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">⚠️ {a.alertType}</p>
                <p className="text-sm text-gray-600 mt-0.5">{a.description}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <span className={a.status === 'open' ? 'badge-danger' : a.status === 'acknowledged' ? 'badge-warning' : 'badge-gray'}>
                {a.status === 'open' ? 'Ouvert' : a.status === 'acknowledged' ? 'Reconnu' : 'Faux positif'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
