# 행정동 레벨 API 지원 추가

**작성일**: 2026-01-12
**상태**: ✅ 구현 완료

---

## 개요

서울시 OpenAPI 중 **행정동 단위** 데이터를 제공하는 API를 지도에 표시할 수 있도록 지원을 추가했습니다.

---

## 발견된 행정동 API

### 1. 행정동 단위 서울 생활인구 (OA-14991)
- **서비스명**: `SPOP_LOCAL_RESD_DONG`
- **데이터**: 내국인 생활인구
- **행정동**: 서울시 약 424개 행정동
- **필드**: `ADSTRD_CODE_SE` (행정동 코드)

### 2. 기타 행정동 API (7개)
- 생활인구 (단기/장기체류 외국인)
- 대중교통 출발지/도착지 승객수
- 관심집단수
- 통신정보

---

## 구현 내용

### 1. spatialType에 'dong' 추가

#### known-apis.ts
```typescript
export interface KnownApiConfig {
  spatialType?: 'point' | 'gu' | 'dong' | 'none';
  dongField?: string;  // 행정동 필드명
}

export const KNOWN_WORKING_APIS: KnownApiConfig[] = [
  // ...
  {
    id: 'OA-14991',
    serviceName: 'SPOP_LOCAL_RESD_DONG',
    description: '행정동 단위 서울 생활인구(내국인)',
    hasData: true,
    spatialType: 'dong',
    dongField: 'ADSTRD_CODE_SE',
  },
];
```

---

### 2. indicator-grouping.ts 수정

#### 행정동 데이터 인식
```typescript
// 구별/행정동 데이터 판단
let isDistrictData = apis.length >= 20;  // 구별 (25개)
let isDongData = false;  // 행정동 (~424개)
let spatialGrain: 'gu' | 'dong' | 'city' = 'city';

if (apis.length === 1) {
  const knownApi = KNOWN_WORKING_APIS.find(ka => ka.id === apis[0].id);
  if (knownApi) {
    if (knownApi.spatialType === 'gu') {
      isDistrictData = true;
      spatialGrain = 'gu';
    } else if (knownApi.spatialType === 'dong') {
      isDongData = true;
      spatialGrain = 'dong';
    }
  }
}
```

#### MULTI_DONG 패턴 생성
```typescript
if (isDongData) {
  subIndicators.push({
    family: mapCategory,
    indicator_id: `${mapCategory}_${taskType}_${entityType}`,
    indicator_name: entityType,
    metric_type: 'count' as const,
    spatial_grain: 'dong',
    source_pattern: `MULTI_DONG:${taskType} - ${entityType}`,
    value_field: '',
    description: `${originalName} (행정동 단위)`,
    aggregation_method: JSON.stringify([{ dong: 'all', id: apis[0].id }]),
  } as IndicatorMetadata);
}
```

#### 우선순위 조정
```typescript
// dong > gu > city 우선순위
const hasDongData = subIndicators.some(ind => ind.spatial_grain === 'dong');
const hasGuData = subIndicators.some(ind => ind.spatial_grain === 'gu');
const representativeSpatialGrain = hasDongData ? 'dong' : (hasGuData ? 'gu' : 'city');
```

---

### 3. indicator-loader.ts에 MULTI_DONG 처리 추가

```typescript
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

  // 단일 API가 모든 행정동 데이터를 반환
  const apiId = dongApiMap[0].id;
  const response = await fetch(`/api/seoul-data?serviceId=${apiId}&startIndex=1&endIndex=1000`);
  const data = await response.json();

  // 행정동 필드 자동 감지
  const dongFields = ['ADSTRD_CODE_SE', 'STDR_DE_NM', 'ADSTRD_NM', 'DONG_NM'];
  let dongField: string | null = null;

  for (const field of dongFields) {
    if (data.rows[0][field]) {
      dongField = field;
      break;
    }
  }

  // 행정동별 집계
  const dongCounts: Record<string, number> = {};
  data.rows.forEach((row: any) => {
    const dongName = row[dongField!];
    if (dongName) {
      dongCounts[dongName] = (dongCounts[dongName] || 0) + 1;
    }
  });

  const indicatorValues: IndicatorValue[] = Object.entries(dongCounts).map(([dong, count]) => ({
    gu: dong,  // 행정동 이름 (gu 필드 재사용)
    value: count
  }));

  return indicatorValues;
}
```

---

## 데이터 흐름

### 행정동 API 처리 과정

```
1. 사용자가 "공공데이터 > 정보" 선택
   ↓
2. "행정동 단위 서울 생활인구(내국인)" 지표 선택
   ↓
3. indicator-grouping.ts
   - OA-14991 감지
   - known-apis에서 spatialType='dong' 확인
   - MULTI_DONG 패턴 생성
   - aggregation_method: [{ dong: 'all', id: 'OA-14991' }]
   ↓
4. loadIndicatorData() 호출
   - source_pattern: "MULTI_DONG:정보 - 생활인구"
   - /api/seoul-data?serviceId=OA-14991&startIndex=1&endIndex=1000
   ↓
5. XML 응답 파싱
   - rows 배열 추출
   - ADSTRD_CODE_SE 필드 감지
   ↓
6. 행정동별 집계
   - 각 행정동별로 데이터 개수 계산
   - [{ gu: "종로1·2·3·4가동", value: 123 }, ...]
   ↓
7. MapContainer
   - seoul-hangjeongdong.geojson과 병합
   ↓
8. 지도에 choropleth 표시
   - 424개 행정동에 색상 적용
```

