/**
 * LOCALDATA 25개 구 병합 API
 *
 * 사용법:
 * GET /api/localdata-merge?industryCode=072217
 *
 * - 특정 업종의 25개 구 데이터를 자동으로 수집하여 병합
 * - 페이지네이션 처리 (최대 1000건/요청)
 * - 각 레코드에 GU 필드 추가
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAllGuServices, parseLocalDataService } from '@/utils/localdata-utils';

const SEOUL_API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY;
const BASE_URL = 'http://openapi.seoul.go.kr:8088';

interface FetchResult {
  guName: string;
  guCode: string;
  data: any[];
  totalCount: number;
  error?: string;
}

/**
 * 단일 구의 모든 데이터 fetch (페이지네이션 포함)
 */
async function fetchGuData(
  serviceName: string,
  guName: string,
  guCode: string
): Promise<FetchResult> {
  const result: FetchResult = {
    guName,
    guCode,
    data: [],
    totalCount: 0,
  };

  try {
    // 첫 번째 요청으로 총 개수 확인 (XML 사용)
    const firstUrl = `${BASE_URL}/${SEOUL_API_KEY}/xml/${serviceName}/1/1`;
    const firstResponse = await fetch(firstUrl);

    if (!firstResponse.ok) {
      result.error = `HTTP ${firstResponse.status}`;
      return result;
    }

    const firstXml = await firstResponse.text();

    // XML에서 총 개수 추출
    const listTotalCountMatch = firstXml.match(/<list_total_count>(\d+)<\/list_total_count>/);
    const totalCount = listTotalCountMatch ? parseInt(listTotalCountMatch[1]) : 0;
    result.totalCount = totalCount;

    if (totalCount === 0) {
      return result; // 데이터 없음
    }

    // 서비스 키 추출 (루트 엘리먼트명)
    const serviceKeyMatch = firstXml.match(/<(\w+)>/);
    const serviceKey = serviceKeyMatch ? serviceKeyMatch[1] : serviceName;

    // 페이지네이션으로 모든 데이터 수집
    const pageSize = 1000;
    const totalPages = Math.ceil(totalCount / pageSize);

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

      // XML에서 row 데이터 추출 (간단한 파싱)
      const rowMatches = xmlText.matchAll(/<row>([\s\S]*?)<\/row>/g);
      const rows = [];

      for (const match of rowMatches) {
        const rowXml = match[1];
        const rowData: any = {};

        // 각 필드 추출
        const fieldMatches = rowXml.matchAll(/<(\w+)>([^<]*)<\/\1>/g);
        for (const fieldMatch of fieldMatches) {
          rowData[fieldMatch[1]] = fieldMatch[2];
        }

        rows.push(rowData);
      }

      // GU 필드 추가
      const enrichedRows = rows.map((row: any) => ({
        ...row,
        GU: guName,
        GU_CODE: guCode,
      }));

      result.data.push(...enrichedRows);
    }

    console.log(`✅ ${guName}: ${result.data.length}건 수집 완료`);
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${guName} fetch 실패:`, result.error);
    return result;
  }
}

/**
 * 25개 구 데이터 병합
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = 'GET';
  if (req.method !== method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const query = req.query;
  const industryCode = query.industryCode as string;
  const aggregate = query.aggregate === 'true'; // 집계 모드: 구별 개수만 반환

  if (!industryCode) {
    return res.status(400).json({ success: false, error: 'industryCode 파라미터가 필요합니다' });
  }

  if (!SEOUL_API_KEY) {
    return res.status(500).json({ success: false, error: 'SEOUL_API_KEY가 설정되지 않았습니다' });
  }

  try {
    console.log(`🔄 업종 ${industryCode} - 25개 구 데이터 수집 시작...`);

    // 25개 구 서비스명 생성
    const services = generateAllGuServices(industryCode);

    // 병렬로 모든 구 데이터 fetch
    const fetchPromises = services.map((service) =>
      fetchGuData(service.serviceName, service.guName, service.guCode)
    );

    const results = await Promise.all(fetchPromises);

    // 결과 집계
    const mergedData: any[] = [];
    const summary = {
      totalRecords: 0,
      guCount: 0,
      guList: [] as string[],
      errors: [] as Array<{ gu: string; error: string }>,
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

    console.log(`✅ 병합 완료: ${summary.totalRecords}건 (${summary.guCount}/25 구)`);

    // 집계 모드: 구별 개수만 반환 (응답 크기 최소화)
    if (aggregate) {
      const guAggregated = results.map((result) => {
        // 영업 상태별 개수 계산
        const activeCount = result.data.filter((row: any) => row.TRDSTATEGBN === '01').length;
        const closedCount = result.data.filter((row: any) => row.TRDSTATEGBN === '03').length;
        const totalCount = result.data.length;

        return {
          gu: result.guName,
          count: totalCount,
          activeCount,
          closedCount,
          totalCount: result.totalCount,
        };
      });

      console.log(`📊 집계 모드: 구별 개수 + 영업상태 반환 (${guAggregated.length}개 구)`);

      return res.json({
        success: true,
        industryCode,
        data: guAggregated,
        summary,
      });
    }

    // 전체 모드: 모든 데이터 반환 (4MB 초과 경고)
    return res.json({
      success: true,
      industryCode,
      data: mergedData,
      summary,
    });
  } catch (error) {
    console.error('❌ 병합 API 에러:', error);
    return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
  }
}
