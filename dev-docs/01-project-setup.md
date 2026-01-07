# 📚 Development Documentation - 프로젝트 초기 설정

> **작성일**: 2026-01-07
> **Task**: 1.0 Set up base map with Seoul GeoJSON
> **상태**: ✅ 완료

---

## 📋 목차

1. [개요](#개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [설치 및 실행](#설치-및-실행)
5. [핵심 구현 내용](#핵심-구현-내용)
6. [코드 상세 설명](#코드-상세-설명)
7. [테스트 방법](#테스트-방법)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

서울시 행정동 단위의 데이터를 Mapbox GL JS를 사용하여 지도에 시각화하는 웹 애플리케이션의 기초 지도 기능을 구현했습니다.

### 구현된 기능

- ✅ Mapbox GL JS 기반 인터랙티브 지도
- ✅ 서울시 행정동 GeoJSON 데이터 로드 및 표시
- ✅ 행정동 경계선 표시 (Fill + Stroke)
- ✅ 확대/축소, 드래그 등 기본 지도 인터랙션
- ✅ 행정동 클릭 이벤트 처리 및 콘솔 출력
- ✅ 클릭된 지역 정보 UI 패널 표시

---

## 기술 스택

### Core Framework
- **Next.js 15.5.9** - React 프레임워크 (App Router 사용)
- **React 19.0.0** - UI 라이브러리
- **TypeScript 5.7.2** - 타입 안전성

### 지도 시각화
- **Mapbox GL JS 3.17.0** - WebGL 기반 지도 렌더링 엔진
- **react-map-gl 8.1.0** - Mapbox GL의 React 래퍼

### 스타일링
- **Tailwind CSS 3.4.17** - 유틸리티 CSS 프레임워크
- **PostCSS 8.4.49** - CSS 처리

---

## 프로젝트 구조

```
seoul/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # 루트 레이아웃 (폰트, 메타데이터)
│   ├── page.tsx                 # 메인 페이지 (지도 통합)
│   └── globals.css              # 글로벌 스타일
├── components/                   # React 컴포넌트
│   └── MapContainer.tsx         # 지도 컨테이너 컴포넌트 ⭐
├── public/                       # 정적 파일
│   └── data/
│       └── seoul-hangjeongdong.geojson  # 서울시 행정동 GeoJSON (908KB)
├── dev-docs/                    # 개발 문서
│   └── 01-project-setup.md      # 현재 문서
├── tasks/                       # 작업 관리
│   └── tasks-seoul-map-feature.md
├── .env.local                   # 환경 변수 (Mapbox 토큰)
├── package.json                 # 의존성 관리
├── tsconfig.json                # TypeScript 설정
├── tailwind.config.ts           # Tailwind 설정
└── next.config.ts               # Next.js 설정
```

---

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token
```

**Mapbox 토큰 발급 방법:**
1. [Mapbox 계정 생성](https://account.mapbox.com/auth/signup/) (무료)
2. [Access Tokens 페이지](https://account.mapbox.com/access-tokens/)에서 토큰 복사

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 4. 빌드 및 프로덕션 실행

```bash
npm run build
npm run start
```

---

## 핵심 구현 내용

### 1. GeoJSON 데이터 로드 (`MapContainer.tsx`)

서울시 행정동 경계 데이터를 비동기로 로드하고 상태로 관리합니다.

**데이터 출처:**
- GitHub Repository: [raqoon886/Local_HangJeongDong](https://github.com/raqoon886/Local_HangJeongDong)
- 파일: `hangjeongdong_서울특별시.geojson`
- 크기: 908KB
- Features: 서울시 전체 행정동 경계 (약 424개 동)

### 2. Mapbox 지도 렌더링

`react-map-gl`의 `<Map>` 컴포넌트를 사용하여 기본 지도를 렌더링합니다.

**지도 초기 설정:**
- 중심점: 서울시청 (위도 37.5665, 경도 126.9780)
- 줌 레벨: 11
- 베이스맵 스타일: `mapbox://styles/mapbox/light-v11`

### 3. GeoJSON 레이어 추가

두 개의 레이어로 행정동을 표시합니다:

1. **Fill Layer** (`seoul-districts-fill`)
   - 행정동 영역을 채우는 레이어
   - 색상: `#627BC1` (파란색)
   - 투명도: 0.4

2. **Line Layer** (`seoul-districts-outline`)
   - 행정동 경계선 레이어
   - 색상: `#1a202c` (진한 회색)
   - 두께: 1.5px

### 4. 클릭 이벤트 처리

지도 클릭 시 해당 위치의 행정동 정보를 추출합니다.

**동작 과정:**
1. 사용자가 지도를 클릭
2. `queryRenderedFeatures()` API로 클릭 위치의 Feature 확인
3. Feature의 `properties` 객체 추출 (동 이름, 코드 등)
4. 콘솔에 로그 출력
5. 부모 컴포넌트(`page.tsx`)로 데이터 전달
6. UI 패널에 정보 표시

---

## 코드 상세 설명

### `components/MapContainer.tsx`

#### 1. 주요 Props

```typescript
interface MapContainerProps {
  onDistrictClick?: (properties: any) => void;
}
```

- `onDistrictClick`: 행정동 클릭 시 호출되는 콜백 함수
- 클릭된 행정동의 `properties` 객체를 인자로 전달

#### 2. State 관리

```typescript
const [geojsonData, setGeojsonData] = useState<any>(null);
const [isLoading, setIsLoading] = useState(true);
```

- `geojsonData`: GeoJSON 데이터를 저장
- `isLoading`: 로딩 상태 관리 (로딩 스피너 표시용)

#### 3. GeoJSON 로드 useEffect

```typescript
useEffect(() => {
  const loadGeoJSON = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/data/seoul-hangjeongdong.geojson');
      if (!response.ok) {
        throw new Error('GeoJSON 로드 실패');
      }
      const data = await response.json();
      setGeojsonData(data);
      console.log('✅ GeoJSON 데이터 로드 완료:', data);
    } catch (error) {
      console.error('❌ GeoJSON 로드 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  loadGeoJSON();
}, []);
```

**동작:**
- 컴포넌트 마운트 시 한 번만 실행 (의존성 배열 `[]`)
- `/public/data/seoul-hangjeongdong.geojson` 파일을 fetch
- 성공 시 상태에 저장, 실패 시 에러 로그
- 로딩 완료 후 `isLoading`을 `false`로 설정

#### 4. 클릭 이벤트 핸들러

```typescript
const handleMapClick = (event: any) => {
  const map = mapRef.current?.getMap();
  if (!map) return;

  const features = map.queryRenderedFeatures(event.point, {
    layers: ['seoul-districts-fill'],
  });

  if (features.length > 0) {
    const clickedFeature = features[0];
    console.log('🗺️ 클릭한 행정동:', clickedFeature.properties);

    if (onDistrictClick) {
      onDistrictClick(clickedFeature.properties);
    }
  }
};
```

**동작:**
1. `mapRef`로 Mapbox 인스턴스 접근
2. `queryRenderedFeatures()`: 클릭 지점의 Feature 쿼리
   - `event.point`: 클릭한 픽셀 좌표
   - `layers`: 쿼리 대상 레이어 지정 (`seoul-districts-fill`)
3. Feature가 존재하면 첫 번째 Feature의 properties 추출
4. 콘솔 로그 출력
5. 부모 컴포넌트의 콜백 함수 호출

#### 5. 레이어 스타일 정의

```typescript
const dataLayer: FillLayer = {
  id: 'seoul-districts-fill',
  type: 'fill',
  paint: {
    'fill-color': '#627BC1',
    'fill-opacity': 0.4,
  },
};

const outlineLayer: LineLayer = {
  id: 'seoul-districts-outline',
  type: 'line',
  paint: {
    'line-color': '#1a202c',
    'line-width': 1.5,
  },
};
```

**Fill Layer:**
- `id`: 레이어 고유 식별자
- `type: 'fill'`: 폴리곤 채우기 타입
- `fill-color`: 채우기 색상 (16진수)
- `fill-opacity`: 투명도 (0~1)

**Line Layer:**
- `type: 'line'`: 선 타입
- `line-color`: 선 색상
- `line-width`: 선 두께 (픽셀)

#### 6. Map 컴포넌트

```typescript
<Map
  ref={mapRef}
  mapboxAccessToken={MAPBOX_TOKEN}
  initialViewState={SEOUL_CENTER}
  style={{ width: '100%', height: '100%' }}
  mapStyle="mapbox://styles/mapbox/light-v11"
  onClick={handleMapClick}
  interactiveLayerIds={['seoul-districts-fill']}
>
  {geojsonData && (
    <Source id="seoul-districts" type="geojson" data={geojsonData}>
      <Layer {...dataLayer} />
      <Layer {...outlineLayer} />
    </Source>
  )}
</Map>
```

**주요 Props:**
- `ref`: 지도 인스턴스 참조 (이벤트 처리용)
- `mapboxAccessToken`: Mapbox API 토큰
- `initialViewState`: 초기 뷰포트 상태 (중심, 줌)
- `mapStyle`: 베이스맵 스타일 (light, dark, streets 등)
- `onClick`: 클릭 이벤트 핸들러
- `interactiveLayerIds`: 클릭 가능한 레이어 지정

**Source & Layer:**
- `<Source>`: GeoJSON 데이터 소스
  - `id`: 소스 식별자
  - `type: 'geojson'`: 데이터 타입
  - `data`: GeoJSON 객체
- `<Layer>`: 렌더링 레이어
  - Fill과 Line 두 개의 레이어를 같은 Source에 연결

---

### `app/page.tsx`

#### 1. State 관리

```typescript
const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
```

- 클릭된 행정동 정보를 저장
- 패널 표시 여부 제어

#### 2. 콜백 함수

```typescript
const handleDistrictClick = (properties: any) => {
  setSelectedDistrict(properties);
};
```

- `MapContainer`에서 전달받은 properties를 상태에 저장

#### 3. UI 구성

```typescript
<main className="relative w-full h-screen">
  {/* 헤더 */}
  <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md">
    ...
  </div>

  {/* 지도 */}
  <div className="pt-16 w-full h-full">
    <MapContainer onDistrictClick={handleDistrictClick} />
  </div>

  {/* 정보 패널 */}
  {selectedDistrict && (
    <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10">
      <pre>{JSON.stringify(selectedDistrict, null, 2)}</pre>
    </div>
  )}
</main>
```

**레이아웃 구조:**
- `main`: 전체 화면 컨테이너 (`h-screen`)
- 헤더: 상단 고정 (`absolute top-0`, `z-10`)
- 지도: 헤더 아래부터 시작 (`pt-16` - 헤더 높이만큼 패딩)
- 패널: 우측 하단 오버레이 (`absolute bottom-4 right-4`, `z-10`)

**조건부 렌더링:**
- `selectedDistrict`가 존재할 때만 패널 표시
- `JSON.stringify(..., null, 2)`: 들여쓰기 2칸으로 JSON 포맷팅

---

## 테스트 방법

### 1. 기본 지도 렌더링 확인

✅ **기대 동작:**
- 브라우저에서 http://localhost:3000 접속
- 서울시 중심의 지도가 표시됨
- 파란색으로 행정동 경계가 표시됨

❌ **문제 발생 시:**
- Mapbox 토큰이 설정되지 않았다는 메시지 → `.env.local` 확인
- 빈 화면 → 브라우저 콘솔에서 에러 확인

### 2. GeoJSON 데이터 로드 확인

✅ **확인 방법:**
1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭 확인
3. "✅ GeoJSON 데이터 로드 완료" 메시지 확인
4. 데이터 객체 확장하여 features 배열 확인

❌ **에러 메시지:**
- "❌ GeoJSON 로드 에러" → `/public/data/seoul-hangjeongdong.geojson` 파일 존재 확인
- 404 에러 → 파일 경로 확인

### 3. 지도 인터랙션 테스트

✅ **테스트 항목:**
- [ ] 마우스 드래그로 지도 이동
- [ ] 스크롤 휠로 확대/축소
- [ ] 더블클릭으로 확대
- [ ] Shift + 드래그로 특정 영역 확대
- [ ] 모바일에서 핀치 줌

### 4. 클릭 이벤트 테스트

✅ **테스트 절차:**
1. 지도에서 아무 행정동이나 클릭
2. 콘솔에 "🗺️ 클릭한 행정동: {...}" 로그 출력 확인
3. 우측 하단에 정보 패널 표시 확인
4. 패널에 행정동 이름, 코드 등 정보 표시 확인

**예시 출력:**
```javascript
🗺️ 클릭한 행정동: {
  "adm_nm": "강남구",
  "adm_cd": "11680",
  "adm_cd2": "1168000000",
  ...
}
```

### 5. 성능 테스트

✅ **확인 항목:**
- 초기 로딩 시간: 2초 이내
- GeoJSON 파싱 시간: 1초 이내
- 클릭 반응 속도: 즉각 반응
- 줌/팬 부드러움: 60fps 유지

---

## 트러블슈팅

### 문제 1: Mapbox 토큰 오류

**증상:**
```
Mapbox 토큰이 설정되지 않았습니다
```

**해결:**
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 환경변수 이름이 정확한지 확인: `NEXT_PUBLIC_MAPBOX_TOKEN`
3. 토큰 값에 따옴표 없이 직접 붙여넣기
4. 개발 서버 재시작 (환경변수 변경 시 필수)

```bash
# 서버 종료 후 재시작
npm run dev
```

### 문제 2: GeoJSON 로드 실패

**증상:**
```
❌ GeoJSON 로드 에러: Failed to fetch
```

**해결:**
1. 파일 경로 확인:
   ```bash
   ls -lh public/data/seoul-hangjeongdong.geojson
   ```
2. 파일 크기 확인 (약 908KB)
3. 파일 재다운로드:
   ```bash
   curl -L "https://raw.githubusercontent.com/raqoon886/Local_HangJeongDong/master/hangjeongdong_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C.geojson" -o public/data/seoul-hangjeongdong.geojson
   ```

### 문제 3: 지도가 표시되지 않음

**증상:**
- 빈 화면 또는 회색 화면

**해결:**
1. 브라우저 콘솔 확인 (F12)
2. Network 탭에서 Mapbox API 요청 확인
3. CSS 로딩 확인:
   ```typescript
   import 'mapbox-gl/dist/mapbox-gl.css';
   ```
4. 컨테이너 높이 확인 (100vh 또는 100% 필요)

### 문제 4: 클릭 이벤트 미작동

**증상:**
- 행정동 클릭 시 아무 반응 없음

**해결:**
1. `interactiveLayerIds` prop 확인:
   ```typescript
   interactiveLayerIds={['seoul-districts-fill']}
   ```
2. 레이어 ID가 정확한지 확인
3. `handleMapClick` 함수 내부에 `console.log` 추가하여 디버깅

### 문제 5: TypeScript 에러

**증상:**
```
Type 'any' is not assignable to type ...
```

**해결:**
1. `tsconfig.json`의 `strict` 모드 확인
2. 타입 정의 추가:
   ```typescript
   interface DistrictProperties {
     adm_nm: string;
     adm_cd: string;
     // ...
   }
   ```
3. 임시로 `any` 타입 사용 (추후 개선)

---

## 다음 단계

Task 1.0 완료 후 진행할 작업:

- [ ] **Task 2.0**: 인구 데이터 기반 클로로플레스 색상 적용
  - 서울시 API 연동
  - 색상 계산 유틸 함수 작성
  - 범례(Legend) 컴포넌트 추가

- [ ] **Task 3.0**: 상세 정보 패널 구현
  - `DetailPanel.tsx` 컴포넌트 작성
  - 평균 비교 계산 로직
  - UI/UX 개선

- [ ] **Task 4.0**: 검색 및 필터 기능
  - `SearchBar.tsx` 구현
  - `LayerToggle.tsx` 구현
  - 구/동 단위 전환

---

## 참고 자료

### 공식 문서
- [Mapbox GL JS API](https://docs.mapbox.com/mapbox-gl-js/api/)
- [react-map-gl Documentation](https://visgl.github.io/react-map-gl/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)

### GeoJSON 데이터
- [서울시 행정동 GeoJSON](https://github.com/raqoon886/Local_HangJeongDong)
- [서울 열린데이터광장](https://data.seoul.go.kr/)

### 관련 예제
- [Mapbox Examples](https://docs.mapbox.com/mapbox-gl-js/example/)
- [react-map-gl Examples](https://visgl.github.io/react-map-gl/examples)

---

**작성자**: Claude (AI Assistant)
**마지막 업데이트**: 2026-01-07
