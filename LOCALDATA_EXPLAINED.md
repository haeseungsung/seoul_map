# LOCALDATA 완전 가이드

**작성일**: 2026-01-12
**목적**: LOCALDATA 개념을 처음부터 끝까지 완벽하게 이해하기

---

## 🎯 LOCALDATA란?

**LOCALDATA**는 서울시에서 제공하는 **지역인가데이터 Open API의 서비스명 패턴**입니다.

### 한 문장 요약
> "각 구별로 인허가 업소 정보를 제공하는 서울시 API 서비스"

---

## 📖 기본 개념

### 1. 왜 LOCALDATA인가?

서울시는 **지역별(구별) 인허가 정보**를 API로 제공합니다:
- 병원, 음식점, 약국 등의 **영업 인허가 정보**
- 각 구(강남구, 강동구 등)별로 **별도 API 존재**
- **실시간 업데이트** (영업중, 폐업 등)

### 2. LOCALDATA 명명 규칙

```
LOCALDATA_[업종코드]_[구코드]
```

#### 구성 요소
- **LOCALDATA**: 고정 접두사
- **업종코드**: 6자리 숫자 (예: 010101 = 병원)
- **구코드**: 2자리 영문 (예: GN = 강남구)

---

## 🏥 구체적인 예시

### 예시 1: 강남구 병원 정보

**서비스명**: `LOCALDATA_010101_GN`

**분해**:
- `LOCALDATA`: 지역인가데이터 API
- `010101`: 병원 (업종 코드)
- `GN`: 강남구 (지역 코드)

**API URL**:
```
http://openapi.seoul.go.kr:8088/{API_KEY}/xml/LOCALDATA_010101_GN/1/100/
```

**응답 예시** (XML):
```xml
<LOCALDATA_010101_GN>
  <list_total_count>122</list_total_count>
  <RESULT>
    <CODE>INFO-000</CODE>
    <MESSAGE>정상 처리되었습니다</MESSAGE>
  </RESULT>
  <row>
    <BPLCNM>서울삼성병원</BPLCNM>
    <SITEWHLADDR>서울특별시 강남구 일원동 50</SITEWHLADDR>
    <TRDSTATEGBN>영업/정상</TRDSTATEGBN>
  </row>
  <row>
    <BPLCNM>강남세브란스병원</BPLCNM>
    <SITEWHLADDR>서울특별시 강남구 도곡동 146-92</SITEWHLADDR>
    <TRDSTATEGBN>영업/정상</TRDSTATEGBN>
  </row>
  ...
</LOCALDATA_010101_GN>
```

**해석**:
- **총 122개의 병원**이 강남구에 있음 (`list_total_count`)
- 각 `<row>`는 1개 병원
- `BPLCNM`: 업소명
- `SITEWHLADDR`: 소재지 주소
- `TRDSTATEGBN`: 영업 상태 (영업중, 폐업 등)

---

### 예시 2: 서초구 일반음식점 정보

**서비스명**: `LOCALDATA_070101_SP`

**분해**:
- `070101`: 일반음식점 (업종 코드)
- `SP`: 서초구 (지역 코드)

**API URL**:
```
http://openapi.seoul.go.kr:8088/{API_KEY}/xml/LOCALDATA_070101_SP/1/100/
```

**응답**:
```xml
<LOCALDATA_070101_SP>
  <list_total_count>5847</list_total_count>
  <row>
    <BPLCNM>맛있는 식당</BPLCNM>
    <SITEWHLADDR>서울특별시 서초구 서초동 1234</SITEWHLADDR>
    <TRDSTATEGBN>영업/정상</TRDSTATEGBN>
  </row>
  ...
</LOCALDATA_070101_SP>
```

**해석**: 서초구에 **5,847개의 일반음식점**이 영업 중

---

## 📋 코드표

### 업종 코드 (Industry Codes)

| 코드 | 업종명 | 예시 |
|------|--------|------|
| 010101 | 병원 | 삼성병원, 강남세브란스 |
| 020101 | 약국 | 서울약국, 강남약국 |
| 070101 | 일반음식점 | 한식, 중식, 일식 레스토랑 |
| 070102 | 휴게음식점 | 카페, 베이커리 |
| 070103 | 단란주점 | 단란주점 |
| 070104 | 유흥주점 | 유흥주점 |
| 110101 | 유통전문판매업 | 편의점, 슈퍼마켓 |

**전체 목록**: `app/api/seoul-data/route.ts`의 `entityCodeMap` 참조

---

### 구 코드 (District Codes)

| 코드 | 구 이름 | 코드 | 구 이름 |
|------|---------|------|---------|
| GN | 강남구 | SP | 서초구 |
| GD | 강동구 | SD | 성동구 |
| GJ | 광진구 | GW | 관악구 |
| GP | 구로구 | YD | 영등포구 |
| DM | 도봉구 | JN | 중랑구 |
| DDM | 동대문구 | JG | 종로구 |
| DJG | 동작구 | JR | 중구 |
| MPK | 마포구 | EP | 은평구 |
| NW | 노원구 | YC | 양천구 |
| SBK | 성북구 | YDP | 용산구 |
| SPA | 송파구 | | |
| GC | 금천구 | | |

