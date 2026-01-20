'use client';

interface LandingHeroProps {
  onStart: () => void;
}

/**
 * 랜딩 페이지 히어로 섹션
 * - 그라데이션 배경
 * - 글래스모피즘 카드
 * - 대기질 정보 강조
 */
export default function LandingHero({ onStart }: LandingHeroProps) {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* 그라데이션 배경 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm" />

      {/* 히어로 카드 - 화면 정중앙 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
        <div
          className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-12 max-w-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
          }}
        >
          {/* 장식용 그라데이션 원 */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-pink-400 to-orange-600 rounded-full blur-3xl opacity-30" />

          {/* 내용 */}
          <div className="relative z-10 text-center">
            {/* 뱃지 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 backdrop-blur-sm rounded-full mb-6">
              <span className="text-2xl">🗺️</span>
              <span className="text-sm font-semibold text-blue-900">서울 열린데이터 시각화</span>
            </div>

            {/* 메인 타이틀 */}
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              서울시 인터랙티브 지도
            </h1>

            {/* 서브 타이틀 */}
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              대기질, 생활인구, 업종 현황 등<br />
              서울시 오픈데이터를 한눈에 확인하고 비교해보세요
            </p>

            {/* 주요 기능 */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-3xl mb-2">🌫️</div>
                <div className="text-sm font-semibold text-gray-800">대기질</div>
                <div className="text-xs text-gray-600 mt-1">실시간 미세먼지</div>
              </div>
              <div className="bg-purple-50/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-sm font-semibold text-gray-800">생활인구</div>
                <div className="text-xs text-gray-600 mt-1">시간대별 유동인구</div>
              </div>
              <div className="bg-pink-50/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="text-3xl mb-2">🏪</div>
                <div className="text-sm font-semibold text-gray-800">업종 현황</div>
                <div className="text-xs text-gray-600 mt-1">상권 및 시설 분포</div>
              </div>
            </div>

            {/* CTA 버튼 */}
            <button
              onClick={onStart}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <span>지도 보기</span>
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            {/* 보조 텍스트 */}
            <p className="text-xs text-gray-500 mt-6">
              💡 지도에서 구를 클릭하면 다른 구와의 비교 분석을 볼 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
