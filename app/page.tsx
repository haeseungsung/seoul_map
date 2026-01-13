'use client';

import { useState, useEffect } from 'react';
import MapContainer from '@/components/MapContainer';
import HierarchicalIndicatorSelector from '@/components/HierarchicalIndicatorSelector';
import DetailPanel from '@/components/DetailPanel';
import {
  loadIndicatorData,
  mergeIndicatorToGeojson,
  type IndicatorMetadata,
} from '@/utils/indicator-loader';
import {
  calculateSeoulAverage,
  calculateGuAverage,
  calculateComparison,
} from '@/utils/map-utils';

export type IndicatorType =
  | 'population'
  | 'households'
  | 'male'
  | 'female'
  | 'male_ratio'
  | 'female_ratio';

type ViewMode = 'dong' | 'gu' | 'city';

export default function Home() {
  // 뷰 모드: 행정동(CSV) vs 구(API) vs 시 전체(API)
  const [viewMode, setViewMode] = useState<ViewMode>('dong');

  // 행정동 모드 state
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [selectedIndicator, setSelectedIndicator] =
    useState<IndicatorType>('population');

  // 구 모드 state
  const [selectedGuIndicator, setSelectedGuIndicator] = useState<IndicatorMetadata | null>(null);
  const [isLoadingGuIndicator, setIsLoadingGuIndicator] = useState(false);
  const [guGeojsonData, setGuGeojsonData] = useState<any>(null); // 구 GeoJSON (지표 데이터 병합됨)
  const [baseGuGeojsonData, setBaseGuGeojsonData] = useState<any>(null); // 원본 구 GeoJSON

  // 시 전체 모드 state
  const [cityData, setCityData] = useState<{ value: number; description: string; totalRows?: number } | null>(null);

  // 공통
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [baseGeojsonData, setBaseGeojsonData] = useState<any>(null); // 원본 GeoJSON

  // MapContainer에서 enriched geojson을 받아옴 (행정동)
  const handleGeojsonLoad = (enrichedGeojson: any) => {
    setBaseGeojsonData(enrichedGeojson); // 원본 저장
    setGeojsonData(enrichedGeojson);
  };

  const handleDistrictClick = (properties: any) => {
    setSelectedDistrict(properties);
  };

  // 구 모드로 전환 시 구 GeoJSON 자동 로드
  useEffect(() => {
    if (viewMode === 'gu' && !baseGuGeojsonData) {
      const loadGuGeojson = async () => {
        try {
          console.log('🗺️ 구 GeoJSON 자동 로드 시작...');
          const response = await fetch('/data/seoul-gu.geojson');
          const guGeojson = await response.json();
          setBaseGuGeojsonData(guGeojson);
          setGuGeojsonData(guGeojson); // 기본 구 지도 표시
          console.log('✅ 구 GeoJSON 로드 완료');
        } catch (error) {
          console.error('❌ 구 GeoJSON 로드 실패:', error);
        }
      };
      loadGuGeojson();
    }
  }, [viewMode, baseGuGeojsonData]);

  // 구/시 전체 지표 선택 핸들러
  const handleGuIndicatorSelect = async (indicator: IndicatorMetadata) => {
    setSelectedGuIndicator(indicator);
    setIsLoadingGuIndicator(true);

    try {
      console.log('📊 지표 로드:', indicator.indicator_name, '(spatial_grain:', indicator.spatial_grain + ')');
      console.log('   - indicator_id:', indicator.indicator_id);
      console.log('   - source_pattern:', indicator.source_pattern);
      console.log('   - family:', indicator.family);

      // City-level 지표인 경우
      if (indicator.spatial_grain === 'city') {
        console.log('🏙️ 서울시 전체 데이터 로드');
        const indicatorData = await loadIndicatorData(indicator);

        if (indicatorData.length > 0 && indicatorData[0].gu === 'seoul') {
          setCityData({
            value: indicatorData[0].value,
            description: indicator.description || indicator.indicator_name,
            totalRows: indicatorData[0].totalRows
          });
          console.log('✅ 서울시 전체 데이터 설정 완료:', indicatorData[0].value, indicatorData[0].totalRows ? `(원본: ${indicatorData[0].totalRows}건)` : '');
        } else {
          console.warn('⚠️ 서울시 전체 데이터가 없습니다');
          alert('⚠️ 이 지표는 데이터가 제공되지 않습니다.');
        }
        setIsLoadingGuIndicator(false);
        return;
      }

      // 행정동 레벨 지표인 경우
      if (indicator.spatial_grain === 'dong') {
        console.log('🏘️ 행정동 단위 데이터 로드');

        // 행정동 GeoJSON 로드
        let dongGeojsonBase = baseGeojsonData;
        if (!dongGeojsonBase) {
          const response = await fetch('/data/seoul-hangjeongdong.geojson');
          dongGeojsonBase = await response.json();
          setBaseGeojsonData(dongGeojsonBase);
          console.log('✅ 행정동 GeoJSON 로드 완료');
        }

        // 지표 데이터 로드
        const indicatorData = await loadIndicatorData(indicator);

        // 값이 모두 0인지 확인
        const allZero = indicatorData.every(v => v.value === 0);
        if (allZero) {
          console.warn('⚠️ 모든 행정동의 값이 0입니다.');
          alert('⚠️ 이 지표는 데이터가 제공되지 않을 수 있습니다.');
        }

        // 행정동 GeoJSON에 병합
        const mergedDongGeojson = mergeIndicatorToGeojson(
          dongGeojsonBase,
          indicatorData,
          indicator
        );
        setGeojsonData(mergedDongGeojson);
        console.log('✅ 지표 데이터를 행정동 지도에 병합 완료');
        console.log('   - indicator_id:', indicator.indicator_id);
        console.log('   - 데이터 개수:', indicatorData.length);

        setIsLoadingGuIndicator(false);
        return;
      }

      // 구 레벨 지표인 경우
      // 0. 구 GeoJSON이 없으면 먼저 로드
      let guGeojsonBase = baseGuGeojsonData;
      if (!guGeojsonBase) {
        const response = await fetch('/data/seoul-gu.geojson');
        guGeojsonBase = await response.json();
        setBaseGuGeojsonData(guGeojsonBase);
        console.log('✅ 구 GeoJSON 로드 완료');
      }

      // 1. 지표 데이터 로드 (25개 구 병합)
      const indicatorData = await loadIndicatorData(indicator);

      console.log('📊 로드된 지표 데이터 샘플 (처음 3개):');
      indicatorData.slice(0, 3).forEach(d => {
        console.log(`   - gu: "${d.gu}", value: ${d.value}`);
      });

      // 값이 모두 0인지 확인
      const allZero = indicatorData.every(v => v.value === 0);
      if (allZero) {
        console.warn('⚠️ 모든 구의 값이 0입니다. 데이터가 제공되지 않을 수 있습니다.');
        alert(
          '⚠️ 이 지표는 데이터가 0이거나 제공되지 않을 수 있습니다.\n\n' +
          '자세한 사항은 서울 열린데이터광장(https://data.seoul.go.kr)을 참고하세요.'
        );
      }

      // 2. 구 GeoJSON에 병합
      console.log('🔗 GeoJSON 병합 시작:');
      console.log('   - indicator_id:', indicator.indicator_id);
      console.log('   - spatial_grain:', indicator.spatial_grain);
      console.log('   - GeoJSON 구 샘플 (처음 3개):', guGeojsonBase.features.slice(0, 3).map((f: any) => f.properties?.gu_name));

      const mergedGuGeojson = mergeIndicatorToGeojson(
        guGeojsonBase,
        indicatorData,
        indicator
      );
      setGuGeojsonData(mergedGuGeojson);
      console.log('✅ 지표 데이터를 구 지도에 병합 완료');
      console.log('   - 데이터 개수:', indicatorData.length);
      console.log('   - 첫 번째 feature properties:', mergedGuGeojson.features[0]?.properties);
      console.log(`   - ${indicator.indicator_id} 필드 존재 여부:`, mergedGuGeojson.features[0]?.properties?.[indicator.indicator_id] !== undefined);
      console.log(`   - ${indicator.indicator_id} 값:`, mergedGuGeojson.features[0]?.properties?.[indicator.indicator_id]);
    } catch (error) {
      console.error('❌ 지표 로드 실패:', error);
      alert(`지표 로드 실패:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingGuIndicator(false);
    }
  };

  const indicators = [
    { value: 'population', label: '총 인구' },
    { value: 'households', label: '가구 수' },
    { value: 'male', label: '남자 인구' },
    { value: 'female', label: '여자 인구' },
    { value: 'male_ratio', label: '남자 비율 (%)' },
    { value: 'female_ratio', label: '여자 비율 (%)' },
  ] as const;

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              서울시 행정동 인터랙티브 지도
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              데이터 기준: 2025년 3/4분기 등록인구
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* 공간 단위 선택 */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('city')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'city'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                시 전체
              </button>
              <button
                onClick={() => setViewMode('gu')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'gu'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                구 단위
              </button>
              <button
                onClick={() => setViewMode('dong')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'dong'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                행정동 단위
              </button>
            </div>

            {/* 통합 지표 선택 */}
            <HierarchicalIndicatorSelector
              onIndicatorSelect={handleGuIndicatorSelect}
              selectedIndicatorId={selectedGuIndicator?.indicator_id}
              filterSpatialGrain={viewMode}
            />
            {isLoadingGuIndicator && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>지표 로딩 중...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 지도 컨테이너 */}
      <div className="absolute inset-0 pt-16">
        <MapContainer
          onDistrictClick={handleDistrictClick}
          selectedIndicator={
            viewMode === 'dong'
              ? selectedIndicator
              : (selectedGuIndicator?.indicator_id as any) || 'placeholder'
          }
          onGeojsonLoad={handleGeojsonLoad}
          viewMode={viewMode}
          guGeojsonData={guGeojsonData}
          cityData={viewMode === 'city' ? cityData || undefined : undefined}
        />
      </div>

      {/* DetailPanel - 선택된 행정동 정보 및 비교 */}
      {selectedDistrict && geojsonData && (() => {
        const fullName = selectedDistrict.adm_nm || '';
        const parts = fullName.split(' ');
        const guName = selectedDistrict.gu_name || parts[1] || '';
        const districtName = selectedDistrict.dong_name || parts[parts.length - 1] || '';
        const districtValue = selectedDistrict[selectedIndicator] || 0;
        const seoulAvg = calculateSeoulAverage(geojsonData, selectedIndicator);
        const guAvg = calculateGuAverage(geojsonData, guName, selectedIndicator);
        const comparison = calculateComparison(districtValue, seoulAvg, guAvg, selectedIndicator);

        console.log('🔍 DetailPanel 디버그:', {
          선택된행정동: districtName,
          구이름: guName,
          구평균: guAvg,
          행정동값: districtValue,
          비교결과: comparison,
        });

        return (
          <DetailPanel
            districtName={districtName}
            guName={guName}
            districtValue={districtValue}
            seoulAverage={seoulAvg}
            guAverage={guAvg}
            seoulDiff={comparison.seoulDiff}
            guDiff={comparison.guDiff}
            seoulMessage={comparison.seoulMessage}
            guMessage={comparison.guMessage}
            indicator={selectedIndicator}
            onClose={() => setSelectedDistrict(null)}
          />
        );
      })()}
    </main>
  );
}
