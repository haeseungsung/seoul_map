# Seoul Open Data API Catalog Crawler

서울 열린데이터광장의 전체 API/데이터 서비스 목록을 자동으로 수집하는 스크립트입니다.

## 기능

1. **서비스 목록 수집** - `SearchCatalogService`를 통해 전체 8,000+ 서비스 자동 수집
2. **파라미터 정보 수집** - (선택) `SearchOpenAPIIOValueService`로 각 API의 입출력 인자 수집
3. **CSV/JSONL 저장** - 엑셀에서 바로 볼 수 있는 CSV와 프로그래밍 친화적인 JSONL 동시 생성

## 설치

```bash
# requests 라이브러리 필요
pip install requests
```

## 사용법

### 1. 기본 사용 (서비스 목록만)

```bash
cd scripts
export SEOUL_API_KEY="706e73447144616c363946766d7263"
python seoul_api_catalog_crawler.py --outdir catalog_output
```

**결과:**
- `catalog_output/seoul_catalog.csv` - 전체 서비스 목록 (엑셀로 열기 가능)
- `catalog_output/seoul_catalog.jsonl` - JSON Lines 형식

**소요 시간:** 약 30초 (8,000+ 서비스)

### 2. IO 파라미터 포함 (완전판)

```bash
python seoul_api_catalog_crawler.py \
  --outdir catalog_output \
  --with-io \
  --io-sample-n 0
```

**결과:**
- 위 2개 파일 +
- `catalog_output/seoul_io_params.csv` - 각 API의 입출력 파라미터 상세
- `catalog_output/seoul_io_params.jsonl`

**소요 시간:** 약 30-60분 (전체 서비스 IO 정보 수집)

**참고:** `--io-sample-n 100`으로 설정하면 처음 100개 서비스만 IO 정보 수집 (테스트용)

### 3. 환경 변수 설정 (.env 파일)

```bash
# .env 파일 생성
echo "SEOUL_API_KEY=706e73447144616c363946766d7263" > .env

# 실행 시 자동 로드 (direnv 등 사용)
python seoul_api_catalog_crawler.py --outdir catalog_output
```

## 주요 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--key` | `$SEOUL_API_KEY` | 서울 OpenAPI 인증키 |
| `--outdir` | `out` | 출력 디렉토리 |
| `--format` | `json` | API 응답 형식 (json 권장) |
| `--with-io` | False | IO 파라미터도 수집 |
| `--io-sample-n` | 0 | IO 수집 제한 (0=전체) |
| `--sleep` | 0.25 | API 호출 간 대기 시간 (초) |

## 출력 예시

### seoul_catalog.csv

| INF_ID | INF_NM | CATE_NM | API_SERVICE_NM | MNG_ORGAN_NAME |
|--------|--------|---------|----------------|----------------|
| OA-12700 | 서울시 중랑구 공지사항 정보 | 공공데이터 | JungnangNewsList | 중랑구 |
| OA-12702 | 서울시 중랑구 문화행사 정보 | 공공데이터 | ... | 중랑구 |

### seoul_io_params.csv

| INF_ID | API_SERVICE_NM | PTYPE_NM | COL_ENG_NM | COL_KOR_NM | REQ_VALTYPE | COL_EXP |
|--------|----------------|----------|------------|------------|-------------|---------|
| OA-12700 | JungnangNewsList | 요청인자 | KEY | 인증키 | STRING(필수) | OpenAPI에서 발급받은 인증키 |
| OA-12700 | JungnangNewsList | 요청인자 | TYPE | 요청파일 타입 | STRING(필수) | xml/json/xls |

## 데이터 활용

### Python에서 읽기

```python
import csv
import json

# CSV 읽기
with open('catalog_output/seoul_catalog.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    services = list(reader)

# JSONL 읽기
with open('catalog_output/seoul_catalog.jsonl', 'r', encoding='utf-8') as f:
    services = [json.loads(line) for line in f]

# 특정 키워드로 필터링
population_apis = [s for s in services if '인구' in s['INF_NM']]
```

### Excel에서 보기

1. Excel 열기
2. 데이터 > 텍스트/CSV 가져오기
3. `seoul_catalog.csv` 선택
4. 인코딩: UTF-8 선택
5. 구분 기호: 쉼표

## API 정보

- **SearchCatalogService**: 서울 열린데이터광장의 전체 서비스 목록 조회
  - URL 형식: `http://openapi.seoul.go.kr:8088/{KEY}/json/SearchCatalogService/1/1000/`
  - 1회 최대 1,000건 조회 가능
  - 총 8,000+ 서비스 등록 (2026년 1월 기준)

- **SearchOpenAPIIOValueService**: 각 서비스의 입출력 파라미터 조회
  - URL 형식: `http://openapi.seoul.go.kr:8088/{KEY}/json/SearchOpenAPIIOValueService/1/200/OA-12700/`
  - 서비스별 파라미터 정보 (필수/선택, 데이터 타입, 설명 등)

## 문제 해결

### "requests module not found"
```bash
pip install requests
```

### "API key missing"
```bash
# 환경 변수 설정
export SEOUL_API_KEY="your_key_here"

# 또는 직접 지정
python seoul_api_catalog_crawler.py --key "your_key_here" --outdir out
```

### 너무 느린 경우
```bash
# sleep 시간 줄이기 (과도한 호출 주의)
python seoul_api_catalog_crawler.py --sleep 0.1 --outdir out

# IO 파라미터는 샘플만
python seoul_api_catalog_crawler.py --with-io --io-sample-n 100 --outdir out
```

## 라이선스

이 스크립트는 MIT 라이선스로 제공됩니다. 자유롭게 수정/배포 가능합니다.

## 참고 링크

- [서울 열린데이터광장](https://data.seoul.go.kr/)
- [서울 OpenAPI 가이드](http://data.seoul.go.kr/together/guide/guide.do)
