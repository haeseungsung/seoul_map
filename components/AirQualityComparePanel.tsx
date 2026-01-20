'use client';

interface AirQualityComparePanelProps {
  guName: string; // 선택된 구 이름
  pm10: number; // 선택된 구의 PM10
  pm25: number; // 선택된 구의 PM2.5
  airQualityLevel: '좋음' | '보통' | '나쁨' | '매우나쁨'; // 선택된 구의 대기질 등급
  stationCount: number; // 선택된 구의 측정소 개수
  allGuData: Array<{ // 모든 구의 대기질 데이터
    gu_name: string;
    pm10: number;
    pm25: number;
    airQualityLevel: '좋음' | '보통' | '나쁨' | '매우나쁨';
    stationCount: number;
  }>;
  onClose: () => void; // 패널 닫기 함수
}

export default function AirQualityComparePanel({
  guName,
  pm10,
  pm25,
  airQualityLevel,
  stationCount,
  allGuData,
  onClose,
}: AirQualityComparePanelProps) {
  // 서울시 전체 평균 계산
  const seoulAvgPm10 = allGuData.reduce((sum, gu) => sum + (gu.pm10 || 0), 0) / allGuData.filter(g => g.pm10 > 0).length;
  const seoulAvgPm25 = allGuData.reduce((sum, gu) => sum + (gu.pm25 || 0), 0) / allGuData.filter(g => g.pm25 > 0).length;

  // PM2.5 기준 순위 계산
  const sortedByPm25 = [...allGuData].filter(g => g.pm25 > 0).sort((a, b) => a.pm25 - b.pm25);
  const myRank = sortedByPm25.findIndex(g => g.gu_name === guName) + 1;
  const totalGu = sortedByPm25.length;

  // 대기질 등급별 색상
  const getLevelColor = (level: string) => {
    switch (level) {
      case '좋음': return 'text-blue-600';
      case '보통': return 'text-green-600';
      case '나쁨': return 'text-orange-600';
      case '매우나쁨': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case '좋음': return 'bg-blue-50';
      case '보통': return 'bg-green-50';
      case '나쁨': return 'bg-orange-50';
      case '매우나쁨': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };

  // 비교 메시지 생성
  const pm25Diff = ((pm25 - seoulAvgPm25) / seoulAvgPm25) * 100;
  const pm25Message = pm25Diff < -10
    ? `서울시 평균보다 ${Math.abs(Math.round(pm25Diff))}% 낮아 대기질이 좋습니다`
    : pm25Diff > 10
    ? `서울시 평균보다 ${Math.round(pm25Diff)}% 높아 대기질이 나쁩니다`
    : `서울시 평균과 비슷한 수준입니다`;

  return (
    <div className="absolute top-20 right-4 w-96 bg-white rounded-lg shadow-xl z-20 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100dvh - 6rem)' }}>
      {/* 헤더 */}
      <div className={`bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-white flex-shrink-0`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{guName}</h2>
            <p className="text-sm text-blue-100 mt-1">대기질 비교</p>
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
        {/* 현재 구 대기질 등급 */}
        <div className={`${getLevelBg(airQualityLevel)} rounded-lg p-4 text-center`}>
          <div className={`text-2xl font-bold ${getLevelColor(airQualityLevel)} mb-1`}>
            {airQualityLevel}
          </div>
          <div className="text-sm text-gray-600">
            PM2.5: {pm25.toFixed(1)} μg/m³
          </div>
        </div>

        {/* 서울시 순위 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            📊 서울시 25개 구 중 순위
          </h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {myRank}위 <span className="text-lg text-gray-500">/ {totalGu}개 구</span>
            </div>
            <p className="text-xs text-gray-600">
              {myRank <= 5 ? '✨ 대기질이 좋은 편입니다' :
               myRank <= 15 ? '😊 대기질이 보통입니다' :
               '😷 대기질 개선이 필요합니다'}
            </p>
          </div>
        </div>

        {/* PM2.5 비교 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            💨 PM2.5 (초미세먼지) 비교
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {/* Bar Chart */}
            <div className="flex justify-center gap-12 mb-4">
              {/* 이 구 바 */}
              <div className="flex flex-col items-center gap-2" style={{ width: '80px' }}>
                <div className="w-full h-32 flex flex-col justify-end items-center">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(20, (pm25 / Math.max(pm25, seoulAvgPm25)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500">{guName}</div>
                <div className="text-sm font-bold text-gray-900">
                  {pm25.toFixed(1)}
                </div>
              </div>
              {/* 서울시 평균 바 */}
              <div className="flex flex-col items-center gap-2" style={{ width: '80px' }}>
                <div className="w-full h-32 flex flex-col justify-end items-center">
                  <div
                    className="w-full bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(20, (seoulAvgPm25 / Math.max(pm25, seoulAvgPm25)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500">서울시 평균</div>
                <div className="text-sm font-bold text-gray-900">
                  {seoulAvgPm25.toFixed(1)}
                </div>
              </div>
            </div>
            {/* 차이 표시 */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span
                className={`text-lg font-bold ${
                  pm25Diff < 0 ? 'text-blue-600' : pm25Diff > 0 ? 'text-purple-600' : 'text-gray-600'
                }`}
              >
                {pm25Diff > 0 ? '+' : ''}
                {Math.round(pm25Diff)}%
              </span>
            </div>
            <p className="text-sm text-gray-600 text-center">{pm25Message}</p>
          </div>
        </div>

        {/* PM10 비교 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            🌫️ PM10 (미세먼지) 비교
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">{guName}</div>
                <div className="text-xl font-bold text-gray-900">{pm10.toFixed(1)}</div>
              </div>
              <div className="text-gray-400 text-2xl">vs</div>
              <div>
                <div className="text-xs text-gray-500 mb-1">서울시 평균</div>
                <div className="text-xl font-bold text-gray-900">{seoulAvgPm10.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 측정소 개수 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏢</span>
              <span className="text-sm font-medium text-gray-600">
                측정소 개수
              </span>
            </div>
            <span className="text-2xl font-bold text-blue-900">
              {stationCount}개
            </span>
          </div>
        </div>

        {/* 대기질 기준 안내 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            📊 대기질 등급 기준 (PM2.5)
          </h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-16 text-blue-600 font-semibold">좋음</span>
              <span>0 ~ 15 μg/m³</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 text-green-600 font-semibold">보통</span>
              <span>16 ~ 35 μg/m³</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 text-orange-600 font-semibold">나쁨</span>
              <span>36 ~ 75 μg/m³</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 text-red-600 font-semibold">매우나쁨</span>
              <span>76 μg/m³ 이상</span>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="bg-gray-50 px-5 py-3 border-t flex-shrink-0">
        <p className="text-xs text-gray-500">
          💡 지도에서 다른 구를 클릭하면 비교 결과가 업데이트됩니다
        </p>
      </div>
    </div>
  );
}
