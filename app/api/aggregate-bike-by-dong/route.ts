import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as turf from '@turf/turf';

/**
 * 서울시 공공자전거 실시간 대여정보를 행정동별로 집계
 *
 * API: OA-15493 (bikeList)
 * - 각 대여소의 좌표를 행정동 GeoJSON과 매칭
 * - 행정동별로 총 주차대수, 이용가능 자전거 수 집계
 */

const API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || '';

// GeoJSON 캐시
let dongGeojsonCache: any = null;

function loadDongGeojson() {
  if (dongGeojsonCache) return dongGeojsonCache;

  try {
    const geojsonPath = path.join(process.cwd(), 'public', 'data', 'seoul-hangjeongdong.geojson');
    dongGeojsonCache = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
    console.log(`✅ 행정동 GeoJSON 로드: ${dongGeojsonCache.features.length}개 행정동`);
    return dongGeojsonCache;
  } catch (error) {
    console.error('❌ 행정동 GeoJSON 로드 실패:', error);
    return null;
  }
}

// 좌표를 행정동으로 매칭 (point-in-polygon)
function findDongByCoordinate(longitude: number, latitude: number, geojson: any): string | null {
  if (!geojson || !geojson.features) return null;

  const point = turf.point([longitude, latitude]);

  for (const feature of geojson.features) {
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      try {
        const isInside = turf.booleanPointInPolygon(point, feature);
        if (isInside) {
          // adm_nm: "서울특별시 종로구 사직동" → "사직동" 추출
          const admNm = feature.properties?.adm_nm || '';
          const parts = admNm.split(' ');
          const dongName = parts.length >= 3 ? parts[2] : admNm;
          const guName = parts.length >= 2 ? parts[1] : '';

          return JSON.stringify({ dong_name: dongName, gu_name: guName, adm_nm: admNm });
        }
      } catch (error) {
        // Skip invalid geometries
        continue;
      }
    }
  }

  return null;
}

// 자전거 대여소 API 호출
async function fetchBikeData() {
  const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/bikeList/1/1000/`;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } }); // 5분 캐시
    if (!response.ok) {
      console.error('❌ 자전거 API 호출 실패:', response.status);
      return null;
    }

    const data = await response.json();

    // 응답 구조 확인
    const rentBikeStatus = data.rentBikeStatus;
    if (!rentBikeStatus || rentBikeStatus.RESULT?.CODE !== 'INFO-000') {
      console.error('❌ 자전거 API 오류:', rentBikeStatus?.RESULT);
      return null;
    }

    return rentBikeStatus.row || [];
  } catch (error) {
    console.error('❌ 자전거 API 호출 에러:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    console.log('🚴 자전거 대여소 데이터 수집 시작');

    // 1. 행정동 GeoJSON 로드
    const dongGeojson = loadDongGeojson();
    if (!dongGeojson) {
      return NextResponse.json(
        { error: '행정동 GeoJSON을 로드할 수 없습니다' },
        { status: 500 }
      );
    }

    // 2. 자전거 대여소 데이터 가져오기
    const bikeStations = await fetchBikeData();
    if (!bikeStations || bikeStations.length === 0) {
      return NextResponse.json(
        { error: '자전거 대여소 데이터를 가져올 수 없습니다' },
        { status: 500 }
      );
    }

    console.log(`📍 자전거 대여소: ${bikeStations.length}개`);

    // 3. 행정동별 집계 객체 초기화
    const dongAggregation: Record<string, {
      dong_name: string;
      gu_name: string;
      adm_nm: string;
      total_racks: number;        // 총 주차대수
      available_bikes: number;    // 이용가능 자전거
      station_count: number;      // 대여소 개수
      stations: Array<{
        stationName: string;
        stationId: string;
        latitude: number;
        longitude: number;
        rackTotCnt: number;
        parkingBikeTotCnt: number;
      }>;
    }> = {};

    let matchedCount = 0;
    let unmatchedCount = 0;

    // 4. 각 대여소를 행정동에 매칭
    for (const station of bikeStations) {
      const lat = parseFloat(station.stationLatitude);
      const lon = parseFloat(station.stationLongitude);

      if (isNaN(lat) || isNaN(lon)) {
        unmatchedCount++;
        continue;
      }

      const dongInfoStr = findDongByCoordinate(lon, lat, dongGeojson);

      if (dongInfoStr) {
        const dongInfo = JSON.parse(dongInfoStr);
        const key = dongInfo.adm_nm;

        if (!dongAggregation[key]) {
          dongAggregation[key] = {
            dong_name: dongInfo.dong_name,
            gu_name: dongInfo.gu_name,
            adm_nm: dongInfo.adm_nm,
            total_racks: 0,
            available_bikes: 0,
            station_count: 0,
            stations: [],
          };
        }

        const rackCount = parseInt(station.rackTotCnt) || 0;
        const bikeCount = parseInt(station.parkingBikeTotCnt) || 0;

        dongAggregation[key].total_racks += rackCount;
        dongAggregation[key].available_bikes += bikeCount;
        dongAggregation[key].station_count += 1;
        dongAggregation[key].stations.push({
          stationName: station.stationName,
          stationId: station.stationId,
          latitude: lat,
          longitude: lon,
          rackTotCnt: rackCount,
          parkingBikeTotCnt: bikeCount,
        });

        matchedCount++;
      } else {
        unmatchedCount++;
      }
    }

    // 5. 배열로 변환 및 이용률 계산
    const dongData = Object.values(dongAggregation).map(dong => ({
      ...dong,
      availability_rate: dong.total_racks > 0
        ? (dong.available_bikes / dong.total_racks) * 100
        : 0,
      usage_rate: dong.total_racks > 0
        ? ((dong.total_racks - dong.available_bikes) / dong.total_racks) * 100
        : 0,
    }));

    console.log(`✅ 행정동별 집계 완료: ${dongData.length}개 행정동`);
    console.log(`   매칭 성공: ${matchedCount}개 대여소`);
    console.log(`   매칭 실패: ${unmatchedCount}개 대여소`);

    return NextResponse.json({
      success: true,
      totalStations: bikeStations.length,
      matchedStations: matchedCount,
      unmatchedStations: unmatchedCount,
      dongCount: dongData.length,
      data: dongData,
      metadata: {
        collectedAt: new Date().toISOString(),
        apiType: '서울시 공공자전거 실시간 대여정보',
        serviceId: 'OA-15493',
      },
    });

  } catch (error) {
    console.error('❌ 자전거 데이터 집계 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
