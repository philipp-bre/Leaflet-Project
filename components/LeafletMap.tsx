
import '../src/app.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { cityMarkersProps } from '../types/types';
import type { Arrow } from '../types/types';

  const cityMarkers:cityMarkersProps[] = [
      { city: "Praha", coords: [ 50.080, 14.42143 ] },
      { city: "Brno", coords: [ 49.150876, 16.642643 ] },
      { city: "Ostrava", coords: [ 49.83765, 18.27432 ] },
  ]

function LeafletMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [50, 15.8],
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright"></a> contributors',
    }).addTo(map);
    mapRef.current = map;

    cityMarkers.forEach((cityMarker) => {
      const marker = L.marker(cityMarker.coords as [number, number], {
        title: cityMarker.city,
      }).addTo(map);

    marker.on('click', () => {
      map.removeLayer(marker);
      markersRef.current = markersRef.current.filter(m => m !== marker);
    });
      
      markersRef.current.push(marker);
    });

    

    return () => {
      mapRef.current = null;
      markersRef.current = [];
      map.remove();
    };
  }, []);

  // vypocet sipek
  const updateArrows = () => {
    const map = mapRef.current;
    if (!map) return;

    const edge = 16;
    const bounds = map.getBounds();
    const center = map.latLngToContainerPoint(map.getCenter());
    const size = map.getSize();
    const rect = {
      left: edge,
      right: size.x - edge,
      top: edge,
      bottom: size.y - edge,
    };

    const newArrows: Arrow[] = cityMarkers.map((cityMarker) => {
      const latLng = L.latLng(cityMarker.coords[0], cityMarker.coords[1]);

      // marker viditelny = arrow se neukaze
      if (bounds.contains(latLng)) {
        return {
          id: cityMarker.city,
          visible: false,
          x: 0,
          y: 0,
          rotation: 0,
          distance: '',
        };
      }

      // vypocet ke smeru k markeru
      const target = map.latLngToContainerPoint(latLng);
      const dx = target.x - center.x;
      const dy = target.y - center.y;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * 180 / Math.PI;

      // okraj mapy
      const hit = rayIntersectRect(center, { x: center.x + dx, y: center.y + dy }, rect);

      if (!hit) {
        return {
          id: cityMarker.city,
          visible: false,
          x: 0,
          y: 0,
          rotation: 0,
          distance: '',
        };
      }

      // vzdalenost v km
      const distanceKm = map.getCenter().distanceTo(latLng) / 1000;

      return {
        id: cityMarker.city,
        visible: true,
        x: hit.x,
        y: hit.y,
        rotation: angleDeg,
        distance: distanceKm.toFixed(1) + ' km',
      };
    });

    setArrows(newArrows);
  };

  // Ray-casting algoritmus
  const rayIntersectRect = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    rect: { left: number; right: number; top: number; bottom: number }
  ) => {
    const x0 = p0.x, y0 = p0.y;
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const ts: number[] = [];

    if (dx !== 0) {
      ts.push((rect.left - x0) / dx);
      ts.push((rect.right - x0) / dx);
    }
    if (dy !== 0) {
      ts.push((rect.top - y0) / dy);
      ts.push((rect.bottom - y0) / dy);
    }

    let best: { t: number; x: number; y: number } | null = null;

    for (const t of ts) {
      if (t <= 0) continue;
      const x = x0 + t * dx;
      const y = y0 + t * dy;
      const eps = 1e-6;
      const onV = Math.abs(x - rect.left) < eps || Math.abs(x - rect.right) < eps;
      const onH = Math.abs(y - rect.top) < eps || Math.abs(y - rect.bottom) < eps;
      const insideV = y >= rect.top - eps && y <= rect.bottom + eps;
      const insideH = x >= rect.left - eps && x <= rect.right + eps;
      const valid = (onV && insideV) || (onH && insideH);

      if (valid && (!best || t < best.t)) {
        best = { t, x, y };
      }
    }

    return best;
  };

  // aktualizace sipek
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleUpdate = () => {
      updateArrows();
    };
    
    map.on('resize', handleUpdate);
    map.on('move', handleUpdate);
    map.on('zoom', handleUpdate);
    map.on('zoomend', handleUpdate);
    map.on('moveend', handleUpdate);

    map.whenReady(handleUpdate);

    return () => {
      map.off('resize', handleUpdate);
      map.off('move', handleUpdate);
      map.off('zoom', handleUpdate);
      map.off('zoomend', handleUpdate);
      map.off('moveend', handleUpdate);
    };
  }, []);

  // zoom zpatky na marker pri kliknuti
  const handleArrowClick = (cityName: string) => {
    const map = mapRef.current;
    if (!map) return;

    const cityMarker = cityMarkers.find((c) => c.city === cityName);
    if (cityMarker) {
      map.panTo(cityMarker.coords as [number, number], { animate: true });
    }
  };

  const [lat, setLat] = useState<string>('50.0686');
  const [lng, setLng] = useState<string>('14.4305');

  const handleAddMarker = () => {
    const map = mapRef.current;
    if (!map) return;

    // string => number
    const zSirka = parseFloat(lat);
    const zDelka = parseFloat(lng);


    if (isNaN(zSirka) || isNaN(zDelka)) {
      alert('Zadej platne souradnice!');
      return;
    }

    const coords: [number, number] = [zSirka, zDelka];
    const marker = L.marker(coords).addTo(map);

    marker.on('click', () => {
    map.removeLayer(marker);
    markersRef.current = markersRef.current.filter(m => m !== marker);
  });
    map.panTo(coords, { animate: true });
  };

  
  return (
    <div className="min-h-screen text-gray-100">
      <div className="mx-auto">
        <div className="relative h-screen min-h-[450px] 
        border border-gray-800 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full"/>
          <div className="fixed top-0 right-2 p-5 flex flex-col z-10000">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Zeměpisná šířka</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="50.0686"
                className="w-full px-3 py-2 border bg-white 
                text-black rounded-lg border-gray-300 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Zeměpisná délka</label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="14.4305"
                className="w-full px-3 py-2 border bg-white text-black
                 rounded-lg border-gray-300 text-sm"
              />
            </div>

            <button
              onClick={handleAddMarker}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-black
              text-white cursor-pointer transition duration-300 border 
              hover:bg-white hover:text-black"
            >
              + Add Marker
            </button>
          </div>
          {arrows.map((arrow) => (
            arrow.visible ?  (
              <button
                key={arrow.id}
                onClick={() => handleArrowClick(arrow.id)}
                className="absolute flex flex-col items-center justify-center 
                w-20 h-20 pointer-events-auto z-1000 cursor-pointer"
                style={{ left: `${arrow.x - 20}px`
                        ,top: `${arrow.y - 20}px`
                        ,transform: `rotate(${arrow.rotation}deg)`,
                      }}
                >
                <svg
                  viewBox="0 0 100 100"
                  className="w-8 h-8"
                  aria-hidden="true"
                >
                  <polygon
                    points="20,15 20,85 85,50"
                    className="fill-red-500"
                  />
                </svg>
                <div className="mt-0.5 text-xs text-black font-medium
                pointer-events-none">
                  {arrow.distance}
                </div>
              </button>
            )
            :
            ""
          ))}
        </div>

        
      </div>
    </div>
  );
}

export default LeafletMap;
  