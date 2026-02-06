# Seoul Open Data Map - 프로젝트 전체 개요

**작성일**: 2026-01-12
**목적**: 프로젝트 이해를 위한 핵심 개념 정리

---

## 📚 이 문서부터 읽으세요

이 프로젝트는 **서울시 열린데이터광장의 8,212개 API**를 지도에 시각화하는 시스템입니다.

---

## 🎯 프로젝트 목표

1. **서울시 오픈 API 통합**: 8,212개의 XML 기반 API를 하나의 인터페이스로 제공
2. **계층형 탐색**: 40개 주제 → 세부 지표로 구조화된 탐색 경험
3. **지도 시각화**: 구별/행정동별 데이터를 choropleth 지도로 표시
4. **실시간 데이터**: CSV 정적 데이터 + API 실시간 데이터 병행 지원

---

## 🗂️ 핵심 개념 설명

### 1. LOCALDATA란?

**LOCALDATA**는 서울시에서 제공하는 **지역인가데이터 API 서비스명 패턴**입니다.

#### 명명 규칙
```
LOCALDATA_[업종코드]_[구코드]
```

#### 예시
- `LOCALDATA_010101_GN`: **강남구(GN)**의 **병원(010101)** 인허가 정보
- `LOCALDATA_070101_SP`: **서초구(SP)**의 **일반음식점(070101)** 인허가 정보
- `LOCALDATA_020101_GD`: **강동구(GD)**의 **약국(020101)** 인허가 정보

#### 업종 코드 (Industry Codes)
| 코드 | 업종명 |
|------|--------|
| 010101 | 병원 |
| 070101 | 일반음식점 |
| 020101 | 약국 |
| 070102 | 휴게음식점 |
| 110101 | 유통전문판매업 |

#### 구 코드 (District Codes)
| 코드 | 구 이름 |
|------|---------|
| GN | 강남구 |
| GD | 강동구 |
| GJ | 광진구 |
| SP | 서초구 |
| YD | 영등포구 |
| ... | (25개 구 전체) |

#### 특징
- **각 구별로 별도 API 존재**: 강남구 병원 API, 강동구 병원 API 등 25개 API 존재
- **XML 응답**: `<list_total_count>`, `<row>` 구조
- **지역인가데이터**: 인허가, 영업중, 폐업 등 행정 정보

---

### 2. 데이터 소스 3가지 유형

#### Type 1: CSV (LOCALDATA 정적 데이터)
- **파일 위치**: `public/data/indicator-catalog.csv`
- **특징**: 이미 수집된 25개 구의 데이터 (행정동 레벨)
- **사용 모드**: "행정동 (CSV)" 모드
- **예시**: 유통전문판매업_전체, 유통전문판매업_영업중, 유통전문판매업_폐업

#### Type 2: LOCALDATA API (구별 인허가 데이터)
- **API 패턴**: `LOCALDATA_[업종코드]_[구코드]`
- **특징**: 각 구별로 별도 API 호출 필요 (25개 구 = 25번 호출)
- **사용 모드**: "구 (API)" 모드
- **통합 방식**:
  - `/api/localdata-merge?industryCode=010101` → 25개 구 데이터를 한 번에 가져옴
  - `aggregateByGu()` 함수로 구별로 집계

#### Type 3: 기타 서울 OpenAPI (실시간 데이터)
- **API 종류**:
  - 단일 API가 25개 구 데이터 반환 (예: `RealtimeCityAir` - 실시간 대기환경)
  - 구별 개별 API (예: 문화행사, 주차장 등)
- **특징**: XML 응답 형식이 API마다 다름
- **사용 모드**: "구 (API)" 모드

---

### 3. API 처리 흐름

#### 사용자가 지표를 선택하면:

```
1. HierarchicalIndicatorSelector (UI)
   ↓ 사용자 선택

2. loadIndicatorData() (indicator-loader.ts)
   ↓ 지표 메타데이터 확인

3-A. LOCALDATA 패턴인 경우:
   → /api/localdata-merge?industryCode=010101
   → 25개 구 데이터 한 번에 가져오기
   → aggregateByGu()로 구별 집계
   → [{ gu: "강남구", value: 122 }, ...]

3-B. MULTI_GU 패턴인 경우 (개별 API):
   → 각 구별 API 호출 (25번)
   → 각 응답의 totalCount 추출
   → [{ gu: "강남구", value: 50 }, ...]

3-C. 단일 API가 전체 구 데이터 반환하는 경우:
   → 1번 API 호출
   → rows에서 MSRSTN_NM 필드로 구 이름 추출
   → [{ gu: "강남구", value: 23 }, ...]

3-D. WELFARE 패턴인 경우 (복지시설):
   → /api/welfare-aggregate?facilityType=노인복지시설
   → 25개 구의 fcltOpenInfo_{구코드} API 호출
   → FCLT_KIND_NM 필드를 파싱하여 종류별 집계
   → [{ gu: "강남구", value: 45 }, ...]

4. MapContainer
   ↓ GeoJSON과 병합

5. 지도에 choropleth 표시
```

---

### 4. 계층형 구조 (V3 Hierarchical)

#### 레벨 1: 주제 (Topic) - 약 40개
```
mapCategory / taskType
예: "보건 > 인허가", "환경 > 정보", "산업경제 > 정보"
```

#### 레벨 2: 세부 지표 (Sub-Indicator) - 수백 개
```
entityType (엔티티 타입)
예: "병원", "음식점", "약국", "권역별"
```

