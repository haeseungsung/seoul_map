import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Next.js API Route - 서울 OpenAPI 프록시
 * 브라우저 CORS 제한을 우회하기 위한 서버 사이드 프록시
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = 'GET';
  if (req.method !== method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || '';

    if (!API_KEY) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
    }

    // SearchCatalogService로 연결 테스트
    const testUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/SearchCatalogService/1/5/`;

    console.log('🧪 서울 API 테스트:', testUrl);

    const response = await fetch(testUrl);

    if (!response.ok) {
      throw new Error(`API HTTP 에러: ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ API 응답 성공');

    return res.json({
      success: true,
      data,
      message: '서울 OpenAPI 연결 성공',
    });
  } catch (error) {
    console.error('❌ API 테스트 실패:', error);

    return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
  }
}
