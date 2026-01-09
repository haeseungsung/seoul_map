/**
 * 서울시 LOCALDATA API 유틸리티
 * - 구 코드 매핑
 * - LOCALDATA 패턴 분석
 * - 25개 구 데이터 병합
 */

/**
 * 서울시 25개 구 코드 매핑
 */
export const GU_CODE_MAP: Record<string, string> = {
  GN: '강남구',
  GD: '강동구',
  GB: '강북구',
  GS: '강서구',
  GA: '관악구',
  GJ: '광진구',
  GR: '구로구',
  GC: '금천구',
  NW: '노원구',
  DB: '도봉구',
  DD: '동대문구',
  DJ: '동작구',
  MP: '마포구',
  SD: '서대문구',
  SC: '서초구',
  ST: '성동구',
  SB: '성북구',
  SP: '송파구',
  YC: '양천구',
  YD: '영등포구',
  YS: '용산구',
  EP: '은평구',
  JR: '종로구',
  JG: '중구',
  JL: '중랑구',
};

/**
 * 구 이름 → 구 코드 매핑 (역방향)
 */
export const GU_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(GU_CODE_MAP).map(([code, name]) => [name, code])
);

/**
 * LOCALDATA 서비스명 패턴 분석
 *
 * @param serviceName - 서비스명 (예: "LOCALDATA_072217_GR")
 * @returns 파싱 결과 또는 null
 */
export interface LocalDataPattern {
  industryCode: string; // 업종 코드 (예: "072217")
  guCode: string; // 구 코드 (예: "GR")
  guName: string; // 구 이름 (예: "구로구")
  baseServiceName: string; // 기본 서비스명 (예: "LOCALDATA_072217")
}

export function parseLocalDataService(serviceName: string): LocalDataPattern | null {
  // LOCALDATA_{업종코드}_{구코드} 패턴 매칭
  const match = serviceName.match(/^LOCALDATA_(\d+)_([A-Z]{2,3})$/);

  if (!match) {
    return null;
  }

  const [, industryCode, guCode] = match;
  const guName = GU_CODE_MAP[guCode];

  if (!guName) {
    return null;
  }

  return {
    industryCode,
    guCode,
    guName,
    baseServiceName: `LOCALDATA_${industryCode}`,
  };
}

/**
 * 특정 업종의 모든 구 서비스명 생성
 *
 * @param industryCode - 업종 코드 (예: "072217")
 * @returns 25개 구의 서비스명 배열
 */
export function generateAllGuServices(industryCode: string): Array<{ serviceName: string; guName: string; guCode: string }> {
  return Object.entries(GU_CODE_MAP).map(([guCode, guName]) => ({
    serviceName: `LOCALDATA_${industryCode}_${guCode}`,
    guName,
    guCode,
  }));
}

/**
 * 카탈로그에서 LOCALDATA 서비스만 필터링
 *
 * @param catalog - 전체 카탈로그
 * @returns LOCALDATA 서비스만 포함된 배열
 */
export function filterLocalDataServices(catalog: any[]): any[] {
  return catalog.filter((service) => {
    const serviceName = service.name || service.INF_NM || '';
    return serviceName.startsWith('LOCALDATA_');
  });
}

/**
 * LOCALDATA 서비스를 업종별로 그룹화
 *
 * @param services - LOCALDATA 서비스 배열
 * @returns 업종별로 그룹화된 맵
 */
export function groupByIndustry(services: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  for (const service of services) {
    const serviceName = service.name || service.INF_NM || '';
    const parsed = parseLocalDataService(serviceName);

    if (parsed) {
      const existing = grouped.get(parsed.industryCode) || [];
      existing.push({
        ...service,
        ...parsed,
      });
      grouped.set(parsed.industryCode, existing);
    }
  }

  return grouped;
}

/**
 * 업종별 서비스 요약 정보 생성
 *
 * @param services - 동일 업종의 서비스 배열
 * @returns 요약 정보
 */
export interface IndustrySummary {
  industryCode: string;
  industryName: string; // 서비스 이름에서 추출
  guCount: number; // 해당 업종을 제공하는 구의 수
  guList: string[]; // 구 목록
  sampleService: any; // 샘플 서비스 (첫 번째 구)
}

export function summarizeIndustry(industryCode: string, services: any[]): IndustrySummary {
  const guList = services.map((s) => s.guName).sort();

  // 서비스 이름에서 업종명 추출 (첫 번째 서비스 사용)
  const sampleService = services[0];
  const fullName = sampleService.name || sampleService.INF_NM || '';

  // 예: "서울시 강남구 유통전문판매업 인허가 정보" → "유통전문판매업"
  // 구 이름 제거 후 "인허가" 앞부분 추출
  let industryName = fullName
    .replace(/서울(시|특별시)?/g, '')
    .replace(new RegExp(guList.join('|'), 'g'), '')
    .replace(/인허가.*$/, '')
    .trim();

  if (!industryName) {
    industryName = `업종 ${industryCode}`;
  }

  return {
    industryCode,
    industryName,
    guCount: services.length,
    guList,
    sampleService,
  };
}
