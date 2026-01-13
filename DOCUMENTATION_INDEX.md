# 문서 전체 목록 및 설명

**작성일**: 2026-01-12
**목적**: 22개 문서 파일 정리 및 설명

---

## 📖 읽는 순서

### 처음 시작하는 경우
1. **PROJECT_OVERVIEW.md** ← **여기서 시작!**
2. **DOCUMENTATION_INDEX.md** (이 문서)
3. **V3_HIERARCHICAL_GROUPING.md**

### 버그 수정 기록 확인
1. **REALTIME_AIR_FINAL_FIX.md**
2. **LOCALDATA_PATTERN_FIX.md**
3. **GU_EXTRACTION_FIX.md**

### 아키텍처 이해
1. **V3_DELIVERABLES_INDEX.md**
2. **API_AGGREGATION_DESIGN.md**

---

## 📂 문서 분류

### 🎯 핵심 문서 (필독)

#### 1. PROJECT_OVERVIEW.md
**내용**: 프로젝트 전체 개요
- LOCALDATA 개념 설명
- 데이터 소스 3가지 유형
- API 처리 흐름
- 계층형 구조 설명
- 현재 상태 및 다음 단계

**읽어야 하는 이유**: 프로젝트 이해를 위한 출발점

---

#### 2. DOCUMENTATION_INDEX.md (이 문서)
**내용**: 모든 문서 목록 및 설명
- 문서별 목적과 내용
- 읽는 순서 가이드
- 카테고리별 분류

**읽어야 하는 이유**: 어떤 문서를 읽어야 할지 결정

---

### 🏗️ 아키텍처 문서

#### 3. V3_DELIVERABLES_INDEX.md
**내용**: V3 계층형 구조 산출물 총정리
- 40개 주제 그룹 구조
- 파일 목록 및 설명
- 사용자 시나리오

**읽어야 하는 경우**: 계층형 구조가 어떻게 구성되었는지 알고 싶을 때

---

#### 4. V3_HIERARCHICAL_GROUPING.md
**내용**: 계층형 그룹핑 전략 상세 설명
- mapCategory / taskType / entityType 구조
- 그룹핑 알고리즘
- 동의어 매핑
- UI 설계

**읽어야 하는 경우**: 8,212개 API가 40개 주제로 어떻게 그룹화되었는지 알고 싶을 때

---

#### 5. API_AGGREGATION_DESIGN.md
**내용**: API 데이터 집계 설계
- LOCALDATA 병합 방식
- aggregateByGu 함수 설계
- 성능 최적화

**읽어야 하는 경우**: 25개 구 데이터를 어떻게 통합하는지 알고 싶을 때

---

### 🐛 버그 수정 기록

#### 6. REALTIME_AIR_FINAL_FIX.md
**내용**: 실시간 대기환경 데이터 최종 수정
- OA-2219 API 문제 진단
- spatialType='gu' 설정
- MSRSTN_NM 필드 감지
- 단일 API 구별 데이터 처리

**문제**: "서울시 권역별 실시간 대기환경 현황"이 지도에서 "데이터 없음"으로 표시됨

**해결**: known-apis.ts에 spatialType 추가 + 단일 API 구별 데이터 인식 로직

**읽어야 하는 경우**: RealtimeCityAir API가 어떻게 작동하는지 알고 싶을 때

---

#### 7. REALTIME_AIR_COMPLETE_FIX.md
**내용**: 실시간 대기환경 데이터 첫 번째 수정 시도
- 변수 중복 에러 수정 (firstApi → testApi)
- 검색 가능하도록 description 개선
- 원본 API 이름 보존

**참고**: REALTIME_AIR_FINAL_FIX.md가 더 완전한 버전이므로 그쪽을 읽는 것을 권장

---

#### 8. LOCALDATA_PATTERN_FIX.md
**내용**: LOCALDATA 패턴 자동 감지 구현
- "서울시 XX구 YYY 인허가 정보" 패턴 감지
- entityCodeMap (병원: 010101 등)
- 자동 서비스명 구성 (LOCALDATA_010101_GN)

