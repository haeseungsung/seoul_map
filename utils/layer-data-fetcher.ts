/**
 * Layer Data Fetcher - V3 Coverage Layer에서 실제 API 데이터 가져오기
 *
 * V3 레이어는 데이터셋 커버리지만 제공합니다.
 * 이 유틸리티는 실제 API를 호출해서 데이터를 가져옵니다.
 */

export interface Layer {
  layerId: string;
  displayName: string;
  entityType: string;
  mapCategory: string;
  taskType: string;
  coverageScope: 'district' | 'citywide' | 'mixed';
  sourceDatasets: SourceDataset[];
  coverageDisplay: CoverageDisplay;
}

export interface SourceDataset {
  id: string;
  name: string;
  district: string;
  serviceType: string;
  serviceTypes: string[];
  gu: string | null;
  isCitywide: boolean;
}

export interface CoverageDisplay {
  districtCount: number;
  districts: string[];
  districtProvidedMap: Record<string, {
    isProvided: boolean;
    sourceCount: number;
  }> | null;
  citywideValue: {
    isProvided: boolean;
    sourceCount: number;
    serviceTypes: Record<string, number>;
  } | null;
}

export interface LayerFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry?: {
    type: 'Point';
    coordinates: [number, number];
  };
  sourceDataset: string;
  sourceGu: string | null;
}

export interface FetchResult {
  success: boolean;
  features: LayerFeature[];
  errors: FetchError[];
  metadata: {
    totalDatasets: number;
    successfulDatasets: number;
    failedDatasets: number;
    totalFeatures: number;
    byDistrict: Record<string, number>;
  };
}

export interface FetchError {
  datasetId: string;
  datasetName: string;
  error: string;
}

/**
 * 레이어의 모든 데이터셋에서 데이터 가져오기
 */
export async function fetchLayerData(
  layer: Layer,
  options?: {
    districts?: string[]; // 특정 구만 가져오기
    limit?: number; // 각 데이터셋당 최대 개수
    timeout?: number; // 타임아웃 (ms)
  }
): Promise<FetchResult> {
  const features: LayerFeature[] = [];
  const errors: FetchError[] = [];
  const byDistrict: Record<string, number> = {};

  // 필터링된 데이터셋 목록
  let datasets = layer.sourceDatasets;

  if (options?.districts && options.districts.length > 0) {
    datasets = datasets.filter(ds =>
      ds.gu && options.districts!.includes(ds.gu)
    );
  }

  console.log(`📊 레이어 "${layer.displayName}" 데이터 가져오기`);
  console.log(`   총 ${datasets.length}개 데이터셋 (전체: ${layer.sourceDatasets.length})`);

  // 병렬로 모든 데이터셋 가져오기
  const promises = datasets.map(dataset =>
    fetchDatasetWithRetry(dataset, {
      limit: options?.limit || 1000,
      timeout: options?.timeout || 10000
    })
  );

  const results = await Promise.allSettled(promises);

  // 결과 집계
  results.forEach((result, index) => {
    const dataset = datasets[index];

    if (result.status === 'fulfilled' && result.value.success) {
      const datasetFeatures = result.value.rows.map((row: any) => ({
        type: 'Feature' as const,
        properties: row,
        sourceDataset: dataset.id,
        sourceGu: dataset.gu,
        geometry: extractGeometry(row)
      }));

      features.push(...datasetFeatures);

      // 구별 카운트
      if (dataset.gu) {
        byDistrict[dataset.gu] = (byDistrict[dataset.gu] || 0) + datasetFeatures.length;
      }

      console.log(`   ✅ ${dataset.gu || '서울시'}: ${datasetFeatures.length}개 (${dataset.id})`);
    } else {
      const error = result.status === 'rejected'
        ? result.reason
        : result.value.error;

      errors.push({
        datasetId: dataset.id,
        datasetName: dataset.name,
        error: String(error)
      });

      console.log(`   ❌ ${dataset.gu || '서울시'}: 실패 (${dataset.id}) - ${error}`);
    }
  });

  const successfulDatasets = datasets.length - errors.length;

  console.log(`\n✅ 완료: ${successfulDatasets}/${datasets.length} 성공, ${features.length}개 항목`);

  if (errors.length > 0) {
    console.log(`❌ 실패한 데이터셋: ${errors.length}개`);
    errors.forEach(err => {
      console.log(`   - ${err.datasetName}: ${err.error}`);
    });
  }

  return {
    success: successfulDatasets > 0,
    features,
    errors,
    metadata: {
      totalDatasets: datasets.length,
      successfulDatasets,
      failedDatasets: errors.length,
      totalFeatures: features.length,
      byDistrict
    }
  };
}

