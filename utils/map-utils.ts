/**
 * 지도 유틸리티 함수
 * - 색상 계산
 * - GeoJSON 처리
 */

import type { IndicatorType } from '@/app/page';

/**
 * 지표별 색상 설정 타입
 */
export interface IndicatorConfig {
  property: string;
  label: string;
  unit: string;
  stops: [number, string][]; // [값, 색상] 배열
}

/**
 * 지표별 색상 범위 설정
 *
 * @param indicator - 표시할 지표 타입
 * @returns 지표별 색상 설정 객체
 */
export function getIndicatorConfig(indicator: IndicatorType): IndicatorConfig {
  switch (indicator) {
    case 'population':
      return {
        property: 'population',
        label: '총 인구',
        unit: '명',
        stops: [
          [0, '#e0e0e0'],      // 데이터 없음 - 회색
          [5000, '#eff6ff'],    // 5천명
          [10000, '#dbeafe'],   // 1만명
          [15000, '#bfdbfe'],   // 1.5만명
          [20000, '#93c5fd'],   // 2만명
          [25000, '#60a5fa'],   // 2.5만명
          [30000, '#3b82f6'],   // 3만명
          [35000, '#1d4ed8'],   // 3.5만명 이상
        ],
      };

    case 'households':
      return {
        property: 'households',
        label: '가구 수',
        unit: '가구',
        stops: [
          [0, '#e0e0e0'],      // 데이터 없음
          [2000, '#fef3c7'],    // 2천 가구
          [4000, '#fde68a'],    // 4천 가구
          [6000, '#fcd34d'],    // 6천 가구
          [8000, '#fbbf24'],    // 8천 가구
          [10000, '#f59e0b'],   // 1만 가구
          [12000, '#d97706'],   // 1.2만 가구
          [15000, '#b45309'],   // 1.5만 가구 이상
        ],
      };

    case 'male':
      return {
        property: 'male',
        label: '남자 인구',
        unit: '명',
        stops: [
          [0, '#e0e0e0'],      // 데이터 없음
          [2500, '#dbeafe'],    // 2.5천명
          [5000, '#bfdbfe'],    // 5천명
          [7500, '#93c5fd'],    // 7.5천명
          [10000, '#60a5fa'],   // 1만명
          [12500, '#3b82f6'],   // 1.25만명
          [15000, '#2563eb'],   // 1.5만명
          [17500, '#1d4ed8'],   // 1.75만명 이상
        ],
      };

    case 'female':
      return {
        property: 'female',
        label: '여자 인구',
        unit: '명',
        stops: [
          [0, '#e0e0e0'],      // 데이터 없음
          [2500, '#fce7f3'],    // 2.5천명
          [5000, '#fbcfe8'],    // 5천명
          [7500, '#f9a8d4'],    // 7.5천명
          [10000, '#f472b6'],   // 1만명
          [12500, '#ec4899'],   // 1.25만명
          [15000, '#db2777'],   // 1.5만명
          [17500, '#be185d'],   // 1.75만명 이상
        ],
      };

    case 'male_ratio':
      return {
        property: 'male_ratio',
        label: '남자 비율',
        unit: '%',
        stops: [
          [0, '#e0e0e0'],      // 데이터 없음
          [45, '#dbeafe'],      // 45%
          [47, '#bfdbfe'],      // 47%
          [49, '#93c5fd'],      // 49%
          [50, '#e5e7eb'],      // 50% (중간값, 회색)
          [51, '#fde68a'],      // 51%
          [53, '#fbbf24'],      // 53%
          [55, '#f59e0b'],      // 55% 이상
        ],
      };

    case 'female_ratio':
      return {
        property: 'female_ratio',
        label: '여자 비율',
        unit: '%',
        stops: [
          [0, '#e0e0e0'],      // 데이터 없음
          [45, '#fef3c7'],      // 45%
          [47, '#fde68a'],      // 47%
          [49, '#fcd34d'],      // 49%
          [50, '#e5e7eb'],      // 50% (중간값, 회색)
          [51, '#fbcfe8'],      // 51%
          [53, '#f9a8d4'],      // 53%
          [55, '#f472b6'],      // 55% 이상
        ],
      };
  }
}

/**
 * Mapbox GL JS의 fill-color expression 생성
 *
 * @param config - 지표 설정 객체
 * @returns Mapbox expression 배열
 */
export function createFillColorExpression(config: IndicatorConfig): any[] {
  return [
    'interpolate',
    ['linear'],
    ['get', config.property],
    ...config.stops.flatMap(([value, color]) => [value, color]),
  ];
}

/**
 * 값을 색상으로 변환 (Mapbox 없이 순수 계산)
 *
 * @param value - 변환할 값
 * @param stops - [값, 색상] 배열
 * @returns 계산된 색상 (hex)
 */
