/**
 * 서울시 열린데이터광장 API 통신 모듈
 * API: 서울생활인구 대도시권 내외국인
 */

const API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || '';
const BASE_URL = 'http://openapi.seoul.go.kr:8088';

// 생활인구 데이터 행 타입
interface PopulationRow {
  STDR_DE_ID: string; // 기준일자 (YYYYMMDD)
  TMZON_PD_SE: string; // 시간대 구분
  ADSTRD_CODE_SE: string; // 행정동 코드 (8자리)
  TOT_LVPOP_CO: string; // 총 생활인구 수
  MLNG_RESDNC_CODE_SE: string; // 거주지 코드
  [key: string]: any; // 연령별 데이터 등
}

// API 응답 타입
interface PopulationAPIResponse {
  ppsOrgnCt: {
    list_total_count: number;
    RESULT: {
      CODE: string;
      MESSAGE: string;
    };
    row: PopulationRow[];
  };
}

/**
 * 서울생활인구 데이터 조회
 *
 * @param date - 기준일자 (YYYYMMDD 형식, 예: '20240102')
 * @param startIndex - 시작 인덱스
 * @param endIndex - 종료 인덱스
 * @returns 생활인구 데이터
 */
export async function fetchPopulationData(
  date: string = '20240102',
  startIndex: number = 1,
  endIndex: number = 1000
): Promise<PopulationAPIResponse> {
  try {
    // URL 생성
    // http://openapi.seoul.go.kr:8088/{KEY}/json/ppsOrgnCt/{startIndex}/{endIndex}/{날짜}/
    const url = `${BASE_URL}/${API_KEY}/json/ppsOrgnCt/${startIndex}/${endIndex}/${date}/`;

    console.log('📡 서울시 생활인구 API 호출:', url);

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('📦 원본 API 응답:', JSON.stringify(data, null, 2));
    console.log('📦 응답 구조 확인:', {
      hasPpsOrgnCt: !!data.ppsOrgnCt,
      hasResult: !!data.ppsOrgnCt?.RESULT,
      resultCode: data.ppsOrgnCt?.RESULT?.CODE,
      hasRow: !!data.ppsOrgnCt?.row,
      rowLength: data.ppsOrgnCt?.row?.length,
      keys: Object.keys(data),
    });

    // API 응답 구조 체크
    if (!data.ppsOrgnCt) {
      console.error('❌ ppsOrgnCt 객체가 없습니다. 전체 응답:', data);
      throw new Error('API 응답 형식이 올바르지 않습니다');
    }

    // API 에러 체크
    if (data.ppsOrgnCt.RESULT && data.ppsOrgnCt.RESULT.CODE !== 'INFO-000') {
      console.error('API RESULT:', data.ppsOrgnCt.RESULT);
      throw new Error(`API 에러 [${data.ppsOrgnCt.RESULT.CODE}]: ${data.ppsOrgnCt.RESULT.MESSAGE || '알 수 없는 에러'}`);
    }

    console.log('✅ 서울시 생활인구 API 응답:', {
      total: data.ppsOrgnCt.list_total_count,
      rows: data.ppsOrgnCt.row?.length || 0,
    });

    return data;
  } catch (error) {
    console.error('❌ 서울시 생활인구 API 에러:', error);
    throw error;
  }
}

/**
 * 행정동별 생활인구 합계 계산
 * 같은 행정동 코드를 가진 데이터들의 인구를 모두 합산
 *
 * @param rows - API에서 받은 생활인구 데이터 배열
 * @returns { [행정동코드]: 총인구수 } 형태의 객체
 */
export function aggregatePopulationByDistrict(rows: PopulationRow[]): Record<string, number> {
  const districtPopulation: Record<string, number> = {};

  rows.forEach((row) => {
    const districtCode = row.ADSTRD_CODE_SE;
    const population = parseFloat(row.TOT_LVPOP_CO) || 0;

    if (districtCode) {
      // 이미 있는 행정동이면 합산, 없으면 새로 추가
      districtPopulation[districtCode] = (districtPopulation[districtCode] || 0) + population;
    }
  });

  return districtPopulation;
}

