'use client';

import { useEffect, useRef, useState } from 'react';
import Map, { Source, Layer, MapRef, LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { loadPopulationFromCSV } from '@/api/seoul-data';
import { parsePopulationCSV, type DistrictPopulation } from '@/utils/csv-parser';

// Mapbox 토큰 (환경변수에서 가져옴)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// 서울시 중심 좌표
const SEOUL_CENTER = {
  longitude: 126.9780,
  latitude: 37.5665,
  zoom: 10,
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

/**
 * 인구수를 색상으로 변환
 * 인구수가 많을수록 진한 파란색
 */
function getColorByPopulation(population: number): string {
  if (population === 0) return '#e0e0e0'; // 데이터 없음 - 회색
  if (population < 5000) return '#eff6ff'; // 매우 적음
  if (population < 10000) return '#dbeafe';
  if (population < 15000) return '#bfdbfe';
  if (population < 20000) return '#93c5fd';
  if (population < 25000) return '#60a5fa';
  if (population < 30000) return '#3b82f6';
  return '#1d4ed8'; // 3만 이상 - 진한 파란색
}

export default function MapContainer({ onDistrictClick }: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [populationData, setPopulationData] = useState<DistrictPopulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // GeoJSON과 인구 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // GeoJSON 로드
        const geojsonResponse = await fetch('/data/seoul-hangjeongdong.geojson');
        if (!geojsonResponse.ok) {
          throw new Error('GeoJSON 로드 실패');
        }
        const geojson = await geojsonResponse.json();

        // CSV 인구 데이터 로드
        const csvText = await loadPopulationFromCSV();
        const population = parsePopulationCSV(csvText);

        console.log('✅ 데이터 로드 완료:', {
          geojsonFeatures: geojson.features?.length || 0,
          populationRecords: population.length,
        });

        // GeoJSON에 인구 데이터 추가
        const enrichedGeojson = {
          ...geojson,
          features: geojson.features.map((feature: any) => {
            // adm_nm: "서울특별시 종로구 사직동" → "사직동" 추출
            const fullName = feature.properties?.adm_nm || '';
            const dongName = fullName.split(' ').pop() || ''; // 마지막 부분 (동 이름)

            const popData = population.find((p) => p.dong === dongName);

            return {
              ...feature,
              properties: {
                ...feature.properties,
                dong_name: dongName, // 동 이름 추가
                population: popData?.population || 0,
                households: popData?.households || 0,
                male: popData?.male || 0,
                female: popData?.female || 0,
              },
            };
          }),
        };

        console.log('✅ 인구 데이터 매칭 완료:', {
          샘플: enrichedGeojson.features.slice(0, 5).map((f: any) => ({
            전체이름: f.properties.adm_nm,
            동: f.properties.dong_name,
            인구: f.properties.population,
          })),
        });

        setGeojsonData(enrichedGeojson);
        setPopulationData(population);
      } catch (error) {
        console.error('❌ 데이터 로드 에러:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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

  // Choropleth 레이어 (인구수에 따라 색상 다르게)
  const dataLayer: LayerProps = {
    id: 'seoul-districts-fill',
    type: 'fill',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'population'],
        0, '#e0e0e0',      // 데이터 없음 - 회색
        5000, '#eff6ff',   // 매우 적음
        10000, '#dbeafe',
        15000, '#bfdbfe',
        20000, '#93c5fd',
        25000, '#60a5fa',
        30000, '#3b82f6',
        35000, '#1d4ed8',  // 3.5만 이상 - 진한 파란색
      ],
      'fill-opacity': 0.7,
    },
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

      {/* 범례 (Legend) */}
      {!isLoading && (
        <div className="absolute bottom-8 left-4 bg-white p-4 rounded-lg shadow-lg z-10">
          <h3 className="font-bold text-sm mb-2">인구수</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#1d4ed8' }}></div>
              <span>35,000명 이상</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>30,000 - 35,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#60a5fa' }}></div>
              <span>25,000 - 30,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#93c5fd' }}></div>
              <span>20,000 - 25,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#bfdbfe' }}></div>
              <span>15,000 - 20,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#dbeafe' }}></div>
              <span>10,000 - 15,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#eff6ff' }}></div>
              <span>5,000 - 10,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4" style={{ backgroundColor: '#e0e0e0' }}></div>
              <span>데이터 없음</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
