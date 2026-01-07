# 📖 Usage Guide - 사용 가이드

> **서울시 행정동 인터랙티브 지도 사용법**
> **작성일**: 2026-01-07

---

## 🚀 빠른 시작

### 1. 프로젝트 클론 또는 다운로드

```bash
cd /Users/haeseungsung/Desktop/vibe/seoul
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

파일 내용:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 🗺️ 지도 기능 사용법

### 기본 네비게이션

| 동작 | 방법 |
|-----|------|
| **지도 이동** | 마우스 드래그 |
| **확대** | 스크롤 업 또는 더블클릭 |
| **축소** | 스크롤 다운 또는 Shift + 더블클릭 |
| **특정 영역 확대** | Shift + 드래그로 영역 선택 |
| **회전** | Ctrl + 드래그 (또는 우클릭 드래그) |
| **기울기** | Ctrl + 드래그 (상하) |

### 키보드 단축키

| 키 | 동작 |
|----|------|
| `+` | 확대 |
| `-` | 축소 |
| `←` `→` `↑` `↓` | 지도 이동 |
| `Shift + ←/→` | 회전 |

### 모바일

| 동작 | 방법 |
|-----|------|
| **이동** | 한 손가락 드래그 |
| **확대/축소** | 핀치 제스처 |
| **회전** | 두 손가락 회전 |

---

## 📍 행정동 클릭 기능

### 1. 행정동 선택

1. 지도에서 원하는 행정동을 클릭
2. 우측 하단에 정보 패널이 나타남
3. 콘솔(F12)에서 상세 정보 확인

### 2. 표시되는 정보

현재 버전에서는 다음 정보가 표시됩니다:

```json
{
  "adm_nm": "강남구",           // 행정구역명
  "adm_cd": "11680",            // 행정구역코드
  "adm_cd2": "1168000000",      // 법정동코드
  "sgg_nm": "강남구",           // 시군구명
  "sido_nm": "서울특별시"       // 시도명
}
```

**향후 추가될 정보:**
- 인구 수
- 인구 밀도
- 서울시 평균과의 비교
- 그래프 및 차트

---

## 🛠️ 개발자 도구 활용

### 브라우저 콘솔 (F12)

#### 1. GeoJSON 로드 확인

```
✅ GeoJSON 데이터 로드 완료: {type: "FeatureCollection", ...}
```

#### 2. 클릭 이벤트 확인

```
🗺️ 클릭한 행정동: {adm_nm: "강남구", ...}
```

#### 3. 지도 인스턴스 접근

콘솔에서 직접 지도 조작:

```javascript
// 지도 인스턴스 가져오기
const map = window.mapRef?.current?.getMap();

// 특정 위치로 이동
map.flyTo({
  center: [126.9780, 37.5665],
  zoom: 14,
  duration: 2000
});

// 현재 줌 레벨 확인
map.getZoom();

// 현재 중심 좌표 확인
map.getCenter();
```

---

## 🎨 스타일 커스터마이징

### 베이스맵 변경

`components/MapContainer.tsx` 파일 수정:

```typescript
mapStyle="mapbox://styles/mapbox/light-v11"  // 밝은 테마
// 다른 옵션:
// "mapbox://styles/mapbox/dark-v11"         // 어두운 테마
// "mapbox://styles/mapbox/streets-v12"      // 도로 중심
// "mapbox://styles/mapbox/satellite-v9"     // 위성 이미지
```

### 행정동 색상 변경

Fill 레이어 색상 수정:

```typescript
const dataLayer: FillLayer = {
  id: 'seoul-districts-fill',
  type: 'fill',
  paint: {
    'fill-color': '#FF6B6B',  // 빨간색으로 변경
    'fill-opacity': 0.6,       // 투명도 증가
  },
};
```

### 경계선 스타일 변경

```typescript
const outlineLayer: LineLayer = {
  id: 'seoul-districts-outline',
  type: 'line',
  paint: {
    'line-color': '#000000',  // 검은색
    'line-width': 2,          // 두께 증가
    'line-dasharray': [2, 4], // 점선 패턴
  },
};
```

---

## 🔧 고급 설정

### 초기 위치 변경

특정 구를 기본으로 표시하려면:

```typescript
const GANGNAM_CENTER = {
  longitude: 127.0495,
  latitude: 37.4979,
  zoom: 13,
};
```

### 줌 범위 제한

```typescript
<Map
  minZoom={10}   // 최소 줌 레벨
  maxZoom={16}   // 최대 줌 레벨
  ...
/>
```

### 회전/기울기 비활성화

```typescript
<Map
  dragRotate={false}     // 회전 비활성화
  pitchWithRotate={false} // 기울기 비활성화
  ...
/>
```

---

## 📊 데이터 활용

### GeoJSON 데이터 구조

서울시 행정동 GeoJSON은 다음과 같은 구조입니다:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "adm_nm": "강남구",
        "adm_cd": "11680",
        ...
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [127.012, 37.501],
            [127.013, 37.502],
            ...
          ]
        ]
      }
    },
    ...
  ]
}
```

### 데이터 확장 방법

행정동에 커스텀 데이터를 추가하려면:

1. **방법 1: GeoJSON 파일 직접 수정**
```json
{
  "properties": {
    "adm_nm": "강남구",
    "population": 123456,      // 추가
    "density": 1234.5,          // 추가
    "custom_field": "value"     // 추가
  }
}
```

2. **방법 2: 런타임에 매핑**
```typescript
useEffect(() => {
  const loadData = async () => {
    const geojson = await fetch('/data/seoul-hangjeongdong.geojson').then(r => r.json());
    const populationData = await fetch('/api/population').then(r => r.json());

    // 행정동 코드 기준으로 매핑
    geojson.features.forEach(feature => {
      const code = feature.properties.adm_cd;
      const pop = populationData.find(d => d.code === code);
      feature.properties.population = pop?.value || 0;
    });

    setGeojsonData(geojson);
  };
  loadData();
}, []);
```