/**
 * 전체 데이터를 페이지별로 가져와서 행정동별로 집계
 * (데이터가 60만건 이상이므로 여러 번 호출 필요)
 *
 * @param date - 기준일자
 * @param maxRecords - 최대 가져올 레코드 수 (기본: 10000)
 * @returns 행정동별 집계된 인구 데이터
 */
export async function fetchAndAggregatePopulation(
  date: string = '20240102',
  maxRecords: number = 10000
): Promise<Record<string, number>> {
  const BATCH_SIZE = 1000; // 한 번에 가져올 개수
  let allRows: PopulationRow[] = [];
  let currentIndex = 1;

  console.log(`📊 생활인구 데이터 수집 시작 (최대 ${maxRecords}건)...`);

  try {
    while (currentIndex <= maxRecords) {
      const endIndex = Math.min(currentIndex + BATCH_SIZE - 1, maxRecords);

      const data = await fetchPopulationData(date, currentIndex, endIndex);

      if (data.ppsOrgnCt?.row) {
        allRows = allRows.concat(data.ppsOrgnCt.row);
        console.log(`  ✓ ${currentIndex}-${endIndex} 수집 완료 (누적: ${allRows.length}건)`);
      }

      // 더 이상 데이터가 없으면 중단
      if (!data.ppsOrgnCt?.row || data.ppsOrgnCt.row.length < BATCH_SIZE) {
        console.log('  ℹ️ 마지막 페이지 도달');
        break;
      }

      currentIndex = endIndex + 1;

      // API 과부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ 총 ${allRows.length}건 수집 완료`);

    // 행정동별로 집계
    const aggregated = aggregatePopulationByDistrict(allRows);
    console.log(`📍 행정동 개수: ${Object.keys(aggregated).length}개`);

    return aggregated;
  } catch (error) {
    console.error('❌ 데이터 수집 실패:', error);
    throw error;
  }
}

/**
 * GeoJSON의 행정동 코드와 매칭
 * GeoJSON은 10자리 코드 사용, API는 8자리 코드 사용
 *
 * @param geojsonCode - GeoJSON의 행정동 코드 (10자리, 예: '1168000000')
 * @param populationData - 행정동별 인구 데이터 (8자리 코드)
 * @returns 해당 행정동의 인구수, 없으면 0
 */
export function getPopulationByGeoJSONCode(
  geojsonCode: string,
  populationData: Record<string, number>
): number {
  // GeoJSON 코드 10자리 → API 코드 8자리로 변환
  // 예: '1168000000' → '11680000'
  const apiCode = geojsonCode.substring(0, 8);

  return populationData[apiCode] || 0;
}

/**
 * 샘플 데이터로 테스트 (개발용)
 */
export async function testPopulationAPI() {
  try {
    console.log('🧪 API 테스트 시작...');

    // 소량의 데이터로 테스트
    const data = await fetchPopulationData('20240102', 1, 100);

    console.log('테스트 결과:');
    console.log('- 총 데이터 수:', data.ppsOrgnCt.list_total_count);
    console.log('- 가져온 행 수:', data.ppsOrgnCt.row?.length || 0);

    if (data.ppsOrgnCt.row && data.ppsOrgnCt.row.length > 0) {
      console.log('- 첫 번째 행:', data.ppsOrgnCt.row[0]);

      // 집계 테스트
      const aggregated = aggregatePopulationByDistrict(data.ppsOrgnCt.row);
      console.log('- 집계된 행정동 수:', Object.keys(aggregated).length);
      console.log('- 샘플 데이터:', Object.entries(aggregated).slice(0, 3));
    }

    return data;
  } catch (error) {
    console.error('테스트 실패:', error);
    throw error;
  }
}

/**
 * 로컬 CSV 파일에서 인구 데이터 로드
 */
export async function loadPopulationFromCSV(): Promise<any> {
  try {
    console.log('📁 CSV 파일 로딩 중...');

    const response = await fetch('/data/seoul-population.csv');
    if (!response.ok) {
      throw new Error('CSV 파일 로드 실패');
    }

    const csvText = await response.text();
    console.log('✅ CSV 파일 로드 완료:', csvText.length, 'bytes');

    // CSV 파싱은 클라이언트에서 할 예정
    return csvText;
  } catch (error) {
    console.error('❌ CSV 로드 실패:', error);
    throw error;
  }
}
