# Seoul Open Data Map

서울시 열린데이터광장 8,212개 API를 지도에 시각화하는 프로젝트

---

## 🚀 빠른 시작

### 1. 개발 서버 실행
```bash
npm install
npm run dev
```

### 2. 브라우저 접속
```
http://localhost:3000
```

---

## 📚 문서 가이드

### 필수 문서 (순서대로 읽기)

1. **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** ⭐
   - 프로젝트 전체 개요
   - LOCALDATA 개념 설명
   - 데이터 처리 흐름
   - **여기서 시작하세요!**

2. **[LOCALDATA_EXPLAINED.md](LOCALDATA_EXPLAINED.md)**
   - LOCALDATA 완전 가이드
   - 업종 코드 / 구 코드 표
   - 실제 예시와 코드 위치

3. **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)**
   - 모든 문서 목록 및 설명
   - 시나리오별 추천 문서

### 기술 문서

- **[V3_HIERARCHICAL_STRUCTURE.md](V3_HIERARCHICAL_STRUCTURE.md)**: 계층형 그룹핑 구조
- **[SEOUL_API_ANALYSIS.md](SEOUL_API_ANALYSIS.md)**: 서울시 API 분석 결과
- **[REALTIME_AIR_FINAL_FIX.md](REALTIME_AIR_FINAL_FIX.md)**: 실시간 대기환경 수정 기록

### 참고 문서

- **[V3_DELIVERABLES_INDEX.md](V3_DELIVERABLES_INDEX.md)**: V3 산출물 목록
- **[prd.md](prd.md)**: 제품 요구사항 정의서

---

## 🗂️ 프로젝트 구조

```
seoul/
├── app/
│   ├── api/
│   │   ├── seoul-data/          # 서울시 OpenAPI 프록시
│   │   └── localdata-merge/     # LOCALDATA 25개 구 병합
│   └── page.tsx                 # 메인 페이지
├── components/
│   ├── HierarchicalIndicatorSelector.tsx  # 지표 선택 UI
│   └── MapContainer.tsx                   # 지도 시각화
├── utils/
│   ├── indicator-loader.ts      # 지표 데이터 로딩
│   └── indicator-grouping.ts    # 8,212개 API 그룹핑
└── public/data/
    ├── indicator-catalog.csv    # CSV 정적 데이터
    └── seoul-api-catalog.json   # 8,212개 API 메타데이터
```

---

## 🎯 주요 기능

### 1. 2단계 계층형 탐색
- **레벨1**: 40개 주제 (예: "보건 > 인허가", "환경 > 정보")
- **레벨2**: 세부 지표 (예: "병원", "음식점", "실시간 대기환경")

### 2. 두 가지 모드
- **행정동 (CSV)**: 정적 데이터, 빠름, 행정동 레벨
- **구 (API)**: 실시간 데이터, 느림, 구 레벨

### 3. Choropleth 지도
- Mapbox GL 기반
- 구별/행정동별 색상 시각화
- 툴팁으로 상세 정보 표시

---

## 🛠️ 기술 스택

- **Framework**: Next.js 15.5.9 (App Router)
- **Map**: Mapbox GL JS
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data**: XML API + CSV

---

## 📊 데이터 소스

### 1. LOCALDATA (지역인가데이터)
- 병원, 음식점, 약국 등 인허가 업소 정보
- 25개 구별 별도 API
- 패턴: `LOCALDATA_[업종코드]_[구코드]`

### 2. 서울 OpenAPI
- 실시간 대기환경, 주차장, 문화행사 등
- 8,212개 API 카탈로그
- 모두 XML 형식

### 3. CSV 정적 데이터
- 유통전문판매업 등 미리 수집된 데이터
- 행정동 레벨
- `public/data/indicator-catalog.csv`

---

## 🔍 API 테스트

### LOCALDATA 병합 API
```bash
curl "http://localhost:3000/api/localdata-merge?industryCode=010101"
```

### 개별 서울시 API
```bash
curl "http://localhost:3000/api/seoul-data?serviceId=OA-2219&startIndex=1&endIndex=25"
```

---

## 📝 로그 확인

```bash
tail -f /tmp/nextjs-dev.log
```

---

## ❓ 자주 묻는 질문

### Q. LOCALDATA가 뭔가요?
→ [LOCALDATA_EXPLAINED.md](LOCALDATA_EXPLAINED.md) 참고

### Q. 왜 데이터가 안 나오나요?
→ [REALTIME_AIR_FINAL_FIX.md](REALTIME_AIR_FINAL_FIX.md) 참고

### Q. 계층형 구조는 어떻게 되나요?
→ [V3_HIERARCHICAL_STRUCTURE.md](V3_HIERARCHICAL_STRUCTURE.md) 참고

---

## 📧 문의

- 문서: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- 개요: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

---

**작성일**: 2026-01-12
**버전**: 3.0
