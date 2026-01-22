/**
 * Build-time 데이터 Pre-fetch 스크립트
 *
 * Netlify의 10초 타임아웃을 우회하기 위해
 * 빌드 시점에 LOCALDATA API 데이터를 미리 수집하여 정적 파일로 저장
 */

const fs = require('fs');
const path = require('path');

const SEOUL_API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY;
const BASE_URL = 'http://openapi.seoul.go.kr:8088';

// 25개 구 코드
const GU_CODES = {
  '종로구': '11110', '중구': '11140', '용산구': '11170',
  '성동구': '11200', '광진구': '11215', '동대문구': '11230',
  '중랑구': '11260', '성북구': '11290', '강북구': '11305',
  '도봉구': '11320', '노원구': '11350', '은평구': '11380',
  '서대문구': '11410', '마포구': '11440', '양천구': '11470',
  '강서구': '11500', '구로구': '11530', '금천구': '11545',
  '영등포구': '11560', '동작구': '11590', '관악구': '11620',
  '서초구': '11650', '강남구': '11680', '송파구': '11710',
  '강동구': '11740'
};

/**
 * 단일 구의 데이터 fetch
 */
async function fetchGuData(serviceName, guName, guCode) {
  try {
    // 첫 번째 요청으로 총 개수 확인
    const firstUrl = `${BASE_URL}/${SEOUL_API_KEY}/xml/${serviceName}/1/1`;
    const firstResponse = await fetch(firstUrl);

    if (!firstResponse.ok) {
      console.error(`❌ ${guName}: HTTP ${firstResponse.status}`);
      return { guName, guCode, data: [], totalCount: 0 };
    }

    const firstXml = await firstResponse.text();
    const listTotalCountMatch = firstXml.match(/<list_total_count>(\d+)<\/list_total_count>/);
    const totalCount = listTotalCountMatch ? parseInt(listTotalCountMatch[1]) : 0;

    if (totalCount === 0) {
      return { guName, guCode, data: [], totalCount: 0 };
    }

    // 페이지네이션으로 모든 데이터 수집
    const pageSize = 1000;
    const totalPages = Math.ceil(totalCount / pageSize);
    const allData = [];

    for (let page = 0; page < totalPages; page++) {
      const startIndex = page * pageSize + 1;
      const endIndex = Math.min((page + 1) * pageSize, totalCount);

      const url = `${BASE_URL}/${SEOUL_API_KEY}/xml/${serviceName}/${startIndex}/${endIndex}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`❌ ${guName} 페이지 ${page + 1} fetch 실패`);
        continue;
      }

      const xmlText = await response.text();
      const rowMatches = xmlText.matchAll(/<row>([\s\S]*?)<\/row>/g);

      for (const match of rowMatches) {
        const rowXml = match[1];
        const rowData = {};

        const fieldMatches = rowXml.matchAll(/<(\w+)>([^<]*)<\/\1>/g);
        for (const fieldMatch of fieldMatches) {
          rowData[fieldMatch[1]] = fieldMatch[2];
        }

        allData.push({
          ...rowData,
          GU: guName,
          GU_CODE: guCode,
        });
      }
    }

    console.log(`✅ ${guName}: ${allData.length}건 수집 완료`);
    return { guName, guCode, data: allData, totalCount };
  } catch (error) {
    console.error(`❌ ${guName} fetch 실패:`, error.message);
    return { guName, guCode, data: [], totalCount: 0, error: error.message };
  }
}

/**
 * 특정 업종의 25개 구 데이터 수집
 */
async function prefetchIndustry(industryCode, industryName) {
  console.log(`\n🔄 ${industryName} (${industryCode}) 데이터 수집 시작...`);

  const services = Object.entries(GU_CODES).map(([guName, guCode]) => ({
    serviceName: `LOCALDATA_${industryCode}_${guCode}`,
    guName,
    guCode,
  }));

  // 병렬로 모든 구 데이터 fetch
  const results = await Promise.all(
    services.map(service => fetchGuData(service.serviceName, service.guName, service.guCode))
  );

  // 결과 집계
  const mergedData = [];
  const summary = {
    industryCode,
    industryName,
    totalRecords: 0,
    guCount: 0,
    guList: [],
    errors: [],
    fetchedAt: new Date().toISOString(),
  };

  for (const result of results) {
    if (result.error) {
      summary.errors.push({ gu: result.guName, error: result.error });
    } else if (result.data.length > 0) {
      mergedData.push(...result.data);
      summary.totalRecords += result.data.length;
      summary.guCount++;
      summary.guList.push(result.guName);
    }
  }

  console.log(`✅ ${industryName} 병합 완료: ${summary.totalRecords}건 (${summary.guCount}/25 구)`);

  return {
    success: true,
    data: mergedData,
    summary,
  };
}

/**
 * 메인 실행 함수
 */
async function main() {
  if (!SEOUL_API_KEY) {
    console.error('❌ SEOUL_API_KEY 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  console.log('📦 LOCALDATA 사전 수집 시작...\n');

  // 수집할 업종 목록
  const industries = [
    { code: '072404', name: '일반음식점' },
    // 필요한 다른 업종 추가 가능
  ];

  // 출력 디렉토리 생성
  const outputDir = path.join(process.cwd(), 'public', 'data', 'prefetch');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 각 업종별로 데이터 수집
  for (const industry of industries) {
    const result = await prefetchIndustry(industry.code, industry.name);

    // JSON 파일로 저장
    const outputPath = path.join(outputDir, `localdata-${industry.code}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`💾 저장 완료: ${outputPath}\n`);
  }

  console.log('✅ 모든 데이터 수집 완료!');
}

main().catch(error => {
  console.error('❌ 실행 실패:', error);
  process.exit(1);
});
