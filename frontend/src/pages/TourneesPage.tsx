import KpiCard from '../components/common/KpiCard';

const TOURNEES = [
  { nom: 'ARGENTEUIL',     depot: 2, pdl: 11, statut: 'En cours',  km: 0.06,   kg: 6,    m3: 4.78  },
  { nom: 'CAMION SIT 491', depot: 2, pdl: 7,  statut: 'En cours',  km: 37.68,  kg: 5,    m3: 5.83  },
  { nom: 'CAMION SIT 728', depot: 2, pdl: 10, statut: 'Terminée',  km: 80.88,  kg: 7,    m3: 9.96  },
  { nom: 'CAMION NOUVEAU', depot: 2, pdl: 7,  statut: 'Terminée',  km: 52.92,  kg: 5,    m3: 9.00  },
  { nom: 'CAMION 2019',    depot: 3, pdl: 7,  statut: 'En cours',  km: 43.27,  kg: 22.5, m3: 15.46 },
  { nom: 'CAMION SIT 822', depot: 2, pdl: 6,  statut: 'Terminée',  km: 102.29, kg: 5,    m3: 18.50 },
  { nom: 'CAMION SIT FK',  depot: 2, pdl: 2,  statut: 'En cours',  km: 111.19, kg: 1,    m3: 20.00 },
  { nom: 'CAMION 2022',    depot: 2, pdl: 2,  statut: 'Terminée',  km: 60.24,  kg: 1,    m3: 20.00 },
  { nom: 'CAMION SIT 215', depot: 2, pdl: 3,  statut: 'Terminée',  km: 59.11,  kg: 2,    m3: 20.32 },
  { nom: 'CAMION 2024',    depot: 2, pdl: 5,  statut: 'Terminée',  km: 61.96,  kg: 4,    m3: 20.00 },
  { nom: 'CAMION SIT 545', depot: 2, pdl: 1,  statut: 'En cours',  km: 57.06,  kg: 1,    m3: 20.00 },
  { nom: 'CAMION SIT 946', depot: 2, pdl: 1,  statut: 'En cours',  km: 57.06,  kg: 1,    m3: 20.00 },
];

export default function TourneesPage() {
  const totalKm   = TOURNEES.reduce((s, t) => s + t.km, 0);
  const totalPdl  = TOURNEES.reduce((s, t) => s + t.pdl, 0);
  const enCours   = TOURNEES.filter(t => t.statut === 'En cours').length;
  const terminees = TOURNEES.filter(t => t.statut === 'Terminée').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🚚</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournées MTS-1</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="ml-auto">
          <a href="https://console.mts-1.com/rounds" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors">
            Ouvrir MTS-1 ↗
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Tournées" value={TOURNEES.length} subtitle="au total" icon="🗺️" color="orange" />
        <KpiCard title="En cours" value={enCours} subtitle={`${terminees} terminée${terminees > 1 ? 's' : ''}`} icon="🔄" color="blue" />
        <KpiCard title="Points de livraison" value={totalPdl} subtitle="journée en cours" icon="📦" color="green" />
        <KpiCard title="Distance totale" value={`${totalKm.toFixed(0)} km`} subtitle="journée en cours" icon="📏" color="purple" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">PDL (avril 2026)</p>
          <p className="text-3xl font-bold text-blue-700">841</p>
          <p className="text-xs text-blue-400 mt-1">dont 227 non terminés</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-xs text-green-500 font-medium uppercase tracking-wide mb-1">Temps moyen / point</p>
          <p className="text-3xl font-bold text-green-700">33 min</p>
          <p className="text-xs text-green-400 mt-1">validation terrain</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
          <p className="text-xs text-purple-500 font-medium uppercase tracking-wide mb-1">Temps moyen / OT</p>
          <p className="text-3xl font-bold text-purple-700">07h57</p>
          <p className="text-xs text-purple-400 mt-1">par ordre de transport</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Tournées du jour</h2>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{enCours} en cours</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{terminees} terminées</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Véhicule</th>
                <th className="px-6 py-3 text-center">Dépôts</th>
                <th className="px-6 py-3 text-center">PDL</th>
                <th className="px-6 py-3 text-center">Statut</th>
                <th className="px-6 py-3 text-right">Distance</th>
                <th className="px-6 py-3 text-right">Poids</th>
                <th className="px-6 py-3 text-right">Cubage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {TOURNEES.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{t.nom}</td>
                  <td className="px-6 py-3 text-center text-gray-600">{t.depot}</td>
                  <td className="px-6 py-3 text-center font-semibold text-gray-800">{t.pdl}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${t.statut === 'Terminée' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.statut === 'Terminée' ? '✓' : '●'} {t.statut}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">{t.km.toFixed(2)} km</td>
                  <td className="px-6 py-3 text-right text-gray-600">{t.kg} kg</td>
                  <td className="px-6 py-3 text-right text-gray-600">{t.m3.toFixed(2)} m³</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
