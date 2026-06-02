import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapPage() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const tokenMissing = !import.meta.env.VITE_MAPBOX_TOKEN;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Carte</h2>
          <p className="text-sm text-gray-500">Vue géographique de la flotte</p>
        </div>
      </div>

      {tokenMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          ⚠️ Ajoutez <code className="font-mono bg-amber-100 px-1 rounded">VITE_MAPBOX_TOKEN=votre_token</code> dans votre fichier <code className="font-mono">.env</code> pour activer la carte.
        </div>
      )}

      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative min-h-96">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
