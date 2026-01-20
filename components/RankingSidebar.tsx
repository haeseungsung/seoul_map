'use client';

import { ReactNode } from 'react';

interface RankingItem {
  gu_name: string;
  value: number;
  displayValue?: string; // 표시용 값 (대기질 등급 등)
}

interface RankingSidebarProps {
  allGuData: Array<{
    gu_name: string;
    value: number;
    displayValue?: string;
  }>;
  onGuClick: (guName: string) => void;
  indicatorName: string; // 지표 이름 (예: "대기질", "생활인구", "음식점")
  unit: string; // 단위 (예: "μg/m³", "명", "개")
  isAirQuality?: boolean; // 대기질 데이터인 경우 true (낮을수록 좋음)
  indicatorSelector?: ReactNode; // 지표 선택 UI
}

/**
 * 범용 순위 사이드바
 * - TOP 3: 값이 높은/낮은 구 (지표 특성에 따라)
 * - BOTTOM 3: 값이 낮은/높은 구
 */
export default function RankingSidebar({
  allGuData,
  onGuClick,
  indicatorName,
  unit,
  isAirQuality = false,
  indicatorSelector
}: RankingSidebarProps) {
  // 대기질은 낮을수록 좋음, 나머지는 높을수록 좋음
  const sortedData = [...allGuData]
    .filter(g => g.value > 0)
    .sort((a, b) => isAirQuality ? a.value - b.value : b.value - a.value);

  const top3 = sortedData.slice(0, 3);
  const bottom3 = sortedData.slice(-3).reverse();

  // 대기질 등급별 색상 (다크모드용)
  const getLevelColor = (level: string) => {
    switch (level) {
      case '좋음': return 'text-blue-400';
      case '보통': return 'text-green-400';
      case '나쁨': return 'text-orange-400';
      case '매우나쁨': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case '좋음': return 'bg-blue-900/30';
      case '보통': return 'bg-green-900/30';
      case '나쁨': return 'bg-orange-900/30';
      case '매우나쁨': return 'bg-red-900/30';
      default: return 'bg-gray-800/30';
    }
  };

  return (
    <div className="fixed top-16 right-0 w-80 h-[calc(100vh-4rem)] bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 shadow-xl z-10 flex flex-col">
      {/* 지표 선택 영역 */}
      {indicatorSelector && (
        <div className="indicator-selector flex-shrink-0 px-3 pt-3 pb-2.5 border-b border-gray-800">
          {indicatorSelector}
        </div>
      )}

      {/* 헤더 - 고정 */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white">{indicatorName} 순위</h2>
      </div>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
        {/* TOP 3 */}
        <div className="bg-gradient-to-br from-blue-900/30 to-gray-800/50 border border-blue-800/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🏆</span>
              <h3 className="font-bold text-xs text-white">
                {isAirQuality ? `좋은 구` : `많은 구`}
              </h3>
            </div>
          </div>
          <div className="p-2 space-y-1.5">
            {top3.map((item, index) => (
              <button
                key={item.gu_name}
                onClick={() => onGuClick(item.gu_name)}
                className="w-full text-left px-2.5 py-2 rounded-md hover:bg-gray-700/70 transition-all duration-150 hover:scale-[1.01] cursor-pointer border border-transparent hover:border-blue-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="font-semibold text-sm text-white">{item.gu_name}</span>
                  </div>
                  {isAirQuality && item.displayValue && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getLevelBg(item.displayValue)} ${getLevelColor(item.displayValue)}`}>
                      {item.displayValue}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end mt-1">
                  <span className="text-sm font-bold text-blue-400">
                    {unit === '개' || unit === '명' ? item.value.toLocaleString() : (item.value >= 1000 ? item.value.toLocaleString() : item.value.toFixed(1))}
                    <span className="text-xs text-gray-500 ml-1">{unit}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM 3 */}
        <div className="bg-gradient-to-br from-red-900/30 to-gray-800/50 border border-red-800/50 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">⚠️</span>
              <h3 className="font-bold text-xs text-white">
                {isAirQuality ? `나쁜 구` : `적은 구`}
              </h3>
            </div>
          </div>
          <div className="p-2 space-y-1.5">
            {bottom3.map((item, index) => (
              <button
                key={item.gu_name}
                onClick={() => onGuClick(item.gu_name)}
                className="w-full text-left px-2.5 py-2 rounded-md hover:bg-gray-700/70 transition-all duration-150 hover:scale-[1.01] cursor-pointer border border-transparent hover:border-red-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">
                      {sortedData.length - (bottom3.length - 1 - index)}위
                    </span>
                    <span className="font-semibold text-sm text-white">{item.gu_name}</span>
                  </div>
                  {isAirQuality && item.displayValue && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getLevelBg(item.displayValue)} ${getLevelColor(item.displayValue)}`}>
                      {item.displayValue}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end mt-1">
                  <span className="text-sm font-bold text-red-400">
                    {unit === '개' || unit === '명' ? item.value.toLocaleString() : (item.value >= 1000 ? item.value.toLocaleString() : item.value.toFixed(1))}
                    <span className="text-xs text-gray-500 ml-1">{unit}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 서울시 통계 */}
        <div className="bg-gradient-to-br from-purple-900/30 to-gray-800/50 border border-purple-800/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">📊</span>
              <h3 className="font-bold text-xs text-white">
                {unit === '개' || unit === '명' ? '서울시 전체' : '서울시 평균'}
              </h3>
            </div>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {unit === '개' || unit === '명' ? '합계' : '평균'}
              </span>
              <span className="text-base font-bold text-purple-400">
                {(() => {
                  // 개수나 명수는 합계, 나머지(%, μg/m³ 등)는 평균
                  if (unit === '개' || unit === '명') {
                    const total = allGuData.reduce((sum, g) => sum + g.value, 0);
                    return total.toLocaleString();
                  } else {
                    const avg = allGuData.reduce((sum, g) => sum + g.value, 0) / allGuData.filter(g => g.value > 0).length;
                    return avg >= 1000 ? avg.toLocaleString() : avg.toFixed(1);
                  }
                })()}
                <span className="text-xs text-gray-500 ml-1">{unit}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
