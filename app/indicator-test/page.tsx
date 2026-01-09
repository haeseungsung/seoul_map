'use client';

import { useState } from 'react';
import IndicatorSelector from '@/components/IndicatorSelector';
import {
  loadIndicatorData,
  mergeIndicatorToGeojson,
  type IndicatorMetadata,
} from '@/utils/indicator-loader';

export default function IndicatorTestPage() {
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleIndicatorSelect = async (indicator: IndicatorMetadata) => {
    setSelectedIndicator(indicator);
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔍 선택된 지표:', indicator);

      // 1. 지표 데이터 로드
      const indicatorData = await loadIndicatorData(indicator);
      console.log('✅ 지표 데이터 로드 완료:', indicatorData);

      // 2. 결과 표시
      setResult({
        indicator,
        data: indicatorData,
        totalRecords: indicatorData.length,
      });
    } catch (error) {
      console.error('❌ 지표 데이터 로드 실패:', error);
      alert(`데이터 로드 실패:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">지표 시스템 테스트</h1>
        <p className="text-gray-600 mb-8">
          메타 카탈로그 기반으로 LOCALDATA API 데이터를 구별로 집계합니다
        </p>

        {/* 지표 선택기 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">1. 지표 선택</h2>
          <IndicatorSelector
            onIndicatorSelect={handleIndicatorSelect}
            selectedIndicatorId={selectedIndicator?.indicator_id}
          />
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-800 font-medium">데이터 로딩 중...</p>
            <p className="text-sm text-blue-600 mt-2">
              25개 구 데이터를 수집하고 있습니다. 잠시만 기다려주세요.
            </p>
          </div>
        )}

        {/* 결과 표시 */}
        {result && !isLoading && (
          <div className="space-y-6">
            {/* 요약 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-4">
                ✅ 데이터 로드 성공!
              </h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">지표:</span>{' '}
                  <strong>{result.indicator.indicator_name}</strong>
                </div>
                <div>
                  <span className="text-gray-600">공간단위:</span>{' '}
                  <strong>{result.indicator.spatial_grain}</strong>
                </div>
                <div>
                  <span className="text-gray-600">데이터 수:</span>{' '}
                  <strong>{result.totalRecords}개</strong>
                </div>
              </div>
            </div>

            {/* 데이터 테이블 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-100 border-b">
                <h2 className="text-lg font-semibold">2. 구별 집계 결과</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">구</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-700">
                        {result.indicator.indicator_name}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.data
                      .sort((a: any, b: any) => b.value - a.value)
                      .map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {item.gu || item.dong}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-700">
                            {item.value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* JSON 원본 */}
            <details className="bg-gray-900 rounded-lg overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer text-white font-medium hover:bg-gray-800">
                JSON 원본 데이터 보기
              </summary>
              <div className="px-6 py-4">
                <pre className="text-xs text-green-400 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* 도움말 */}
        {!selectedIndicator && !isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">💡 사용 방법</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
              <li>위에서 카테고리(LOCALDATA, POPULATION 등)를 선택하세요</li>
              <li>원하는 지표를 선택하세요 (예: 유통전문판매업_업소수)</li>
              <li>시스템이 자동으로 25개 구 데이터를 수집하여 집계합니다</li>
              <li>결과 테이블에서 구별 집계값을 확인할 수 있습니다</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
