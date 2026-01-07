'use client';

import { useEffect, useRef, useState } from 'react';
import Map, { Source, Layer, MapRef, LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox 토큰 (환경변수에서 가져옴)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// 서울시 중심 좌표
const SEOUL_CENTER = {
  longitude: 126.9780,
  latitude: 37.5665,
  zoom: 11,
};

// GeoJSON 레이어 스타일 - 채우기 (Fill)
const dataLayer: LayerProps = {
  id: 'seoul-districts-fill',
  type: 'fill',
  paint: {
    'fill-color': '#627BC1',
    'fill-opacity': 0.4,
  },
};

// GeoJSON 레이어 스타일 - 경계선 (Line)
const outlineLayer: LayerProps = {
  id: 'seoul-districts-outline',
  type: 'line',
  paint: {
    'line-color': '#1a202c',
    'line-width': 1.5,
  },
};

interface MapContainerProps {
  onDistrictClick?: (properties: any) => void;
}

export default function MapContainer({ onDistrictClick }: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // GeoJSON 데이터 로드
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/data/seoul-hangjeongdong.geojson');
        if (!response.ok) {
          throw new Error('GeoJSON 로드 실패');
        }
        const data = await response.json();
        setGeojsonData(data);
        console.log('✅ GeoJSON 데이터 로드 완료:', data);
      } catch (error) {
        console.error('❌ GeoJSON 로드 에러:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGeoJSON();
  }, []);

  // 지도 클릭 이벤트 핸들러
  const handleMapClick = (event: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ['seoul-districts-fill'],
    });

    if (features.length > 0) {
      const clickedFeature = features[0];
      console.log('🗺️ 클릭한 행정동:', clickedFeature.properties);

      // 부모 컴포넌트로 클릭 정보 전달
      if (onDistrictClick) {
        onDistrictClick(clickedFeature.properties);
      }
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Mapbox 토큰이 설정되지 않았습니다
          </h2>
          <p className="text-gray-700 mb-4">
            .env.local 파일에 NEXT_PUBLIC_MAPBOX_TOKEN을 설정해주세요.
          </p>
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Mapbox 토큰 발급받기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">지도 데이터 로딩 중...</p>
          </div>
        </div>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={SEOUL_CENTER}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onClick={handleMapClick}
        interactiveLayerIds={['seoul-districts-fill']}
      >
        {geojsonData && (
          <Source id="seoul-districts" type="geojson" data={geojsonData}>
            <Layer {...dataLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}
      </Map>
    </div>
  );
}