---

## 타입 정의

### IndicatorMetadata
```typescript
export interface IndicatorMetadata {
  family: string;
  indicator_id: string;
  indicator_name: string;
  metric_type: 'count' | 'rate' | 'avg' | 'sum';
  spatial_grain: 'gu' | 'dong' | 'city';  // ✅ 'dong' 추가됨
  source_pattern: string;
  value_field: string;
  aggregation_method?: string;
  description: string;
}
```

### IndicatorTopic
```typescript
export interface IndicatorTopic {
  topic_id: string;
  topic_name: string;
  category: string;
  spatial_grain: 'gu' | 'dong' | 'city';  // ✅ 'dong' 추가됨
  sub_indicators: IndicatorMetadata[];
  description: string;
}
```

---

## 테스트 방법

### 1. 서버 실행 및 로그 확인
```bash
npm run dev
tail -f /tmp/nextjs-dev.log | grep "행정동"
```

### 2. 브라우저에서 테스트
1. `http://localhost:3000` 접속
2. **"구 (API)"** 모드 선택
3. 지표 선택 드롭다운 열기
4. **"공공데이터 > 정보"** 검색 또는 선택
5. **"행정동 단위 서울 생활인구(내국인)"** 선택
6. 지도에 424개 행정동별 데이터 표시 확인

### 3. 예상 로그
```
✅ 통합 카탈로그 로드: 41개 주제
   - LOCALDATA 주제: 1개
   - API 주제: 40개

📊 행정동 API 지표 로드: 생활인구
   - 단일 API가 모든 행정동 데이터 반환: OA-14991
   ✅ 행정동 데이터 수신: 424개 행
   - 행정동 필드 감지: ADSTRD_CODE_SE
✅ 행정동 집계 완료: 424개 행정동
```

---

## 추가 가능한 행정동 API

현재 카탈로그에서 발견된 행정동 API들:

| ID | 이름 | 타입 | 추가 가능 |
|----|------|------|-----------|
| OA-14991 | 행정동 단위 서울 생활인구(내국인) | Sheet,Api,File | ✅ 추가됨 |
| OA-14992 | 행정동 단위 서울 생활인구(장기체류 외국인) | Sheet,Api,File | ⏳ 대기 |
| OA-14993 | 행정동 단위 서울 생활인구(단기체류 외국인) | Sheet,Api,File | ⏳ 대기 |
| OA-21226 | 서울시 행정동 단위 대중교통 출발지/도착지 승객수 | File | ❌ File 타입 |
| OA-21227 | 서울시 행정동 단위 대중교통 수단 출발지/도착지 승객수 | File | ❌ File 타입 |
| OA-21228 | 서울시 행정동 단위 대중교통 목적 출발지/도착지 승객수 | File | ❌ File 타입 |
| OA-22266 | 행정동단위 10개 관심집단수 | File | ❌ File 타입 |
| OA-22267 | 행정동단위 29개 통신정보 | File | ❌ File 타입 |

---

## 제약사항

### 1. API 키 필요
- 일부 행정동 API는 유효한 API 키가 필요할 수 있음
- 테스트 시 API 키 확인 필요

### 2. File 타입 API
- 대부분의 행정동 API가 File 타입 (엑셀 다운로드)
- 실시간 조회 가능한 API는 생활인구 시리즈 정도

### 3. GeoJSON 매칭
- 행정동 이름이 GeoJSON의 `adm_nm` 필드와 정확히 일치해야 함
- 일부 행정동 이름 불일치 가능성 (예: "종로1·2·3·4가동" vs "종로1234가동")

---

## 다음 단계

### 1. 추가 행정동 API 테스트
```typescript
{
  id: 'OA-14992',
  serviceName: 'SPOP_LOCAL_RESD_DONG_FO_LT',
  description: '행정동 단위 서울 생활인구(장기체류 외국인)',
  hasData: true,
  spatialType: 'dong',
  dongField: 'ADSTRD_CODE_SE',
},
```

### 2. 행정동 이름 정규화
- GeoJSON과 API 응답의 행정동 이름 매칭 로직 추가
- 별칭 맵 생성 (예: "종로1·2·3·4가동" → "종로1234가동")

### 3. UI 개선
- spatial_grain이 'dong'인 경우 "행정동" 배지 표시
- 행정동 모드 별도 토글 추가 가능

---

## 요약

### ✅ 완료된 작업
1. spatialType에 'dong' 추가
2. MULTI_DONG 패턴 처리 로직 구현
3. 행정동 필드 자동 감지
4. 행정동별 데이터 집계
5. OA-14991 (생활인구) API 등록

### 📊 기대 효과
- **데이터 세분화**: 구 레벨(25개) → 행정동 레벨(424개)
- **더 정밀한 시각화**: 행정동별 인구, 교통 등 데이터 표시
- **확장성**: 다른 행정동 API 쉽게 추가 가능

### 🎯 사용 방법
1. "구 (API)" 모드 선택
2. "공공데이터 > 정보" 검색
3. "행정동 단위 서울 생활인구(내국인)" 선택
4. 424개 행정동별 데이터 확인

---

**작성일**: 2026-01-12
**버전**: 1.0
**상태**: ✅ 구현 완료, 테스트 필요
