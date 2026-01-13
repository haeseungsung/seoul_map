/**
 * 지표 그룹화 및 통합 유틸리티
 */

import { IndicatorMetadata } from './indicator-loader';
import { KNOWN_WORKING_APIS } from '@/app/api/seoul-data/known-apis';

export interface SeoulApiService {
  id: string;
  name: string;
  category: string;
  district: string;
  mapCategory: string;
  serviceType: string;
}

export interface IndicatorTopic {
  topic_id: string;
  topic_name: string;
  category: string;
  spatial_grain: 'gu' | 'dong' | 'city';
  sub_indicators: IndicatorMetadata[];
  description: string;
}

/**
 * indicator-catalog.csv에서 주제별로 그룹화
 * 예: "유통전문판매업_전체", "_영업중", "_폐업" → "유통전문판매업" 주제로 묶기
 */
export function groupIndicatorsByTopic(indicators: IndicatorMetadata[]): IndicatorTopic[] {
  const topicMap = new Map<string, IndicatorMetadata[]>();

  indicators.forEach(indicator => {
    // 이름에서 주제와 세부지표 분리 (예: "유통전문판매업_영업중" → ["유통전문판매업", "영업중"])
    const match = indicator.indicator_name.match(/^([^_]+)_(.+)$/);

    if (match) {
      const topicName = match[1];
      const key = `${indicator.family}:${topicName}`;

      if (!topicMap.has(key)) {
        topicMap.set(key, []);
      }
      topicMap.get(key)!.push(indicator);
    } else {
      // 세부지표가 없는 경우 (예: "총인구") - 단일 지표로 취급
      const key = `${indicator.family}:${indicator.indicator_name}`;
      topicMap.set(key, [indicator]);
    }
  });

  // Map을 IndicatorTopic 배열로 변환
  const topics: IndicatorTopic[] = [];
  topicMap.forEach((subIndicators, key) => {
    const [family, topicName] = key.split(':');
    const firstIndicator = subIndicators[0];

    topics.push({
      topic_id: `${family.toLowerCase()}_${topicName.replace(/\s+/g, '_')}`,
      topic_name: topicName,
      category: family,
      spatial_grain: firstIndicator.spatial_grain,
      sub_indicators: subIndicators,
      description: `${topicName} 관련 ${subIndicators.length}개 지표`,
    });
  });

  return topics;
}

/**
 * taskType 추출 (v2: 더 강력한 병합)
 */
function extractTaskType(name: string): string {
  if (name.includes('인허가')) return '인허가';
  if (name.includes('예약')) return '예약';
  if (name.includes('검사')) return '검사';
  if (name.includes('처분')) return '처분';

  // 목록/현황/정보/조회/상세 → "정보"로 통합
  if (name.includes('목록') || name.includes('현황') || name.includes('정보') ||
      name.includes('조회') || name.includes('상세') || name.includes('통계') ||
      name.includes('분석')) {
    return '정보';
  }

  return '기타';
}

/**
 * entityType 추출 및 정규화 (v2: 강화된 동의어 매핑)
 */
