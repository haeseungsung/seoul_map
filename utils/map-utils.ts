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
 * 데이터 배열에서 분위수 기반 색상 stops 생성
 *
 * @param values - 실제 데이터 값 배열
 * @param unit - 단위 (%, μg/m³ 등)
 * @returns 분위수 기반 색상 stops
 */
export function createQuantileStops(values: number[], unit: string): [number, string][] {
  // 유효한 값만 필터링 (0 제외)
  const validValues = values.filter(v => v > 0).sort((a, b) => a - b);

  if (validValues.length === 0) {
    return [[0, '#f3f4f6'], [1, '#dbeafe']];
  }

  // 분위수 계산 (0%, 20%, 40%, 60%, 80%, 100%)
  const getQuantile = (p: number) => {
    const index = Math.floor(validValues.length * p);
    return validValues[Math.min(index, validValues.length - 1)];
  };

  const min = validValues[0];
  const q20 = getQuantile(0.2);
  const q40 = getQuantile(0.4);
  const q60 = getQuantile(0.6);
  const q80 = getQuantile(0.8);
  const max = validValues[validValues.length - 1];

  // % 단위는 초록색 계열
  if (unit === '%') {
    return [
      [0, '#f3f4f6'],          // 데이터 없음
      [min, '#f0fdf4'],        // 최소값
      [q20, '#dcfce7'],        // 20%
      [q40, '#86efac'],        // 40%
      [q60, '#22c55e'],        // 60%
      [q80, '#16a34a'],        // 80%
      [max, '#15803d'],        // 최대값
    ];
  }

  // 기본: 단일 파란색 톤 그라데이션 (개수용)
  return [
    [0, '#e5e7eb'],          // 데이터 없음 (회색)
    [min, '#eff6ff'],        // 최소값 (매우 연한 파란색)
    [q20, '#dbeafe'],        // 20%
    [q40, '#93c5fd'],        // 40%
    [q60, '#3b82f6'],        // 60%
    [q80, '#2563eb'],        // 80%
    [max, '#1d4ed8'],        // 최대값 (진한 파란색)
  ];
}

/**
 * 지표별 색상 범위 설정
 *
 * @param indicator - 표시할 지표 타입
 * @returns 지표별 색상 설정 객체
 */
export function getIndicatorConfig(indicator: IndicatorType | string): IndicatorConfig {
  // API ID에서 단위 추출 시도 (known-apis.ts 참고)
  const getUnitFromIndicatorId = (indicatorId: string): string => {
    // OA-14991 (생활인구) → '명'
    if (indicatorId.includes('OA-14991') || indicatorId.includes('생활인구') || indicatorId.includes('LVPOP')) {
      return '명';
    }
    // OA-2219 (대기질) → 'μg/m³'
    if (indicatorId.includes('OA-2219') || indicatorId.includes('환경_정보')) {
      return 'μg/m³';
    }
    // 영업률, 비율 등 → '%'
    if (indicatorId.includes('영업률') || indicatorId.includes('비율') || indicatorId.includes('률') || indicatorId.includes('_ratio')) {
      return '%';
    }
    // 기본값
    return '개';
  };

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

    default:
      // Handle API indicators (string IDs)
      const unit = getUnitFromIndicatorId(indicator as string);

      // 환경_정보 (대기질 데이터) 특별 처리
      if ((indicator as string).includes('환경_정보') || (indicator as string).includes('OA-2219')) {
        return {
          property: indicator as string,
          label: '대기질 (PM2.5 기준)',
          unit: unit,
          stops: [
            [0, '#e5e7eb'],      // 데이터 없음 - 회색
            [1, '#34d399'],      // 좋음 (0-15) - 초록
            [16, '#fbbf24'],     // 보통 (16-35) - 노랑
            [36, '#fb923c'],     // 나쁨 (36-75) - 주황
            [76, '#ef4444'],     // 매우나쁨 (76+) - 빨강
          ],
        };
      }

      // 자전거 대여 가능률 (OA-15493)
      if ((indicator as string).includes('OA-15493') || (indicator as string).includes('공공자전거')) {
        return {
          property: 'availability_rate',
          label: '자전거 대여 가능률',
          unit: '%',
          stops: [
            [0, '#e5e7eb'],      // 데이터 없음 - 회색
            [1, '#ef4444'],      // 0-10% - 빨강 (거의 없음)
            [10, '#fb923c'],     // 10-25% - 주황 (부족)
            [25, '#fbbf24'],     // 25-40% - 노랑 (보통)
            [40, '#a3e635'],     // 40-60% - 연두 (여유)
            [60, '#34d399'],     // 60%+ - 초록 (충분)
          ],
        };
      }

      // % 단위는 초록색/그린 계열 색상 사용
      if (unit === '%') {
        return {
          property: indicator as string,
          label: indicator as string,
          unit: unit,
          stops: [
            [0, '#f3f4f6'],     // 0% - 회색 (데이터 없음)
            [10, '#f0fdf4'],    // 10% - 매우 연한 초록
            [20, '#dcfce7'],    // 20% - 연한 초록
            [30, '#bbf7d0'],    // 30% - 밝은 초록
            [40, '#86efac'],    // 40% - 중간 초록
            [50, '#4ade80'],    // 50% - 초록
            [60, '#22c55e'],    // 60% - 진한 초록
            [70, '#16a34a'],    // 70% - 더 진한 초록
            [80, '#15803d'],    // 80%+ - 가장 진한 초록
          ],
        };
      }

      // 기본 블루 계열 - 25개 구에 최적화된 색상 분포
      return {
        property: indicator as string,
        label: indicator as string,
        unit: unit,
        stops: [
          [0, '#f3f4f6'],      // 0 - 회색 (데이터 없음)
          [1, '#dbeafe'],      // 최소값 - 매우 연한 파랑
          [20, '#93c5fd'],     // 하위 25% - 연한 파랑
          [40, '#60a5fa'],     // 하위 50% - 중간 파랑
          [60, '#3b82f6'],     // 상위 50% - 진한 파랑
          [80, '#2563eb'],     // 상위 25% - 더 진한 파랑
          [100, '#1d4ed8'],    // 상위 값 - 가장 진한 파랑
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