**전체 25개 구** 존재

**전체 목록**: `app/api/seoul-data/route.ts`의 `GU_CODE_MAP` 참조

---

## 🔢 수학 계산

### 서울시 전체 병원 개수 구하기

**문제**: 서울시 전체에 병원이 몇 개인가?

**방법**: 25개 구의 병원 API를 각각 호출

```
LOCALDATA_010101_GN (강남구 병원)  → 122개
LOCALDATA_010101_GD (강동구 병원)  → 45개
LOCALDATA_010101_GJ (광진구 병원)  → 32개
...
LOCALDATA_010101_SPA (송파구 병원) → 67개

총합: 122 + 45 + 32 + ... + 67 = 전체 병원 개수
```

**이것이 바로 이 프로젝트가 하는 일입니다!**

---

## 🛠️ 이 프로젝트에서의 처리 방식

### 문제: 25번 API 호출은 너무 느리다

각 구별로 API를 호출하면:
- 강남구 병원 API 호출 (1번)
- 강동구 병원 API 호출 (2번)
- ...
- 송파구 병원 API 호출 (25번)

**총 25번의 API 호출** = 느림 😢

---

### 해결책: localdata-merge API

우리는 **병합 API**를 만들었습니다:

```
/api/localdata-merge?industryCode=010101
```

**작동 방식**:
1. 내부적으로 25개 구 API를 동시에 호출
2. 모든 응답을 하나로 병합
3. 한 번의 요청으로 전체 데이터 반환

**결과**:
```json
{
  "success": true,
  "data": [
    { "BPLCNM": "서울삼성병원", "SITEWHLADDR": "서울특별시 강남구 일원동 50", ... },
    { "BPLCNM": "강동경희대병원", "SITEWHLADDR": "서울특별시 강동구 상일동 149", ... },
    // 총 1,234개 병원 (25개 구 합계)
  ]
}
```

---

### aggregateByGu() 함수

병합된 데이터를 **구별로 집계**합니다:

```typescript
// utils/indicator-loader.ts
function aggregateByGu(data, metadata) {
  // 1. 구별로 그룹화
  const grouped = {};

  data.forEach(row => {
    // 주소에서 구 이름 추출
    const addr = row.SITEWHLADDR || '';
    const guMatch = addr.match(/서울특별시\s+(\S+구)/);
    const gu = guMatch ? guMatch[1] : null;

    if (!gu) return;

    if (!grouped[gu]) grouped[gu] = [];
    grouped[gu].push(row);
  });

  // 2. 구별 개수 계산
  const result = [];
  for (const [gu, rows] of Object.entries(grouped)) {
    result.push({
      gu: gu,           // "강남구"
      value: rows.length // 122
    });
  }

  return result;
}
```

**결과**:
```javascript
[
  { gu: "강남구", value: 122 },
  { gu: "강동구", value: 45 },
  { gu: "광진구", value: 32 },
  ...
  { gu: "송파구", value: 67 }
]
```

---

## 🗺️ 지도에 표시하기

### 데이터 흐름

```
1. 사용자가 "보건 > 인허가" 선택
   ↓
2. "병원" 지표 선택
   ↓
3. loadIndicatorData() 호출
   ↓
4. /api/localdata-merge?industryCode=010101
   ↓ (내부적으로 25개 API 호출)
5. 병합된 1,234개 병원 데이터 반환
   ↓
6. aggregateByGu() 실행
   ↓
7. [{ gu: "강남구", value: 122 }, ...]
   ↓
8. MapContainer에서 GeoJSON과 병합
   ↓
9. 지도에 choropleth 표시
   - 강남구: 진한 파란색 (122개)
   - 광진구: 연한 파란색 (32개)
   - ...
```

---

## 🔍 실제 코드 위치

### 1. LOCALDATA 패턴 감지
**파일**: [app/api/seoul-data/route.ts](app/api/seoul-data/route.ts:114-152)

```typescript
// "서울시 XX구 YYY 인허가 정보" 패턴 감지
const localdataMatch = serviceInfo.name.match(/서울시\s+(\S+구)\s+(.+?)\s+(인허가|정보|현황|목록)/);

if (localdataMatch) {
  const guName = localdataMatch[1];      // "강남구"
  const entityName = localdataMatch[2];  // "병원"

  const guCode = GU_CODE_MAP[guName];       // "GN"
  const entityCode = entityCodeMap[entityName]; // "010101"

  if (guCode && entityCode) {
    apiUrl = `http://openapi.seoul.go.kr:8088/${API_KEY}/xml/LOCALDATA_${entityCode}_${guCode}/1/100/`;
    console.log(`✅ LOCALDATA API 발견: LOCALDATA_${entityCode}_${guCode}`);
  }
}
```

---

### 2. localdata-merge API
**파일**: [app/api/localdata-merge/route.ts](app/api/localdata-merge/route.ts)

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const industryCode = searchParams.get('industryCode'); // "010101"

  // 25개 구의 LOCALDATA API를 동시에 호출
  const promises = GU_CODES.map(guCode => {
    return fetch(`/api/seoul-data?serviceId=LOCALDATA_${industryCode}_${guCode}`);
  });

  const responses = await Promise.all(promises);

  // 모든 응답 병합
  const allData = [];
  for (const res of responses) {
    const data = await res.json();
    if (data.success && data.rows) {
      allData.push(...data.rows);
    }
  }

  return NextResponse.json({ success: true, data: allData });
}
```