function extractEntityType(name: string): string {
  const entitySynonyms: Record<string, string[]> = {
    '음식점': ['음식점', '일반음식점', '휴게음식점', '단란주점', '유흥주점', '식당', '레스토랑', '카페', '주점'],
    '병원': ['병원', '의료기관', '의원', '치과', '한의원', '보건소', '병원급', '요양병원', '정신병원', '종합병원'],
    '약국': ['약국', '한약국'],
    '편의점': ['편의점'],
    '슈퍼마켓': ['슈퍼마켓', '슈퍼', '마트'],
    '유통': ['유통전문판매업', '유통', '판매업'],
    '복지시설': ['사회복지시설', '복지시설', '어린이집', '보육시설', '노인복지시설', '장애인복지시설', '아동복지시설', '정신요양시설'],
    '주차장': ['주차장', '공영주차장', '민영주차장'],
    '공원': ['공원', '어린이공원', '근린공원'],
    '학교': ['학교', '초등학교', '중학교', '고등학교', '유치원', '어린이집'],
    '도서관': ['도서관', '작은도서관'],
    '체육시설': ['체육시설', '체육관', '운동장', '수영장', '테니스장'],
    '화장실': ['공중화장실', '화장실'],
    '공지사항': ['공지사항', '새소식', '알림'],
    '채용': ['채용', '일자리', '구인'],
    '문화행사': ['문화행사', '행사', '축제', '이벤트'],
    '민원': ['민원', '불편신고', '신고'],
    '예약': ['공공서비스예약', '시설대관', '시설예약', '대관'],
    '검사': ['수거검사', '식품검사', '위생검사', '검사'],
    '처분': ['행정처분', '처분', '과태료'],
    '업소': ['공중위생업소', '위생업소', '업소'],
    '도로': ['도로', '가로', '골목'],
    '시설': ['시설물', '공공시설'],
    '대기오염': ['대기오염', '대기환경', '미세먼지', '초미세먼지', '오존', '이산화질소'],
  };

  // 1순위: 동의어 매칭 (가장 긴 매칭)
  let bestMatch: string | null = null;
  let maxLength = 0;

  for (const [normalized, synonyms] of Object.entries(entitySynonyms)) {
    for (const synonym of synonyms) {
      if (name.includes(synonym) && synonym.length > maxLength) {
        bestMatch = normalized;
        maxLength = synonym.length;
      }
    }
  }

  if (bestMatch) return bestMatch;

  // 2순위: "서울시 XX구 YYY 정보" 패턴에서 YYY 추출
  const match = name.match(/서울(시)?\s+\S+구\s+([^\s]+)\s+(인허가|현황|목록|정보|예약|처분|검사|공공서비스예약)/);
  if (match) {
    const extracted = match[2];
    // 추출된 엔티티를 동의어 그룹으로 정규화
    for (const [normalized, synonyms] of Object.entries(entitySynonyms)) {
      if (synonyms.includes(extracted)) {
        return normalized;
      }
    }
    return extracted;
  }

  // 3순위: 이름을 단어로 분리해서 명사 추출
  const cleanName = name.replace(/서울(시)?/g, '').replace(/\S+구/g, '');
  const words = cleanName.split(/\s+/).filter(w => w.length > 1);

  if (words.length > 0) {
    for (const word of words) {
      if (!['정보', '목록', '현황', '인허가', '조회', '상세', '통계', '분석', '데이터'].includes(word)) {
        // 동의어 정규화 시도
        for (const [normalized, synonyms] of Object.entries(entitySynonyms)) {
          if (synonyms.includes(word)) {
            return normalized;
          }
        }
        return word;
      }
    }
  }

  return '일반';
}

/**
 * mapCategory 정규화
 */
function normalizeMapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    '문화/관광': '문화관광',
    '문화': '문화관광',
    '관광': '문화관광',
    '산업/경제': '산업경제',
    '산업': '산업경제',
    '경제': '산업경제',
  };
  return categoryMap[category] || category;
}

/**
 * API 카탈로그에서 구별 중복 제거 및 통합 (v3: 계층형 구조)
 * 레벨1: mapCategory/taskType (첫 화면에 40개 표시)
 * 레벨2: entityType (클릭 후 세부 엔티티 선택)
 */
