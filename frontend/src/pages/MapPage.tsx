import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { connectorsApi } from '../services/api';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const { data: positions = [], refetch, isLoading, isError: errMap } = useQuery({
    queryKey: ['positions'],
    queryFn: connectorsApi.positions,
    refetchInterval: 120_000,
    retry: false,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [2.3488, 48.8534],
      zoom: 6,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
  }, []);

  useEffect(() => {
    if (!mapRef.current || positions.length === 0) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    positions.forEach((pos: any) => {
      if (!pos.lat && !pos.latitude) return;
      const lat = pos.lat || pos.latitude;
      const lng = pos.lng || pos.longitude;
      const el = document.createElement('div');
      el.style.cssText = `
        width:32px;height:32px;background:#1d4ed8;border:2px solid white;
        border-radius:50%;cursor:pointer;display:flex;align-items:center;
        justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)
      `;
      el.innerHTML = '🚗';
      el.addEventListener('click', () => setSelected(pos));
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    if (positions.length > 1) {
      const lats = positions.map((p: any) => p.lat || p.latitude).filter(Boolean);
      const lngs = positions.map((p: any) => p.lng || p.longitude).filter(Boolean);
      mapRef.current.fitBounds(
        [[Math.min(...lngs) - 0.5, Math.min(...lats) - 0.5], [Math.max(...lngs) + 0.5, Math.max(...lats) + 0.5]],
        { padding: 60, maxZoom: 14 }
      );
    }
  }, [positions]);

  const tokenMissing = !import.meta.env.VITE_MAPBOX_TOKEN;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Carte et suivi GPS</h2>
          <p className="text-sm text-gray-500">{positions.length} vehicules localises</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          Actualiser
        </button>
      </div>

      {errMap && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          Positions GPS non disponibles — connectez Webfleet ou un autre telemetre GPS.
        </div>
      )}

      {tokenMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Ajoutez VITE_MAPBOX_TOKEN dans votre fichier .env pour activer la carte.
          Creez un token gratuit sur mapbox.com.
        </div>
      )}

      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative min-h-96">
        <div ref={containerRef} className="w-full h-full" />
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <p className="text-gray-500">Chargement des positions...</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="card border-l-4 border-l-blue-500 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-800">
                {selected.registration || selected.objectUid || 'Vehicule'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Position : {(selected.lat || selected.latitude)?.toFixed(5)}, {(selected.lng || selected.longitude)?.toFixed(5)}
              </p>
              {selected.speedKmh !== undefined && (
                <p className="text-sm text-gray-600">Vitesse : {selected.speedKmh} km/h</p>
              )}
              {selected.recordedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Derniere position : {new Date(selected.recordedAt).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">X</button>
          </div>
        </div>
      )}
    </div>
  );
}
