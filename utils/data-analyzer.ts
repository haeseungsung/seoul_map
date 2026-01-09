/**
 * 서울시 API 데이터 분석 유틸리티
 */

export interface SpatialInfo {
  type: 'gu' | 'multi-gu' | 'dong' | 'point' | 'none';
  guName?: string; // 구 이름 (예: "강동구") - single gu only
  guList?: string[]; // 여러 구 포함 시 목록
  guCount?: number; // 포함된 구 개수
  dongName?: string; // 동 이름
  latitude?: number;
  longitude?: number;
}

export interface DataAnalysis {
  hasSpatialInfo: boolean;
  spatialInfo: SpatialInfo;
  totalRecords: number;
  numericFields: { field: string; avg: number; min: number; max: number; sum: number }[];
  categoricalFields: { field: string; uniqueCount: number; topValues: { value: string; count: number }[] }[];
  sampleRecords: any[];
}

// 서울시 구 이름 매핑 (다양한 표기 처리)
const GU_NAMES = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구'
];

// 공간정보 관련 필드명 패턴
const SPATIAL_FIELD_PATTERNS = {
  gu: ['GU', 'GU_NM', 'GU_NAME', 'SIGNGU_NM', 'SGG_NM', 'DITC_NM', 'DISTRICT', '자치구', '구'],
  dong: ['DONG_NM', 'DONG_NAME', 'ADMDONG_NM', 'EMD_NM', '동', '행정동'],
  lat: ['LAT', 'LATITUDE', 'Y', 'Y_COORD', 'WGS84_Y', '위도'],
  lng: ['LNG', 'LON', 'LONGITUDE', 'X', 'X_COORD', 'WGS84_X', '경도'],
};

/**
 * 필드명이 특정 패턴과 매칭되는지 확인
 */
function matchesPattern(fieldName: string, patterns: string[]): boolean {
  const normalized = fieldName.toUpperCase();
  return patterns.some(pattern => normalized.includes(pattern));
}

/**
 * 데이터에서 공간정보 추출
 */
export function extractSpatialInfo(rows: any[]): SpatialInfo {
  if (!rows || rows.length === 0) {
    return { type: 'none' };
  }

  const firstRow = rows[0];
  const fieldNames = Object.keys(firstRow);

  // 구 이름 찾기
  const guField = fieldNames.find(f => matchesPattern(f, SPATIAL_FIELD_PATTERNS.gu));
  if (guField) {
    // 데이터에 포함된 고유 구 목록 추출
    const uniqueGus = new Set<string>();
    rows.forEach(row => {
      const guValue = String(row[guField] || '');
      const normalizedGu = GU_NAMES.find(gu =>
        guValue.includes(gu) || guValue.replace(/\s/g, '').includes(gu.replace(/구$/, ''))
      );
      if (normalizedGu) {
        uniqueGus.add(normalizedGu);
      }
    });

    const guList = Array.from(uniqueGus).sort();

    // 단일 구 데이터
    if (guList.length === 1) {
      return {
        type: 'gu',
        guName: guList[0],
      };
    }

    // 여러 구 병합 데이터 (LOCALDATA 병합 등)
    if (guList.length > 1) {
      return {
        type: 'multi-gu',
        guList,
        guCount: guList.length,
      };
    }
  }

  // 동 이름 찾기
  const dongField = fieldNames.find(f => matchesPattern(f, SPATIAL_FIELD_PATTERNS.dong));
  if (dongField) {
    return {
      type: 'dong',
      dongName: String(firstRow[dongField] || ''),
    };
  }

  // 위경도 좌표 찾기
  const latField = fieldNames.find(f => matchesPattern(f, SPATIAL_FIELD_PATTERNS.lat));
  const lngField = fieldNames.find(f => matchesPattern(f, SPATIAL_FIELD_PATTERNS.lng));

  if (latField && lngField) {
    const lat = parseFloat(String(firstRow[latField] || '0'));
    const lng = parseFloat(String(firstRow[lngField] || '0'));

    // 서울 좌표 범위 검증 (대략 37.4~37.7, 126.7~127.2)
    if (lat >= 37.4 && lat <= 37.7 && lng >= 126.7 && lng <= 127.2) {
      return {
        type: 'point',
        latitude: lat,
        longitude: lng,
      };
    }
  }

  return { type: 'none' };
}

/**
 * 데이터 통계 분석
 */
export function analyzeData(rows: any[]): DataAnalysis {
  const spatialInfo = extractSpatialInfo(rows);

  if (!rows || rows.length === 0) {
    return {
      hasSpatialInfo: spatialInfo.type !== 'none',
      spatialInfo,
      totalRecords: 0,
      numericFields: [],
      categoricalFields: [],
      sampleRecords: [],
    };
  }

  const fieldNames = Object.keys(rows[0]);
  const numericFields: DataAnalysis['numericFields'] = [];
  const categoricalFields: DataAnalysis['categoricalFields'] = [];

  // 각 필드 분석
  fieldNames.forEach(field => {
    const values = rows.map(r => r[field]).filter(v => v !== null && v !== undefined && v !== '');

    if (values.length === 0) return;

    // 숫자 필드인지 확인
    const numericValues = values
      .map(v => {
        const parsed = parseFloat(String(v).replace(/,/g, ''));
        return isNaN(parsed) ? null : parsed;
      })
      .filter((v): v is number => v !== null);

    // 80% 이상이 숫자면 숫자 필드로 판단
    if (numericValues.length / values.length > 0.8 && numericValues.length > 0) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      numericFields.push({
        field,
        avg: sum / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        sum,
      });
    } else {
      // 카테고리 필드
      const valueCounts = new Map<string, number>();
      values.forEach(v => {
        const str = String(v);
        valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
      });

      const topValues = Array.from(valueCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      categoricalFields.push({
        field,
        uniqueCount: valueCounts.size,
        topValues,
      });
    }
  });

  return {
    hasSpatialInfo: spatialInfo.type !== 'none',
    spatialInfo,
    totalRecords: rows.length,
    numericFields: numericFields.sort((a, b) => b.sum - a.sum).slice(0, 10), // 상위 10개
    categoricalFields: categoricalFields.slice(0, 10), // 상위 10개
    sampleRecords: rows.slice(0, 5),
  };
}

/**
 * 데이터를 지도용 GeoJSON 형식으로 변환 (구별 집계)
 */
export function aggregateByGu(rows: any[], guField: string, valueField: string): Record<string, number> {
  const guData: Record<string, number> = {};

  rows.forEach(row => {
    const guName = String(row[guField] || '');
    const normalizedGu = GU_NAMES.find(gu =>
      guName.includes(gu) || guName.replace(/\s/g, '').includes(gu.replace(/구$/, ''))
    );

    if (normalizedGu) {
      const value = parseFloat(String(row[valueField] || '0').replace(/,/g, ''));
      if (!isNaN(value)) {
        guData[normalizedGu] = (guData[normalizedGu] || 0) + value;
      }
    }
  });

  return guData;
}
