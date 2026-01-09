'use client';

import type { IndicatorType } from '@/app/page';
import { getIndicatorConfig } from '@/utils/map-utils';

interface DetailPanelProps {
  districtName: string; // 행정동 이름
  guName: string; // 구 이름
  districtValue: number; // 선택된 행정동의 값
  seoulAverage: number; // 서울시 전체 평균
  guAverage: number; // 소속 구의 평균
  seoulDiff: number; // 서울시 평균과의 차이 (%)
  guDiff: number; // 구 평균과의 차이 (%)
  seoulMessage: string; // 서울시 평균 비교 문구
  guMessage: string; // 구 평균 비교 문구
  indicator: IndicatorType; // 현재 선택된 지표
  onClose: () => void; // 패널 닫기 함수
}

export default function DetailPanel({
  districtName,
  guName,
  districtValue,
  seoulAverage,
  guAverage,
  seoulDiff,
  guDiff,
  seoulMessage,
  guMessage,
  indicator,
  onClose,
}: DetailPanelProps) {
  const config = getIndicatorConfig(indicator);

  // 값 포맷팅 (반올림, 소수점 없음)
  const formatValue = (value: number): string => {
    // 값이 0이면 "데이터 없음" 표시
    if (value === 0) {
      return '데이터 없음';
    }

    const rounded = Math.round(value);
    if (indicator.includes('ratio')) {
      return rounded + '%';
    }
    return rounded.toLocaleString() + config.unit;
  };

  return (
    <div className="absolute top-20 right-4 w-96 bg-white rounded-lg shadow-xl z-20 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100dvh - 6rem)' }}>
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-white flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{districtName}</h2>
            <p className="text-sm text-blue-100 mt-1">{guName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition"
            aria-label="닫기"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* 현재 지표 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              {config.label}
            </span>
            <span className="text-xs text-gray-500">이 행정동</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {formatValue(districtValue)}
          </div>
        </div>

        {/* 서울시 평균 비교 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            📊 서울시 전체 행정동의 평균과 비교
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {districtValue === 0 || seoulAverage === 0 ? (
              // 데이터 없을 때
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">비교할 데이터가 없습니다</p>
              </div>
            ) : (
              // 정상 비교
              <>
                {/* Bar Chart */}
                <div className="flex justify-center gap-12 mb-4">
                  {/* 이 행정동 바 */}
                  <div className="flex flex-col items-center gap-2" style={{ width: '80px' }}>
                    <div className="w-full h-32 flex flex-col justify-end items-center">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all"
                        style={{
                          height: `${Math.max(20, (districtValue / Math.max(districtValue, seoulAverage)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">이 행정동</div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatValue(districtValue)}
                    </div>
                  </div>
                  {/* 서울시 평균 바 */}
                  <div className="flex flex-col items-center gap-2" style={{ width: '80px' }}>
                    <div className="w-full h-32 flex flex-col justify-end items-center">
                      <div
                        className="w-full bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-md transition-all"
                        style={{
                          height: `${Math.max(20, (seoulAverage / Math.max(districtValue, seoulAverage)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">서울시 평균</div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatValue(seoulAverage)}
                    </div>
                  </div>
                </div>
                {/* 차이 표시 */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className={`text-lg font-bold ${
                      seoulDiff > 0
                        ? 'text-blue-600'
                        : seoulDiff < 0
                        ? 'text-purple-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {seoulDiff > 0 ? '+' : ''}
                    {Math.round(seoulDiff)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 text-center">{seoulMessage}</p>
              </>
            )}
          </div>
        </div>

        {/* 구 평균 비교 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            🏘️ {guName} 전체 행정동의 평균과 비교
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {districtValue === 0 || guAverage === 0 ? (
              // 데이터 없을 때
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">비교할 데이터가 없습니다</p>
              </div>
            ) : (
              // 정상 비교
              <>
                {/* Bar Chart */}
                <div className="flex justify-center gap-12 mb-4">
                  {/* 이 행정동 바 */}
                  <div className="flex flex-col items-center gap-2" style={{ width: '80px' }}>
                    <div className="w-full h-32 flex flex-col justify-end items-center">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all"
                        style={{
                          height: `${Math.max(20, (districtValue / Math.max(districtValue, guAverage)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">이 행정동</div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatValue(districtValue)}
                    </div>
                  </div>
                  {/* 구 평균 바 */}
                  <div className="flex flex-col items-center gap-2" style={{ width: '80px' }}>
                    <div className="w-full h-32 flex flex-col justify-end items-center">
                      <div
                        className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-md transition-all"
                        style={{
                          height: `${Math.max(20, (guAverage / Math.max(districtValue, guAverage)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">{guName} 평균</div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatValue(guAverage)}
                    </div>
                  </div>
                </div>
                {/* 차이 표시 */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className={`text-lg font-bold ${
                      guDiff > 0
                        ? 'text-blue-600'
                        : guDiff < 0
                        ? 'text-orange-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {guDiff > 0 ? '+' : ''}
                    {Math.round(guDiff)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 text-center">{guMessage}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="bg-gray-50 px-5 py-3 border-t flex-shrink-0">
        <p className="text-xs text-gray-500">
          💡 지도에서 다른 행정동을 클릭하면 비교 결과가 업데이트됩니다
        </p>
      </div>
    </div>
  );
}
