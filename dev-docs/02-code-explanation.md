# 💻 Code Explanation - 코드 상세 분석

> **Task 1.0 관련 코드 심층 분석**
> **작성일**: 2026-01-07

---

## 📋 목차

1. [MapContainer.tsx 완전 분석](#mapcontainertsx-완전-분석)
2. [page.tsx 분석](#pagetsx-분석)
3. [환경 설정 파일들](#환경-설정-파일들)
4. [Mapbox GL JS 핵심 개념](#mapbox-gl-js-핵심-개념)
5. [성능 최적화 포인트](#성능-최적화-포인트)

---

## MapContainer.tsx 완전 분석

### 전체 코드 구조

```typescript
'use client';                    // Next.js Client Component 지시어

import { useEffect, useRef, useState } from 'react';
import Map, { MapRef, Source, Layer } from 'react-map-gl';
import type { FillLayer, LineLayer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ... 상수 및 타입 정의 ...

export default function MapContainer({ onDistrictClick }: MapContainerProps) {
  // ... 상태 및 로직 ...
  return (
    // ... JSX ...
  );
}
```

---

### 1. 'use client' 지시어

```typescript
'use client';
```

**목적:**
- Next.js 13+ App Router에서 이 컴포넌트가 **클라이언트 컴포넌트**임을 명시
- 서버 사이드 렌더링(SSR) 중에는 실행되지 않고, 브라우저에서만 실행됨

**왜 필요한가?**
- Mapbox GL JS는 브라우저 API(`window`, `document`)에 의존
- React Hooks(`useState`, `useEffect`)를 사용
- 사용자 인터랙션 처리 (클릭, 드래그 등)

**서버 컴포넌트 vs 클라이언트 컴포넌트:**

| 특성 | 서버 컴포넌트 | 클라이언트 컴포넌트 |
|-----|------------|---------------|
| 렌더링 위치 | 서버 | 브라우저 |
| 번들 크기 | JS 번들에 포함 안됨 | JS 번들에 포함됨 |
| Hooks 사용 | ❌ 불가 | ✅ 가능 |
| 브라우저 API | ❌ 불가 | ✅ 가능 |
| 이벤트 핸들러 | ❌ 불가 | ✅ 가능 |

---

### 2. Import 구문 상세

#### React Hooks

```typescript
import { useEffect, useRef, useState } from 'react';
```

- **`useState`**: 컴포넌트 상태 관리
  - `geojsonData`: GeoJSON 데이터 저장
  - `isLoading`: 로딩 상태 관리

- **`useEffect`**: 사이드 이펙트 처리
  - GeoJSON 데이터 비동기 로드
  - 컴포넌트 마운트 시 한 번만 실행

- **`useRef`**: DOM 또는 인스턴스 참조
  - Mapbox 지도 인스턴스 접근
  - 리렌더링 시에도 참조 유지

#### react-map-gl 컴포넌트

```typescript
import Map, { MapRef, Source, Layer } from 'react-map-gl';
```

- **`Map`**: 기본 지도 컴포넌트
- **`MapRef`**: Map ref의 TypeScript 타입
- **`Source`**: 데이터 소스 컴포넌트
- **`Layer`**: 렌더링 레이어 컴포넌트

#### 타입 정의

```typescript
import type { FillLayer, LineLayer } from 'react-map-gl';
```

- **`type` 키워드**: TypeScript 타입만 import (런타임 번들에 포함 안됨)
- **`FillLayer`**: 폴리곤 채우기 레이어 타입
- **`LineLayer`**: 선 레이어 타입

#### CSS 파일

```typescript
import 'mapbox-gl/dist/mapbox-gl.css';
```

**포함된 스타일:**
- 지도 컨트롤 버튼 (줌 +/-)
- 네비게이션 컨트롤
- 어트리뷰션 (Mapbox 로고)
- 마커, 팝업 기본 스타일

**이 import를 빼먹으면?**
- 지도가 깨져서 보임
- 컨트롤 버튼이 스타일 없이 표시됨
- 레이아웃이 무너짐

---

### 3. 환경 변수 및 상수

#### Mapbox 토큰

```typescript
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
```

**`process.env.NEXT_PUBLIC_MAPBOX_TOKEN`:**
- `.env.local` 파일에서 로드
- `NEXT_PUBLIC_` 접두사: 브라우저에 노출됨
- 없으면 빈 문자열로 폴백

**보안 주의사항:**
- Mapbox Public Token은 브라우저 노출이 안전함 (읽기 전용)
- Secret Token은 절대 `NEXT_PUBLIC_`로 시작하면 안됨
- URL 제한 설정 권장 (Mapbox 대시보드에서)

#### 서울시 중심 좌표

```typescript
const SEOUL_CENTER = {
  longitude: 126.9780,  // 경도 (동서)
  latitude: 37.5665,    // 위도 (남북)
  zoom: 11,             // 줌 레벨
};
```

**좌표 시스템:**
- **WGS84 좌표계** 사용 (GPS 표준)
- 경도(longitude): -180 ~ 180 (동경이 +)
- 위도(latitude): -90 ~ 90 (북위가 +)

**줌 레벨:**
- 0: 전 세계
- 5: 대륙
- 10: 도시
- 11: 서울시 전체 (현재 설정)
- 15: 동네
- 20: 건물

**서울시청 좌표:**
- 위도: 37.5665°N
- 경도: 126.9780°E
- 주소: 서울특별시 중구 세종대로 110

---

### 4. 레이어 스타일 정의

#### Fill Layer (채우기)

```typescript
const dataLayer: FillLayer = {
  id: 'seoul-districts-fill',
  type: 'fill',
  paint: {
    'fill-color': '#627BC1',
    'fill-opacity': 0.4,
  },
};
```

**필드 설명:**

| 필드 | 값 | 설명 |
|-----|---|------|
| `id` | `'seoul-districts-fill'` | 레이어 고유 식별자 (클릭 이벤트 처리 시 사용) |
| `type` | `'fill'` | 레이어 타입 (폴리곤 채우기) |
| `paint['fill-color']` | `'#627BC1'` | 채우기 색상 (파란색) |
| `paint['fill-opacity']` | `0.4` | 투명도 (0=투명, 1=불투명) |

**다른 paint 속성 (추후 사용 가능):**
```typescript
paint: {
  'fill-color': '#627BC1',
  'fill-opacity': 0.4,
  'fill-outline-color': '#000000',  // 외곽선 색상
  'fill-antialias': true,           // 안티앨리어싱
  'fill-translate': [0, 0],         // 위치 이동
}
```

#### Line Layer (경계선)

```typescript
const outlineLayer: LineLayer = {
  id: 'seoul-districts-outline',
  type: 'line',
  paint: {
    'line-color': '#1a202c',
    'line-width': 1.5,
  },
};
```

**필드 설명:**

| 필드 | 값 | 설명 |
|-----|---|------|
| `id` | `'seoul-districts-outline'` | 레이어 식별자 |
| `type` | `'line'` | 선 타입 |
| `paint['line-color']` | `'#1a202c'` | 선 색상 (진한 회색) |
| `paint['line-width']` | `1.5` | 선 두께 (픽셀) |

**다른 paint 속성:**
```typescript
paint: {
  'line-color': '#1a202c',
  'line-width': 1.5,
  'line-opacity': 1,              // 투명도
  'line-blur': 0,                 // 흐림 효과
  'line-dasharray': [2, 4],       // 점선 패턴
  'line-gap-width': 0,            // 중심선 간격
}
```

---

### 5. Props 타입 정의

```typescript
interface MapContainerProps {
  onDistrictClick?: (properties: any) => void;
}
```

**인터페이스 분석:**
- `onDistrictClick`: 옵셔널 콜백 함수 (`?` 표시)
- 파라미터: `properties` (행정동 정보 객체)
- 리턴 타입: `void` (값을 반환하지 않음)

**실제 properties 구조 예시:**
```typescript
{
  adm_nm: "강남구",           // 행정구역명
  adm_cd: "11680",            // 행정구역코드
  adm_cd2: "1168000000",      // 행정구역코드 확장
  sgg_nm: "강남구",           // 시군구명
  sido_nm: "서울특별시",      // 시도명
  ...
}
```

**향후 개선 (타입 안전성):**
```typescript
interface DistrictProperties {
  adm_nm: string;
  adm_cd: string;
  adm_cd2: string;
  sgg_nm: string;
  sido_nm: string;
}

interface MapContainerProps {
  onDistrictClick?: (properties: DistrictProperties) => void;
}
```

---

### 6. State 관리

```typescript
const mapRef = useRef<MapRef>(null);
const [geojsonData, setGeojsonData] = useState<any>(null);
const [isLoading, setIsLoading] = useState(true);
```

#### mapRef (useRef)

**용도:**
- Mapbox 지도 인스턴스에 접근
- 클릭 이벤트 처리 시 `queryRenderedFeatures()` 호출

**타입:**
```typescript
MapRef | null
```

**사용 예시:**
```typescript
const map = mapRef.current?.getMap();  // Mapbox GL 인스턴스
map?.flyTo({ center: [lng, lat], zoom: 14 });  // 지도 이동
```

**왜 useState가 아닌 useRef?**
- Ref 변경 시 리렌더링 발생하지 않음
- 지도 인스턴스는 렌더링과 무관
- 성능 최적화

#### geojsonData (useState)

**타입:**
```typescript
any | null
```

**초기값:** `null`

**데이터 구조:**
```typescript
{
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { adm_nm: "강남구", ... },
      geometry: {
        type: "Polygon",
        coordinates: [[[lng, lat], ...]]
      }
    },
    ...
  ]
}
```

**왜 useState?**
- GeoJSON 로드 시 리렌더링 필요
- `<Source>` 컴포넌트에 props로 전달
- 데이터 변경 시 레이어 업데이트

#### isLoading (useState)

**타입:** `boolean`

**초기값:** `true`

**상태 변화:**
```
true (초기) → fetch 중 → false (로드 완료)
```

**사용 목적:**
- 로딩 스피너 표시/숨김
- UX 개선

---

### 7. useEffect - GeoJSON 로드

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

#### 비동기 패턴 분석

**1. async/await 사용:**
```typescript
const loadGeoJSON = async () => { ... }
```
- 비동기 함수 정의
- `await`로 Promise 대기

**2. try-catch-finally 구조:**

```typescript
try {
  // 정상 실행 코드
} catch (error) {
  // 에러 처리
} finally {
  // 항상 실행 (로딩 상태 해제)
}
```

**3. fetch API:**
```typescript
const response = await fetch('/data/seoul-hangjeongdong.geojson');
```
- 상대 경로: `/data/...` → `public/data/...`
- Next.js가 자동으로 `public` 폴더를 루트로 매핑
- `await`: 네트워크 요청 완료 대기

**4. 응답 검증:**
```typescript
if (!response.ok) {
  throw new Error('GeoJSON 로드 실패');
}
```
- `response.ok`: HTTP 상태 200-299 범위 체크
- 실패 시 에러 발생 → catch 블록으로 이동

**5. JSON 파싱:**
```typescript
const data = await response.json();
```
- 응답 본문을 JSON으로 파싱
- 대용량 파일(908KB)이므로 await 필요

**6. 상태 업데이트:**
```typescript
setGeojsonData(data);
```
- 상태 변경 → 리렌더링 트리거
- `<Source>` 컴포넌트에 데이터 전달

**7. 로딩 상태 해제:**
```typescript
finally {
  setIsLoading(false);
}
```
- 성공/실패 관계없이 항상 실행
- 로딩 스피너 숨김

#### 의존성 배열

```typescript
}, []);
```

**빈 배열 `[]`의 의미:**
- 컴포넌트 마운트 시 **단 한 번만** 실행
- 의존성이 없으므로 리렌더링 시 재실행 안됨

**다른 패턴들:**
```typescript
}, []);           // 마운트 시 1회
}, [count]);      // count 변경 시마다 실행
});               // 모든 렌더링마다 실행 (위험!)
```

---

### 8. 클릭 이벤트 핸들러

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

#### 단계별 동작 분석

**Step 1: 지도 인스턴스 가져오기**
```typescript
const map = mapRef.current?.getMap();
if (!map) return;
```
- `mapRef.current`: `<Map>` 컴포넌트 참조
- `.getMap()`: Mapbox GL JS 인스턴스 반환
- `?.`: Optional chaining (null/undefined 안전)
- Early return: map이 없으면 함수 종료

**Step 2: 클릭 지점의 Feature 쿼리**
```typescript
const features = map.queryRenderedFeatures(event.point, {
  layers: ['seoul-districts-fill'],
});
```

**`queryRenderedFeatures()` 메서드:**
- 화면에 렌더링된 Feature 중 특정 지점과 겹치는 것을 찾음
- `event.point`: 클릭한 픽셀 좌표 `{ x: number, y: number }`
- `layers`: 쿼리 대상 레이어 배열

**왜 'seoul-districts-fill'만 지정?**
- Fill 레이어는 영역을 가지므로 클릭 감지에 적합
- Outline(Line) 레이어는 선만 있어서 클릭하기 어려움
- 여러 레이어 지정 가능: `['layer1', 'layer2']`

**반환값:**
```typescript
[
  {
    type: "Feature",
    properties: { adm_nm: "강남구", ... },
    geometry: { ... },
    layer: { id: 'seoul-districts-fill', ... },
    source: 'seoul-districts',
    state: {}
  },
  ...
]
```

**Step 3: Feature 존재 확인**
```typescript
if (features.length > 0) {
  const clickedFeature = features[0];
  ...
}
```
- `features.length > 0`: 클릭한 곳에 Feature가 있는지 확인
- 지도 빈 곳 클릭 시 `features = []`
- `features[0]`: 가장 위에 있는 Feature (겹치는 경우 첫 번째)

**Step 4: 콘솔 로그**
```typescript
console.log('🗺️ 클릭한 행정동:', clickedFeature.properties);
```
- 디버깅 및 확인용
- 이모지로 가독성 향상
- `properties`: GeoJSON의 메타데이터

**Step 5: 콜백 함수 호출**
```typescript
if (onDistrictClick) {
  onDistrictClick(clickedFeature.properties);
}
```
- `onDistrictClick`이 전달된 경우에만 호출
- props로 받은 콜백 실행
- 부모 컴포넌트로 데이터 전달

---

### 9. 조건부 렌더링 - 토큰 검증

```typescript
if (!MAPBOX_TOKEN) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-red-50">
      <div className="text-center p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-2">
          Mapbox 토큰이 설정되지 않았습니다
        </h2>
        <p className="text-gray-700 mb-4">
          .env.local 파일에 NEXT_PUBLIC_MAPBOX_TOKEN을 설정해주세요.
        </p>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Mapbox 토큰 발급받기
        </a>
      </div>
    </div>
  );
}
```

**Early Return 패턴:**
- 토큰이 없으면 에러 UI 표시
- 이후 코드 실행 안됨
- UX 개선 (개발자에게 명확한 가이드)

**Tailwind CSS 클래스:**
- `w-full h-screen`: 전체 화면
- `flex items-center justify-center`: 중앙 정렬
- `bg-red-50`: 연한 빨간색 배경
- `text-2xl font-bold text-red-600`: 큰 굵은 빨간 글씨

**보안 속성:**
```typescript
target="_blank"           // 새 탭에서 열기
rel="noopener noreferrer" // 보안 강화
```
- `noopener`: 새 창이 `window.opener` 접근 불가
- `noreferrer`: Referer 헤더 전송 안함

---

### 10. 로딩 UI

```typescript
{isLoading && (
  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">지도 데이터 로딩 중...</p>
    </div>
  </div>
)}
```

**조건부 렌더링:**
```typescript
{isLoading && <LoadingUI />}
```
- `isLoading`이 `true`일 때만 표시
- 로드 완료 시 자동으로 사라짐

**레이아웃:**
- `absolute inset-0`: 부모 요소 전체 커버
- `z-10`: 지도 위에 오버레이
- `bg-white bg-opacity-75`: 반투명 흰색 배경

**스피너 애니메이션:**
```typescript
className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
```
- `animate-spin`: Tailwind 기본 회전 애니메이션
- `rounded-full`: 완전한 원
- `border-b-2`: 하단 테두리만 표시 (회전 시 스피너 효과)

---

### 11. Map 컴포넌트

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

#### Props 상세 분석

**1. ref**
```typescript
ref={mapRef}
```
- `useRef`로 생성한 ref 연결
- 지도 인스턴스 접근용

**2. mapboxAccessToken**
```typescript
mapboxAccessToken={MAPBOX_TOKEN}
```
- Mapbox API 인증
- 환경변수에서 로드

**3. initialViewState**
```typescript
initialViewState={SEOUL_CENTER}
// = { longitude: 126.9780, latitude: 37.5665, zoom: 11 }
```
- 지도 초기 위치 및 줌
- 컴포넌트 마운트 시 한 번만 적용

**4. style**
```typescript
style={{ width: '100%', height: '100%' }}
```
- 인라인 스타일
- 부모 컨테이너 크기에 맞춤

**5. mapStyle**
```typescript
mapStyle="mapbox://styles/mapbox/light-v11"
```

**다양한 베이스맵 스타일:**
- `light-v11`: 밝은 테마 (현재 사용)
- `dark-v11`: 어두운 테마
- `streets-v12`: 도로 중심
- `satellite-v9`: 위성 이미지
- `outdoors-v12`: 아웃도어
- 커스텀 스타일: `mapbox://styles/username/style-id`

**6. onClick**
```typescript
onClick={handleMapClick}
```
- 지도 클릭 이벤트 핸들러
- `event` 객체 전달

**7. interactiveLayerIds**
```typescript
interactiveLayerIds={['seoul-districts-fill']}
```
- 클릭 가능한 레이어 지정
- 마우스 커서 변경 (`pointer`)
- 성능 최적화 (모든 레이어 체크 안함)

---

### 12. Source & Layer

```typescript
{geojsonData && (
  <Source id="seoul-districts" type="geojson" data={geojsonData}>
    <Layer {...dataLayer} />
    <Layer {...outlineLayer} />
  </Source>
)}
```

#### 조건부 렌더링

```typescript
{geojsonData && <Source>...</Source>}
```
- `geojsonData`가 로드되기 전까지 렌더링 안됨
- `null` 체크로 에러 방지

#### Source 컴포넌트

```typescript
<Source id="seoul-districts" type="geojson" data={geojsonData}>
```

**Props:**
- `id`: 소스 고유 식별자
- `type`: 데이터 타입 (`'geojson'`, `'vector'`, `'raster'` 등)
- `data`: GeoJSON 객체

**하나의 Source, 여러 Layer:**
- 같은 데이터로 여러 시각화 가능
- Fill과 Line을 동시에 표시

#### Layer 컴포넌트

```typescript
<Layer {...dataLayer} />
<Layer {...outlineLayer} />
```

**Spread 연산자 `{...}`:**
```typescript
{...dataLayer}
// 동일:
id={dataLayer.id}
type={dataLayer.type}
paint={dataLayer.paint}
```

**레이어 순서:**
- 먼저 선언한 레이어가 아래에 표시
- Fill → Line 순서: 경계선이 위에 그려짐

---

## page.tsx 분석

### 전체 구조

```typescript
'use client';

import { useState } from 'react';
import MapContainer from '@/components/MapContainer';

export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);

  const handleDistrictClick = (properties: any) => {
    setSelectedDistrict(properties);
  };

  return (
    <main className="relative w-full h-screen">
      {/* 헤더 */}
      {/* 지도 */}
      {/* 정보 패널 */}
    </main>
  );
}
```

### 1. Import Alias

```typescript
import MapContainer from '@/components/MapContainer';
```

**`@/` 경로:**
- `tsconfig.json`의 `paths` 설정
- `@/*`: 프로젝트 루트 (`./`) 참조
- 상대 경로보다 명확: `../../../components/` → `@/components/`

### 2. State 관리

```typescript
const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
```

**용도:**
- 클릭한 행정동 정보 저장
- 정보 패널 표시 여부 제어

**데이터 흐름:**
```
지도 클릭 → MapContainer → handleDistrictClick → setSelectedDistrict → 리렌더링 → 패널 표시
```

### 3. 콜백 함수

```typescript
const handleDistrictClick = (properties: any) => {
  setSelectedDistrict(properties);
};
```

**단순한 상태 업데이트:**
- 받은 데이터를 그대로 상태에 저장
- 추후 확장 가능 (분석, 변환 등)

### 4. 레이아웃 구조

```typescript
<main className="relative w-full h-screen">
```

**Flexbox 대신 Absolute Positioning:**
- `relative`: 자식의 absolute 기준점
- `h-screen`: 100vh (뷰포트 높이)

#### 헤더

```typescript
<div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md">
```

- `absolute top-0 left-0 right-0`: 상단 전체 너비
- `z-10`: 지도 위에 오버레이

#### 지도

```typescript
<div className="pt-16 w-full h-full">
  <MapContainer onDistrictClick={handleDistrictClick} />
</div>
```

- `pt-16`: 상단 패딩 (헤더 높이)
- `h-full`: 부모 높이 100%

#### 정보 패널

```typescript
{selectedDistrict && (
  <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-sm">
    <h3 className="font-bold text-lg mb-2">선택된 지역</h3>
    <pre className="text-xs overflow-auto max-h-60 bg-gray-50 p-2 rounded">
      {JSON.stringify(selectedDistrict, null, 2)}
    </pre>
  </div>
)}
```

**조건부 렌더링:**
- `selectedDistrict`가 있을 때만 표시

**`<pre>` 태그:**
- 공백과 줄바꿈 유지
- JSON 포맷팅에 적합

**`JSON.stringify(obj, null, 2)`:**
- `null`: replacer (필터링 없음)
- `2`: 들여쓰기 2칸

---

## 환경 설정 파일들

### tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    },
    ...
  }
}
```

**Import Alias 설정:**
- `@/components/...` → `./components/...`

### tailwind.config.ts

```typescript
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  ...
}
```

**Content 경로:**
- Tailwind가 스캔할 파일 지정
- 사용된 클래스만 CSS에 포함 (Tree Shaking)

---

## Mapbox GL JS 핵심 개념

### 1. Tile-based Rendering

**래스터 타일 (기존 방식):**
```
서버에서 미리 렌더링된 이미지 타일 다운로드
└─ 장점: 빠름
└─ 단점: 스타일 변경 불가, 큰 용량
```

**벡터 타일 (Mapbox GL):**
```
서버에서 데이터만 다운로드 → 브라우저에서 실시간 렌더링
└─ 장점: 동적 스타일, 작은 용량, 부드러운 줌
└─ 단점: GPU 필요
```

### 2. Style Specification

Mapbox 지도는 JSON으로 스타일 정의:

```json
{
  "version": 8,
  "sources": {
    "seoul-districts": {
      "type": "geojson",
      "data": { ... }
    }
  },
  "layers": [
    {
      "id": "seoul-districts-fill",
      "type": "fill",
      "source": "seoul-districts",
      "paint": {
        "fill-color": "#627BC1"
      }
    }
  ]
}
```

### 3. GeoJSON Feature Properties

**클릭 시 얻는 정보:**
```javascript
{
  type: "Feature",
  properties: {
    // 여기에 커스텀 데이터 저장
    adm_nm: "강남구",
    population: 123456,
    ...
  },
  geometry: {
    type: "Polygon",
    coordinates: [...]
  }
}
```

---

## 성능 최적화 포인트

### 1. useMemo로 레이어 스타일 메모이제이션

**현재 (컴포넌트 밖에 정의):**
```typescript
const dataLayer: FillLayer = { ... };
```
- 매 렌더링마다 새 객체 생성 안됨 ✅

**안좋은 예:**
```typescript
function MapContainer() {
  const dataLayer = { ... };  // ❌ 매번 새 객체
}
```

### 2. useCallback으로 이벤트 핸들러 최적화

**향후 개선:**
```typescript
const handleMapClick = useCallback((event: any) => {
  // ...
}, [onDistrictClick]);
```

### 3. React.memo로 컴포넌트 메모이제이션

```typescript
export default React.memo(MapContainer);
```
- Props가 변경되지 않으면 리렌더링 스킵

### 4. 레이어 쿼리 최적화

**interactiveLayerIds 사용:**
```typescript
interactiveLayerIds={['seoul-districts-fill']}
```
- 모든 레이어 체크 안함
- 성능 향상

---

**작성자**: Claude (AI Assistant)
**마지막 업데이트**: 2026-01-07
