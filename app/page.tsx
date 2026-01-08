'use client';

import { useState } from 'react';
import MapContainer from '@/components/MapContainer';
import { testPopulationAPI, loadPopulationFromCSV } from '@/api/seoul-data';
import { parsePopulationCSV } from '@/utils/csv-parser';

export type IndicatorType =
  | 'population'
  | 'households'
  | 'male'
  | 'female'
  | 'male_ratio'
  | 'female_ratio';

export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [selectedIndicator, setSelectedIndicator] =
    useState<IndicatorType>('population');

  const handleDistrictClick = (properties: any) => {
    setSelectedDistrict(properties);
  };

  // API 테스트 함수 (현재 작동하지 않음)
  const handleTestAPI = async () => {
    try {
      console.log('🧪 API 테스트 시작...');
      await testPopulationAPI();
    } catch (error) {
      console.error('API 테스트 실패:', error);
    }
  };

  // CSV 테스트 함수
  const handleTestCSV = async () => {
    try {
      console.log('📁 CSV 테스트 시작...');
      const csvText = await loadPopulationFromCSV();
      const populationData = parsePopulationCSV(csvText);

      console.log('✅ CSV 파싱 완료:');
      console.log('- 총 행정동 수:', populationData.length);
      console.log('- 샘플 데이터 (처음 5개):');
      populationData.slice(0, 5).forEach((d) => {
        console.log(`  ${d.gu} ${d.dong}: ${d.population.toLocaleString()}명`);
      });

      // 총 인구 계산
      const totalPopulation = populationData.reduce(
        (sum, d) => sum + d.population,
        0
      );
      console.log('- 총 인구:', totalPopulation.toLocaleString(), '명');
    } catch (error) {
      console.error('CSV 테스트 실패:', error);
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
            {/* 지표 선택 드롭다운 */}
            <div className="flex items-center gap-2">
              <label htmlFor="indicator" className="text-sm font-medium text-gray-700">
                표시 지표:
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

            <div className="flex gap-2">
              <button
                onClick={handleTestCSV}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition"
              >
                CSV 테스트
              </button>
              <button
                onClick={handleTestAPI}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
              >
                API 테스트
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 지도 컨테이너 */}
      <div className="pt-16 w-full h-full">
        <MapContainer
          onDistrictClick={handleDistrictClick}
          selectedIndicator={selectedIndicator}
        />
      </div>

      {/* 클릭된 지역 정보 표시 (임시) */}
      {selectedDistrict && (
        <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-sm">
          <h3 className="font-bold text-lg mb-2">선택된 지역</h3>
          <pre className="text-xs overflow-auto max-h-60 bg-gray-50 p-2 rounded">
            {JSON.stringify(selectedDistrict, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
