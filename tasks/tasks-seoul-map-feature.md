# 🗂️ Task List – 서울시 지도 기반 클로로플레스 시각화 웹앱

## Relevant Files

- `src/pages/index.tsx` - 메인 지도 페이지, 전체 앱 구조의 진입점.
- `src/components/MapContainer.tsx` - Mapbox 기반 지도 컴포넌트.
- `src/components/DetailPanel.tsx` - 클릭된 지역 상세 분석 정보 카드.
- `src/components/SearchBar.tsx` - 행정동/주소 검색 기능 구현용 컴포넌트.
- `src/components/LayerToggle.tsx` - 구/동 단위 전환 기능을 위한 레이어 토글.
- `src/utils/map-utils.ts` - 색상 계산, GeoJSON 처리 등 유틸 함수 모음.
- `src/api/seoul-data.ts` - 서울시 API fetch 및 가공 로직.
- `src/utils/export-utils.ts` - PDF/JPEG 저장 기능 유틸.

### Notes

- 테스트 파일은 각 컴포넌트/유틸 파일 옆에 `.test.ts(x)`로 위치합니다.
- `npx jest` 또는 `npx jest path/to/file.test.tsx` 명령어로 테스트를 실행하세요.

---

## Instructions for Completing Tasks

**IMPORTANT:** 아래 작업을 수행하면서 각 단계가 완료되면 `- [ ]`을 `- [x]`로 바꿔 체크하세요.  
세부 작업 단위로 갱신하는 것이 중요합니다.

---

## Tasks

- [ ] 0.0 Create feature branch  
  - [ ] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/seoul-map-feature`)

---

- [x] 1.0 Set up base map with Seoul GeoJSON
  - [x] 1.1 설치: Mapbox GL JS 설치 및 초기 설정 (`mapbox-gl`, `react-map-gl`)
  - [x] 1.2 서울시 GeoJSON 데이터 다운로드 또는 fetch 설정
  - [x] 1.3 `MapContainer.tsx`에서 기본 맵 렌더링
  - [x] 1.4 GeoJSON을 레이어로 추가하고 행정동 경계 표시
  - [x] 1.5 확대/축소, 이동 등 기본 지도 인터랙션 테스트
  - [x] 1.6 단일 동 클릭 시 해당 GeoJSON Feature 정보 콘솔 출력

---

- [x] 2.0 Implement choropleth coloring based on population data
  - [x] 2.1 서울시 인구 데이터 API 구조 분석 (CSV 파일 사용)
  - [x] 2.2 `seoul-data.ts`에서 API fetch 함수 작성 (`loadPopulationFromCSV`)
  - [x] 2.3 데이터를 행정동 코드 기준으로 매핑 (`csv-parser.ts`)
  - [x] 2.4 `map-utils.ts`에서 값 → 색상 변환 로직 작성 (`getIndicatorConfig`)
  - [x] 2.5 지도에 색상 반영: feature마다 fill-color 적용 (Mapbox expression)
  - [x] 2.6 색상 범례(legend) 컴포넌트 추가 (MapContainer 하단)
  - [x] 2.7 데이터 누락 시 fallback 처리 (ex. 회색 표시, `|| 0` 처리)

---

- [x] 3.0 Add click interaction and detail panel
  - [x] 3.1 지도 클릭 이벤트 핸들러 작성 (MapContainer.tsx - 이미 구현됨)
  - [x] 3.2 클릭한 Feature의 행정동 코드 기반 데이터 추출 (이미 구현됨)
  - [x] 3.3 서울시 전체 평균, 행정동 평균 계산 함수 구현 (`map-utils.ts`: `calculateSeoulAverage`, `calculateGuAverage`)
  - [x] 3.4 비교 결과 % 차이 계산 및 문구 생성 (`map-utils.ts`: `calculateComparison`)
  - [x] 3.5 `DetailPanel.tsx` 컴포넌트 구현 및 UI 렌더링 (그라디언트 바, 비교 통계 포함)
  - [x] 3.6 패널 닫기 / 다시 클릭 시 갱신 동작 확인 (onClose 핸들러, 클릭 시 재계산)

---

- [ ] 4.0 Implement search & filter UI  
  - [ ] 4.1 `SearchBar.tsx`에서 입력창 구현  
  - [ ] 4.2 주소/동 이름으로 행정동 코드 검색 매핑  
  - [ ] 4.3 검색 결과 위치로 지도 이동 (flyTo)  
  - [ ] 4.4 `LayerToggle.tsx`에서 구/동 단위 전환 버튼 UI 구현  
  - [ ] 4.5 선택된 단위에 따라 GeoJSON 레이어 동적 전환

---

- [ ] 5.0 Enable PDF/JPEG export of current view with legend  
  - [ ] 5.1 `export-utils.ts`에서 html2canvas 활용한 이미지 캡쳐 함수 구현  
  - [ ] 5.2 jsPDF로 PDF 저장 기능 구현  
  - [ ] 5.3 범례와 함께 캡쳐되도록 전체 영역 구성  
  - [ ] 5.4 “저장” 버튼 UI 추가 및 클릭 이벤트 연동  
  - [ ] 5.5 이미지와 PDF 저장 테스트

---

- [ ] 6.0 Add responsive layout for mobile  
  - [ ] 6.1 지도, 패널, 검색 UI를 모바일 크기에 맞게 스타일링  
  - [ ] 6.2 모바일 터치 기반 인터랙션 테스트  
  - [ ] 6.3 작은 화면에서 패널 자동 슬라이드 업 방식 구현  
  - [ ] 6.4 반응형 레이아웃 최종 점검

---
