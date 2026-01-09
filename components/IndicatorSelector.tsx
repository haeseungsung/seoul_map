'use client';

import { useState, useEffect } from 'react';
import { loadIndicatorCatalog, type IndicatorMetadata } from '@/utils/indicator-loader';

interface IndicatorSelectorProps {
  onIndicatorSelect: (indicator: IndicatorMetadata) => void;
  selectedIndicatorId?: string;
}

export default function IndicatorSelector({
  onIndicatorSelect,
  selectedIndicatorId,
}: IndicatorSelectorProps) {
  const [indicators, setIndicators] = useState<IndicatorMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState<string>('');

  useEffect(() => {
    const loadIndicators = async () => {
      try {
        const catalog = await loadIndicatorCatalog();
        setIndicators(catalog);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ 지표 카탈로그 로드 실패:', error);
        setIsLoading(false);
      }
    };

    loadIndicators();
  }, []);

  // Family 목록 추출
  const families = Array.from(new Set(indicators.map((i) => i.family)));

  // 선택된 family에 따라 필터링
  const filteredIndicators = selectedFamily
    ? indicators.filter((i) => i.family === selectedFamily)
    : indicators;

  const selectedIndicator = indicators.find((i) => i.indicator_id === selectedIndicatorId);

  return (
    <div className="flex items-center gap-3">
      {/* Family 선택 */}
      <select
        value={selectedFamily}
        onChange={(e) => setSelectedFamily(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      >
        <option value="">전체 카테고리</option>
        {families.map((family) => (
          <option key={family} value={family}>
            {family}
          </option>
        ))}
      </select>

      {/* 지표 선택 */}
      <select
        value={selectedIndicatorId || ''}
        onChange={(e) => {
          const indicator = indicators.find((i) => i.indicator_id === e.target.value);
          if (indicator) {
            onIndicatorSelect(indicator);
          }
        }}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        disabled={isLoading}
      >
        <option value="">지표 선택 ({filteredIndicators.length}개)</option>
        {filteredIndicators.map((indicator) => (
          <option key={indicator.indicator_id} value={indicator.indicator_id}>
            {indicator.indicator_name} ({indicator.spatial_grain})
          </option>
        ))}
      </select>

      {/* 선택된 지표 정보 */}
      {selectedIndicator && (
        <div className="text-xs text-gray-600 max-w-xs">
          {selectedIndicator.description}
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-gray-500">지표 로딩 중...</div>
      )}
    </div>
  );
}
