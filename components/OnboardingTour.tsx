'use client';

import { useEffect, useState } from 'react';

interface OnboardingStep {
  target: string; // CSS selector
  title: string;
  message: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
}

const steps: OnboardingStep[] = [
  {
    target: '.indicator-selector',
    title: '🎯 지표 선택',
    message: '이곳을 클릭해서 다양한 데이터를 지도에 표시해보세요',
    position: 'bottom',
  },
  {
    target: '.view-mode-selector',
    title: '🗺️ 지역 범위 선택',
    message: '시 전체, 구, 행정동 단위로 데이터를 확인할 수 있습니다',
    position: 'bottom',
  },
  {
    target: '.map-container',
    title: '👆 지도 클릭',
    message: '지도의 구역을 클릭하면 해당 지역의 상세 데이터를 볼 수 있습니다',
    position: 'center',
  },
];

export default function OnboardingTour({ isActive, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const updateTargetRect = () => {
      const targetElement = document.querySelector(steps[currentStep].target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);
        console.log(`🎯 OnboardingTour Step ${currentStep}:`, {
          target: steps[currentStep].target,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        });
      } else {
        console.warn(`⚠️ OnboardingTour: Target not found for step ${currentStep}:`, steps[currentStep].target);
      }
    };

    // 약간의 딜레이를 주고 렌더링이 완료된 후 확인
    const timer = setTimeout(updateTargetRect, 100);
    window.addEventListener('resize', updateTargetRect);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [isActive, currentStep]);

  if (!isActive) return null;

  const step = steps[currentStep];

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const padding = 24;
    switch (step.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          top: targetRect.top - padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - padding,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: 'translateY(-50%)',
        };
      case 'center':
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <>
      {/* Backdrop overlay with cutout using box-shadow inset */}
      {targetRect && (
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{
            top: targetRect.top - 12,
            left: targetRect.left - 12,
            width: targetRect.width + 24,
            height: targetRect.height + 24,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
            borderRadius: '12px',
          }}
        />
      )}

      {/* Full-screen clickable overlay (behind the cutout) */}
      <div
        className="fixed inset-0 z-[9999] pointer-events-auto"
        onClick={handleSkip}
      />

      {/* Animated highlight border */}
      {targetRect && (
        <div
          className="fixed z-[10001] pointer-events-none animate-pulse-border"
          style={{
            top: targetRect.top - 12,
            left: targetRect.left - 12,
            width: targetRect.width + 24,
            height: targetRect.height + 24,
            border: '4px solid #3b82f6',
            borderRadius: '12px',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[10002] bg-white rounded-xl shadow-2xl p-6 w-[420px] pointer-events-auto"
        style={getTooltipPosition()}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            건너뛰기
          </button>
        </div>

        <p className="text-gray-700 mb-6 leading-relaxed">{step.message}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-blue-600'
                    : index < currentStep
                    ? 'w-2 bg-blue-400'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
          >
            {currentStep < steps.length - 1 ? '다음' : '시작하기'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.02);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
