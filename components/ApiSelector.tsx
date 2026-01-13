'use client';

import { useState, useEffect, useMemo } from 'react';

interface SeoulApiService {
  id: string;
  name: string;
  category: string;
  district: string;
  mapCategory: string;
  serviceType: string;
}

interface ApiSelectorProps {
  onApiSelect: (service: SeoulApiService) => void;
  selectedApiId?: string;
}

export default function ApiSelector({ onApiSelect, selectedApiId }: ApiSelectorProps) {
  const [catalog, setCatalog] = useState<SeoulApiService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [spatialFilter, setSpatialFilter] = useState<'all' | 'gu' | 'city'>('all'); // 구별/시별 필터
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Load API catalog on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch('/data/seoul-api-catalog.json');
        const data = await response.json();
        setCatalog(data);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ API 카탈로그 로드 실패:', error);
        setIsLoading(false);
      }
    };

    loadCatalog();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(catalog.map((s) => s.category).filter(Boolean));
    return Array.from(uniqueCategories).sort();
  }, [catalog]);

  // Filter services based on search query, category, and spatial type
  const filteredServices = useMemo(() => {
    let filtered = catalog;

    // Filter by spatial type (구별/시별)
    if (spatialFilter === 'gu') {
      filtered = filtered.filter((s) => s.district !== '서울시 전체' && s.district !== '');
    } else if (spatialFilter === 'city') {
      filtered = filtered.filter((s) => s.district === '서울시 전체' || s.district === '');
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query (fuzzy matching on name and id)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          s.district.toLowerCase().includes(query)
      );
    }

    // Limit to 100 results for performance
    return filtered.slice(0, 100);
  }, [catalog, searchQuery, selectedCategory, spatialFilter]);

  const selectedService = catalog.find((s) => s.id === selectedApiId);

  return (
    <div className="relative">
      {/* Selected API Display / Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
      >
        {isLoading ? (
          <span className="text-gray-400">API 목록 로딩 중...</span>
        ) : selectedService ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{selectedService.name}</span>
            <span className="text-xs text-gray-500">
              {selectedService.category} • {selectedService.id}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">서울시 OpenAPI 선택 ({catalog.length.toLocaleString()}개)</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && !isLoading && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 flex flex-col">
          {/* Search and Filter Controls */}
          <div className="p-3 border-b border-gray-200 space-y-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="이름, ID, 자치구로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {/* Spatial Filter (구별/시별) */}
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

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto">
            {filteredServices.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      onApiSelect(service);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition ${
                      service.id === selectedApiId ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{service.category}</span>
                        {service.district && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600">{service.district}</span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 mt-1">{service.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Results Count Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
              <p className="text-xs text-gray-600">
                {filteredServices.length === 100
                  ? '상위 100개 결과 표시 (검색어를 더 구체화하세요)'
                  : `${filteredServices.length.toLocaleString()}개 결과`}
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
