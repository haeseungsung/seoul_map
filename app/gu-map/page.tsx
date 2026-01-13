'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function GuMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selectedGu, setSelectedGu] = useState<string | null>(null);
  const [guInfo, setGuInfo] = useState<any>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [126.9780, 37.5665],
      zoom: 10.5,
    });

    mapRef.current = map;

    map.on('load', async () => {
      console.log('🗺️  지도 로드 완료');

      // Load gu-level GeoJSON
      const response = await fetch('/data/seoul-gu.geojson');
      const geojson = await response.json();

      console.log('✅ GeoJSON 로드:', geojson.features.length, '개 구');

      // Add source
      map.addSource('seoul-gu', {
        type: 'geojson',
        data: geojson,
      });

      console.log('✅ Mapbox 소스 추가 완료');

      // Add fill layer
      map.addLayer({
        id: 'gu-fill',
        type: 'fill',
        source: 'seoul-gu',
        paint: {
          'fill-color': '#e2e8f0',
          'fill-opacity': 0.6,
        },
      });

      // Add hover layer
      map.addLayer({
        id: 'gu-fill-hover',
        type: 'fill',
        source: 'seoul-gu',
        paint: {
          'fill-color': '#4299e1',
          'fill-opacity': 0.8,
        },
        filter: ['==', 'gu_name', ''],
      });

      // Add outline layer
      map.addLayer({
        id: 'gu-outline',
        type: 'line',
        source: 'seoul-gu',
        paint: {
          'line-color': '#2d3748',
          'line-width': 2,
        },
      });

      // Add labels
      map.addLayer({
        id: 'gu-labels',
        type: 'symbol',
        source: 'seoul-gu',
        layout: {
          'text-field': ['get', 'gu_name'],
          'text-size': 14,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#1a202c',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });

      console.log('✅ 모든 레이어 추가 완료');

      // Hover effect
      map.on('mousemove', 'gu-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const guName = e.features[0].properties?.gu_name;
          map.setFilter('gu-fill-hover', ['==', 'gu_name', guName]);
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      map.on('mouseleave', 'gu-fill', () => {
        map.setFilter('gu-fill-hover', ['==', 'gu_name', '']);
        map.getCanvas().style.cursor = '';
      });

      // Click handler
      map.on('click', 'gu-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;

          setSelectedGu(properties?.gu_name || null);
          setGuInfo(properties);

          // Zoom to clicked gu
          const bounds = new mapboxgl.LngLatBounds();
          const coords = (feature.geometry as any).coordinates;

          coords.forEach((polygon: any) => {
            polygon[0].forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          });

          map.fitBounds(bounds, {
            padding: 50,
            duration: 1000,
          });
        }
      });
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <main className="relative w-full h-screen">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                서울시 자치구 경계 지도
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                총 25개 자치구 (행정동 경계 병합)
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              ← 메인으로
            </a>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Info Panel */}
      {selectedGu && guInfo && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-xl z-10 p-4 max-w-sm">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900">{selectedGu}</h3>
            <button
              onClick={() => {
                setSelectedGu(null);
                setGuInfo(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">자치구 코드:</span>
              <span className="font-medium">{guInfo.gu_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">행정동 수:</span>
              <span className="font-medium">{guInfo.dong_count}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">시도:</span>
              <span className="font-medium">{guInfo.sidonm}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              클릭한 자치구로 자동 줌인됩니다
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-24 left-4 bg-white rounded-lg shadow-md z-10 p-4">
        <h4 className="font-semibold text-sm text-gray-900 mb-2">범례</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 border-2 border-gray-700"></div>
            <span>자치구 경계</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 border-2 border-gray-700"></div>
            <span>마우스 호버</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
          <p>• 구를 클릭하면 상세정보 표시</p>
          <p>• 마우스를 올리면 하이라이트</p>
        </div>
      </div>
    </main>
  );
}
