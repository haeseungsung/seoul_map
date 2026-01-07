/**
 * CSV 파일 파싱 및 인구 데이터 처리 유틸리티
 */

// 행정동별 인구 데이터 타입
export interface DistrictPopulation {
  gu: string; // 구 이름 (예: "종로구")
  dong: string; // 동 이름 (예: "사직동")
  population: number; // 총 인구수
  households: number; // 세대수
  male: number; // 남성 인구
  female: number; // 여성 인구
}

/**
 * CSV 텍스트를 파싱하여 행정동별 인구 데이터로 변환
 *
 * @param csvText - CSV 파일 내용
 * @returns 행정동별 인구 데이터 배열
 */
export function parsePopulationCSV(csvText: string): DistrictPopulation[] {
  const lines = csvText.split('\n');
  const data: DistrictPopulation[] = [];

  // 헤더 3줄 건너뛰고 데이터 행부터 시작
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV 파싱 (따옴표 처리 포함)
    const columns = parseCSVLine(line);

    // "합계" 행이 아니고, 동 이름이 있는 행만 처리
    const col1 = columns[0] || '';
    const gu = columns[1] || '';
    const dong = columns[2] || '';

    // "소계" 행은 건너뛰기
    if (dong === '소계' || dong === '') continue;

    // 데이터 추출
    const households = parseNumber(columns[3]);
    const population = parseNumber(columns[4]); // 총 인구
    const male = parseNumber(columns[5]); // 남자
    const female = parseNumber(columns[6]); // 여자

    if (gu && dong && population > 0) {
      data.push({
        gu,
        dong,
        population,
        households,
        male,
        female,
      });
    }
  }

  return data;
}

/**
 * CSV 라인을 파싱 (따옴표 처리 포함)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * 문자열을 숫자로 변환 (쉼표 제거)
 */
function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').replace(/"/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * 행정동 이름으로 인구 데이터 검색
 * GeoJSON의 행정동 이름과 매칭
 *
 * @param dongName - GeoJSON의 행정동 이름 (예: "사직동")
 * @param populationData - 파싱된 인구 데이터 배열
 * @returns 해당 행정동의 인구수, 없으면 0
 */
export function getPopulationByDongName(
  dongName: string,
  populationData: DistrictPopulation[]
): number {
  // 동 이름으로 매칭
  const found = populationData.find((d) => d.dong === dongName);
  return found ? found.population : 0;
}

/**
 * 행정동 코드로 인구 데이터 검색
 * GeoJSON의 ADM_DR_CD 필드 사용
 *
 * @param admCode - 행정동 코드 (10자리, 예: '1111051500')
 * @param populationData - 파싱된 인구 데이터 배열
 * @param geojsonFeatures - GeoJSON features (코드-이름 매핑용)
 * @returns 해당 행정동의 인구수, 없으면 0
 */
export function getPopulationByAdmCode(
  admCode: string,
  populationData: DistrictPopulation[],
  geojsonFeatures: any[]
): number {
  // GeoJSON에서 해당 코드의 행정동 이름 찾기
  const feature = geojsonFeatures.find(
    (f) => f.properties?.ADM_DR_CD === admCode
  );

  if (!feature || !feature.properties?.ADM_DR_NM) {
    return 0;
  }

  const dongName = feature.properties.ADM_DR_NM;
  return getPopulationByDongName(dongName, populationData);
}

/**
 * 전체 인구 데이터를 행정동 코드 기반 딕셔너리로 변환
 *
 * @param populationData - 파싱된 인구 데이터 배열
 * @param geojsonFeatures - GeoJSON features
 * @returns { [행정동코드]: 인구수 } 형태의 객체
 */
export function createPopulationDictByCode(
  populationData: DistrictPopulation[],
  geojsonFeatures: any[]
): Record<string, number> {
  const result: Record<string, number> = {};

  geojsonFeatures.forEach((feature) => {
    const admCode = feature.properties?.ADM_DR_CD;
    const dongName = feature.properties?.ADM_DR_NM;

    if (admCode && dongName) {
      const population = getPopulationByDongName(dongName, populationData);
      result[admCode] = population;
    }
  });

  return result;
}
