import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * Next.js API Route - 25개 구별 API 데이터를 자동으로 수집해서 병합
 *
 * 예: /api/aggregate-gu-data?apiType=일반음식점 인허가 정보
 *
 * 모든 구의 "서울시 XX구 일반음식점 인허가 정보" API를 호출해서
 * 하나의 서울시 데이터로 병합
 */

const API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || '';

const GU_NAMES = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구'
];

// 카탈로그 로드
let catalogCache: any[] | null = null;
function loadCatalog() {
  if (catalogCache) return catalogCache;
  try {
    const catalogPath = path.join(process.cwd(), 'public', 'data', 'seoul-api-catalog.json');
    catalogCache = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    return catalogCache;
  } catch (error) {
    console.error('카탈로그 로드 실패:', error);
    return [];
  }
}

// API 이름에서 구 이름 제거 (정규화)
function normalizeApiName(name: string): string {
  let normalized = name;
  GU_NAMES.forEach(gu => {
    normalized = normalized.replace(`서울시 ${gu} `, '').replace(gu, '').trim();
  });
  return normalized;
}

// tbLnOpendataService API 호출
async function fetchGuData(serviceId: string, guName: string) {
  const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/tbLnOpendataService/1/1000/${serviceId}/`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const serviceKey = Object.keys(data)[0];
    const serviceData = data[serviceKey];

    // 데이터 체크
    if (serviceData?.RESULT?.CODE === 'INFO-200' || !serviceData?.row) {
      return null;
    }

    return serviceData.row || [];
  } catch (error) {
    console.error(`❌ ${guName} 데이터 로드 실패:`, error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = 'GET';
  if (req.method !== method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
    }

    const query = req.query;
    const apiType = query.apiType as string; // 예: "일반음식점 인허가 정보"

    if (!apiType) {
      return res.status(400).json({ error: 'apiType 파라미터가 필요합니다' });
    }

    console.log('🔄 구별 API 데이터 수집 시작:', apiType);

    // 카탈로그 로드
    const catalog = loadCatalog();
    if (!catalog || catalog.length === 0) {
      return res.status(500).json({ error: 'API 카탈로그를 로드할 수 없습니다' });
    }

    // 각 구별로 해당 API 찾기
    const guApiMap: Record<string, any> = {};

    GU_NAMES.forEach(gu => {
      const apiName = `서울시 ${gu} ${apiType}`;
      const found = catalog.find((item: any) => item.name === apiName);
      if (found) {
        guApiMap[gu] = found;
      }
    });

    const foundCount = Object.keys(guApiMap).length;
    console.log(`✅ ${foundCount}개 구의 API 발견`);

    if (foundCount === 0) {
      return res.status(404).json({ error: `"${apiType}"에 해당하는 구별 API를 찾을 수 없습니다` });
    }

    // 모든 구의 데이터를 병렬로 가져오기
    console.log('📡 25개 구 API 병렬 호출 중...');

    const dataPromises = GU_NAMES.map(async (gu) => {
      const apiInfo = guApiMap[gu];
      if (!apiInfo) return { gu, data: null, error: 'API 없음' };

      const data = await fetchGuData(apiInfo.id, gu);
      return { gu, data, error: data === null ? '데이터 없음' : null };
    });

    const results = await Promise.all(dataPromises);

    // 성공/실패 통계
    const successful = results.filter(r => r.data !== null);
    const failed = results.filter(r => r.data === null);

    console.log(`✅ 성공: ${successful.length}개 구`);
    console.log(`❌ 실패: ${failed.length}개 구`);

    // 모든 데이터 병합
    let allRows: any[] = [];
    const guDataCounts: Record<string, number> = {};

    successful.forEach(result => {
      if (result.data && Array.isArray(result.data)) {
        // 각 row에 구 이름 추가
        const enrichedRows = result.data.map((row: any) => ({
          ...row,
          _gu_name: result.gu, // 메타데이터로 구 이름 추가
        }));

        allRows = allRows.concat(enrichedRows);
        guDataCounts[result.gu] = result.data.length;
      }
    });

    console.log(`📊 총 ${allRows.length}개 row 병합 완료`);

    return res.json({
      success: true,
      apiType,
      totalRows: allRows.length,
      successfulGus: successful.length,
      failedGus: failed.length,
      guDataCounts,
      failedGuList: failed.map(f => ({ gu: f.gu, error: f.error })),
      rows: allRows,
      metadata: {
        collectedAt: new Date().toISOString(),
        apiType,
        coverage: `${successful.length}/25 구`,
      },
    });

  } catch (error) {
    console.error('❌ 구별 데이터 수집 실패:', error);
    return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
  }
}
