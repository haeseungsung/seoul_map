'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Map, { Source, Layer, MapRef, LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { loadPopulationFromCSV } from '@/api/seoul-data';
import { parsePopulationCSV, type DistrictPopulation } from '@/utils/csv-parser';
import type { IndicatorType } from '@/app/page';
import { getIndicatorConfig } from '@/utils/map-utils';

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
  dongGeojsonData?: any; // 행정동 GeoJSON (API 지표 데이터 병합됨) - page.tsx에서 전달
  cityData?: { value: number; description: string; totalRows?: number }; // 시 전체 데이터 (totalRows: 원본 레코드 수)
}

export default function MapContainer({
  onDistrictClick,
  selectedIndicator,
  onGeojsonLoad,
  viewMode = 'dong',
  guGeojsonData: externalGuGeojsonData,
  dongGeojsonData: externalDongGeojsonData,
  cityData,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [populationData, setPopulationData] = useState<DistrictPopulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  console.log('🗺️ MapContainer 렌더링:', {
    viewMode,
    selectedIndicator,
    hasInternalGeojsonData: !!geojsonData,
    hasExternalDongData: !!externalDongGeojsonData,
    hasExternalGuData: !!externalGuGeojsonData,
    dataSource: externalDongGeojsonData ? 'external-api-dong' : (geojsonData ? 'internal-csv' : 'none')
  });

  // 행정동 API 데이터인 경우 첫 번째 feature 확인
  if (viewMode === 'dong' && externalDongGeojsonData) {
    console.log('📊 행정동 API GeoJSON 첫 번째 feature properties:',
      externalDongGeojsonData.features[0]?.properties);
    console.log(`   - selectedIndicator 필드("${selectedIndicator}") 존재?:`,
      externalDongGeojsonData.features[0]?.properties?.[selectedIndicator] !== undefined);
    console.log(`   - 값:`, externalDongGeojsonData.features[0]?.properties?.[selectedIndicator]);

    // 데이터 값 범위 확인
    const values = externalDongGeojsonData.features
      .map((f: any) => f.properties?.[selectedIndicator] || 0)
      .filter((v: number) => v > 0);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    console.log(`   - 데이터 값 범위: ${minValue} ~ ${maxValue} (0 제외)`);
    console.log(`   - 0이 아닌 값 개수: ${values.length}개`);
  }

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

  // 지도 클릭 이벤트 핸들러 (행정동)
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

  // 구 클릭 이벤트 핸들러
  const handleGuClick = (event: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ['seoul-gu-fill'],
    });

    if (features.length > 0) {
      const clickedFeature = features[0];
      console.log('🗺️ 클릭한 구:', clickedFeature.properties);

      const props = clickedFeature.properties;
      if (!props) return;

      // 부모 컴포넌트로 클릭 정보 전달 (대기질 포함 모든 데이터)
      if (onDistrictClick) {
        onDistrictClick(props);
      }
    }
  };

  // 선택된 지표에 따라 동적으로 레이어 생성
  const indicatorConfig = useMemo(() => {
    // 구 모드에서 대기질 데이터 확인
    if (viewMode === 'gu' && externalGuGeojsonData && selectedIndicator.includes('환경_정보')) {
      console.log('   🌫️ 구 모드: 대기질 데이터 감지, PM2.5 기준 색상 적용');
      console.log('   🔍 첫 번째 구 feature properties:', externalGuGeojsonData.features[0]?.properties);
      console.log('   🔍 selectedIndicator:', selectedIndicator);

      // 실제 PM2.5 값 확인
      const pm25Values = externalGuGeojsonData.features
        .map((f: any) => ({
          gu: f.properties?.gu_name,
          pm25: f.properties?.pm25,
          indicatorValue: f.properties?.[selectedIndicator]
        }))
        .slice(0, 3);
      console.log('   🔍 PM2.5 값 샘플 (처음 3개):', pm25Values);

      return getIndicatorConfig(selectedIndicator);
    }

    // 행정동 API 데이터가 있으면 실제 값 범위 기반으로 색상 생성
    if (viewMode === 'dong' && externalDongGeojsonData) {
      const values = externalDongGeojsonData.features
        .map((f: any) => f.properties?.[selectedIndicator] || 0)
        .filter((v: number) => v > 0);

      if (values.length > 0) {
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        console.log(`   🎨 행정동 데이터 범위: ${minValue.toLocaleString()} ~ ${maxValue.toLocaleString()}`);

        // 항상 데이터 기반 동적 색상 범위 생성
        const range = maxValue - minValue;
        const numStops = 8; // 8단계 색상

        const stops: [number, string][] = [[0, '#f3f4f6']]; // 회색 (0)

        const colors = [
          '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa',
          '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'
        ];

        // 균등 분할 (quantile 방식이 더 좋지만 일단 균등 분할)
        for (let i = 0; i < numStops; i++) {
          const value = minValue + (range * i / (numStops - 1));
          stops.push([Math.round(value), colors[i]]);
        }

        console.log(`   🎨 동적 색상 범위 생성: ${numStops}개 stops`, stops);

        return {
          property: selectedIndicator,
          label: selectedIndicator,
          unit: '명',
          stops,
        };
      }
    }

    // 기본 동작
    return getIndicatorConfig(selectedIndicator);
  }, [selectedIndicator, viewMode, externalDongGeojsonData, externalGuGeojsonData]);

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
    <div className="relative w-full h-screen" style={{ paddingRight: '320px' }}>
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
        onClick={viewMode === 'dong' ? handleMapClick : viewMode === 'gu' ? handleGuClick : undefined}
        interactiveLayerIds={viewMode === 'dong' ? ['seoul-districts-fill'] : ['seoul-gu-fill']}
      >
        {/* 행정동 모드: 행정동 레이어 표시 */}
        {/* API 데이터가 있으면 우선 사용, 없으면 CSV 데이터 사용 */}
        {viewMode === 'dong' && (externalDongGeojsonData || geojsonData) && (
          <Source id="seoul-districts" type="geojson" data={externalDongGeojsonData || geojsonData}>
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
                  ...indicatorConfig.stops.flatMap(([value, color]) => [value, color])
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
              minzoom={0}
              layout={{
                'text-field': ['coalesce', ['get', 'gu_name'], ['get', 'SIG_KOR_NM'], ''],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 15,
                'text-offset': [0, -1.5],
                'text-anchor': 'center',
                'text-allow-overlap': false,
                'text-optional': false,
              }}
              paint={{
                'text-color': '#000000',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2.5,
              }}
            />
            {/* 구 수치 텍스트 레이어 */}
            {indicatorConfig && (
              <Layer
                id="seoul-gu-values"
                type="symbol"
                layout={{
                  'text-field':
                    // 대기질 데이터인 경우 등급 표시 (좋음/보통/나쁨/매우나쁨)
                    selectedIndicator.includes('환경_정보')
                      ? ['get', 'airQualityLevel']
                      : [
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