#### 예시: 병원 인허가 정보
```
레벨1: "보건 > 인허가"
  ↓ 클릭
레벨2: "서울시 강남구 병원 인허가 정보 (25개 구 통합)"
  ↓ 선택
지도에 각 구별 병원 개수 표시
```

---

### 5. 주요 컴포넌트

#### Frontend
- **HierarchicalIndicatorSelector.tsx**: 2단계 지표 선택 UI
- **MapContainer.tsx**: Mapbox GL + choropleth 시각화
- **page.tsx**: 메인 페이지 (모드 전환 등)

#### Backend API Routes
- **pages/api/seoul-data.ts**: 서울시 OpenAPI 프록시 (XML 파싱 포함)
- **pages/api/localdata-merge.ts**: LOCALDATA 25개 구 통합 호출
- **pages/api/welfare-aggregate.ts**: 복지시설 25개 구 통합 + 종류별 집계
- **app/api/aggregate-gu-data/route.ts**: 구별 데이터 집계

#### Utilities
- **utils/indicator-loader.ts**: 지표 데이터 로딩 로직
- **utils/indicator-grouping.ts**: 8,212개 API를 40개 주제로 그룹화
- **utils/api-aggregation.ts**: API 응답 병합 및 집계

#### Configuration
- **app/api/seoul-data/known-apis.ts**: 특수 처리가 필요한 API 목록
- **public/data/indicator-catalog.csv**: LOCALDATA CSV 정적 데이터
- **public/data/seoul-api-catalog.json**: 8,212개 API 메타데이터

---

## 🔄 데이터 처리 방식 비교

| 패턴 | API 호출 횟수 | 데이터 추출 방식 | 예시 |
|------|--------------|----------------|------|
| **LOCALDATA** | 25번 (병합됨) | `aggregateByGu()` | 병원, 음식점, 약국 |
| **WELFARE** | 25번 (병합됨) | `FCLT_KIND_NM` 파싱 + 종류별 집계 | 노인/아동/장애인 복지시설 |
| **MULTI_GU** | 25번 (개별) | 각 응답의 `totalCount` | 문화행사, 주차장 |
| **Single API** | 1번 | rows의 `MSRSTN_NM` 필드 | 실시간 대기환경 |
| **CSV** | 0번 (파일 읽기) | CSV 파싱 | 유통전문판매업 |

---

## 📊 현재 상태

### ✅ 작동하는 것
1. CSV 모드 (행정동 레벨 정적 데이터)
2. LOCALDATA API (localdata-merge + aggregateByGu)
3. RealtimeCityAir (OA-2219) 실시간 대기환경
4. 계층형 지표 선택 UI (40개 주제)
5. 자동 LOCALDATA 서비스명 구성

### ⚠️ 알려진 제약
1. XML 응답 형식이 API마다 다름 (표준화 불가)
2. 일부 API는 실제 데이터가 없음 (Sheet 타입)
3. 주소 필드에서 구 이름 추출 필요 (GU 필드 없는 경우)

---

## 📁 문서 파일 가이드

### 프로젝트 이해
- **PROJECT_OVERVIEW.md** (이 문서): 프로젝트 전체 개요
- **DOCUMENTATION_INDEX.md**: 모든 문서 목록 및 설명

### 아키텍처
- **V3_DELIVERABLES_INDEX.md**: V3 계층형 구조 산출물
- **V3_HIERARCHICAL_GROUPING.md**: 40개 주제 그룹핑 전략
- **API_AGGREGATION_DESIGN.md**: API 데이터 집계 설계

### 기술 문서
- **REALTIME_AIR_FINAL_FIX.md**: 실시간 대기환경 수정 기록
- **LOCALDATA_PATTERN_FIX.md**: LOCALDATA 패턴 감지 구현
- **GU_EXTRACTION_FIX.md**: 주소에서 구 이름 추출 수정

### 참고 자료
- **SEOUL_API_ANALYSIS.md**: 서울시 API 분석 결과
- **dev-docs/seoul-openapi-analysis.md**: API 구조 상세 분석

---

## 🚀 다음 단계

### 옵션 1: 현재 방식 유지 (권장)
- LOCALDATA는 localdata-merge 사용
- 다른 API는 개별 처리
- **장점**: 유연하고 실용적
- **단점**: 복잡도 높음

### 옵션 2: API별 맞춤 처리
- known-apis.ts에 더 많은 API 추가
- 각 API에 맞는 파싱 로직 구현
- **장점**: 정확도 높음
- **단점**: 유지보수 부담 큼

### 옵션 3: 샘플링 방식
- 각 구당 1개 API만 호출
- 전체 경향성 파악용
- **장점**: 빠름
- **단점**: 정확도 낮음

---

## 🛠️ 개발 시작하기

### 1. 서버 실행
```bash
npm run dev
```

### 2. 로그 확인
```bash
tail -f /tmp/nextjs-dev.log
```

### 3. API 테스트
```bash
# LOCALDATA 병합 API
curl "http://localhost:3000/api/localdata-merge?industryCode=010101"

# 개별 서울시 API
curl "http://localhost:3000/api/seoul-data?serviceId=OA-2219&startIndex=1&endIndex=25"
```

### 4. 브라우저 접속
```
http://localhost:3000
```

---

**작성일**: 2026-01-12
**버전**: 1.0
**다음 읽을 문서**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
