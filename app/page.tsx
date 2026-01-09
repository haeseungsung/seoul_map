'use client';

import { useState } from 'react';
import MapContainer from '@/components/MapContainer';
import ApiSelector from '@/components/ApiSelector';
import IndicatorSelector from '@/components/IndicatorSelector';
import DetailPanel from '@/components/DetailPanel';
import DataAnalysisPanel from '@/components/DataAnalysisPanel';
import { analyzeData, type DataAnalysis } from '@/utils/data-analyzer';
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

type ViewMode = 'dong' | 'gu';

interface SeoulApiService {
  id: string;
  name: string;
  category: string;
  district: string;
  mapCategory: string;
  serviceType: string;
}

export default function Home() {
  // 뷰 모드: 행정동(CSV) vs 구(API)
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

  // 공통
  const [selectedApi, setSelectedApi] = useState<SeoulApiService | null>(null);
  const [apiDataAnalysis, setApiDataAnalysis] = useState<DataAnalysis | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
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

  // 구 지표 선택 핸들러
  const handleGuIndicatorSelect = async (indicator: IndicatorMetadata) => {
    setSelectedGuIndicator(indicator);
    setIsLoadingGuIndicator(true);

    try {
      console.log('📊 구 지표 로드:', indicator.indicator_name);

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

      // 2. 구 GeoJSON에 병합
      const mergedGuGeojson = mergeIndicatorToGeojson(
        guGeojsonBase,
        indicatorData,
        indicator
      );
      setGuGeojsonData(mergedGuGeojson);
      console.log('✅ 지표 데이터를 구 지도에 병합 완료', mergedGuGeojson);
    } catch (error) {
      console.error('❌ 구 지표 로드 실패:', error);
      alert(`지표 로드 실패:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingGuIndicator(false);
    }
  };

  const handleApiSelect = async (service: SeoulApiService) => {
    setSelectedApi(service);
    setIsLoadingApi(true);
    setApiDataAnalysis(null);

    try {
      console.log('🔍 API 데이터 가져오기:', service.id);

      // Check if this is a LOCALDATA API that needs merging
      const isLocalData = service.id.startsWith('LOCALDATA_');

      const apiUrl = isLocalData
        ? `/api/localdata-merge?serviceId=${service.id}`
        : `/api/seoul-fetch?serviceId=${service.id}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '데이터 가져오기 실패');
      }

      // Analyze the data
      const analysis = analyzeData(result.data);
      setApiDataAnalysis(analysis);

      console.log('✅ API 데이터 분석 완료:', analysis);
    } catch (error) {
      console.error('❌ API 데이터 가져오기 실패:', error);
      alert(`데이터 가져오기 실패:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingApi(false);
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
    <main className="relative w-full h-screen">
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
            {/* 뷰 모드 토글 */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('dong')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'dong'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                행정동 (CSV)
              </button>
              <button
                onClick={() => setViewMode('gu')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === 'gu'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                구 (API)
              </button>
            </div>

            {/* 행정동 모드 - 인구 지표 */}
            {viewMode === 'dong' && (
              <div className="flex items-center gap-2">
                <label htmlFor="indicator" className="text-sm font-medium text-gray-700">
                  인구 지표:
                </label>
                <select
                  id="indicator"
                  value={selectedIndicator}
                  onChange={(e) => setSelectedIndicator(e.target.value as IndicatorType)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {indicators.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 구 모드 - LOCALDATA 지표 */}
            {viewMode === 'gu' && (
              <>
                <IndicatorSelector
                  onIndicatorSelect={handleGuIndicatorSelect}
                  selectedIndicatorId={selectedGuIndicator?.indicator_id}
                />
                {isLoadingGuIndicator && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>지표 로딩 중...</span>
                  </div>
                )}
              </>
            )}

            {/* API 선택 (분석용) */}
            <div className="w-80">
              <ApiSelector
                onApiSelect={handleApiSelect}
                selectedApiId={selectedApi?.id}
              />
            </div>

            {isLoadingApi && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>API 데이터 로딩 중...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 지도 컨테이너 */}
      <div className="pt-16 w-full h-full">
        <MapContainer
          onDistrictClick={handleDistrictClick}
          selectedIndicator={
            viewMode === 'dong'
              ? selectedIndicator
              : (selectedGuIndicator?.indicator_id as any) || 'population'
          }
          onGeojsonLoad={handleGeojsonLoad}
          viewMode={viewMode}
          guGeojsonData={guGeojsonData}
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

      {/* DataAnalysisPanel - API 데이터 분석 결과 */}
      {apiDataAnalysis && selectedApi && (
        <DataAnalysisPanel
          analysis={apiDataAnalysis}
          apiName={selectedApi.name}
          onClose={() => {
            setApiDataAnalysis(null);
            setSelectedApi(null);
          }}
        />
      )}
    </main>
  );
}
