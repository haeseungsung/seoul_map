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
  selectedIndicator: IndicatorType | string; // IndicatorType 또는 메타 카탈로그 indicator_id
  onGeojsonLoad?: (geojson: any) => void; // enriched geojson 전달
  viewMode?: 'dong' | 'gu' | 'city'; // 뷰 모드 (행정동 vs 구 vs 시 전체)
  guGeojsonData?: any; // 구 GeoJSON (지표 데이터 병합됨)
  cityData?: { value: number; description: string; totalRows?: number }; // 시 전체 데이터 (totalRows: 원본 레코드 수)
}

/**
 * 지표별 색상 범위 설정
 */
const getIndicatorConfig = (indicator: IndicatorType | string) => {
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
    case 'placeholder':
      // 구 모드에서 지표 미선택 시 기본값
      return {
        property: 'placeholder',
        label: '지표를 선택하세요',
        unit: '',
        stops: [
          [0, '#e5e7eb'],
          [1, '#e5e7eb'],
        ],
      };
    default:
      // 메타 카탈로그 기반 custom 지표 처리
      // indicator_id를 property로 사용하고, 동적 색상 범위 설정
      // indicator_id에서 metric_type 유추 (rate, avg, sum, count)
      let unit = '개';
      let stops = [
        [0, '#e0e0e0'],
        [100, '#eff6ff'],
        [500, '#dbeafe'],
        [1000, '#bfdbfe'],
        [2000, '#93c5fd'],
        [3000, '#60a5fa'],
        [4000, '#3b82f6'],
        [5000, '#2563eb'],
        [7500, '#1d4ed8'],
        [10000, '#1e40af'],
      ];

      // indicator_id에 ratio가 포함되면 rate 타입 (초록색 계열)
      if (indicator.includes('ratio')) {
        unit = '%';
        stops = [
          [0, '#f0fdf4'],
          [10, '#dcfce7'],
          [20, '#bbf7d0'],
          [30, '#86efac'],
          [40, '#4ade80'],
          [50, '#22c55e'],
          [60, '#16a34a'],
          [70, '#15803d'],
          [80, '#166534'],
          [100, '#14532d'],
        ];
      }
      // indicator_id에 avg나 area가 포함되면 avg 타입 (주황색 계열)
      else if (indicator.includes('avg') || indicator.includes('area')) {
        unit = indicator.includes('area') ? '㎡' : '명';
        stops = [
          [0, '#fff7ed'],
          [10, '#ffedd5'],
          [20, '#fed7aa'],
          [30, '#fdba74'],
          [50, '#fb923c'],
          [75, '#f97316'],
          [100, '#ea580c'],
          [150, '#c2410c'],
          [200, '#9a3412'],
        ];
      }
      // indicator_id에 total이나 sum이 포함되면 sum 타입 (보라색 계열)
      else if (indicator.includes('total') || indicator.includes('sum')) {
        unit = '명';
        stops = [
          [0, '#faf5ff'],
          [100, '#f3e8ff'],
          [500, '#e9d5ff'],
          [1000, '#d8b4fe'],
          [2000, '#c084fc'],
          [3000, '#a855f7'],
          [5000, '#9333ea'],
          [7500, '#7e22ce'],
          [10000, '#6b21a8'],
        ];
      }
      // 기본: count 타입 (파란색 계열)

      return {
        property: indicator,
        label: indicator,
        unit: unit,
        stops: stops,
      };
  }
};