/**
 * 단일 데이터셋에서 데이터 가져오기 (재시도 포함)
 */
async function fetchDatasetWithRetry(
  dataset: SourceDataset,
  options: { limit: number; timeout: number },
  retries = 1
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      const response = await fetch(
        `/api/seoul-data?serviceId=${dataset.id}&startIndex=1&endIndex=${options.limit}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // 재시도 전 대기
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * 데이터에서 좌표 추출 시도
 */
function extractGeometry(row: any): { type: 'Point'; coordinates: [number, number] } | undefined {
  // 다양한 좌표 필드명 시도
  const latFields = ['LAT', 'LATITUDE', 'Y', 'WGS84LAT', '위도'];
  const lngFields = ['LNG', 'LON', 'LONGITUDE', 'X', 'WGS84LON', '경도'];

  let lat: number | undefined;
  let lng: number | undefined;

  // 위도 찾기
  for (const field of latFields) {
    const value = row[field] || row[field.toLowerCase()];
    if (value) {
      lat = parseFloat(String(value));
      if (!isNaN(lat)) break;
    }
  }

  // 경도 �기
  for (const field of lngFields) {
    const value = row[field] || row[field.toLowerCase()];
    if (value) {
      lng = parseFloat(String(value));
      if (!isNaN(lng)) break;
    }
  }

  // 좌표가 유효한 범위인지 확인 (서울 근처)
  if (lat && lng &&
      lat >= 37.0 && lat <= 38.0 &&
      lng >= 126.0 && lng <= 128.0) {
    return {
      type: 'Point',
      coordinates: [lng, lat]
    };
  }

  return undefined;
}

/**
 * 특정 구의 데이터만 가져오기
 */
export async function fetchDistrictData(
  layer: Layer,
  gu: string,
  options?: { limit?: number; timeout?: number }
): Promise<FetchResult> {
  return fetchLayerData(layer, {
    ...options,
    districts: [gu]
  });
}

/**
 * 여러 구의 데이터 가져오기
 */
export async function fetchMultipleDistricts(
  layer: Layer,
  districts: string[],
  options?: { limit?: number; timeout?: number }
): Promise<FetchResult> {
  return fetchLayerData(layer, {
    ...options,
    districts
  });
}

/**
 * 레이어 데이터를 GeoJSON으로 변환
 */
export function convertToGeoJSON(result: FetchResult) {
  return {
    type: 'FeatureCollection',
    features: result.features.filter(f => f.geometry !== undefined),
    properties: {
      totalFeatures: result.metadata.totalFeatures,
      byDistrict: result.metadata.byDistrict
    }
  };
}

/**
 * 간단한 통계 추출
 */
export function getLayerStats(result: FetchResult) {
  const stats = {
    total: result.features.length,
    withCoordinates: result.features.filter(f => f.geometry).length,
    withoutCoordinates: result.features.filter(f => !f.geometry).length,
    byDistrict: result.metadata.byDistrict,
    topDistricts: Object.entries(result.metadata.byDistrict)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([gu, count]) => ({ gu, count }))
  };

  return stats;
}
