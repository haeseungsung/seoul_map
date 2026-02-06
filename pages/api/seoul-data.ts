import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { KNOWN_WORKING_APIS } from '@/utils/known-apis';

/**
 * Next.js API Route - 서울 OpenAPI 데이터 가져오기
 * 선택된 API 서비스에서 실제 데이터를 조회
 */

// 캐시된 카탈로그 데이터
let catalogCache: any[] | null = null;

function loadCatalog() {
  if (catalogCache) return catalogCache;

  try {
    const catalogPath = path.join(process.cwd(), 'public', 'data', 'seoul-api-catalog.json');
    const catalogData = fs.readFileSync(catalogPath, 'utf-8');
    catalogCache = JSON.parse(catalogData);
    return catalogCache;
  } catch (error) {
    console.error('카탈로그 로드 실패:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || '';

    if (!API_KEY) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
    }

    const { serviceId, startIndex = '1', endIndex = '1000' } = req.query;
    const start = parseInt(startIndex as string);
    const end = parseInt(endIndex as string);

    if (!serviceId) {
      return res.status(400).json({ error: '서비스 ID가 필요합니다' });
    }

    // 카탈로그에서 서비스 정보 찾기
    const catalog = loadCatalog();

    if (!catalog || catalog.length === 0) {
      return res.status(500).json({ error: 'API 카탈로그를 로드할 수 없습니다' });
    }

    const serviceInfo = catalog.find((s: any) => s.id === serviceId);

    if (!serviceInfo) {
      return res.status(404).json({ error: `서비스 ID "${serviceId}"를 카탈로그에서 찾을 수 없습니다` });
    }

    // 서울시 OpenAPI는 대부분 XML 응답을 사용합니다.
    // LOCALDATA 계열만 JSON을 사용하며, 나머지는 모두 XML입니다.

    // 구 이름 → 구 코드 매핑
    const GU_CODE_MAP: Record<string, string> = {
      '강남구': 'GN', '강동구': 'GD', '강북구': 'GB', '강서구': 'GS',
      '관악구': 'GA', '광진구': 'GJ', '구로구': 'GR', '금천구': 'GC',
      '노원구': 'NW', '도봉구': 'DB', '동대문구': 'DD', '동작구': 'DJ',
      '마포구': 'MP', '서대문구': 'SD', '서초구': 'SC', '성동구': 'ST',
      '성북구': 'SB', '송파구': 'SP', '양천구': 'YC', '영등포구': 'YD',
      '용산구': 'YS', '은평구': 'EP', '종로구': 'JR', '중구': 'JG', '중랑구': 'JL'
    };

    // Known API인지 확인 (ID 또는 이름으로)
    const knownApi = KNOWN_WORKING_APIS.find(api =>
      api.id === serviceId ||
      serviceInfo.name.includes(api.description) ||
      serviceInfo.name.toLowerCase().includes(api.serviceName.toLowerCase())
    );

    let apiUrl: string;

    if (knownApi) {
      // LOCALDATA 계열도 XML 사용
      apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/${knownApi.serviceName}/${start}/${end}/`;
      console.log('✅ Known API 발견 (XML):', knownApi.serviceName);
    } else if (serviceInfo.name.includes('사회복지시설')) {
      // 사회복지시설 API: fcltOpenInfo_{구코드} 패턴 (XML)
      const guMatch = serviceInfo.name.match(/서울시\s+(\S+구)/);
      if (guMatch) {
        const guName = guMatch[1];
        const guCode = GU_CODE_MAP[guName];
        if (guCode) {
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/fcltOpenInfo_${guCode}/${start}/${end}/`;
          console.log(`✅ 사회복지시설 API 발견 (XML): fcltOpenInfo_${guCode} (${guName})`);
        } else {
          // 구 코드를 찾지 못하면 fallback (XML)
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
          console.log('⚠️  구 코드를 찾을 수 없음, tbLnOpendataService (XML) 시도');
        }
      } else {
        apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
        console.log('⚠️  구 이름 추출 실패, tbLnOpendataService (XML) 시도');
      }
    } else if (serviceInfo.name.includes('CCTV') && serviceInfo.name.includes('불법주정차')) {
      // CCTV API: TbOpendataFixedcctv{구코드} 패턴 (XML)
      const guMatch = serviceInfo.name.match(/서울시\s+(\S+구)/);
      if (guMatch) {
        const guName = guMatch[1];
        const guCode = GU_CODE_MAP[guName];
        if (guCode) {
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/TbOpendataFixedcctv${guCode}/${start}/${end}/`;
          console.log(`✅ CCTV API 발견 (XML): TbOpendataFixedcctv${guCode} (${guName})`);
        } else {
          // 구 코드를 찾지 못하면 fallback (XML)
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
          console.log('⚠️  구 코드를 찾을 수 없음, tbLnOpendataService (XML) 시도');
        }
      } else {
        apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
        console.log('⚠️  구 이름 추출 실패, tbLnOpendataService (XML) 시도');
      }
    } else if (serviceInfo.name.includes('번호판') && serviceInfo.name.includes('영치')) {
      // 번호판 영치 API: TnCsdyPublicView{구코드} 패턴 (XML)
      const guMatch = serviceInfo.name.match(/서울시\s+(\S+구)/);
      if (guMatch) {
        const guName = guMatch[1];
        const guCode = GU_CODE_MAP[guName];
        if (guCode) {
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/TnCsdyPublicView${guCode}/${start}/${end}/`;
          console.log(`✅ 번호판 영치 API 발견 (XML): TnCsdyPublicView${guCode} (${guName})`);
        } else {
          // 구 코드를 찾지 못하면 fallback (XML)
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
          console.log('⚠️  구 코드를 찾을 수 없음, tbLnOpendataService (XML) 시도');
        }
      } else {
        apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
        console.log('⚠️  구 이름 추출 실패, tbLnOpendataService (XML) 시도');
      }
    } else {
      // LOCALDATA 패턴 감지: "서울시 XX구 YYY 인허가 정보"
      const localdataMatch = serviceInfo.name.match(/서울시\s+(\S+구)\s+(.+?)\s+(인허가|정보|현황|목록)/);
      if (localdataMatch) {
        const guName = localdataMatch[1];
        const entityName = localdataMatch[2];
        const guCode = GU_CODE_MAP[guName];

        // 엔티티 타입 코드 매핑 (병원: 010101, 음식점: 070101 등)
        const entityCodeMap: Record<string, string> = {
          '병원': '010101',
          '치과병원': '010102',
          '한방병원': '010103',
          '요양병원': '010104',
          '일반음식점': '070101',
          '휴게음식점': '070102',
          '단란주점': '070103',
          '유흥주점': '070104',
          '약국': '020101',
          '한약국': '020102',
          '공중위생업소': '030101'
        };

        const entityCode = entityCodeMap[entityName];

        if (guCode && entityCode) {
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/LOCALDATA_${entityCode}_${guCode}/${start}/${end}/`;
          console.log(`✅ LOCALDATA API 발견 (XML): LOCALDATA_${entityCode}_${guCode} (${guName} ${entityName})`);
        } else {
          // 매핑을 찾지 못하면 fallback
          apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
          console.log(`⚠️  LOCALDATA 매핑 실패 (entityCode: ${entityCode}, guCode: ${guCode}), fallback 시도`);
        }
      } else {
        // 기본값: XML 형식으로 tbLnOpendataService 시도
        apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/tbLnOpendataService/${start}/${end}/${serviceId}/`;
        console.log('⚠️  Unknown API, tbLnOpendataService (XML) 시도');
      }
    }

    console.log('📡 서울 API 호출:', {
      serviceId,
      serviceInfo: serviceInfo.name,
      knownApi: knownApi?.serviceName,
      url: apiUrl,
    });

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API HTTP 에러: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let data: any;
    let serviceKey: string;
    let serviceData: any;

    // XML 응답 처리
    if (contentType.includes('xml')) {
      const xmlText = await response.text();
      console.log('📄 XML 응답 수신');

      // 간단한 XML 파싱 (list_total_count와 row 추출)
      const listTotalCountMatch = xmlText.match(/<list_total_count>(\d+)<\/list_total_count>/);
      const totalCount = listTotalCountMatch ? parseInt(listTotalCountMatch[1]) : 0;

      // 서비스 키 추출 (루트 엘리먼트명)
      const serviceKeyMatch = xmlText.match(/<(\w+)>/);
      serviceKey = serviceKeyMatch ? serviceKeyMatch[1] : 'unknown';

      // RESULT 코드 확인
      const resultCodeMatch = xmlText.match(/<CODE>([^<]+)<\/CODE>/);
      const resultCode = resultCodeMatch ? resultCodeMatch[1] : 'INFO-000';

      // 데이터 기준일 추출 (여러 패턴 시도)
      let dataDate: string | null = null;
      const datePatterns = [
        /<STDR_DE>([^<]+)<\/STDR_DE>/,      // 기준일
        /<BASE_DT>([^<]+)<\/BASE_DT>/,      // 기준일자
        /<DATA_STD_DT>([^<]+)<\/DATA_STD_DT>/, // 데이터 기준일자
        /<UPD_DT>([^<]+)<\/UPD_DT>/,        // 갱신일자
        /<UPD_DATE>([^<]+)<\/UPD_DATE>/,    // 갱신일
      ];

      for (const pattern of datePatterns) {
        const match = xmlText.match(pattern);
        if (match) {
          dataDate = match[1];
          break;
        }
      }

      // row 데이터 추출
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

      console.log('✅ XML 파싱 완료:', {
        serviceKey,
        totalCount,
        resultCode,
        dataDate,
        rowCount: rows.length,
      });

      serviceData = {
        list_total_count: totalCount,
        RESULT: {
          CODE: resultCode,
          MESSAGE: '정상 처리되었습니다'
        },
        dataDate: dataDate || undefined,
        row: rows,
      };

      data = { [serviceKey]: serviceData };
    } else {
      // JSON 응답 처리
      data = await response.json();

      console.log('✅ JSON 응답 수신:', {
        keys: Object.keys(data),
        firstKey: Object.keys(data)[0],
      });

      serviceKey = Object.keys(data)[0];
      serviceData = data[serviceKey];
    }

    // RESULT 에러 체크
    if (serviceData?.RESULT) {
      const resultCode = serviceData.RESULT.CODE;

      // INFO-200: 해당하는 데이터가 없습니다
      if (resultCode === 'INFO-200') {
        return res.json({
          success: false,
          error: '해당 서비스는 데이터를 제공하지 않습니다',
          code: resultCode,
          message: serviceData.RESULT.MESSAGE || '데이터가 없습니다',
        });
      }

      // INFO-000이 아닌 다른 에러 코드
      if (resultCode !== 'INFO-000') {
        return res.status(400).json({
            success: false,
            error: `API 에러: ${serviceData.RESULT.MESSAGE || resultCode}`,
            code: resultCode,
          });
      }

      // INFO-000이고 row도 없고 list_total_count도 0이면 에러
      if (!serviceData.row && !serviceData.list_total_count) {
        return res.json({
          success: false,
          error: '해당 서비스는 데이터를 제공하지 않습니다',
          code: resultCode,
          message: '데이터가 없습니다',
        });
      }
    }

    const totalCount = serviceData?.list_total_count || 0;
    const dataDate = serviceData?.dataDate || null;

    return res.json({
      success: true,
      data: serviceData,
      serviceKey,
      serviceName: serviceInfo.name,
      totalCount,
      rows: serviceData?.row || [],
      dataDate,
      dataNote: totalCount === 0
        ? '데이터가 0이거나 제공되지 않을 수 있습니다. 자세한 사항은 서울 열린데이터광장(https://data.seoul.go.kr)을 참고하세요.'
        : dataDate
          ? `데이터 기준일: ${dataDate}`
          : '데이터 기준일 정보 없음',
    });
  } catch (error) {
    console.error('❌ API 호출 실패:', error);

    return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
  }
}