export default function MapContainer({
  onDistrictClick,
  selectedIndicator,
  onGeojsonLoad,
  viewMode = 'dong',
  guGeojsonData: externalGuGeojsonData,
  cityData,
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

        // 행정동 GeoJSON 로드
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
            // adm_nm: "서울특별시 종로구 사직동" → 구 이름과 동 이름 추출
            const fullName = feature.properties?.adm_nm || '';
            const parts = fullName.split(' ');
            const guName = parts[1] || ''; // "종로구"
            const dongName = parts[2] || ''; // "사직동"

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
                gu_name: guName, // 구 이름 추가 (중요!)
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
            구: f.properties.gu_name,
            동: f.properties.dong_name,
            인구: f.properties.population,
          })),
        });

        setGeojsonData(enrichedGeojson);
        setPopulationData(population);

        // 부모 컴포넌트에 enriched geojson 전달
        if (onGeojsonLoad) {
          onGeojsonLoad(enrichedGeojson);
        }
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

  // 로딩 상태: 행정동 모드에서는 geojsonData가 없을 때, 구 모드에서는 항상 로딩 완료로 간주
  const showLoading = viewMode === 'dong' ? isLoading : false;

  return (
    <div className="relative w-full h-screen">
      {showLoading && (
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
        onClick={viewMode === 'dong' ? handleMapClick : undefined}
        interactiveLayerIds={viewMode === 'dong' ? ['seoul-districts-fill'] : ['seoul-gu-fill']}
      >
        {/* 행정동 모드: 행정동 레이어 표시 */}
        {viewMode === 'dong' && geojsonData && (
          <Source id="seoul-districts" type="geojson" data={geojsonData}>
            <Layer {...dataLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}

        {/* 구 모드: 구 레이어 표시 */}
        {viewMode === 'gu' && externalGuGeojsonData && (
          <Source id="seoul-gu" type="geojson" data={externalGuGeojsonData}>
            {/* 구 채우기 레이어 */}
            <Layer
              id="seoul-gu-fill"
              type="fill"
              paint={{
                'fill-color': indicatorConfig ? [
                  'interpolate',
                  ['linear'],
                  ['get', indicatorConfig.property],
                  ...indicatorConfig.stops.flat()
                ] : '#e0e0e0',
                'fill-opacity': 0.7,
              }}
            />
            {/* 구 경계선 레이어 */}
            <Layer
              id="seoul-gu-outline"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': 3,
                'line-opacity': 0.8,
              }}
            />
            {/* 구 이름 텍스트 레이어 */}
            <Layer
              id="seoul-gu-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'gu_name'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 14,
                'text-offset': [0, -1.5],
                'text-anchor': 'center',
              }}
              paint={{
                'text-color': '#000000',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
              }}
            />
            {/* 구 수치 텍스트 레이어 */}
            {indicatorConfig && (
              <Layer
                id="seoul-gu-values"
                type="symbol"
                layout={{
                  'text-field': [
                    'concat',
                    ['to-string', ['round', ['get', indicatorConfig.property]]],
                    indicatorConfig.unit
                  ],
                  'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
                  'text-size': 12,
                  'text-offset': [0, 0.5],
                  'text-anchor': 'center',
                }}
                paint={{
                  'text-color': '#1e3a8a',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 1.5,
                }}
              />
            )}
          </Source>
        )}
      </Map>

      {/* 시 전체 통계 카드 - city 모드에서만 표시 */}
      {viewMode === 'city' && cityData && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-2xl z-10 min-w-[400px]">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">서울시 전체</h2>
            <p className="text-sm text-gray-500 mb-6">{cityData.description}</p>
            <div className="bg-blue-50 rounded-xl p-6">
              {cityData.totalRows && cityData.totalRows !== cityData.value ? (
                // 측정소 같은 경우: 총 레코드 수와 고유 개체 수가 다름
                <>
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {cityData.totalRows.toLocaleString()}
                  </div>
                  <div className="text-lg text-gray-600 mb-4">
                    건의 측정 데이터
                  </div>
                  <div className="text-2xl font-semibold text-blue-500 pt-4 border-t border-blue-200">
                    {cityData.value.toLocaleString()}개 측정소
                  </div>
                </>
              ) : (
                // 일반적인 경우
                <>
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {cityData.value.toLocaleString()}
                  </div>
                  <div className="text-lg text-gray-600">
                    {cityData.description.includes('시설') || cityData.description.includes('기관')
                      ? '개 시설'
                      : '건'}
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              * 서울시 전역 데이터
            </p>
          </div>
        </div>
      )}

      {/* 범례 (Legend) - 행정동 모드에서만 표시 */}
      {!isLoading && indicatorConfig && viewMode === 'dong' && (
        <div className="absolute bottom-8 left-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-sm mb-2">
            {indicatorConfig.label}
          </h3>
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