**문제**: OA-16181이 ERROR-500 반환

**해결**: route.ts에 LOCALDATA 패턴 감지 로직 추가

**읽어야 하는 경우**: LOCALDATA API 자동 구성이 어떻게 작동하는지 알고 싶을 때

---

#### 9. GU_EXTRACTION_FIX.md
**내용**: 주소 필드에서 구 이름 추출
- aggregateByGu() 함수 개선
- RDNWHLADDR, SITEWHLADDR에서 정규식으로 구 추출

**문제**: 지도에 모든 구가 0으로 표시됨

**해결**: row.GU 필드가 없는 경우 주소 문자열에서 추출

**읽어야 하는 경우**: 구 이름 추출 로직을 이해하고 싶을 때

---

#### 10. UI_IMPROVEMENT_FIX.md
**내용**: 계층형 선택기 UI 개선
- "Category > TaskType" 형식으로 표시
- Level-2에서 전체 API 이름 표시
- 선택된 지표 표시 개선

**문제**: "대기오염"이 4번 중복되어 보임

**해결**: HierarchicalIndicatorSelector.tsx 수정

**읽어야 하는 경우**: UI 표시 로직을 이해하고 싶을 때

---

### 📊 분석 문서

#### 11. SEOUL_API_ANALYSIS.md
**내용**: 서울시 API 분석 결과
- 8,212개 API 카탈로그
- API 타입 분포 (XML, JSON, Sheet)
- LOCALDATA 패턴 발견
- 실제 작동하는 API 목록

**읽어야 하는 경우**: 서울시 API 전체 현황을 알고 싶을 때

---

#### 12. dev-docs/seoul-openapi-analysis.md
**내용**: 서울시 OpenAPI 구조 상세 분석
- API 카탈로그 수집 방법
- XML/JSON 응답 구조
- 구별 API 패턴
- 테스트 결과

**읽어야 하는 경우**: API 구조를 깊이 이해하고 싶을 때

---

### 🗂️ 작업 로그

#### 13. tasks/tasks-seoul-map-feature.md
**내용**: 개발 태스크 목록
- 완료된 작업
- 진행 중인 작업
- 예정된 작업

**읽어야 하는 경우**: 개발 진행 상황을 확인하고 싶을 때

---

### 🔧 기술 참고 문서

#### 14. INDICATOR_CATALOG_FORMAT.md
**내용**: indicator-catalog.csv 파일 형식 설명
- 컬럼 정의
- 데이터 예시
- 사용 방법

**읽어야 하는 경우**: CSV 데이터 구조를 이해하고 싶을 때

---

#### 15. API_ROUTE_DOCUMENTATION.md
**내용**: API 엔드포인트 문서
- /api/seoul-data
- /api/localdata-merge
- /api/aggregate-gu-data
- 파라미터 및 응답 형식

**읽어야 하는 경우**: API 엔드포인트를 직접 호출하고 싶을 때

---

### 📋 기타 문서

#### 16. KNOWN_APIS_DOCUMENTATION.md
**내용**: known-apis.ts 파일 설명
- KnownApiConfig 인터페이스
- 등록된 API 목록
- spatialType 설명

**읽어야 하는 경우**: 특수 처리가 필요한 API를 추가하고 싶을 때

---

#### 17. TROUBLESHOOTING_GUIDE.md
**내용**: 문제 해결 가이드
- 자주 발생하는 문제
- 해결 방법
- 로그 확인 방법

**읽어야 하는 경우**: 문제가 발생했을 때

---

#### 18. DEVELOPMENT_SETUP.md
**내용**: 개발 환경 설정
- Node.js 설치
- 패키지 설치
- 환경 변수 설정
- 서버 실행

**읽어야 하는 경우**: 처음 프로젝트를 세팅할 때

---

### 📦 레거시 문서 (참고용)

