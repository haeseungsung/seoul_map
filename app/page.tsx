'use client';

import { useState } from 'react';
import MapContainer from '@/components/MapContainer';

export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);

  const handleDistrictClick = (properties: any) => {
    setSelectedDistrict(properties);
  };

  return (
    <main className="relative w-full h-screen">
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">
            서울시 행정동 인터랙티브 지도
          </h1>
        </div>
      </div>

      {/* 지도 컨테이너 */}
      <div className="pt-16 w-full h-full">
        <MapContainer onDistrictClick={handleDistrictClick} />
      </div>

      {/* 클릭된 지역 정보 표시 (임시) */}
      {selectedDistrict && (
        <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-sm">
          <h3 className="font-bold text-lg mb-2">선택된 지역</h3>
          <pre className="text-xs overflow-auto max-h-60 bg-gray-50 p-2 rounded">
            {JSON.stringify(selectedDistrict, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
