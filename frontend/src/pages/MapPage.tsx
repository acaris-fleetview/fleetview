import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { connectorsApi } from '../services/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapPage() {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const { data: positions = [], refetch, isLoading, isError: errMap } = useQuery({
    queryKey: ['positions'],
    queryFn: connectorsApi.positions,
    refetchInterval: 120_000,
    retry: false,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;
    import('mapbox-gl').then((mod) => {
      const mapboxgl = mod.default;
      try {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [2.3488, 48.8534],
          zoom: 6,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      } catch (e: any) {
        setMapError(e?.message || 'Erreur initialisation carte');
      }
    }).catch(() => setMapError('mapbox-gl non disponible'));
  }, []);

  useEffect(() => {
    if (!mapRef.current || (positions as any[]).length === 0) return;
    import('mapbox-gl').then((mod) => {
      const mapboxgl = mod.default;
      markersRef.current.forEach((m: any) => m.remove());
      markersRef.current = [];
      (positions as any[]).forEach((pos: any) => {
        if (!pos.lat && !pos.latitude) return;
        const lat = pos.lat || pos.latitude;
        const lng = pos.lng || pos.longitude;
        const el = document.createElement('div');
        el.style.cssText = 'width:32px;height:32px;background:#1d4ed8;border:2px solid white;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;';
        el.innerHTML = '🚗';
        el.addEventListener('click', () => setSelected(pos));
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current!);
        markersRef.current.push(marker);
      });
    });
  }, [positions]);

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Carte et suivi GPS</h2>
          <p className="text-sm text-gray-500">{(positions as any[]).length} vehicules localises</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">Actualiser</button>
      </div>

      {errMap && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          Positions GPS non disponibles — connectez Webfleet ou un autre telemetre GPS.
        </div>
      )}

      {!MAPBOX_TOKEN && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Ajoutez VITE_MAPBOX_TOKEN dans les variables Netlify pour activer la carte.
          Token gratuit sur mapbox.com.
        </div>
      )}

      {mapError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          Erreur carte : {mapError}
        </div>
      )}

      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative min-h-96 bg-gray-50 flex items-center justify-center">
        {MAPBOX_TOKEN ? (
          <>
            <div ref={containerRef} className="w-full h-full" />
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <p className="text-gray-500">Chargement des positions...</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-400 p-8">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-lg font-medium text-gray-500">Carte GPS</p>
            <p className="text-sm mt-2">Configurez VITE_MAPBOX_TOKEN pour afficher la carte</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="card border-l-4 border-l-blue-500 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-800">{selected.registration || 'Vehicule'}</p>
              <p className="text-sm text-gray-600 mt-1">
                {(selected.lat || selected.latitude)?.toFixed(5)}, {(selected.lng || selected.longitude)?.toFixed(5)}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">X</button>
          </div>
        </div>
      )}
    </div>
  );
}
