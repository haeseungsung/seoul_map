'use client';

import { DataAnalysis } from '@/utils/data-analyzer';

interface DataAnalysisPanelProps {
  analysis: DataAnalysis;
  apiName: string;
  onClose: () => void;
}

export default function DataAnalysisPanel({ analysis, apiName, onClose }: DataAnalysisPanelProps) {
  const { hasSpatialInfo, spatialInfo, totalRecords, numericFields, categoricalFields, sampleRecords } = analysis;

  return (
    <div className="absolute top-20 right-4 bg-white rounded-lg shadow-xl z-20 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between bg-gray-50">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900">{apiName}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-600">총 {totalRecords.toLocaleString()}건</span>
            {hasSpatialInfo ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                공간정보 있음
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                공간정보 없음
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 공간정보 상세 */}
        {hasSpatialInfo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-green-900 mb-2">📍 공간정보</h4>
            <div className="text-sm text-green-800">
              {spatialInfo.type === 'gu' && (
                <p>• 자치구: <strong>{spatialInfo.guName}</strong> (지도에 표시됨)</p>
              )}
              {spatialInfo.type === 'multi-gu' && (
                <>
                  <p className="mb-1">• 포함된 구: <strong>{spatialInfo.guCount}개 / 25개</strong></p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {spatialInfo.guList?.map(gu => (
                      <span key={gu} className="px-2 py-0.5 bg-green-200 text-green-900 text-xs rounded">
                        {gu}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {spatialInfo.type === 'dong' && (
                <p>• 행정동: <strong>{spatialInfo.dongName}</strong></p>
              )}
              {spatialInfo.type === 'point' && (
                <p>• 좌표: <strong>{spatialInfo.latitude?.toFixed(4)}, {spatialInfo.longitude?.toFixed(4)}</strong></p>
              )}
            </div>
          </div>
        )}

        {/* 숫자 필드 통계 */}
        {numericFields.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-2">📊 숫자 데이터 요약</h4>
            <div className="space-y-2">
              {numericFields.slice(0, 5).map((field) => (
                <div key={field.field} className="bg-gray-50 rounded p-2 text-xs">
                  <div className="font-medium text-gray-700 mb-1">{field.field}</div>
                  <div className="grid grid-cols-4 gap-2 text-gray-600">
                    <div>
                      <span className="text-gray-500">평균:</span> <strong>{field.avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">최소:</span> <strong>{field.min.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">최대:</span> <strong>{field.max.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">합계:</span> <strong>{field.sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 카테고리 필드 요약 */}
        {categoricalFields.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-2">🏷️ 카테고리 데이터 요약</h4>
            <div className="space-y-2">
              {categoricalFields.slice(0, 5).map((field) => (
                <div key={field.field} className="bg-gray-50 rounded p-2 text-xs">
                  <div className="font-medium text-gray-700 mb-1">
                    {field.field} <span className="text-gray-500">({field.uniqueCount}개 유형)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {field.topValues.slice(0, 3).map((v, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                        {v.value} ({v.count})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 샘플 데이터 */}
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">📋 샘플 데이터 (최대 5건)</h4>
          <div className="bg-gray-900 rounded p-3 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono">
              {JSON.stringify(sampleRecords, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
