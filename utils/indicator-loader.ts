/**
 * 지표 메타데이터 및 데이터 로더
 */

export interface IndicatorMetadata {
  family: string;
  indicator_id: string;
  indicator_name: string;
  metric_type: 'count' | 'rate' | 'avg' | 'sum';
  spatial_grain: 'gu' | 'dong' | 'city';
  source_pattern: string;
  value_field: string;
  aggregation_method?: string; // count, count_active, count_closed, active_ratio, sum, avg
  filter_condition?: string; // 예: TRDSTATEGBN=01
  description: string;
}

export interface IndicatorValue {
  gu?: string;
  dong?: string;
  value: number;
  totalRows?: number; // 원본 레코드 수 (측정소 데이터 등)
}

export interface IndicatorDataResult {
  values: IndicatorValue[];
  metadata?: {
    dataDate?: string | null;
    dataNote?: string;
  };
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
 * 필터 조건 파싱 (예: TRDSTATEGBN=01)
 */
function parseFilterCondition(condition: string): { field: string; operator: string; value: string } {
  if (condition.includes('>=')) {
    const [field, value] = condition.split('>=');
    return { field: field.trim(), operator: '>=', value: value.trim() };
  }
  if (condition.includes('=')) {
    const [field, value] = condition.split('=');
    return { field: field.trim(), operator: '=', value: value.trim() };
  }
  if (condition.includes('>')) {
    const [field, value] = condition.split('>');
    return { field: field.trim(), operator: '>', value: value.trim() };
  }
  return { field: '', operator: '', value: '' };
}

/**
 * 필터 조건 평가
 */
function evaluateCondition(fieldValue: any, operator: string, filterValue: string): boolean {
  const strValue = String(fieldValue || '');

  switch (operator) {
    case '=':
      return strValue === filterValue;
    case '>':
      const numValue1 = parseFloat(strValue);
      const numFilter1 = parseFloat(filterValue);
      return !isNaN(numValue1) && !isNaN(numFilter1) && numValue1 > numFilter1;
    case '>=':
      const numValue2 = parseFloat(strValue);
      const numFilter2 = parseFloat(filterValue);
      return !isNaN(numValue2) && !isNaN(numFilter2) && numValue2 >= numFilter2;
    default:
      return true;
  }
}

/**
 * 구별 데이터 집계
 */
function aggregateByGu(data: any[], metadata: IndicatorMetadata): IndicatorValue[] {
  const { aggregation_method = 'count', value_field, filter_condition } = metadata;

  // 1. 구별로 그룹핑
  const grouped = data.reduce((acc, row) => {
    // 구 이름 추출: GU 필드 또는 주소에서 추출
    let gu = row.GU || '';

    // GU 필드가 없으면 주소에서 추출
    if (!gu) {
      // RDNWHLADDR (도로명주소) 또는 SITEWHLADDR (지번주소)에서 구 이름 추출
      const addr = row.RDNWHLADDR || row.SITEWHLADDR || '';
      const guMatch = addr.match(/서울특별시\s+(\S+구)/);
      if (guMatch) {
        gu = guMatch[1];
      }
    }

    if (!gu) return acc;
    if (!acc[gu]) acc[gu] = [];
    acc[gu].push(row);
    return acc;
  }, {} as Record<string, any[]>);

  // 2. 각 구별로 집계
  return Object.entries(grouped).map(([gu, items]) => {
    const typedItems = items as any[];
    let value = 0;

    // 필터링 (예: TRDSTATEGBN=01)
    let filtered: any[] = typedItems;
    if (filter_condition) {
      const { field, operator, value: filterValue } = parseFilterCondition(filter_condition);
      if (field) {
        filtered = typedItems.filter((item: any) => evaluateCondition(item[field], operator, filterValue));
      }
    }

    // 집계
    switch (aggregation_method) {
      case 'count':
        value = filtered.length;
        break;

      case 'count_active':
        value = filtered.filter((item: any) => item.TRDSTATEGBN === '01').length;
        break;

      case 'count_closed':
        value = filtered.filter((item: any) => item.TRDSTATEGBN === '03').length;
        break;

      case 'active_ratio':
        const total = filtered.length;
        const active = filtered.filter((item: any) => item.TRDSTATEGBN === '01').length;
        value = total > 0 ? (active / total) * 100 : 0;
        break;

      case 'sum':
        value = filtered.reduce((sum: number, item: any) => {
          const val = parseFloat(item[value_field]) || 0;
          return sum + val;
        }, 0);
        break;

      case 'avg':
        const validItems = filtered.filter((item: any) => {
          const val = parseFloat(item[value_field]);
          return !isNaN(val) && val > 0;
        });
        if (validItems.length > 0) {
          const sum = validItems.reduce((s: number, item: any) => s + parseFloat(item[value_field]), 0);
          value = sum / validItems.length;
        }
        break;

      default:
        value = filtered.length;
    }

    return { gu, value };
  });
}

/**
 * 특정 지표의 데이터를 API에서 가져오기
 */
export async function loadIndicatorData(
  metadata: IndicatorMetadata
): Promise<IndicatorValue[]> {
  const { family, source_pattern } = metadata;

  if (family === 'LOCALDATA') {
    // LOCALDATA_072217_* 패턴에서 업종 코드 추출
    // 예: LOCALDATA_072217_* → 072217
    const industryCode = source_pattern.replace('LOCALDATA_', '').replace('_*', '');

    console.log(`📊 LOCALDATA 지표 로드: ${metadata.indicator_name}`);
    console.log(`   - 업종 코드: ${industryCode}`);
    console.log(`   - 집계 방식: ${metadata.aggregation_method || 'count'}`);

    // LOCALDATA API는 25개 구를 병합해야 함
    const apiUrl = `/api/localdata-merge?industryCode=${industryCode}`;
    console.log(`   - API URL: ${apiUrl}`);

    const response = await fetch(apiUrl);
    const result = await response.json();

    console.log(`   - API 응답 상태:`, result.success);
    if (result.summary) {
      console.log(`   - 요약:`, result.summary);
    }

    if (!result.success) {
      console.error(`   ❌ API 에러:`, result.error);
      throw new Error(result.error || `Failed to load ${metadata.indicator_name}`);
    }

    console.log(`✅ API 응답: ${result.data.length}건 (${result.summary.guCount}개 구)`);

    // 구별로 집계 (새로운 집계 함수 사용)
    const indicatorValues = aggregateByGu(result.data, metadata);

    console.log(`✅ 구별 집계 완료:`, indicatorValues);

    return indicatorValues;
  }

  // 행정동 API 데이터 (MULTI_DONG 패턴)
  if (source_pattern.startsWith('MULTI_DONG:')) {
    console.log(`📊 행정동 API 지표 로드: ${metadata.indicator_name}`);

    let dongApiMap: Array<{ dong: string; id: string }> = [];

    try {
      dongApiMap = JSON.parse(metadata.aggregation_method || '[]');
    } catch (error) {
      console.error('❌ aggregation_method 파싱 실패:', error);
      return [];
    }

    if (dongApiMap.length === 0 || dongApiMap[0].dong !== 'all') {
      console.warn('⚠️  행정동 API 매핑이 잘못되었습니다');
      return [];
    }

    // 단일 API가 모든 행정동 데이터를 반환
    const apiId = dongApiMap[0].id;
    console.log(`   - 단일 API가 모든 행정동 데이터 반환: ${apiId}`);

    const response = await fetch(`/api/seoul-data?serviceId=${apiId}&startIndex=1&endIndex=1000`, {
      signal: AbortSignal.timeout(30000)
    });
    const data = await response.json();

    if (!data.success || !data.rows || data.rows.length === 0) {
      console.error('❌ 행정동 API 데이터 없음');
      return [];
    }

    console.log(`   ✅ 행정동 데이터 수신: ${data.rows.length}개 행`);

    // 행정동 필드 감지 (ADSTRD_CODE_SE, STDR_DE_NM, ADSTRD_NM 등)
    const dongFields = ['ADSTRD_CODE_SE', 'STDR_DE_NM', 'ADSTRD_NM', 'DONG_NM'];
    let dongField: string | null = null;

    for (const field of dongFields) {
      if (data.rows[0][field]) {
        dongField = field;
        break;
      }
    }

    if (!dongField) {
      console.error('❌ 행정동 필드를 찾을 수 없습니다');
      return [];
    }

    console.log(`   - 행정동 필드 감지: ${dongField}`);

    // 행정동별 집계 (간단히 개수로)
    const dongCounts: Record<string, number> = {};
    data.rows.forEach((row: any) => {
      const dongName = row[dongField!];
      if (dongName) {
        dongCounts[dongName] = (dongCounts[dongName] || 0) + 1;
      }
    });

    const indicatorValues: IndicatorValue[] = Object.entries(dongCounts).map(([dong, count]) => ({
      dong: dong,  // 행정동 이름
      value: count
    }));

    console.log(`✅ 행정동 집계 완료: ${indicatorValues.length}개 행정동`);
    return indicatorValues;
  }

  // 서울시 전체 데이터 (CITY 패턴)
  if (source_pattern.startsWith('CITY:')) {
    console.log(`🏙️  서울시 전체 API 지표 로드: ${metadata.indicator_name}`);

    let cityApiMap: Array<{ city: string; id: string }> = [];

    try {
      cityApiMap = JSON.parse(metadata.aggregation_method || '[]');
    } catch (error) {
      console.error('❌ aggregation_method 파싱 실패:', error);
      return [];
    }

    if (cityApiMap.length === 0 || cityApiMap[0].city !== 'seoul') {
      console.warn('⚠️  서울시 API 매핑이 잘못되었습니다');
      return [];
    }

    // 단일 API로 서울시 전체 데이터 반환
    const apiId = cityApiMap[0].id;
    console.log(`   - 서울시 전체 데이터 API: ${apiId}`);

    const response = await fetch(`/api/seoul-data?serviceId=${apiId}&startIndex=1&endIndex=1000`, {
      signal: AbortSignal.timeout(30000)
    });
    const data = await response.json();

    if (!data.success || !data.rows || data.rows.length === 0) {
      console.error('❌ 서울시 전체 데이터 없음');
      return [];
    }

    console.log(`   ✅ 서울시 전체 데이터 수신: ${data.rows.length}개 행`);

    // 서울시 전체 통계 계산
    const totalRows = data.rows.length; // 원본 레코드 수
    let totalCount = totalRows;
    let hasSeparateCount = false;

    // 특정 API의 경우 고유 개체 수를 계산 (예: 측정소 개수)
    // 대기오염 측정: MSRSTN_CD (측정소 코드)로 그룹화
    if (apiId === 'OA-15526' || metadata.indicator_name.includes('대기오염') || metadata.indicator_name.includes('측정')) {
      const stationCodes = new Set<string>();
      data.rows.forEach((row: any) => {
        if (row.MSRSTN_CD) {
          stationCodes.add(row.MSRSTN_CD);
        }
      });
      if (stationCodes.size > 0 && stationCodes.size !== totalRows) {
        totalCount = stationCodes.size;
        hasSeparateCount = true;
        console.log(`   📍 총 ${totalRows}건의 측정 데이터, ${totalCount}개 측정소`);
      }
    }

    // city-level 데이터는 단일 값으로 반환 (gu: 'seoul'로 표시)
    const indicatorValues: IndicatorValue[] = [{
      gu: 'seoul',
      value: totalCount,
      totalRows: hasSeparateCount ? totalRows : undefined
    }];

    console.log(`✅ 서울시 전체 집계 완료: ${totalCount}개${hasSeparateCount ? ` (원본: ${totalRows}건)` : ''}`);
    return indicatorValues;
  }

  // 구 API 통합 데이터 (MULTI_GU 패턴)
  if (source_pattern.startsWith('MULTI_GU:')) {
    console.log(`📊 구 API 통합 지표 로드: ${metadata.indicator_name}`);

    // aggregation_method에 JSON 형태로 저장된 구별 API 정보 파싱
    let guApiMap: Array<{ gu: string; id: string }> = [];

    try {
      guApiMap = JSON.parse(metadata.aggregation_method || '[]');
    } catch (error) {
      console.error('❌ aggregation_method 파싱 실패:', error);
      return [];
    }

    if (guApiMap.length === 0) {
      console.warn('⚠️  구별 API 매핑이 비어있습니다');
      return [];
    }

    // 단일 API가 모든 구 데이터를 반환하는 경우 (gu: 'all')
    if (guApiMap.length === 1 && guApiMap[0].gu === 'all') {
      console.log(`   - 단일 API가 모든 구 데이터 반환 (예: RealtimeCityAir)`);

      const firstApi = guApiMap[0];
      const testResponse = await fetch(`/api/seoul-data?serviceId=${firstApi.id}&startIndex=1&endIndex=100`, {
        signal: AbortSignal.timeout(10000)
      });
      const testData = await testResponse.json();

      // MSRSTN_NM 필드로 구별 데이터 추출 (이미 위에서 처리됨)
      if (testData.success && testData.rows && testData.rows.length > 0 && testData.rows[0].MSRSTN_NM) {
        console.log(`   ✅ 구별 rows 데이터 감지 (MSRSTN_NM 필드)`);

        const indicatorValues: IndicatorValue[] = testData.rows.map((row: any) => {
          const guName = row.MSRSTN_NM;
          const value = parseInt(row.PM || row.FPM || row.CAI_IDX || '0');

          return { gu: guName, value: value };
        });

        console.log(`✅ 구 API 통합 완료: ${indicatorValues.length}개 구 (단일 API)`);
        return indicatorValues;
      }
    }

    console.log(`   - ${guApiMap.length}개 구의 API 분석 중...`);

    // 첫 번째 구의 API로 실제 서비스명 확인
    const testApi = guApiMap[0];
    const testResponse = await fetch(`/api/seoul-data?serviceId=${testApi.id}&startIndex=1&endIndex=1`);
    const testData = await testResponse.json();

    // serviceKey에서 LOCALDATA 패턴 감지
    if (testData.serviceKey && testData.serviceKey.startsWith('LOCALDATA_')) {
      // LOCALDATA API인 경우 → localdata-merge 사용
      const match = testData.serviceKey.match(/LOCALDATA_(\d+)_/);
      if (match) {
        const industryCode = match[1];
        console.log(`   - LOCALDATA 업종 코드 발견: ${industryCode}`);
        console.log(`   - /api/localdata-merge API 사용`);

        const response = await fetch(`/api/localdata-merge?industryCode=${industryCode}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'LOCALDATA 병합 실패');
        }

        console.log(`✅ API 응답: ${result.data.length}건 (${result.summary.guCount}개 구)`);

        // 구별로 집계
        const indicatorValues = aggregateByGu(result.data, { ...metadata, aggregation_method: 'count' });

        console.log(`✅ 구 API 통합 완료:`, indicatorValues);

        return indicatorValues;
      }
    }

    // LOCALDATA가 아닌 경우
    // 일부 API는 한 번의 호출로 모든 구 데이터를 반환 (예: RealtimeCityAir)
    // 이미 위에서 가져온 testData를 재사용하여 rows 확인
    console.log(`   - 일반 API: 데이터 구조 확인 (이미 호출한 testData 사용)`);

    let collectedDataDate: string | null = null;
    let collectedDataNote: string | undefined = undefined;

    // rows에 MSRSTN_NM 필드가 있으면 → 한 번의 호출로 모든 구 데이터 반환하는 API
    if (testData.success && testData.rows && testData.rows.length > 0 && testData.rows[0].MSRSTN_NM) {
      console.log(`   ✅ 구별 rows 데이터 감지 (MSRSTN_NM 필드) - 한 번의 호출로 처리`);

      // 더 많은 데이터를 가져오기 위해 다시 호출 (최대 100개)
      const fullResponse = await fetch(`/api/seoul-data?serviceId=${testApi.id}&startIndex=1&endIndex=100`, {
        signal: AbortSignal.timeout(10000)
      });
      const fullData = await fullResponse.json();

      collectedDataDate = fullData.dataDate;
      collectedDataNote = fullData.dataNote;

      // rows에서 구별 데이터 추출
      const indicatorValues: IndicatorValue[] = fullData.rows.map((row: any) => {
        const guName = row.MSRSTN_NM; // "강남구", "송파구" 등
        // PM, FPM 등 여러 필드 중 첫 번째 숫자 값 사용
        const value = parseInt(row.PM || row.FPM || row.CAI_IDX || '0');

        return {
          gu: guName,
          value: value
        };
      });

      console.log(`✅ 구 API 통합 완료: ${indicatorValues.length}개 구, rows에서 추출`);
      if (collectedDataDate) {
        console.log(`📅 데이터 기준일: ${collectedDataDate}`);
      }

      return indicatorValues;
    }

    // rows가 없거나 MSRSTN_NM이 없으면 → 각 구별 개별 호출
    console.log(`   - 구별 rows 없음: 25개 구 개별 호출 (카운트 추출)`);

    const promises = guApiMap.map(async ({ gu, id }) => {
      try {
        const response = await fetch(`/api/seoul-data?serviceId=${id}&startIndex=1&endIndex=1`, {
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          console.log(`   ❌ ${gu}: API 실패 (${id})`);
          return { gu, value: 0, dataDate: null, dataNote: undefined };
        }

        // 1순위: totalCount (서울 API가 반환한 전체 개수)
        let count = data.totalCount || 0;

        // 2순위: rows 배열 길이 (실제 데이터가 있는 경우)
        if (count === 0 && data.rows && data.rows.length > 0) {
          count = data.rows.length;
        }

        // 3순위: data.data.list_total_count (일부 API 응답 구조)
        if (count === 0 && data.data?.list_total_count) {
          count = data.data.list_total_count;
        }

        if (count > 0) {
          console.log(`   ✅ ${gu}: ${count}개 (${id})`);
        } else {
          console.log(`   ⚠️  ${gu}: 데이터 없음 (${id})`);
        }

        return {
          gu,
          value: count,
          dataDate: data.dataDate || null,
          dataNote: data.dataNote
        };
      } catch (error) {
        console.log(`   ❌ ${gu}: API 실패 - ${error}`);
        return { gu, value: 0, dataDate: null, dataNote: undefined };
      }
    });

    const results = await Promise.allSettled(promises);
    const rawResults = results
      .filter((result): result is PromiseFulfilledResult<{ gu: string; value: any; dataDate: any; dataNote: any }> => result.status === 'fulfilled')
      .map(result => result.value);

    // 메타데이터 수집 (첫 번째 성공한 API에서)
    for (const result of rawResults) {
      if (result.dataDate) {
        collectedDataDate = result.dataDate;
        break;
      }
    }
    for (const result of rawResults) {
      if (result.dataNote) {
        collectedDataNote = result.dataNote;
        break;
      }
    }

    const indicatorValues: IndicatorValue[] = rawResults.map(({ gu, value }) => ({ gu, value }));

    const successCount = indicatorValues.filter(v => v.value > 0).length;
    const totalCount = indicatorValues.reduce((sum, v) => sum + v.value, 0);

    console.log(`✅ 구 API 통합 완료: ${successCount}/${guApiMap.length}개 구 성공, 총 ${totalCount}개 항목`);
    if (collectedDataDate) {
      console.log(`📅 데이터 기준일: ${collectedDataDate}`);
    }
    if (collectedDataNote) {
      console.log(`📝 데이터 안내: ${collectedDataNote}`);
    }

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

  let matchCount = 0;
  let totalFeatures = 0;

  const result = {
    ...geojson,
    features: geojson.features.map((feature: any, index: number) => {
      totalFeatures++;
      let matchedValue = 0;

      if (spatial_grain === 'gu') {
        const featureGu = feature.properties?.gu_name;
        const dataPoint = indicatorData.find((d) => d.gu === featureGu);
        matchedValue = dataPoint?.value || 0;

        if (dataPoint) {
          matchCount++;
          if (index < 3) {
            console.log(`   🔗 매칭 ${index + 1}: "${featureGu}" → value: ${matchedValue}`);
          }
        } else if (index < 3) {
          console.log(`   ❌ 매칭 실패 ${index + 1}: "${featureGu}" (데이터에서 찾을 수 없음)`);
        }
      } else if (spatial_grain === 'dong') {
        const featureDong = feature.properties?.dong_name;
        const dataPoint = indicatorData.find((d) => d.dong === featureDong);
        matchedValue = dataPoint?.value || 0;

        if (dataPoint) {
          matchCount++;
        }
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

  console.log(`   ✅ 병합 완료: ${matchCount}/${totalFeatures} 매칭됨`);

  return result;
}
