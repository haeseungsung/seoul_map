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
  // 대기질 데이터 추가 필드
  pm10?: number; // 미세먼지(PM10) 평균값
  pm25?: number; // 초미세먼지(PM2.5) 평균값
  ozon?: number; // 오존(O₃) 평균값 (ppm)
  no2?: number; // 이산화질소(NO₂) 평균값 (ppm)
  co?: number; // 일산화탄소(CO) 평균값 (ppm)
  caiIndex?: number; // 통합대기환경지수(CAI)
  airQualityLevel?: '좋음' | '보통' | '나쁨' | '매우나쁨'; // 대기질 등급
  stationCount?: number; // 측정소 개수
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
 * @param metadata - 지표 메타데이터
 * @param options - 옵션 (timeHour: 시간대 필터 0-23)
 */
export async function loadIndicatorData(
  metadata: IndicatorMetadata,
  options?: { timeHour?: number }
): Promise<IndicatorValue[]> {
  const { family, source_pattern } = metadata;

  // 공간 집계 API (좌표 기반 데이터를 행정동별로 집계)
  // 예: 자전거 대여소 (bike_availability_dong)
  if (source_pattern === 'SPATIAL_AGGREGATE_DONG') {
    console.log(`🚴 공간 집계 API: ${metadata.indicator_name}`);

    try {
      const response = await fetch('/api/aggregate-bike-by-dong');
      const result = await response.json();

      if (!result.success || !result.data) {
        console.error('❌ 자전거 데이터 로드 실패:', result.error);
        return [];
      }

      console.log(`✅ 자전거 데이터: ${result.dongCount}개 행정동, ${result.matchedStations}개 대여소`);

      // 행정동별 데이터를 IndicatorValue 형식으로 변환
      const indicatorValues: IndicatorValue[] = result.data.map((item: any) => ({
        gu: item.adm_nm, // "서울특별시 종로구 사직동" 형태
        value: item.availability_rate, // 대여 가능률
        // 추가 정보 (MapContainer에서 사용 가능)
        total_racks: item.total_racks,
        available_bikes: item.available_bikes,
        station_count: item.station_count,
        usage_rate: item.usage_rate,
      }));

      return indicatorValues;
    } catch (error) {
      console.error('❌ 자전거 API 호출 실패:', error);
      return [];
    }
  }

  if (family === 'LOCALDATA') {
    // LOCALDATA_072217_* 패턴에서 업종 코드 추출
    // 예: LOCALDATA_072217_* → 072217
    const industryCode = source_pattern.replace('LOCALDATA_', '').replace('_*', '');

    console.log(`📊 LOCALDATA 지표 로드: ${metadata.indicator_name}`);
    console.log(`   - 업종 코드: ${industryCode}`);
    console.log(`   - 집계 방식: ${metadata.aggregation_method || 'count'}`);

    // LOCALDATA API는 25개 구를 병합해야 함
    // aggregate=true로 구별 집계 결과만 받아서 응답 크기 최소화 (4MB 초과 방지)
    const apiUrl = `/api/localdata-merge?industryCode=${industryCode}&aggregate=true`;
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

    console.log(`✅ API 응답: ${result.data.length}개 구 집계 데이터`);

    // 집계된 데이터를 IndicatorValue 형식으로 변환
    // aggregation_method에 따라 값 계산
    const indicatorValues: IndicatorValue[] = result.data.map((item: any) => {
      let value = 0;

      switch (metadata.aggregation_method) {
        case 'count':
          value = item.count; // 전체 개수
          break;

        case 'count_active':
          value = item.activeCount; // 영업중 개수
          break;

        case 'count_closed':
          value = item.closedCount; // 폐업 개수
          break;

        case 'active_ratio':
          // 영업률 (%) = (영업중 / 전체) * 100
          value = item.count > 0 ? (item.activeCount / item.count) * 100 : 0;
          break;

        default:
          value = item.count;
      }

      return {
        gu: item.gu,
        value,
      };
    });

    console.log(`✅ 구별 데이터 변환 완료 (${metadata.aggregation_method}):`, indicatorValues.slice(0, 3));

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

    // 생활인구 API는 대용량(712,396건)이므로 샘플링
    // API 제한: 한 번에 최대 1,000건
    // 데이터 구조: 467개 행정동 × 24시간 × 여러 날짜
    // 패턴: 약 467건마다 다음 시간대로 이동

    const DONGS_COUNT = 467;  // 행정동 개수
    let allRows: any[] = [];

    if (options?.timeHour !== undefined) {
      // 특정 시간대 선택: 해당 시간대 데이터만 수집
      // 시간당 약 467개 행정동 × 여러 날짜 = 충분한 샘플
      const hourOffset = options.timeHour * DONGS_COUNT;
      const intervals = [
        1 + hourOffset,           // 첫 날 해당 시간
        1 + hourOffset + 11208,   // 다음 날 해당 시간 (24h × 467)
      ];

      console.log(`   ⏰ 시간대 필터: ${options.timeHour}시 → ${intervals.length}개 구간 샘플링`);

      for (const start of intervals) {
        const response = await fetch(
          `/api/seoul-data?serviceId=${apiId}&startIndex=${start}&endIndex=${start + DONGS_COUNT - 1}`,
          { signal: AbortSignal.timeout(30000) }
        );
        const data = await response.json();

        if (data.success && data.rows && data.rows.length > 0) {
          allRows.push(...data.rows);
          console.log(`   ✓ 구간 ${start}~${start + DONGS_COUNT - 1}: ${data.rows.length}건 (시간: ${data.rows[0]?.TMZON_PD_SE}시)`);
        }
      }
    } else {
      // 전체: 하루치 24시간 전체 데이터 수집 (11,208건)
      // 24번 호출은 너무 많으므로 6개 시간대만 샘플링 (0, 4, 8, 12, 16, 20시)
      const hours = [0, 4, 8, 12, 16, 20];
      console.log(`   - 전체 시간대 → ${hours.length}개 시간 샘플링`);

      for (const hour of hours) {
        const start = 1 + (hour * DONGS_COUNT);
        const response = await fetch(
          `/api/seoul-data?serviceId=${apiId}&startIndex=${start}&endIndex=${start + DONGS_COUNT - 1}`,
          { signal: AbortSignal.timeout(30000) }
        );
        const data = await response.json();

        if (data.success && data.rows && data.rows.length > 0) {
          allRows.push(...data.rows);
          console.log(`   ✓ ${hour}시: ${data.rows.length}건`);
        }
      }
    }

    if (allRows.length === 0) {
      console.error('❌ 모든 구간에서 데이터 수집 실패');
      return [];
    }

    console.log(`   ✅ 총 ${allRows.length.toLocaleString()}건 수집 완료`);

    const data = { success: true, rows: allRows };

    console.log(`   ✅ 행정동 데이터 수신: ${data.rows.length}개 행`);
    console.log(`   - 첫 번째 row의 모든 필드:`, Object.keys(data.rows[0]));
    console.log(`   - 첫 번째 row 데이터 샘플:`, data.rows[0]);

    // 행정동 필드 감지 (이름 우선, 코드는 마지막)
    const dongFields = ['ADSTRD_NM', 'DONG_NM', 'STDR_DE_NM', 'ADSTRD_CODE_SE'];
    let dongField: string | null = null;

    for (const field of dongFields) {
      if (data.rows[0][field]) {
        dongField = field;
        console.log(`   - 후보 필드 "${field}" 발견, 값:`, data.rows[0][field]);
        break;
      }
    }

    if (!dongField) {
      console.error('❌ 행정동 필드를 찾을 수 없습니다');
      return [];
    }

    console.log(`   - 행정동 필드 감지: ${dongField}`);
    console.log(`   - 행정동 코드 샘플 (처음 5개):`, data.rows.slice(0, 5).map((r: any) => r[dongField!]));

    // 값 필드 감지 (생활인구 데이터의 경우 TOT_LVPOP_CO)
    const valueFields = ['TOT_LVPOP_CO', 'TOT_POPLTN_CNT', 'VALUE', 'COUNT'];
    let valueField: string | null = null;

    for (const field of valueFields) {
      if (data.rows[0][field]) {
        valueField = field;
        console.log(`   - 값 필드 감지: ${field}, 샘플 값:`, data.rows[0][field]);
        break;
      }
    }

    // 행정동 코드 → 이름 매핑 (GeoJSON에서 생성)
    const dongCodeToName: Record<string, string> = {};

    // GeoJSON 로드해서 매핑 테이블 생성
    const geojsonResponse = await fetch('/data/seoul-hangjeongdong.geojson');
    const geojson = await geojsonResponse.json();

    geojson.features.forEach((feature: any) => {
      const adm_cd2 = feature.properties?.adm_cd2; // 10자리: "1111053000"
      const adm_nm = feature.properties?.adm_nm;   // "서울특별시 종로구 사직동"

      if (adm_cd2 && adm_nm) {
        const code8 = adm_cd2.substring(0, 8); // 앞 8자리: "11110530"
        const parts = adm_nm.split(' ');
        const dongName = parts[parts.length - 1]; // "사직동"
        dongCodeToName[code8] = dongName;
      }
    });

    console.log(`   - 매핑 테이블 생성 완료: ${Object.keys(dongCodeToName).length}개 행정동`);
    console.log(`   - 매핑 샘플 (처음 3개):`, Object.entries(dongCodeToName).slice(0, 3));

    // 이미 정확한 시간대 데이터만 샘플링했으므로 추가 필터링 불필요
    // 검증을 위해 실제 시간대 확인
    if (data.rows.length > 0) {
      const firstRowTime = data.rows[0].TMZON_PD_SE || data.rows[0].TMZON_SE;
      const uniqueTimes = new Set(data.rows.map((r: any) => r.TMZON_PD_SE || r.TMZON_SE));
      console.log(`   ✅ 수집된 시간대: [${Array.from(uniqueTimes).sort().join(', ')}]`);
      if (options?.timeHour !== undefined) {
        const expectedTime = options.timeHour.toString().padStart(2, '0');
        if (firstRowTime !== expectedTime) {
          console.warn(`   ⚠️ 시간대 불일치: 요청=${expectedTime}, 실제=${firstRowTime}`);
        }
      }
    }

    // 행정동별 집계
    const filteredRows = data.rows;
    if (valueField) {
      // 값 필드가 있으면 평균 계산
      const dongData: Record<string, { sum: number; count: number }> = {};

      filteredRows.forEach((row: any) => {
        const dongCode = row[dongField!];
        if (dongCode) {
          const dongName = dongCodeToName[dongCode];
          if (dongName) {
            const value = parseFloat(row[valueField!]) || 0;
            if (!dongData[dongName]) {
              dongData[dongName] = { sum: 0, count: 0 };
            }
            dongData[dongName].sum += value;
            dongData[dongName].count += 1;
          }
        }
      });

      const indicatorValues: IndicatorValue[] = Object.entries(dongData).map(([dong, data]) => ({
        dong: dong,
        value: Math.round(data.sum / data.count) // 평균값 (반올림)
      }));

      console.log(`✅ 행정동 집계 완료: ${indicatorValues.length}개 행정동`);
      console.log(`   - 행정동 샘플 (처음 5개):`, indicatorValues.slice(0, 5).map(v => `${v.dong}: ${v.value.toLocaleString()}명`));
      return indicatorValues;
    } else {
      // 값 필드가 없으면 row 개수만 세기 (기존 로직)
      const dongCounts: Record<string, number> = {};
      filteredRows.forEach((row: any) => {
        const dongCode = row[dongField!];
        if (dongCode) {
          const dongName = dongCodeToName[dongCode];
          if (dongName) {
            dongCounts[dongName] = (dongCounts[dongName] || 0) + 1;
          } else {
            console.warn(`   ⚠️ 매핑되지 않은 행정동 코드: ${dongCode}`);
          }
        }
      });

      const indicatorValues: IndicatorValue[] = Object.entries(dongCounts).map(([dong, count]) => ({
        dong: dong,
        value: count
      }));

      console.log(`✅ 행정동 집계 완료: ${indicatorValues.length}개 행정동`);
      console.log(`   - 행정동 샘플 (처음 5개):`, indicatorValues.slice(0, 5).map(v => `${v.dong}: ${v.value}개`));
      return indicatorValues;
    }
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

      // MSRSTN_NM 필드로 구별 데이터 추출
      if (testData.success && testData.rows && testData.rows.length > 0 && testData.rows[0].MSRSTN_NM) {
        console.log(`   ✅ 구별 rows 데이터 감지 (MSRSTN_NM 필드)`);

        // 대기질 데이터인지 확인 (PM, FPM 필드 존재 여부)
        const isAirQualityData = testData.rows[0]?.PM !== undefined || testData.rows[0]?.FPM !== undefined;

        if (isAirQualityData) {
          console.log(`   🌫️  대기질 데이터 감지 - PM10, PM2.5 구별 평균 계산`);

          // 구별로 측정소 데이터 그룹화
          const guDataMap = new Map<string, { pm10Values: number[], pm25Values: number[], stationCount: number }>();

          testData.rows.forEach((row: any) => {
            const guName = row.MSRSTN_NM;
            if (!guName) return;

            if (!guDataMap.has(guName)) {
              guDataMap.set(guName, { pm10Values: [], pm25Values: [], stationCount: 0 });
            }

            const guData = guDataMap.get(guName)!;
            guData.stationCount++;

            const pm10 = parseFloat(row.PM);
            if (!isNaN(pm10)) guData.pm10Values.push(pm10);

            const pm25 = parseFloat(row.FPM);
            if (!isNaN(pm25)) guData.pm25Values.push(pm25);
          });

          // 대기질 등급 판정 함수 (PM2.5 기준)
          const getAirQualityLevel = (pm25: number): '좋음' | '보통' | '나쁨' | '매우나쁨' => {
            if (pm25 <= 15) return '좋음';
            if (pm25 <= 35) return '보통';
            if (pm25 <= 75) return '나쁨';
            return '매우나쁨';
          };

          // 데이터 없는 구 목록
          const excludedGu = ['은평구', '송파구', '구로구'];

          // 구별 평균 계산 (데이터 없는 구 제외)
          const indicatorValues: IndicatorValue[] = Array.from(guDataMap.entries())
            .filter(([guName]) => !excludedGu.includes(guName))
            .map(([guName, data]) => {
              const avgPm10 = data.pm10Values.length > 0
                ? data.pm10Values.reduce((a, b) => a + b, 0) / data.pm10Values.length
                : 0;

              const avgPm25 = data.pm25Values.length > 0
                ? data.pm25Values.reduce((a, b) => a + b, 0) / data.pm25Values.length
                : 0;

              const airQualityLevel = avgPm25 > 0 ? getAirQualityLevel(avgPm25) : '보통';

              return {
                gu: guName,
                value: Math.round(avgPm25),
                pm10: Math.round(avgPm10 * 10) / 10,
                pm25: Math.round(avgPm25 * 10) / 10,
                airQualityLevel,
                stationCount: data.stationCount
              };
            });

          console.log(`✅ 구 API 통합 완료: ${indicatorValues.length}개 구, 대기질 데이터 집계`);
          console.log(`   - 예시: ${indicatorValues[0]?.gu} PM10=${indicatorValues[0]?.pm10}, PM2.5=${indicatorValues[0]?.pm25}, 측정소=${indicatorValues[0]?.stationCount}개`);
          console.log(`   - 전체 구조 (처음 3개):`, indicatorValues.slice(0, 3));
          return indicatorValues;
        }

        // 대기질이 아닌 일반 데이터
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

      // 대기질 데이터인지 확인 (PM, FPM 필드 존재 여부)
      const isAirQualityData = fullData.rows[0]?.PM !== undefined || fullData.rows[0]?.FPM !== undefined;

      if (isAirQualityData) {
        console.log(`   🌫️  대기질 데이터 감지 - PM10, PM2.5, 오존, NO2, CO, CAI 구별 평균 계산`);

        // 구별로 측정소 데이터 그룹화
        const guDataMap = new Map<string, {
          pm10Values: number[],
          pm25Values: number[],
          ozonValues: number[],
          no2Values: number[],
          coValues: number[],
          caiValues: number[],
          stationCount: number
        }>();

        let isFirstRow = true;
        fullData.rows.forEach((row: any) => {
          const guName = row.MSRSTN_NM; // "강남구", "송파구" 등
          if (!guName) return;

          if (!guDataMap.has(guName)) {
            guDataMap.set(guName, {
              pm10Values: [],
              pm25Values: [],
              ozonValues: [],
              no2Values: [],
              coValues: [],
              caiValues: [],
              stationCount: 0
            });
          }

          const guData = guDataMap.get(guName)!;
          guData.stationCount++;

          // PM10 (미세먼지)
          const pm10 = parseFloat(row.PM);
          if (!isNaN(pm10)) {
            guData.pm10Values.push(pm10);
          }

          // PM2.5 (초미세먼지)
          const pm25 = parseFloat(row.FPM);
          if (!isNaN(pm25)) {
            guData.pm25Values.push(pm25);
          }

          // O₃ (오존) - ppm
          const ozon = parseFloat(row.OZON);
          if (!isNaN(ozon)) {
            guData.ozonValues.push(ozon);
          }

          // NO₂ (이산화질소) - ppm
          const no2 = parseFloat(row.NTDX);
          if (!isNaN(no2)) {
            guData.no2Values.push(no2);
          }

          // CO (일산화탄소) - ppm (CBMX 필드 사용)
          const co = parseFloat(row.CBMX);
          if (!isNaN(co)) {
            guData.coValues.push(co);
          }

          // CAI (통합대기환경지수)
          const cai = parseFloat(row.CAI_IDX);
          if (!isNaN(cai)) {
            guData.caiValues.push(cai);
          }

          // 첫 번째 측정소의 원시 데이터 로깅
          if (isFirstRow) {
            console.log('🔍 첫 번째 측정소 원시 데이터:', {
              구: guName,
              측정소: row.MSRSTN_NM,
              PM10: row.PM,
              PM25: row.FPM,
              OZON필드: row.OZON,
              NTDX필드: row.NTDX,
              CBMX필드: row.CBMX,
              CAI_IDX필드: row.CAI_IDX,
              파싱결과: { ozon, no2, co, cai }
            });
            isFirstRow = false;
          }
        });

        // 대기질 등급 판정 함수 (PM2.5 기준)
        const getAirQualityLevel = (pm25: number): '좋음' | '보통' | '나쁨' | '매우나쁨' => {
          if (pm25 <= 15) return '좋음';
          if (pm25 <= 35) return '보통';
          if (pm25 <= 75) return '나쁨';
          return '매우나쁨';
        };

        // 구별 평균 계산
        const indicatorValues: IndicatorValue[] = Array.from(guDataMap.entries()).map(([guName, data]) => {
          const avgPm10 = data.pm10Values.length > 0
            ? data.pm10Values.reduce((a, b) => a + b, 0) / data.pm10Values.length
            : 0;

          const avgPm25 = data.pm25Values.length > 0
            ? data.pm25Values.reduce((a, b) => a + b, 0) / data.pm25Values.length
            : 0;

          const avgOzon = data.ozonValues.length > 0
            ? data.ozonValues.reduce((a, b) => a + b, 0) / data.ozonValues.length
            : undefined;

          const avgNo2 = data.no2Values.length > 0
            ? data.no2Values.reduce((a, b) => a + b, 0) / data.no2Values.length
            : undefined;

          const avgCo = data.coValues.length > 0
            ? data.coValues.reduce((a, b) => a + b, 0) / data.coValues.length
            : undefined;

          const avgCai = data.caiValues.length > 0
            ? data.caiValues.reduce((a, b) => a + b, 0) / data.caiValues.length
            : undefined;

          const airQualityLevel = avgPm25 > 0 ? getAirQualityLevel(avgPm25) : '보통';

          const result = {
            gu: guName,
            value: Math.round(avgPm25), // 주요 값은 PM2.5 평균으로 (지도 색상 표시용)
            pm10: Math.round(avgPm10 * 10) / 10, // 소수점 1자리
            pm25: Math.round(avgPm25 * 10) / 10, // 소수점 1자리
            ozon: avgOzon !== undefined ? Math.round(avgOzon * 1000) / 1000 : undefined, // 소수점 3자리
            no2: avgNo2 !== undefined ? Math.round(avgNo2 * 1000) / 1000 : undefined, // 소수점 3자리
            co: avgCo !== undefined ? Math.round(avgCo * 10) / 10 : undefined, // 소수점 1자리
            caiIndex: avgCai !== undefined ? Math.round(avgCai) : undefined, // 정수
            airQualityLevel,
            stationCount: data.stationCount
          };

          // 디버깅 로그 추가 - 강동구 추가
          if (guName === '중구' || guName === '종로구' || guName === '강동구') {
            console.log(`✅ ${guName} 대기질 데이터 수집 완료:`, result);
            console.log(`   원시 값 수: ozon=${data.ozonValues.length}, no2=${data.no2Values.length}, co=${data.coValues.length}, cai=${data.caiValues.length}`);
          }

          return result;
        });

        console.log(`✅ 구 API 통합 완료: ${indicatorValues.length}개 구, 대기질 데이터 집계`);
        const firstItem = indicatorValues[0];
        console.log(`   - 예시: ${firstItem?.gu} PM10=${firstItem?.pm10}, PM2.5=${firstItem?.pm25}, O₃=${firstItem?.ozon}, NO₂=${firstItem?.no2}, CO=${firstItem?.co}, CAI=${firstItem?.caiIndex}, 측정소=${firstItem?.stationCount}개`);
        console.log(`   - 전체 구조 (처음 3개):`, indicatorValues.slice(0, 3));
        if (collectedDataDate) {
          console.log(`📅 데이터 기준일: ${collectedDataDate}`);
        }

        return indicatorValues;
      }

      // 대기질이 아닌 일반 데이터 처리
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
        console.log(`   - ${gu}: API ${id} 호출 중...`);
        const response = await fetch(`/api/seoul-data?serviceId=${id}&startIndex=1&endIndex=1`, {
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          // HTML 응답인 경우 (Sheet 타입 API)
          console.log(`   ❌ ${gu}: JSON 파싱 실패 - Sheet 타입 API (${id})`);
          return { gu, value: 0, dataDate: null, dataNote: 'Sheet API (JSON 미지원)' };
        }

        if (!data.success) {
          console.log(`   ❌ ${gu}: API 실패 - ${data.error || '알 수 없는 오류'} (${id})`);
          return { gu, value: 0, dataDate: null, dataNote: data.error };
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

  console.log('🔍 enrichGuGeojson 시작:');
  console.log('   - indicatorData 샘플 (처음 3개):', indicatorData.slice(0, 3));
  console.log('   - 첫 번째 데이터 구조:', indicatorData[0]);

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

          // 대기질 데이터 추가 필드 병합
          if (dataPoint.pm10 !== undefined || dataPoint.pm25 !== undefined) {
            if (index < 3) {
              console.log(`   🌫️ 대기질 데이터 추가: PM10=${dataPoint.pm10}, PM2.5=${dataPoint.pm25}, 오존=${dataPoint.ozon}, NO2=${dataPoint.no2}, CO=${dataPoint.co}, CAI=${dataPoint.caiIndex}, 등급=${dataPoint.airQualityLevel}`);
            }
            return {
              ...feature,
              properties: {
                ...feature.properties,
                [indicator_id]: matchedValue,
                pm10: dataPoint.pm10,
                pm25: dataPoint.pm25,
                ozon: dataPoint.ozon,
                no2: dataPoint.no2,
                co: dataPoint.co,
                caiIndex: dataPoint.caiIndex,
                airQualityLevel: dataPoint.airQualityLevel,
                stationCount: dataPoint.stationCount,
              },
            };
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
          if (index < 3) {
            console.log(`   🔗 매칭 ${index + 1}: "${featureDong}" → value: ${matchedValue}`);
          }
        } else if (index < 3) {
          console.log(`   ❌ 매칭 실패 ${index + 1}: GeoJSON dong_name="${featureDong}", 데이터에서 찾을 수 없음`);
          console.log(`      - 데이터 샘플 (처음 3개):`, indicatorData.slice(0, 3).map(d => d.dong));
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