---

## 🧪 테스트 및 디버깅

### 로컬 테스트

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드 테스트
npm run build
npm run start
```

### 일반적인 문제 해결

#### 문제: 지도가 표시되지 않음

**체크리스트:**
- [ ] Mapbox 토큰이 `.env.local`에 설정되어 있는가?
- [ ] 개발 서버가 실행 중인가?
- [ ] 브라우저 콘솔에 에러가 있는가?
- [ ] `mapbox-gl/dist/mapbox-gl.css` import가 있는가?

#### 문제: GeoJSON이 로드되지 않음

**체크리스트:**
- [ ] `/public/data/seoul-hangjeongdong.geojson` 파일이 존재하는가?
- [ ] 파일 크기가 약 908KB인가?
- [ ] Network 탭에서 404 에러가 있는가?

#### 문제: 클릭 이벤트가 작동하지 않음

**체크리스트:**
- [ ] `interactiveLayerIds`에 올바른 레이어 ID가 있는가?
- [ ] `handleMapClick` 함수가 props로 전달되었는가?
- [ ] 콘솔에 에러가 있는가?

---

## 📱 모바일 최적화

현재는 모바일 터치 이벤트가 기본적으로 지원됩니다:

- ✅ 터치 드래그
- ✅ 핀치 줌
- ✅ 더블탭 줌

**향후 개선 예정:**
- 모바일 전용 UI (하단 시트)
- 터치 제스처 가이드
- 작은 화면 최적화

---

## 🌐 브라우저 호환성

### 지원 브라우저

| 브라우저 | 최소 버전 | WebGL 지원 |
|---------|---------|-----------|
| Chrome | 94+ | ✅ |
| Firefox | 93+ | ✅ |
| Safari | 15+ | ✅ |
| Edge | 94+ | ✅ |
| Opera | 80+ | ✅ |

### 모바일 브라우저

| 브라우저 | 지원 |
|---------|-----|
| Chrome (Android) | ✅ |
| Safari (iOS) | ✅ |
| Samsung Internet | ✅ |

### WebGL 확인

브라우저가 WebGL을 지원하는지 확인:
https://get.webgl.org/

---

## 📦 배포

### Vercel 배포

1. GitHub에 푸시
2. [Vercel](https://vercel.com)에 로그인
3. 프로젝트 import
4. 환경 변수 설정:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` 추가
5. Deploy 클릭

### 환경 변수 설정 (Vercel)

```
Settings → Environment Variables

Name: NEXT_PUBLIC_MAPBOX_TOKEN
Value: your_mapbox_token
Environments: Production, Preview, Development
```

### 빌드 확인

```bash
npm run build
```

빌드 성공 시:
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Finalizing page optimization
```

---

## 🔐 보안 고려사항

### Mapbox 토큰 보호

**Public Token (NEXT_PUBLIC_):**
- ✅ 브라우저 노출 안전
- ✅ 읽기 전용 권한
- ⚠️ URL 제한 설정 권장

**Mapbox 대시보드에서 URL 제한:**
1. [Access Tokens](https://account.mapbox.com/access-tokens/) 페이지
2. 토큰 클릭 → Edit
3. URL restrictions 추가:
   ```
   https://yourapp.com/*
   http://localhost:3000/*
   ```

### Secret Token (사용 시)

- ❌ 절대 `NEXT_PUBLIC_`로 시작하지 말 것
- ❌ 프론트엔드 코드에 포함하지 말 것
- ✅ API Routes(`/api/*`)에서만 사용
- ✅ 서버 사이드에서만 접근

---

## 📚 추가 학습 자료

### 공식 문서
- [Mapbox GL JS Guide](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [react-map-gl Examples](https://visgl.github.io/react-map-gl/examples)
- [Next.js Documentation](https://nextjs.org/docs)

### 튜토리얼
- [Mapbox GL JS Tutorials](https://docs.mapbox.com/help/tutorials/)
- [GeoJSON Specification](https://geojson.org/)
- [Tailwind CSS Learn](https://tailwindcss.com/docs)

### 커뮤니티
- [Mapbox Community](https://community.mapbox.com/)
- [Stack Overflow - Mapbox](https://stackoverflow.com/questions/tagged/mapbox-gl-js)
- [GitHub Discussions](https://github.com/visgl/react-map-gl/discussions)

---

## 🆘 지원 및 피드백

### 문제 발생 시

1. **브라우저 콘솔 확인** (F12)
2. **Network 탭 확인** (리소스 로드 실패 여부)
3. **dev-docs 문서 참고**
   - `01-project-setup.md` - 설치 및 설정
   - `02-code-explanation.md` - 코드 상세 분석
   - `03-usage-guide.md` - 현재 문서

### 버그 리포트

GitHub Issues에 다음 정보와 함께 제출:
- 문제 설명
- 재현 방법
- 브라우저 및 버전
- 콘솔 에러 메시지
- 스크린샷

---

## 🎯 다음 단계

**현재 완료된 기능:**
- ✅ 기본 지도 렌더링
- ✅ 서울시 행정동 경계 표시
- ✅ 클릭 이벤트 처리
- ✅ 기본 인터랙션

**다음 구현 예정:**
- [ ] 인구 데이터 시각화 (클로로플레스)
- [ ] 상세 정보 패널
- [ ] 검색 기능
- [ ] 필터 및 레이어 토글
- [ ] PDF/JPEG 내보내기
- [ ] 모바일 최적화

---

**작성자**: Claude (AI Assistant)
**마지막 업데이트**: 2026-01-07
**버전**: 1.0.0