export function groupApisByTopic(apiCatalog: SeoulApiService[]): IndicatorTopic[] {
  // 레벨2 맵: mapCategory/taskType/entityType → APIs
  const level2Map = new Map<string, SeoulApiService[]>();

  // Debug: OA-15526이 카탈로그에 있는지 확인
  const hasOA15526 = apiCatalog.some(api => api.id === 'OA-15526');
  console.log(`🔍 [0단계] apiCatalog 확인: ${apiCatalog.length}개 API, OA-15526 포함: ${hasOA15526}`);
  if (hasOA15526) {
    const oa15526 = apiCatalog.find(api => api.id === 'OA-15526');
    console.log(`   - OA-15526 정보:`, oa15526);
  }

  apiCatalog.forEach(api => {
    const rawMapCategory = api.mapCategory || api.category;
    const mapCategory = normalizeMapCategory(rawMapCategory);
    const taskType = extractTaskType(api.name);
    const entityType = extractEntityType(api.name);

    // LayerKey = mapCategory/taskType/entityType
    const key = `${mapCategory}/${taskType}/${entityType}`;

    // Debug: OA-15526 추적
    if (api.id === 'OA-15526') {
      console.log(`🔍 [1단계] OA-15526 분류:`, {
        name: api.name,
        mapCategory,
        taskType,
        entityType,
        key
      });
    }

    if (!level2Map.has(key)) {
      level2Map.set(key, []);
    }
    level2Map.get(key)!.push(api);
  });

  // 레벨1로 그룹핑: mapCategory/taskType
  const level1Map = new Map<string, Map<string, SeoulApiService[]>>();

  level2Map.forEach((apis, key) => {
    const [mapCategory, taskType, entityType] = key.split('/');
    const level1Key = `${mapCategory}/${taskType}`;

    if (!level1Map.has(level1Key)) {
      level1Map.set(level1Key, new Map());
    }

    level1Map.get(level1Key)!.set(entityType, apis);
  });

  // 레벨1을 IndicatorTopic 배열로 변환
  const topics: IndicatorTopic[] = [];

  level1Map.forEach((entityMap, level1Key) => {
    const [mapCategory, taskType] = level1Key.split('/');

    // 모든 entityType을 sub_indicators로 변환
    const subIndicators: IndicatorMetadata[] = [];
    const allApiNames: string[] = []; // 검색을 위한 API 이름 수집

    entityMap.forEach((apis, entityType) => {
      // API 이름 수집 (검색용)
      apis.forEach(api => allApiNames.push(api.name));

      // Debug: OA-15526 추적
      const hasTarget = apis.some(api => api.id === 'OA-15526');
      if (hasTarget) {
        console.log(`🔍 [2단계] OA-15526 entityMap 처리:`, {
          entityType,
          apisLength: apis.length,
          apiIds: apis.map(a => a.id),
        });
      }

      // 🔥 중요: known-apis에 등록된 API들을 먼저 분리 (개수와 무관하게)
      // city/dong/gu level API가 같은 entityType에 섞여 있을 수 있음
      const cityApis: typeof apis = [];
      const dongApis: typeof apis = [];
      const guApis: typeof apis = [];
      const unknownApis: typeof apis = [];

      apis.forEach(api => {
        const knownApi = KNOWN_WORKING_APIS.find(ka => ka.id === api.id);
        if (knownApi) {
          if (knownApi.spatialType === 'none') {
            cityApis.push(api);
          } else if (knownApi.spatialType === 'dong') {
            dongApis.push(api);
          } else if (knownApi.spatialType === 'gu') {
            guApis.push(api);
          } else {
            unknownApis.push(api);
          }
        } else {
          unknownApis.push(api);
        }
      });

      // City-level API 처리
      cityApis.forEach(api => {
        console.log(`🏙️  ${api.name} (${api.id}) - 서울시 전체 데이터로 분류`);

        // API 이름에서 더 읽기 쉬운 description 생성
        let cleanDescription = api.name.replace('서울시 ', '').replace('서울 ', '');

        // 특정 패턴 정리
        if (cleanDescription.includes('측정정보')) {
          cleanDescription = cleanDescription.replace('측정정보', '측정 정보');
        }

        subIndicators.push({
          family: mapCategory,
          indicator_id: `${mapCategory}_${taskType}_${entityType}_${api.id}`,
          indicator_name: entityType,
          metric_type: 'count' as const,
          spatial_grain: 'city',
          source_pattern: `CITY:${taskType} - ${entityType}`,
          value_field: '',
          description: cleanDescription,
          aggregation_method: JSON.stringify([{ city: 'seoul', id: api.id }]),
        } as IndicatorMetadata);
      });

      // Dong-level API 처리
      dongApis.forEach(api => {
        subIndicators.push({
          family: mapCategory,
          indicator_id: `${mapCategory}_${taskType}_${entityType}_${api.id}`,
          indicator_name: entityType,
          metric_type: 'count' as const,
          spatial_grain: 'dong',
          source_pattern: `MULTI_DONG:${taskType} - ${entityType}`,
          value_field: '',
          description: `${api.name} (행정동 단위)`,
          aggregation_method: JSON.stringify([{ dong: 'all', id: api.id }]),
        } as IndicatorMetadata);
      });

      // Gu-level API 처리 (known API 중)
      guApis.forEach(api => {
        subIndicators.push({
          family: mapCategory,
          indicator_id: `${mapCategory}_${taskType}_${entityType}_${api.id}`,
          indicator_name: entityType,
          metric_type: 'count' as const,
          spatial_grain: 'gu',
          source_pattern: `MULTI_GU:${taskType} - ${entityType}`,
          value_field: '',
          description: `${api.name} (25개 구 통합)`,
          aggregation_method: JSON.stringify([{ gu: 'all', id: api.id }]),
        } as IndicatorMetadata);
      });

      // Unknown APIs 처리 (개수로 판단)
      if (unknownApis.length >= 20) {
        // 20개 이상이면 구별 데이터로 추정
        const suffix = `${unknownApis.length}개 구 통합`;
        subIndicators.push({
          family: mapCategory,
          indicator_id: `${mapCategory}_${taskType}_${entityType}`,
          indicator_name: entityType,
          metric_type: 'count' as const,
          spatial_grain: 'gu',
          source_pattern: `MULTI_GU:${taskType} - ${entityType}`,
          value_field: '',
          description: `${entityType} (${suffix})`,
          aggregation_method: JSON.stringify(
            unknownApis.map(a => ({ gu: a.name.match(/(\S+구)/)?.[1], id: a.id }))
          ),
        } as IndicatorMetadata);
      } else if (unknownApis.length > 0) {
        // 알 수 없는 API들은 제외
        console.log(`⏭️  ${unknownApis[0].name} (${unknownApis[0].id}) - spatial 타입을 알 수 없어 제외`);
      }

    });

    // sub_indicators가 0개인 경우 제외
    if (subIndicators.length === 0) {
      console.log(`⏭️  주제 제외 (sub_indicators 없음): ${mapCategory} - ${taskType}`);
      return;
    }

    // 🔥 중요: spatial_grain별로 주제를 분리
    // 같은 mapCategory/taskType이라도 city/gu/dong 레벨은 별도 주제로 생성
    const cityIndicators = subIndicators.filter(ind => ind.spatial_grain === 'city');
    const guIndicators = subIndicators.filter(ind => ind.spatial_grain === 'gu');
    const dongIndicators = subIndicators.filter(ind => ind.spatial_grain === 'dong');

    // City-level 주제 생성
    if (cityIndicators.length > 0) {
      const cityApiNames = cityIndicators.map(ind => ind.description.replace(' (서울시 전체)', ''));
      const citySampleNames = cityApiNames.slice(0, 3).join(', ');
      const cityHasMore = cityApiNames.length > 3;
      const cityDescription = `${mapCategory} - ${taskType} | ${citySampleNames}${cityHasMore ? '...' : ''}`;

      topics.push({
        topic_id: `${mapCategory.toLowerCase()}_${taskType.replace(/\s+/g, '_')}_city`,
        topic_name: taskType,
        category: mapCategory,
        spatial_grain: 'city',
        sub_indicators: cityIndicators,
        description: cityDescription,
      });
    }

    // Gu-level 주제 생성
    if (guIndicators.length > 0) {
      const guApiNames = guIndicators.map(ind => ind.description.replace(/ \(.*\)$/, ''));
      const guSampleNames = guApiNames.slice(0, 3).join(', ');
      const guHasMore = guApiNames.length > 3;
      const guDescription = `${mapCategory} - ${taskType} | ${guSampleNames}${guHasMore ? '...' : ''}`;

      topics.push({
        topic_id: `${mapCategory.toLowerCase()}_${taskType.replace(/\s+/g, '_')}_gu`,
        topic_name: taskType,
        category: mapCategory,
        spatial_grain: 'gu',
        sub_indicators: guIndicators,
        description: guDescription,
      });
    }

    // Dong-level 주제 생성
    if (dongIndicators.length > 0) {
      const dongApiNames = dongIndicators.map(ind => ind.description.replace(' (행정동 단위)', ''));
      const dongSampleNames = dongApiNames.slice(0, 3).join(', ');
      const dongHasMore = dongApiNames.length > 3;
      const dongDescription = `${mapCategory} - ${taskType} | ${dongSampleNames}${dongHasMore ? '...' : ''}`;

      topics.push({
        topic_id: `${mapCategory.toLowerCase()}_${taskType.replace(/\s+/g, '_')}_dong`,
        topic_name: taskType,
        category: mapCategory,
        spatial_grain: 'dong',
        sub_indicators: dongIndicators,
        description: dongDescription,
      });
    }
  });

  return topics;
}

/**
 * LOCALDATA 및 API 카탈로그 통합
 */
export function mergeAllTopics(
  indicatorTopics: IndicatorTopic[],
  apiTopics: IndicatorTopic[]
): IndicatorTopic[] {
  return [...indicatorTopics, ...apiTopics];
}
