'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Map, { Source, Layer, MapRef, LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { loadPopulationFromCSV } from '@/api/seoul-data';
import { parsePopulationCSV, type DistrictPopulation } from '@/utils/csv-parser';
import type { IndicatorType } from '@/app/page';

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
  selectedIndicator: IndicatorType;
}

/**
 * 지표별 색상 범위 설정
 */
const getIndicatorConfig = (indicator: IndicatorType) => {
  switch (indicator) {
    case 'population':
      return {
        property: 'population',
        label: '총 인구',
        unit: '명',
        stops: [
          [0, '#e0e0e0'],
          [5000, '#eff6ff'],
          [10000, '#dbeafe'],
          [15000, '#bfdbfe'],
          [20000, '#93c5fd'],
          [25000, '#60a5fa'],
          [30000, '#3b82f6'],
          [35000, '#1d4ed8'],
        ],
      };
    case 'households':
      return {
        property: 'households',
        label: '가구 수',
        unit: '가구',
        stops: [
          [0, '#e0e0e0'],
          [2000, '#fef3c7'],
          [4000, '#fde68a'],
          [6000, '#fcd34d'],
          [8000, '#fbbf24'],
          [10000, '#f59e0b'],
          [12000, '#d97706'],
          [15000, '#b45309'],
        ],
      };
    case 'male':
      return {
        property: 'male',
        label: '남자 인구',
        unit: '명',
        stops: [
          [0, '#e0e0e0'],
          [2500, '#dbeafe'],
          [5000, '#bfdbfe'],
          [7500, '#93c5fd'],
          [10000, '#60a5fa'],
          [12500, '#3b82f6'],
          [15000, '#2563eb'],
          [17500, '#1d4ed8'],
        ],
      };
    case 'female':
      return {
        property: 'female',
        label: '여자 인구',
        unit: '명',
        stops: [
          [0, '#e0e0e0'],
          [2500, '#fce7f3'],
          [5000, '#fbcfe8'],
          [7500, '#f9a8d4'],
          [10000, '#f472b6'],
          [12500, '#ec4899'],
          [15000, '#db2777'],
          [17500, '#be185d'],
        ],
      };
    case 'male_ratio':
      return {
        property: 'male_ratio',
        label: '남자 비율',
        unit: '%',
        stops: [
          [0, '#e0e0e0'],
          [45, '#dbeafe'],
          [47, '#bfdbfe'],
          [49, '#93c5fd'],
          [50, '#e5e7eb'],
          [51, '#fde68a'],
          [53, '#fbbf24'],
          [55, '#f59e0b'],
        ],
      };
    case 'female_ratio':
      return {
        property: 'female_ratio',
        label: '여자 비율',
        unit: '%',
        stops: [
          [0, '#e0e0e0'],
          [45, '#fef3c7'],
          [47, '#fde68a'],
          [49, '#fcd34d'],
          [50, '#e5e7eb'],
          [51, '#fbcfe8'],
          [53, '#f9a8d4'],
          [55, '#f472b6'],
        ],
      };
  }
};

export default function MapContainer({
  onDistrictClick,
  selectedIndicator,
}: MapContainerProps) {
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

            const pop = popData?.population || 0;
            const male = popData?.male || 0;
            const female = popData?.female || 0;

            // 남녀 비율 계산
            const male_ratio = pop > 0 ? (male / pop) * 100 : 0;
            const female_ratio = pop > 0 ? (female / pop) * 100 : 0;

            return {
              ...feature,
              properties: {
                ...feature.properties,
                dong_name: dongName, // 동 이름 추가
                population: pop,
                households: popData?.households || 0,
                male,
                female,
                male_ratio,
                female_ratio,
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

  // 선택된 지표에 따라 동적으로 레이어 생성
  const indicatorConfig = useMemo(
    () => getIndicatorConfig(selectedIndicator),
    [selectedIndicator]
  );

  const dataLayer: LayerProps = useMemo(
    () => ({
      id: 'seoul-districts-fill',
      type: 'fill',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', indicatorConfig.property],
          ...indicatorConfig.stops.flatMap(([value, color]) => [value, color]),
        ],
        'fill-opacity': 0.7,
      },
    }),
    [indicatorConfig]
  );

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
        <div className="absolute bottom-8 left-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-sm mb-2">{indicatorConfig.label}</h3>
          <div className="space-y-1 text-xs">
            {indicatorConfig.stops
              .slice()
              .reverse()
              .map((stop, idx, arr) => {
                const [value, color] = stop as [number, string];
                const nextStop = arr[idx + 1] as [number, string] | undefined;

                // 첫 번째 항목 (가장 큰 값)
                if (idx === 0 && value > 0) {
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <div
                        className="w-6 h-4"
                        style={{ backgroundColor: color as string }}
                      ></div>
                      <span>
                        {value.toLocaleString()}
                        {indicatorConfig.unit} 이상
                      </span>
                    </div>
                  );
                }

                // 데이터 없음 (0)
                if (value === 0) {
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <div
                        className="w-6 h-4"
                        style={{ backgroundColor: color as string }}
                      ></div>
                      <span>데이터 없음</span>
                    </div>
                  );
                }

                // 중간 범위
                if (nextStop) {
                  const [nextValue] = nextStop;
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <div
                        className="w-6 h-4"
                        style={{ backgroundColor: color as string }}
                      ></div>
                      <span>
                        {nextValue.toLocaleString()} -{' '}
                        {value.toLocaleString()}
                        {indicatorConfig.unit}
                      </span>
                    </div>
                  );
                }

                return null;
              })}
          </div>
        </div>
      )}
    </div>
  );
}