---

### 3. aggregateByGu 함수
**파일**: [utils/indicator-loader.ts](utils/indicator-loader.ts:96-118)

```typescript
function aggregateByGu(data: any[], metadata: IndicatorMetadata): IndicatorValue[] {
  const grouped = data.reduce((acc, row) => {
    let gu = row.GU || '';

    // GU 필드가 없으면 주소에서 추출
    if (!gu) {
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

  return Object.entries(grouped).map(([gu, rows]) => ({
    gu: gu,
    value: rows.length
  }));
}
```

---

### 4. LOCALDATA 데이터 로드
**파일**: [utils/indicator-loader.ts](utils/indicator-loader.ts:188-213)

```typescript
// LOCALDATA 패턴인 경우
if (family === 'LOCALDATA') {
  const industryCode = metadata.source_pattern.split(':')[1]; // "010101"

  console.log(`🔄 LOCALDATA 병합 시작: ${industryCode}`);

  const response = await fetch(`/api/localdata-merge?industryCode=${industryCode}`);
  const result = await response.json();

  if (!result.success) {
    console.error('❌ LOCALDATA 병합 실패');
    return [];
  }

  // aggregateByGu로 구별 집계
  const indicatorValues = aggregateByGu(result.data, metadata);

  console.log(`✅ LOCALDATA 통합 완료: ${indicatorValues.length}개 구`);
  return indicatorValues;
}
```

---

## ❓ 자주 묻는 질문

### Q1. LOCALDATA와 일반 서울 OpenAPI의 차이는?

**LOCALDATA**:
- 인허가 업소 정보 (병원, 음식점 등)
- 각 구별로 별도 API
- 서비스명 패턴: `LOCALDATA_[업종코드]_[구코드]`

**일반 OpenAPI**:
- 다양한 정보 (대기환경, 주차장, 문화행사 등)
- 서비스명이 다양함 (RealtimeCityAir, bikeList 등)
- 패턴 없음 (각 API마다 다름)

---

### Q2. 왜 25개 구 API를 따로 호출해야 하나?

서울시가 그렇게 설계했기 때문입니다.

**이유 (추정)**:
- 각 구청에서 자체적으로 인허가 데이터 관리
- 구별로 데이터 양이 많아서 분리
- 시스템 부하 분산

---

### Q3. 모든 업종에 LOCALDATA API가 있나?

아니요, **인허가가 필요한 업종**만 있습니다:
- ✅ 병원, 약국, 음식점 → 있음
- ❌ 공원, 도로, 하천 → 없음 (인허가 대상 아님)

---

### Q4. 데이터가 실시간인가?

**준실시간** (Near real-time):
- 인허가 정보는 매일 업데이트
- 영업중/폐업 상태 반영
- 신규 개업 정보 포함

---

### Q5. CSV 데이터와 LOCALDATA API의 차이는?

**CSV** (indicator-catalog.csv):
- **정적 데이터** (한 번 수집된 스냅샷)
- **행정동 레벨** (더 세밀함)
- 빠름 (API 호출 불필요)

**LOCALDATA API**:
- **실시간 데이터** (최신 상태)
- **구 레벨** (행정동보다 넓음)
- 느림 (25번 API 호출 필요)

---

## 🎓 요약

### LOCALDATA 5줄 요약

1. **LOCALDATA**: 서울시 지역인가데이터 API 서비스명 패턴
2. **구조**: `LOCALDATA_[업종코드]_[구코드]` (예: LOCALDATA_010101_GN)
3. **데이터**: 병원, 음식점, 약국 등 인허가 업소 정보
4. **개수**: 25개 구 × N개 업종 = 수백 개 API
5. **처리**: localdata-merge로 병합 → aggregateByGu로 집계

---

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `app/api/seoul-data/route.ts` | LOCALDATA 패턴 감지 및 API 호출 |
| `app/api/localdata-merge/route.ts` | 25개 구 API 병합 |
| `utils/indicator-loader.ts` | LOCALDATA 데이터 로드 및 aggregateByGu |
| `utils/indicator-grouping.ts` | LOCALDATA 지표 그룹핑 |

---

### 다음 읽을 문서

- **PROJECT_OVERVIEW.md**: 프로젝트 전체 구조
- **API_AGGREGATION_DESIGN.md**: aggregateByGu 상세 설계
- **LOCALDATA_PATTERN_FIX.md**: 패턴 감지 구현 기록

---

**작성일**: 2026-01-12
**버전**: 1.0
**상태**: ✅ 완료
