'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { loadIndicatorCatalog, type IndicatorMetadata } from '@/utils/indicator-loader';
import {
  groupIndicatorsByTopic,
  groupApisByTopic,
  mergeAllTopics,
  type IndicatorTopic,
  type SeoulApiService,
} from '@/utils/indicator-grouping';

interface HierarchicalIndicatorSelectorProps {
  onIndicatorSelect: (indicator: IndicatorMetadata) => void;
  selectedIndicatorId?: string;
  filterSpatialGrain?: 'gu' | 'dong' | 'city'; // 특정 spatial_grain만 필터링
}

export default function HierarchicalIndicatorSelector({
  onIndicatorSelect,
  selectedIndicatorId,
  filterSpatialGrain,
}: HierarchicalIndicatorSelectorProps) {
  const [topics, setTopics] = useState<IndicatorTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // 2단계 선택 state
  const [selectedTopic, setSelectedTopic] = useState<IndicatorTopic | null>(null);
  const [showSubIndicators, setShowSubIndicators] = useState(false);

  // Portal ref와 position state
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);

  // Client-side mount detection
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        left: rect.left,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load both indicator catalog and API catalog
        const [indicatorCatalog, apiResponse] = await Promise.all([
          loadIndicatorCatalog(),
          fetch('/data/seoul-api-catalog.json'),
        ]);

        const apiData: SeoulApiService[] = await apiResponse.json();

        // 1. LOCALDATA 지표를 주제별로 그룹화
        const indicatorTopics = groupIndicatorsByTopic(indicatorCatalog);

        // 2. API 카탈로그를 주제별로 그룹화 (구별 중복 제거)
        const apiTopics = groupApisByTopic(apiData);

        // 3. 통합
        const allTopics = mergeAllTopics(indicatorTopics, apiTopics);

        setTopics(allTopics);
        setIsLoading(false);

        console.log(`✅ 통합 카탈로그 로드: ${allTopics.length}개 주제`);
        console.log(`   - LOCALDATA 주제: ${indicatorTopics.length}개`);
        console.log(`   - API 주제: ${apiTopics.length}개`);

        // Spatial grain 분포 확인
        const cityTopics = allTopics.filter(t => t.spatial_grain === 'city');
        const guTopics = allTopics.filter(t => t.spatial_grain === 'gu');
        const dongTopics = allTopics.filter(t => t.spatial_grain === 'dong');
        console.log(`   - City 레벨: ${cityTopics.length}개`, cityTopics.map(t => t.topic_name));
        console.log(`   - Gu 레벨: ${guTopics.length}개`);
        console.log(`   - Dong 레벨: ${dongTopics.length}개`);
      } catch (error) {
        console.error('❌ 카탈로그 로드 실패:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 카테고리 목록 추출
  const categories = useMemo(() => {
    const uniqueCategories = new Set(topics.map((t) => t.category).filter(Boolean));
    return Array.from(uniqueCategories).sort();
  }, [topics]);

  // 필터링된 주제 목록
  const filteredTopics = useMemo(() => {
    let filtered = topics;

    // Spatial filter (filterSpatialGrain prop 적용)
    if (filterSpatialGrain) {
      filtered = filtered.filter((t) => t.spatial_grain === filterSpatialGrain);
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.topic_name.toLowerCase().includes(query) ||
          t.topic_id.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    // Limit to 100 results
    return filtered.slice(0, 100);
  }, [topics, selectedCategory, searchQuery, filterSpatialGrain]);

  // 선택된 지표 찾기
  const selectedIndicator = useMemo(() => {
    if (!selectedIndicatorId) return null;

    for (const topic of topics) {
      const indicator = topic.sub_indicators.find((ind) => ind.indicator_id === selectedIndicatorId);
      if (indicator) return { topic, indicator };
    }
    return null;
  }, [topics, selectedIndicatorId]);

  // 주제 선택 핸들러
  const handleTopicClick = (topic: IndicatorTopic) => {
    console.log('🖱️ 주제 클릭:', topic.topic_name, 'sub_indicators:', topic.sub_indicators.length);
    console.log('   첫 번째 지표:', topic.sub_indicators[0]);

    // 세부 지표가 1개뿐이면 바로 선택
    if (topic.sub_indicators.length === 1) {
      console.log('   → 바로 선택 실행');
      onIndicatorSelect(topic.sub_indicators[0]);
      setIsOpen(false);
    } else {
      // 세부 지표가 여러 개면 2단계로 이동
      console.log('   → 2단계로 이동');
      setSelectedTopic(topic);
      setShowSubIndicators(true);
    }
  };

  // 세부 지표 선택 핸들러
  const handleSubIndicatorClick = (indicator: IndicatorMetadata) => {
    onIndicatorSelect(indicator);
    setIsOpen(false);
    setShowSubIndicators(false);
    setSelectedTopic(null);
  };

  // 뒤로 가기 핸들러
  const handleBack = () => {
    setShowSubIndicators(false);
    setSelectedTopic(null);
  };

  return (
    <div className="relative">
      {/* Selected Indicator Display / Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left min-w-[320px]"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="text-gray-500">지표 로딩 중...</span>
        ) : selectedIndicator ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              {selectedIndicator.topic.category} &gt; {selectedIndicator.topic.topic_name}
            </span>
            <span className="text-xs text-gray-400 truncate">
              {selectedIndicator.indicator.description}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">지표 선택 ({topics.length.toLocaleString()}개 주제)</span>
        )}
      </button>

      {/* Dropdown Panel - Rendered via Portal */}
      {isOpen && !isLoading && isMounted && createPortal(
        <div
          className="fixed z-[9999] w-[500px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 flex flex-col"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          {!showSubIndicators ? (
            // 1단계: 주제 선택
            <>
              {/* Search and Filter Controls */}
              <div className="p-3 border-b border-gray-700 space-y-2">
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="주제 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 카테고리</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topics List */}
              <div className="flex-1 overflow-y-auto">
                {filteredTopics.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {filteredTopics.map((topic) => (
                      <button
                        key={topic.topic_id}
                        onClick={() => handleTopicClick(topic)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {topic.category} &gt; {topic.topic_name}
                              </span>
                              {topic.sub_indicators.length > 1 && (
                                <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded-full">
                                  {topic.sub_indicators.length}개
                                </span>
                              )}
                              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                                {topic.spatial_grain}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block line-clamp-1">
                              {topic.description.split('|')[1]?.trim() || topic.description}
                            </span>
                          </div>
                          {topic.sub_indicators.length > 1 && (
                            <svg
                              className="w-5 h-5 text-gray-500 group-hover:text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Results Count Footer */}
                <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-4 py-2">
                  <p className="text-xs text-gray-400">
                    {filteredTopics.length === 100
                      ? '상위 100개 결과 표시 (검색어를 더 구체화하세요)'
                      : `${filteredTopics.length.toLocaleString()}개 주제`}
                  </p>
                </div>
              </div>
            </>
          ) : (
            // 2단계: 세부 지표 선택
            <>
              {/* Header with Back Button */}
              <div className="p-3 border-b border-gray-700">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  뒤로 가기
                </button>
                <h3 className="text-sm font-semibold text-white">
                  {selectedTopic?.topic_name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedTopic?.description}
                </p>
              </div>

              {/* Sub-Indicators List */}
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-gray-700">
                  {selectedTopic?.sub_indicators.map((indicator) => (
                    <button
                      key={indicator.indicator_id}
                      onClick={() => handleSubIndicatorClick(indicator)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition ${
                        indicator.indicator_id === selectedIndicatorId ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {indicator.description}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          {indicator.metric_type} • {indicator.spatial_grain}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Click outside to close - Also rendered via Portal */}
      {isOpen && isMounted && createPortal(
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => {
            setIsOpen(false);
            setShowSubIndicators(false);
            setSelectedTopic(null);
          }}
        />,
        document.body
      )}
    </div>
  );
}