#### 19. V2_GROUPING_STRATEGY.md
**내용**: V2 그룹핑 전략 (구버전)
- V3 이전 버전의 그룹핑 방식
- 문제점 및 개선 사항

**읽어야 하는 경우**: 왜 V3로 변경되었는지 알고 싶을 때

---

#### 20. V1_INITIAL_IMPLEMENTATION.md
**내용**: V1 초기 구현 (구버전)
- 최초 프로토타입
- 단순 API 호출 방식

**읽어야 하는 경우**: 프로젝트 초기 구조를 알고 싶을 때

---

#### 21. MIGRATION_V2_TO_V3.md
**내용**: V2에서 V3로 마이그레이션
- 변경 사항
- 마이그레이션 가이드

**읽어야 하는 경우**: V2 코드를 V3로 업그레이드할 때

---

#### 22. LEGACY_API_NOTES.md
**내용**: 레거시 API 메모
- 작동하지 않는 API 목록
- 더 이상 사용하지 않는 패턴

**읽어야 하는 경우**: 과거 시도했던 방법을 알고 싶을 때

---

## 🎯 시나리오별 추천 문서

### "프로젝트를 처음 본다"
1. PROJECT_OVERVIEW.md
2. V3_HIERARCHICAL_GROUPING.md
3. SEOUL_API_ANALYSIS.md

### "LOCALDATA가 뭔지 모르겠다"
1. PROJECT_OVERVIEW.md (LOCALDATA 섹션)
2. LOCALDATA_PATTERN_FIX.md
3. API_AGGREGATION_DESIGN.md

### "왜 데이터가 안 나올까?"
1. TROUBLESHOOTING_GUIDE.md
2. REALTIME_AIR_FINAL_FIX.md
3. GU_EXTRACTION_FIX.md

### "새로운 API를 추가하고 싶다"
1. KNOWN_APIS_DOCUMENTATION.md
2. API_ROUTE_DOCUMENTATION.md
3. LOCALDATA_PATTERN_FIX.md

### "UI를 수정하고 싶다"
1. V3_DELIVERABLES_INDEX.md
2. UI_IMPROVEMENT_FIX.md
3. V3_HIERARCHICAL_GROUPING.md (UI 설계 섹션)

### "아키텍처를 이해하고 싶다"
1. V3_DELIVERABLES_INDEX.md
2. API_AGGREGATION_DESIGN.md
3. V3_HIERARCHICAL_GROUPING.md

---

## 📝 문서 작성 규칙

각 문서는 다음 형식을 따릅니다:
- **작성일**: 2026-01-12
- **상태**: ✅ 완료 / ⚠️ 진행중 / ❌ 폐기
- **목적**: 문서의 목적
- **내용**: 주요 내용
- **관련 파일**: 참조하는 코드 파일

---

## 🗑️ 정리 가능한 문서

다음 문서들은 레거시이므로 아카이브하거나 삭제 가능:
- V1_INITIAL_IMPLEMENTATION.md
- V2_GROUPING_STRATEGY.md
- MIGRATION_V2_TO_V3.md
- LEGACY_API_NOTES.md
- REALTIME_AIR_COMPLETE_FIX.md (FINAL_FIX가 더 완전함)

---

## 🔄 통합 추천

다음 문서들은 통합 가능:
- **버그 수정 기록** → `BUGFIX_HISTORY.md` 하나로 통합
  - REALTIME_AIR_FINAL_FIX.md
  - LOCALDATA_PATTERN_FIX.md
  - GU_EXTRACTION_FIX.md
  - UI_IMPROVEMENT_FIX.md

- **개발 가이드** → `DEVELOPER_GUIDE.md` 하나로 통합
  - DEVELOPMENT_SETUP.md
  - TROUBLESHOOTING_GUIDE.md
  - API_ROUTE_DOCUMENTATION.md

---

**작성일**: 2026-01-12
**버전**: 1.0
**다음 읽을 문서**: 시나리오에 따라 위 추천 참고
