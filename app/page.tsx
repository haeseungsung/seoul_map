'use client';

import { useState, useEffect } from 'react';
import MapContainer from '@/components/MapContainer';
import HierarchicalIndicatorSelector from '@/components/HierarchicalIndicatorSelector';
import DetailPanel from '@/components/DetailPanel';
import TimeSlider from '@/components/TimeSlider';
import AirQualityComparePanel from '@/components/AirQualityComparePanel';
import LandingHero from '@/components/LandingHero';
import RankingSidebar from '@/components/RankingSidebar';
import OnboardingTour from '@/components/OnboardingTour';
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

/**
 * 생활인구 지표인지 확인
 */
function isLivingPopulation(indicator: IndicatorMetadata): boolean {
  return indicator.indicator_id.includes('OA-14991') ||
         indicator.indicator_id.includes('생활인구') ||
         indicator.indicator_name.includes('생활인구');
}

export default function Home() {
  // 랜딩 페이지 state
  const [showLanding, setShowLanding] = useState(true);

  // 온보딩 투어 state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 뷰 모드: 행정동(CSV) vs 구(API) vs 시 전체(API)
  const [viewMode, setViewMode] = useState<ViewMode>('gu'); // 기본값을 구 모드로 변경

  // 행정동 모드 state (CSV 전용)
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [selectedIndicator, setSelectedIndicator] =
    useState<IndicatorType>('population');

  // API 지표 state (구/행정동/시 전체 공통)
  const [selectedGuIndicator, setSelectedGuIndicator] = useState<IndicatorMetadata | null>(null);
  const [isLoadingGuIndicator, setIsLoadingGuIndicator] = useState(false);
  const [guGeojsonData, setGuGeojsonData] = useState<any>(null); // 구 GeoJSON (지표 데이터 병합됨)
  const [baseGuGeojsonData, setBaseGuGeojsonData] = useState<any>(null); // 원본 구 GeoJSON

  // 시 전체 모드 state
  const [cityData, setCityData] = useState<{ value: number; description: string; totalRows?: number } | null>(null);

  // 시간대 필터 state (생활인구 전용)
  const [selectedTimeHour, setSelectedTimeHour] = useState<number | null>(null);

  // 공통
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [baseGeojsonData, setBaseGeojsonData] = useState<any>(null); // 원본 GeoJSON

  console.log('📊 page.tsx 상태:', {
    viewMode,
    selectedIndicator: selectedIndicator,
    selectedGuIndicator: selectedGuIndicator?.indicator_id,
    hasGeojsonData: !!geojsonData,
  });

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

  // 구 GeoJSON 로드 완료 후 대기질 지표 자동 로드
  useEffect(() => {
    if (viewMode === 'gu' && baseGuGeojsonData && !selectedGuIndicator) {
      console.log('🌫️ 앱 시작: 대기질 지표 자동 로드');
      const airQualityIndicator: IndicatorMetadata = {
        family: '환경_정보',
        indicator_id: '환경_정보_대기오염_OA-2219',
        indicator_name: '대기오염',
        metric_type: 'avg',
        spatial_grain: 'gu',
        source_pattern: 'MULTI_GU:all',
        value_field: '',
        aggregation_method: JSON.stringify([{ gu: 'all', id: 'OA-2219' }]),
        description: '서울시 권역별 실시간 대기환경 현황'
      };
      handleGuIndicatorSelect(airQualityIndicator);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, baseGuGeojsonData]);

  // 시간대 변경 시 생활인구 데이터 다시 로드
  useEffect(() => {
    if (selectedGuIndicator && isLivingPopulation(selectedGuIndicator)) {
      console.log(`⏰ 시간대 변경 감지 (${selectedTimeHour === null ? '전체' : selectedTimeHour + '시'}) - 데이터 재로드`);
      handleGuIndicatorSelect(selectedGuIndicator);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeHour]);

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
        // 시간대 옵션 전달 (생활인구인 경우)
        const options = isLivingPopulation(indicator) && selectedTimeHour !== null
          ? { timeHour: selectedTimeHour }
          : undefined;
        const indicatorData = await loadIndicatorData(indicator, options);

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

        // 지표 데이터 로드 (시간대 옵션 전달)
        const options = isLivingPopulation(indicator) && selectedTimeHour !== null
          ? { timeHour: selectedTimeHour }
          : undefined;
        const indicatorData = await loadIndicatorData(indicator, options);

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
        console.log('   - 첫 번째 feature properties:', mergedDongGeojson.features[0]?.properties);
        console.log('📤 page.tsx → MapContainer에 dongGeojsonData 전달 (행정동 API 데이터)');

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

      // 1. 지표 데이터 로드 (25개 구 병합, 시간대 옵션 전달)
      const options = isLivingPopulation(indicator) && selectedTimeHour !== null
        ? { timeHour: selectedTimeHour }
        : undefined;
      const indicatorData = await loadIndicatorData(indicator, options);

      console.log('📊 로드된 지표 데이터 샘플 (처음 3개):');
      indicatorData.slice(0, 3).forEach(d => {
        console.log(`   - gu: "${d.gu}", value: ${d.value}, 전체 데이터:`, d);
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

  // 랜딩 히어로 닫기 핸들러
  const handleStartMap = () => {
    setShowLanding(false);
    // 랜딩 닫은 후 약간의 딜레이를 주고 온보딩 시작
    setTimeout(() => {
      setShowOnboarding(true);
    }, 500);
  };

  // 온보딩 완료 핸들러
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* 랜딩 히어로 */}
      {showLanding && <LandingHero onStart={handleStartMap} />}

      {/* 헤더 - 사이드바 공간 제외 */}
      <div className="absolute top-0 left-0 right-0 z-[5] bg-gray-900 border-b border-gray-800 shadow-xl overflow-visible">
        <div className="px-6 py-4 flex items-center justify-between overflow-visible">
          <div className="flex-1">
            {selectedGuIndicator ? (
              <>
                <h1 className="text-lg font-bold text-white">
                  {selectedGuIndicator.description || selectedGuIndicator.indicator_name}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  주제: {selectedGuIndicator.indicator_name} • 출처: 서울열린데이터광장
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-bold text-white">
                  서울 열린데이터광장
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  지표를 선택하여 서울시 오픈데이터를 시각화하세요
                </p>
              </>
            )}
          </div>
          <div className="flex gap-3 items-center">
            {/* 공간 단위 선택 */}
            <div className="view-mode-selector flex items-center gap-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('city')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'city'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                시 전체
              </button>
              <button
                onClick={() => setViewMode('gu')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'gu'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                구 단위
              </button>
              <button
                onClick={() => setViewMode('dong')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'dong'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                행정동 단위
              </button>
            </div>

            {/* 로딩 표시 */}
            {isLoadingGuIndicator && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>지표 로딩 중...</span>
              </div>
            )}
          </div>
        </div>

        {/* 시간대 슬라이더 (생활인구일 때만) */}
        {selectedGuIndicator && isLivingPopulation(selectedGuIndicator) && (
          <div className="px-6 pb-4">
            <TimeSlider
              value={selectedTimeHour}
              onChange={setSelectedTimeHour}
              disabled={isLoadingGuIndicator}
            />
          </div>
        )}
      </div>

      {/* 지도 컨테이너 */}
      <div className="map-container absolute inset-0 pt-16 z-0">
        <MapContainer
          onDistrictClick={handleDistrictClick}
          selectedIndicator={
            // API 지표가 선택되었으면 indicator_id 사용, 없으면 CSV 지표 사용
            selectedGuIndicator?.indicator_id ||
            (viewMode === 'dong' ? selectedIndicator : 'placeholder')
          }
          onGeojsonLoad={handleGeojsonLoad}
          viewMode={viewMode}
          guGeojsonData={guGeojsonData}
          dongGeojsonData={viewMode === 'dong' ? geojsonData : undefined}
          cityData={viewMode === 'city' ? cityData || undefined : undefined}
        />
      </div>

      {/* 온보딩 투어 */}
      <OnboardingTour isActive={showOnboarding} onComplete={handleOnboardingComplete} />

      {/* RankingSidebar - 모든 구 단위 지표에 대한 TOP 3 / BOTTOM 3 */}
      {viewMode === 'gu' && selectedGuIndicator && (() => {
        console.log('🎯 RankingSidebar 렌더링 조건 확인:', {
          viewMode,
          selectedGuIndicator: selectedGuIndicator?.indicator_id,
          isLoadingGuIndicator,
          hasGuGeojsonData: !!guGeojsonData
        });

        const isAirQuality = selectedGuIndicator.indicator_id.includes('환경_정보');
        const indicatorId = selectedGuIndicator.indicator_id;

        // 대기질 데이터인 경우
        if (isAirQuality) {
          const excludedGu = ['은평구', '송파구', '구로구']; // 데이터 없는 구
          const allGuData = guGeojsonData?.features
            ? guGeojsonData.features
                .filter((f: any) => {
                  const guName = f.properties.gu_name || f.properties.SIG_KOR_NM || '';
                  return f.properties?.pm25 !== undefined &&
                         f.properties?.pm25 > 0 &&
                         !excludedGu.includes(guName);
                })
                .map((f: any) => ({
                  gu_name: f.properties.gu_name || f.properties.SIG_KOR_NM || '',
                  value: f.properties.pm25 || 0,
                  displayValue: f.properties.airQualityLevel || '보통',
                }))
            : [];

          const handleGuClick = (guName: string) => {
            if (!guGeojsonData) return;
            const feature = guGeojsonData.features.find(
              (f: any) => f.properties?.gu_name === guName || f.properties?.SIG_KOR_NM === guName
            );
            if (feature) {
              setSelectedDistrict(feature.properties);
            }
          };

          return (
            <RankingSidebar
              allGuData={allGuData}
              onGuClick={handleGuClick}
              indicatorName="PM2.5"
              unit="μg/m³"
              isAirQuality={true}
              isLoading={isLoadingGuIndicator}
              indicatorSelector={
                <HierarchicalIndicatorSelector
                  onIndicatorSelect={handleGuIndicatorSelect}
                  selectedIndicatorId={selectedGuIndicator?.indicator_id}
                  filterSpatialGrain={viewMode}
                />
              }
            />
          );
        }

        // 일반 지표 데이터 (생활인구, 업종 등)
        const allGuData = guGeojsonData?.features
          ? guGeojsonData.features
              .filter((f: any) => f.properties?.[indicatorId] !== undefined && f.properties?.[indicatorId] > 0)
              .map((f: any) => ({
                gu_name: f.properties.gu_name || f.properties.SIG_KOR_NM || '',
                value: f.properties[indicatorId] || 0,
              }))
          : [];

        // 로딩 중이 아닌데 데이터가 없으면 null 반환
        if (allGuData.length === 0 && !isLoadingGuIndicator) return null;

        const handleGuClick = (guName: string) => {
          if (!guGeojsonData) return;
          const feature = guGeojsonData.features.find(
            (f: any) => f.properties?.gu_name === guName || f.properties?.SIG_KOR_NM === guName
          );
          if (feature) {
            setSelectedDistrict(feature.properties);
          }
        };

        // 단위 추출
        const getUnit = () => {
          if (selectedGuIndicator.indicator_name.includes('생활인구') || selectedGuIndicator.indicator_name.includes('인구')) {
            return '명';
          }
          if (selectedGuIndicator.indicator_name.includes('영업률') || selectedGuIndicator.indicator_name.includes('비율') || selectedGuIndicator.indicator_name.includes('률')) {
            return '%';
          }
          return '개';
        };

        return (
          <RankingSidebar
            allGuData={allGuData}
            onGuClick={handleGuClick}
            indicatorName={selectedGuIndicator.indicator_name}
            unit={getUnit()}
            isAirQuality={false}
            isLoading={isLoadingGuIndicator}
            indicatorSelector={
              <HierarchicalIndicatorSelector
                onIndicatorSelect={handleGuIndicatorSelect}
                selectedIndicatorId={selectedGuIndicator?.indicator_id}
                filterSpatialGrain={viewMode}
              />
            }
          />
        );
      })()}

      {/* AirQualityComparePanel - 구 단위 대기질 비교 */}
      {selectedDistrict && guGeojsonData && viewMode === 'gu' && selectedGuIndicator?.indicator_id.includes('환경_정보') && (() => {
        const guName = selectedDistrict.gu_name || selectedDistrict.SIG_KOR_NM || '알 수 없음';
        const pm10 = selectedDistrict.pm10 || 0;
        const pm25 = selectedDistrict.pm25 || 0;
        const airQualityLevel = selectedDistrict.airQualityLevel || '보통';
        const stationCount = selectedDistrict.stationCount || 0;

        // 데이터가 없는 구인지 확인 (PM25가 0이면 데이터 없음)
        const hasData = pm25 > 0;

        // 추가 대기환경 데이터
        const ozon = selectedDistrict.ozon;
        const no2 = selectedDistrict.no2;
        const co = selectedDistrict.co;
        const caiIndex = selectedDistrict.caiIndex;

        // 모든 구의 대기질 데이터 추출
        const allGuData = guGeojsonData.features
          .filter((f: any) => f.properties?.pm25 !== undefined && f.properties?.pm25 > 0)
          .map((f: any) => ({
            gu_name: f.properties.gu_name || f.properties.SIG_KOR_NM || '',
            pm10: f.properties.pm10 || 0,
            pm25: f.properties.pm25 || 0,
            airQualityLevel: f.properties.airQualityLevel || '보통',
            stationCount: f.properties.stationCount || 0,
          }));

        console.log('🌫️ 대기질 패널 데이터:', {
          선택된구: guName,
          PM25: pm25,
          등급: airQualityLevel,
          전체구수: allGuData.length,
          데이터존재: hasData,
          추가데이터: { ozon, no2, co, caiIndex }
        });

        // 데이터가 없으면 "데이터 없음" 패널 표시
        if (!hasData) {
          return (
            <div className="absolute top-20 right-4 w-96 bg-white rounded-lg shadow-xl z-20 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{guName}</h2>
                  <p className="text-sm text-gray-500 mt-1">대기질 정보</p>
                </div>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                  aria-label="닫기"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  데이터가 없습니다
                </h3>
                <p className="text-sm text-gray-600">
                  이 구는 현재 대기질 측정소가 없어<br />
                  데이터를 제공하지 않습니다.
                </p>
              </div>
            </div>
          );
        }

        return (
          <AirQualityComparePanel
            guName={guName}
            pm10={pm10}
            pm25={pm25}
            airQualityLevel={airQualityLevel as any}
            stationCount={stationCount}
            ozon={ozon}
            no2={no2}
            co={co}
            caiIndex={caiIndex}
            allGuData={allGuData}
            onClose={() => setSelectedDistrict(null)}
          />
        );
      })()}

      {/* 구 단위 일반 지표 상세 패널 */}
      {selectedDistrict && guGeojsonData && viewMode === 'gu' && selectedGuIndicator && !selectedGuIndicator.indicator_id.includes('환경_정보') && (() => {
        const guName = selectedDistrict.gu_name || selectedDistrict.SIG_KOR_NM || '알 수 없음';
        const indicatorId = selectedGuIndicator.indicator_id;
        const value = selectedDistrict[indicatorId] || 0;

        // 데이터 존재 여부 확인
        const hasData = value > 0;

        // 데이터가 없으면 "데이터 없음" 패널 표시
        if (!hasData) {
          return (
            <div className="absolute top-20 right-4 w-96 bg-white rounded-lg shadow-xl z-20 p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{guName}</h2>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                  aria-label="닫기"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">데이터가 없습니다</h3>
                <p className="text-sm text-gray-600 mb-3">
                  이 구는 현재 {selectedGuIndicator.indicator_name}에 대한<br />
                  데이터를 제공하지 않습니다.
                </p>
                <p className="text-xs text-gray-500">
                  자세한 사항은 서울 열린데이터광장<br />
                  (<a href="https://data.seoul.go.kr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://data.seoul.go.kr</a>)을 참고하세요.
                </p>
              </div>
            </div>
          );
        }

        // 단위 결정
        const getUnit = () => {
          if (selectedGuIndicator.indicator_name.includes('생활인구') || selectedGuIndicator.indicator_name.includes('인구')) {
            return '명';
          }
          if (selectedGuIndicator.indicator_name.includes('영업률') || selectedGuIndicator.indicator_name.includes('비율') || selectedGuIndicator.indicator_name.includes('률')) {
            return '%';
          }
          return '개';
        };

        // 서울시 전체 평균 계산
        const allGuValues = guGeojsonData.features
          .map((f: any) => f.properties?.[indicatorId] || 0)
          .filter((v: number) => v > 0);
        const seoulAvg = allGuValues.length > 0
          ? allGuValues.reduce((sum: number, v: number) => sum + v, 0) / allGuValues.length
          : 0;

        // 순위 계산
        const sortedData = guGeojsonData.features
          .map((f: any) => ({
            gu_name: f.properties.gu_name || f.properties.SIG_KOR_NM || '',
            value: f.properties[indicatorId] || 0,
          }))
          .filter((d: any) => d.value > 0)
          .sort((a: any, b: any) => b.value - a.value);

        const myRank = sortedData.findIndex((d: any) => d.gu_name === guName) + 1;
        const totalGu = sortedData.length;

        // 비교 메시지
        const diff = ((value - seoulAvg) / seoulAvg) * 100;
        const compareMessage = diff > 10
          ? `서울시 전체 구 평균보다 ${Math.round(diff)}% 높습니다`
          : diff < -10
          ? `서울시 전체 구 평균보다 ${Math.abs(Math.round(diff))}% 낮습니다`
          : `서울시 전체 구 평균과 비슷한 수준입니다`;

        return (
          <div className="absolute top-20 right-4 w-96 bg-white rounded-lg shadow-xl z-20 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100dvh - 6rem)' }}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-white flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{guName}</h2>
                  <p className="text-sm text-blue-100 mt-1">{selectedGuIndicator.indicator_name}</p>
                </div>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="text-white hover:text-blue-200 transition"
                  aria-label="닫기"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* 현재 구 수치 */}
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-blue-600 mb-1">
                  {getUnit() === '%' ? value.toFixed(1) : (value >= 1000 ? value.toLocaleString() : value)}
                </div>
                <div className="text-sm text-gray-600">
                  {getUnit()}
                </div>
              </div>

              {/* 서울시 순위 */}
              {myRank > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    📊 서울시 25개 구 중 순위
                  </h3>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {myRank}위 <span className="text-lg text-gray-500">/ {totalGu}개 구</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 서울시 전체 구 평균 비교 */}
              {seoulAvg > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    📈 서울시 전체 구 평균 비교
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">{guName}</div>
                        <div className="text-xl font-bold text-gray-900">
                          {getUnit() === '%' ? value.toFixed(1) : (value >= 1000 ? value.toLocaleString() : value)}
                        </div>
                      </div>
                      <div className="text-gray-400 text-2xl">vs</div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">전체 구 평균</div>
                        <div className="text-xl font-bold text-gray-900">
                          {getUnit() === '%' ? seoulAvg.toFixed(1) : (seoulAvg >= 1000 ? Math.round(seoulAvg).toLocaleString() : Math.round(seoulAvg))}
                        </div>
                      </div>
                    </div>
                    <div className="text-center pt-2 border-t border-gray-200">
                      <span className={`text-sm font-medium ${diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                        {compareMessage}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="bg-gray-50 px-5 py-3 border-t flex-shrink-0">
              <p className="text-xs text-gray-500">
                💡 지도에서 다른 구를 클릭하면 비교 결과가 업데이트됩니다
              </p>
            </div>
          </div>
        );
      })()}

      {/* DetailPanel - 선택된 행정동 정보 및 비교 */}
      {selectedDistrict && geojsonData && viewMode === 'dong' && (() => {
        const fullName = selectedDistrict.adm_nm || '';
        const parts = fullName.split(' ');
        const guName = selectedDistrict.gu_name || parts[1] || '';
        const districtName = selectedDistrict.dong_name || parts[parts.length - 1] || '';

        // API 지표가 선택되었으면 indicator_id 사용, 아니면 CSV 지표 사용
        const currentIndicator = selectedGuIndicator?.indicator_id || selectedIndicator;
        const districtValue = selectedDistrict[currentIndicator] || 0;
        const seoulAvg = calculateSeoulAverage(geojsonData, currentIndicator as any);
        const guAvg = calculateGuAverage(geojsonData, guName, currentIndicator as any);
        const comparison = calculateComparison(districtValue, seoulAvg, guAvg, currentIndicator as any);

        console.log('🔍 DetailPanel 디버그:', {
          선택된행정동: districtName,
          구이름: guName,
          현재지표: currentIndicator,
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
            indicator={currentIndicator as any}
            onClose={() => setSelectedDistrict(null)}
          />
        );
      })()}
    </main>
  );
}
