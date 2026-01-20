'use client';

import React from 'react';

interface TimeSliderProps {
  /** 현재 선택된 시간 (0-23, null이면 전체) */
  value: number | null;
  /** 시간 변경 핸들러 */
  onChange: (hour: number | null) => void;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 시간대 선택 버튼 그룹 컴포넌트
 * - 0시~23시 선택 가능
 * - "전체" 옵션 제공
 * - 직관적인 버튼 UI로 동기화 문제 해결
 */
export default function TimeSlider({ value, onChange, disabled = false }: TimeSliderProps) {
  const timeText = value === null ? '전체' : `${value}시`;

  // 시간 옵션 생성: 전체 + 0시~23시
  const timeOptions = [
    { label: '전체', value: null },
    ...Array.from({ length: 24 }, (_, i) => ({ label: `${i}시`, value: i }))
  ];

  return (
    <div className="w-full">
      {/* 레이블 */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700">
          시간대: <span className="text-blue-600 font-bold">{timeText}</span>
        </label>
        {value !== null && (
          <button
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
          >
            전체로 초기화
          </button>
        )}
      </div>

      {/* 시간 버튼 그리드 */}
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {timeOptions.map((option) => (
          <button
            key={option.value === null ? 'all' : option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              px-2 py-1.5 text-xs font-medium rounded transition-colors
              ${value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              ${option.value === null ? 'col-span-1 bg-gray-800 text-white hover:bg-gray-700' : ''}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 설명 */}
      {value !== null ? (
        <p className="text-xs text-gray-600">
          💡 {value}시의 생활인구 데이터를 표시합니다
        </p>
      ) : (
        <p className="text-xs text-gray-600">
          💡 여러 시간대(0시, 4시, 8시, 12시, 16시, 20시)의 평균 생활인구를 표시합니다
        </p>
      )}
    </div>
  );
}
