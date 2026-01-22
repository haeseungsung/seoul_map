/**
 * 실제로 데이터를 제공하는 것으로 확인된 서울시 OpenAPI 목록
 *
 * 대부분의 서울시 OpenAPI는 Sheet 타입(엑셀 다운로드)이고
 * 실시간 조회가 가능한 API는 극히 일부입니다.
 *
 * 2025-01-08 기준 테스트 완료된 API 목록
 */

export interface KnownApiConfig {
  id: string;           // 카탈로그 ID (있는 경우)
  serviceName: string;  // 실제 API 서비스명
  description: string;  // 설명
  hasData: boolean;     // 실제 데이터 제공 여부
  spatialType?: 'point' | 'gu' | 'dong' | 'none'; // 공간정보 타입
  dongField?: string;   // 행정동 필드명 (spatialType='dong'인 경우)
  unit?: string;        // 단위 (예: '명', '개', '%')
}

export const KNOWN_WORKING_APIS: KnownApiConfig[] = [
  {
    id: 'OA-2219',
    serviceName: 'RealtimeCityAir',
    description: '서울시 권역별 실시간 대기환경 현황',
    hasData: true,
    spatialType: 'gu', // MSRSTN_NM 필드로 구별 데이터 제공
  },
  {
    id: 'WORKING-002',
    serviceName: 'bikeList',
    description: '서울시 공공자전거(따릉이) 대여소 정보',
    hasData: true,
    spatialType: 'point', // stationLatitude, stationLongitude
  },
  {
    id: 'WORKING-003',
    serviceName: 'SearchPublicToiletPOIService',
    description: '서울시 공중화장실 위치 정보',
    hasData: true,
    spatialType: 'point', // X_WGS84, Y_WGS84
  },
  {
    id: 'WORKING-004',
    serviceName: 'GetParkInfo',
    description: '서울시 공영주차장 정보',
    hasData: true,
    spatialType: 'point', // LAT, LOT
  },
  {
    id: 'WORKING-005',
    serviceName: 'culturalEventInfo',
    description: '서울시 문화행사 정보',
    hasData: true,
    spatialType: 'gu', // GUNAME 필드 (자치구별)
  },
  // 행정동 단위 API
  {
    id: 'OA-14991',
    serviceName: 'SPOP_LOCAL_RESD_DONG',
    description: '행정동 단위 서울 생활인구(내국인)',
    hasData: true,
    spatialType: 'dong',
    dongField: 'ADSTRD_CODE_SE', // 행정동 코드 또는 이름 필드
    unit: '명', // 생활인구 단위
  },
  // 서울시 전체(city-level) 데이터 - 지도 시각화 불가
  {
    id: 'OA-15526',
    serviceName: 'airPolutionMeasuring1Hour',
    description: '서울시 대기오염 측정정보 (측정소별 데이터)',
    hasData: true,
    spatialType: 'none', // 지도 시각화 대상에서 제외
  },
];

/**
 * 서비스 ID로 알려진 API 찾기
 */
export function findKnownApi(serviceId: string): KnownApiConfig | null {
  return KNOWN_WORKING_APIS.find(api => api.id === serviceId) || null;
}

/**
 * 서비스명으로 알려진 API 찾기
 */
export function findKnownApiByName(serviceName: string): KnownApiConfig | null {
  return KNOWN_WORKING_APIS.find(api => api.serviceName === serviceName) || null;
}
