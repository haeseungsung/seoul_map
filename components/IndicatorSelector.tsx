'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadIndicatorCatalog, type IndicatorMetadata } from '@/utils/indicator-loader';

interface SeoulApiService {
  id: string;
  name: string;
  category: string;
  district: string;
  mapCategory: string;
  serviceType: string;
}

interface IndicatorSelectorProps {
  onIndicatorSelect: (indicator: IndicatorMetadata) => void;
  selectedIndicatorId?: string;
}

export default function IndicatorSelector({
  onIndicatorSelect,
  selectedIndicatorId,
}: IndicatorSelectorProps) {
  const [indicators, setIndicators] = useState<IndicatorMetadata[]>([]);
  const [apiCatalog, setApiCatalog] = useState<SeoulApiService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [spatialFilter, setSpatialFilter] = useState<'all' | 'gu' | 'city'>('gu');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load both indicator catalog and API catalog
        const [indicatorCatalog, apiResponse] = await Promise.all([
          loadIndicatorCatalog(),
          fetch('/data/seoul-api-catalog.json'),
        ]);

        const apiData = await apiResponse.json();

        setIndicators(indicatorCatalog);
        setApiCatalog(apiData);
        setIsLoading(false);

        console.log(`✅ 통합 카탈로그 로드: ${indicatorCatalog.length}개 지표 + ${apiData.length}개 API`);
      } catch (error) {
        console.error('❌ 카탈로그 로드 실패:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Convert API catalog entries to IndicatorMetadata format (gu-level only for now)
  const apiAsIndicators: IndicatorMetadata[] = useMemo(() => {
    return apiCatalog
      .filter((api) => {
        // Filter by spatial type
        if (spatialFilter === 'gu') {
          return api.district !== '서울시 전체' && api.district !== '';
        } else if (spatialFilter === 'city') {
          return api.district === '서울시 전체' || api.district === '';
        }
        return true;
      })
      .map((api) => ({
        family: api.category || 'API',
        indicator_id: api.id,
        indicator_name: api.name,
        metric_type: 'count' as const,
        spatial_grain: (api.district === '서울시 전체' || api.district === '') ? 'city' as const : 'gu' as const,
        source_pattern: api.id,
        value_field: '',
        description: `${api.category} - ${api.district}`,
      }));
  }, [apiCatalog, spatialFilter]);

  // Combine indicators and APIs
  const allIndicators = useMemo(() => {
    return [...indicators, ...apiAsIndicators];
  }, [indicators, apiAsIndicators]);

  // Extract unique families from combined list
  const families = useMemo(() => {
    const uniqueFamilies = new Set(allIndicators.map((i) => i.family).filter(Boolean));
    return Array.from(uniqueFamilies).sort();
  }, [allIndicators]);

  // Filter by family and search query
  const filteredIndicators = useMemo(() => {
    let filtered = allIndicators;

    // Filter by family
    if (selectedFamily) {
      filtered = filtered.filter((i) => i.family === selectedFamily);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.indicator_name.toLowerCase().includes(query) ||
          i.indicator_id.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query)
      );
    }

    // Limit to 100 results for performance
    return filtered.slice(0, 100);
  }, [allIndicators, selectedFamily, searchQuery]);

  const selectedIndicator = allIndicators.find((i) => i.indicator_id === selectedIndicatorId);

  return (
    <div className="relative">
      {/* Selected Indicator Display / Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left min-w-[250px]"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="text-gray-400">지표 로딩 중...</span>
        ) : selectedIndicator ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{selectedIndicator.indicator_name}</span>
            <span className="text-xs text-gray-500">
              {selectedIndicator.family} • {selectedIndicator.spatial_grain}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">지표 선택 ({allIndicators.length.toLocaleString()}개)</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && !isLoading && (
        <div className="absolute z-20 mt-2 w-[500px] bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 flex flex-col">
          {/* Search and Filter Controls */}
          <div className="p-3 border-b border-gray-200 space-y-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="이름, ID로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {/* Spatial Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setSpatialFilter('all')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition ${
                  spatialFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSpatialFilter('gu')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition ${
                  spatialFilter === 'gu'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                구별 데이터
              </button>
              <button
                onClick={() => setSpatialFilter('city')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition ${
                  spatialFilter === 'city'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                시별 데이터
              </button>
            </div>

            {/* Family Filter */}
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 카테고리</option>
              {families.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto">
            {filteredIndicators.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIndicators.map((indicator) => (
                  <button
                    key={indicator.indicator_id}
                    onClick={() => {
                      onIndicatorSelect(indicator);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition ${
                      indicator.indicator_id === selectedIndicatorId ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{indicator.indicator_name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{indicator.family}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">{indicator.spatial_grain}</span>
                      </div>
                      <span className="text-xs text-gray-400 mt-1">{indicator.indicator_id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Results Count Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
              <p className="text-xs text-gray-600">
                {filteredIndicators.length === 100
                  ? '상위 100개 결과 표시 (검색어를 더 구체화하세요)'
                  : `${filteredIndicators.length.toLocaleString()}개 결과`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
