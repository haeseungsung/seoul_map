/**
 * 복지시설 25개 구 병합 및 종류별 집계 API
 *
 * 사용법:
 * GET /api/welfare-aggregate?facilityType=노인복지시설
 * GET /api/welfare-aggregate (전체)
 *
 * - 25개 구의 사회복지시설 데이터를 수집하여 종류별로 집계
 * - FCLT_KIND_NM 필드를 파싱하여 대분류별 개수 반환
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const SEOUL_API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY;
const BASE_URL = 'http://openapi.seoul.go.kr:8088';

// 구 코드 매핑
const GU_CODE_MAP: Record<string, string> = {
  '강남구': 'GN', '강동구': 'GD', '강북구': 'GB', '강서구': 'GS',
  '관악구': 'GA', '광진구': 'GJ', '구로구': 'GR', '금천구': 'GC',
  '노원구': 'NW', '도봉구': 'DB', '동대문구': 'DD', '동작구': 'DJ',
  '마포구': 'MP', '서대문구': 'SD', '서초구': 'SC', '성동구': 'ST',
  '성북구': 'SB', '송파구': 'SP', '양천구': 'YC', '영등포구': 'YD',
  '용산구': 'YS', '은평구': 'EP', '종로구': 'JR', '중구': 'JG', '중랑구': 'JL'
};

interface FacilityRecord {
  FCLT_NM: string;
  FCLT_KIND_NM: string;
  FCLT_KIND_DTL_NM: string;
  JRSD_SGG_NM: string;
}

interface GuAggregate {
  gu: string;
  total: number;
  노인복지시설: number;
  아동복지시설: number;
  장애인복지시설: number;
  정신보건복지시설: number;
  여성복지시설: number;
  일반사회복지시설: number;
}

/**
 * 시설 종류를 대분류로 매핑
 */
function categorizeFacility(fcltKindNm: string): string {
  if (fcltKindNm.includes('노인복지시설') || fcltKindNm.includes('장기요양시설')) {
    return '노인복지시설';
  }
  if (fcltKindNm.includes('아동복지시설')) {
    return '아동복지시설';
  }
  if (fcltKindNm.includes('장애인복지시설')) {
    return '장애인복지시설';
  }
  if (fcltKindNm.includes('정신보건복지시설')) {
    return '정신보건복지시설';
  }
  if (fcltKindNm.includes('여성복지시설')) {
    return '여성복지시설';
  }
  // 나머지는 일반사회복지시설로 분류
  return '일반사회복지시설';
}

/**
 * 단일 구의 복지시설 데이터 fetch
 */
async function fetchGuWelfare(guName: string, guCode: string): Promise<FacilityRecord[]> {
  try {
    const serviceName = `fcltOpenInfo_${guCode}`;
    const url = `${BASE_URL}/${SEOUL_API_KEY}/xml/${serviceName}/1/1000/`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ ${guName} HTTP 에러: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();

    // 총 개수 확인
    const listTotalCountMatch = xmlText.match(/<list_total_count>(\d+)<\/list_total_count>/);
    const totalCount = listTotalCountMatch ? parseInt(listTotalCountMatch[1]) : 0;

    if (totalCount === 0) {
      return [];
    }

    // row 데이터 추출
    const rowMatches = xmlText.matchAll(/<row>([\s\S]*?)<\/row>/g);
    const facilities: FacilityRecord[] = [];

    for (const match of rowMatches) {
      const rowXml = match[1];

      // 필요한 필드만 추출
      const fcltNmMatch = rowXml.match(/<FCLT_NM>([^<]*)<\/FCLT_NM>/);
      const fcltKindNmMatch = rowXml.match(/<FCLT_KIND_NM>([^<]*)<\/FCLT_KIND_NM>/);
      const fcltKindDtlNmMatch = rowXml.match(/<FCLT_KIND_DTL_NM>([^<]*)<\/FCLT_KIND_DTL_NM>/);
      const jrsdSggNmMatch = rowXml.match(/<JRSD_SGG_NM>([^<]*)<\/JRSD_SGG_NM>/);

      if (fcltKindNmMatch) {
        facilities.push({
          FCLT_NM: fcltNmMatch?.[1] || '',
          FCLT_KIND_NM: fcltKindNmMatch[1],
          FCLT_KIND_DTL_NM: fcltKindDtlNmMatch?.[1] || '',
          JRSD_SGG_NM: jrsdSggNmMatch?.[1] || guName,
        });
      }
    }

    console.log(`✅ ${guName}: ${facilities.length}개 복지시설 수집`);
    return facilities;
  } catch (error) {
    console.error(`❌ ${guName} fetch 실패:`, error);
    return [];
  }
}

/**
 * 25개 구 복지시설 데이터 병합 및 집계
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { facilityType } = req.query;

  if (!SEOUL_API_KEY) {
    return res.status(500).json({ success: false, error: 'SEOUL_API_KEY가 설정되지 않았습니다' });
  }

  try {
    console.log(`🔄 복지시설 데이터 수집 시작 (필터: ${facilityType || '전체'})`);

    // 25개 구 병렬 fetch
    const fetchPromises = Object.entries(GU_CODE_MAP).map(([guName, guCode]) =>
      fetchGuWelfare(guName, guCode)
    );

    const results = await Promise.all(fetchPromises);

    // 구별 집계
    const guAggregates: GuAggregate[] = Object.keys(GU_CODE_MAP).map((guName, index) => {
      const facilities = results[index];

      const aggregate: GuAggregate = {
        gu: guName,
        total: facilities.length,
        노인복지시설: 0,
        아동복지시설: 0,
        장애인복지시설: 0,
        정신보건복지시설: 0,
        여성복지시설: 0,
        일반사회복지시설: 0,
      };

      facilities.forEach(facility => {
        const category = categorizeFacility(facility.FCLT_KIND_NM);
        aggregate[category as keyof Omit<GuAggregate, 'gu' | 'total'>]++;
      });

      return aggregate;
    });

    console.log(`✅ 복지시설 집계 완료: ${guAggregates.reduce((sum, g) => sum + g.total, 0)}개 시설`);

    // 특정 종류 필터링
    if (facilityType && typeof facilityType === 'string') {
      const filteredData = guAggregates.map(g => ({
        gu: g.gu,
        count: g[facilityType as keyof Omit<GuAggregate, 'gu'>] || 0,
      }));

      return res.json({
        success: true,
        facilityType,
        data: filteredData,
      });
    }

    // 전체 데이터 반환
    return res.json({
      success: true,
      data: guAggregates,
    });
  } catch (error) {
    console.error('❌ 복지시설 집계 API 에러:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
