/**
 * LOCALDATA 캐시된 데이터 API
 *
 * 빌드 시점에 미리 수집한 정적 데이터를 반환
 * Netlify의 10초 타임아웃 제약을 우회
 *
 * 사용법:
 * GET /api/localdata-cached?industryCode=072404
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { industryCode } = req.query;

  if (!industryCode || typeof industryCode !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'industryCode 파라미터가 필요합니다',
    });
  }

  try {
    // 캐시된 데이터 파일 경로
    const dataPath = path.join(process.cwd(), 'public', 'data', 'prefetch', `localdata-${industryCode}.json`);

    // 파일 존재 확인
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({
        success: false,
        error: `업종 ${industryCode}의 캐시 데이터가 없습니다. 빌드 시점에 수집되지 않았습니다.`,
        hint: 'scripts/prefetch-localdata.js에 해당 업종을 추가하세요',
      });
    }

    // 캐시 데이터 읽기
    const cachedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // 캐시 시간 확인
    const fetchedAt = new Date(cachedData.summary.fetchedAt);
    const ageInHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);

    console.log(`✅ 캐시 데이터 반환: ${industryCode} (${ageInHours.toFixed(1)}시간 전)`);

    // 응답 헤더에 캐시 정보 추가
    res.setHeader('X-Cache-Age-Hours', ageInHours.toFixed(1));
    res.setHeader('X-Cache-Fetched-At', cachedData.summary.fetchedAt);

    return res.json(cachedData);
  } catch (error) {
    console.error('❌ 캐시 데이터 읽기 실패:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
