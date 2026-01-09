/**
 * 지표 메타데이터 및 데이터 로더
 */

export interface IndicatorMetadata {
  family: string;
  indicator_id: string;
  indicator_name: string;
  metric_type: 'count' | 'rate' | 'avg';
  spatial_grain: 'gu' | 'dong';
  source_pattern: string;
  value_field: string;
  description: string;
}

export interface IndicatorValue {
  gu?: string;
  dong?: string;
  value: number;
}

/**
 * CSV에서 지표 메타데이터 로드
 */
export async function loadIndicatorCatalog(): Promise<IndicatorMetadata[]> {
  const response = await fetch('/data/indicator-catalog.csv');
  const csvText = await response.text();

  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header] = values[i];
    });
    return obj as IndicatorMetadata;
  });
}

/**
 * 특정 지표의 데이터를 API에서 가져오기
 */
export async function loadIndicatorData(
  metadata: IndicatorMetadata
): Promise<IndicatorValue[]> {
  const { family, source_pattern, spatial_grain, value_field, metric_type } = metadata;

  if (family === 'LOCALDATA') {
    // LOCALDATA_072217_* 패턴에서 업종 코드 추출
    // 예: LOCALDATA_072217_* → 072217
    const industryCode = source_pattern.replace('LOCALDATA_', '').replace('_*', '');

    console.log(`📊 LOCALDATA 지표 로드: ${metadata.indicator_name}`);
    console.log(`   - 업종 코드: ${industryCode}`);
    console.log(`   - 집계 방식: ${metric_type}`);

    // LOCALDATA API는 25개 구를 병합해야 함
    const response = await fetch(`/api/localdata-merge?industryCode=${industryCode}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || `Failed to load ${metadata.indicator_name}`);
    }

    console.log(`✅ API 응답: ${result.data.length}건 (${result.summary.guCount}개 구)`);

    // 구별로 집계
    const guCounts: Record<string, number> = {};
    result.data.forEach((row: any) => {
      const gu = row.GU || '';
      if (gu) {
        guCounts[gu] = (guCounts[gu] || 0) + 1;
      }
    });

    const indicatorValues = Object.entries(guCounts).map(([gu, count]) => ({
      gu,
      value: count,
    }));

    console.log(`✅ 구별 집계 완료:`, indicatorValues);

    return indicatorValues;
  }

  if (family === 'POPULATION') {
    // CSV 기반 인구 데이터는 이미 로드되어 있음
    // 여기서는 placeholder
    return [];
  }

  return [];
}

/**
 * 지표 데이터를 GeoJSON에 병합
 */
export function mergeIndicatorToGeojson(
  geojson: any,
  indicatorData: IndicatorValue[],
  metadata: IndicatorMetadata
): any {
  const { spatial_grain, indicator_id } = metadata;

  return {
    ...geojson,
    features: geojson.features.map((feature: any) => {
      let matchedValue = 0;

      if (spatial_grain === 'gu') {
        const featureGu = feature.properties?.gu_name;
        const dataPoint = indicatorData.find((d) => d.gu === featureGu);
        matchedValue = dataPoint?.value || 0;
      } else if (spatial_grain === 'dong') {
        const featureDong = feature.properties?.dong_name;
        const dataPoint = indicatorData.find((d) => d.dong === featureDong);
        matchedValue = dataPoint?.value || 0;
      }

      return {
        ...feature,
        properties: {
          ...feature.properties,
          [indicator_id]: matchedValue,
        },
      };
    }),
  };
}