export function valueToColor(value: number, stops: [number, string][]): string {
  // 값이 0이거나 없으면 첫 번째 색상 (회색)
  if (value === 0 || value < stops[0][0]) {
    return stops[0][1];
  }

  // 최댓값 초과하면 마지막 색상
  if (value >= stops[stops.length - 1][0]) {
    return stops[stops.length - 1][1];
  }

  // 중간값: 선형 보간
  for (let i = 0; i < stops.length - 1; i++) {
    const [v1, c1] = stops[i];
    const [v2, c2] = stops[i + 1];

    if (value >= v1 && value < v2) {
      // 간단 구현: 가까운 색상 반환 (실제 RGB 보간은 복잡)
      const ratio = (value - v1) / (v2 - v1);
      return ratio < 0.5 ? c1 : c2;
    }
  }

  return stops[0][1]; // fallback
}

/**
 * GeoJSON Feature에 인구 데이터 추가
 *
 * @param geojson - 원본 GeoJSON
 * @param populationData - 행정동별 인구 데이터
 * @returns 인구 데이터가 추가된 GeoJSON
 */
export function enrichGeojsonWithPopulation(
  geojson: any,
  populationData: Array<{
    dong: string;
    population: number;
    households: number;
    male: number;
    female: number;
  }>
): any {
  return {
    ...geojson,
    features: geojson.features.map((feature: any) => {
      // adm_nm: "서울특별시 종로구 사직동" → 동 이름 추출
      const fullName = feature.properties?.adm_nm || '';
      const parts = fullName.split(' '); // ["서울특별시", "종로구", "사직동"]
      const guName = parts.length >= 2 ? parts[1] : ''; // "종로구"
      const dongName = parts.length >= 3 ? parts[2] : ''; // "사직동"

      const popData = populationData.find((p) => p.dong === dongName);

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
          gu_name: guName,
          dong_name: dongName,
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
}

/**
 * 서울시 전체 평균 계산
 *
 * @param geojson - 인구 데이터가 포함된 GeoJSON
 * @param indicator - 계산할 지표
 * @returns 서울시 전체 평균값
 */
export function calculateSeoulAverage(geojson: any, indicator: IndicatorType): number {
  if (!geojson?.features || geojson.features.length === 0) return 0;

  const values = geojson.features
    .map((f: any) => f.properties?.[indicator] || 0)
    .filter((v: number) => v > 0); // 0이 아닌 값만

  if (values.length === 0) return 0;

  const sum = values.reduce((acc: number, val: number) => acc + val, 0);
  return sum / values.length;
}

/**
 * 특정 구의 평균 계산
 *
 * @param geojson - 인구 데이터가 포함된 GeoJSON
 * @param guName - 구 이름 (예: "종로구")
 * @param indicator - 계산할 지표
 * @returns 해당 구의 평균값
 */
export function calculateGuAverage(
  geojson: any,
  guName: string,
  indicator: IndicatorType
): number {
  if (!geojson?.features) return 0;

  const guFeatures = geojson.features.filter(
    (f: any) => f.properties?.gu_name === guName
  );

  console.log('📊 calculateGuAverage 디버그:', {
    찾는구: guName,
    찾은행정동수: guFeatures.length,
    샘플gu_name: geojson.features.slice(0, 3).map((f: any) => f.properties?.gu_name),
  });

  if (guFeatures.length === 0) return 0;

  const values = guFeatures
    .map((f: any) => f.properties?.[indicator] || 0)
    .filter((v: number) => v > 0);

  if (values.length === 0) return 0;

  const sum = values.reduce((acc: number, val: number) => acc + val, 0);
  return sum / values.length;
}

/**
 * 비교 결과 계산 (% 차이 및 문구 생성)
 *
 * @param districtValue - 선택된 행정동의 값
 * @param seoulAverage - 서울시 전체 평균
 * @param guAverage - 소속 구의 평균
 * @param indicator - 지표 타입
 * @returns 비교 결과 객체
 */
export function calculateComparison(
  districtValue: number,
  seoulAverage: number,
  guAverage: number,
  indicator: IndicatorType
): {
  seoulDiff: number;
  guDiff: number;
  seoulMessage: string;
  guMessage: string;
} {
  // 서울시 평균과의 차이 (%)
  const seoulDiff = seoulAverage > 0 ? ((districtValue - seoulAverage) / seoulAverage) * 100 : 0;

  // 소속 구 평균과의 차이 (%)
  const guDiff = guAverage > 0 ? ((districtValue - guAverage) / guAverage) * 100 : 0;

  // 서울시 평균 비교 문구
  const seoulMessage =
    seoulDiff > 0
      ? `이 행정동이 서울시 전체 행정동의 평균보다 ${Math.round(Math.abs(seoulDiff))}% 높습니다`
      : seoulDiff < 0
      ? `이 행정동이 서울시 전체 행정동의 평균보다 ${Math.round(Math.abs(seoulDiff))}% 낮습니다`
      : `서울시 전체 행정동의 평균과 동일합니다`;

  // 구 평균 비교 문구
  const guMessage =
    guDiff > 0
      ? `이 행정동이 구 전체 행정동의 평균보다 ${Math.round(Math.abs(guDiff))}% 높습니다`
      : guDiff < 0
      ? `이 행정동이 구 전체 행정동의 평균보다 ${Math.round(Math.abs(guDiff))}% 낮습니다`
      : `구 전체 행정동의 평균과 동일합니다`;

  return {
    seoulDiff,
    guDiff,
    seoulMessage,
    guMessage,
  };
}
