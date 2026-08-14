import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Share2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortfolioData } from '../types/portfolio';
import { useEscapeClose } from '../lib/hooks';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioData: PortfolioData;
}

export const PresentationModal: React.FC<PresentationModalProps> = ({ isOpen, onClose, portfolioData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slides = portfolioData.slides || [];

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1));
      if (e.key === 'ArrowLeft') setCurrentIndex((prev) => Math.max(0, prev - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length]);

  if (!isOpen) return null;

  const currentSlide = slides[currentIndex] || slides[0];

  const themeClasses = {
    navy: 'bg-slate-900 text-white',
    emerald: 'bg-emerald-950 text-white',
    slate: 'bg-slate-800 text-white',
    dark: 'bg-black text-white'
  };

  const activeThemeClass = themeClasses[portfolioData.theme || 'navy'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 sm:p-10 select-none">
        {/* Top Header */}
        <div className="flex justify-between items-center z-10 text-white">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight text-emerald-400">
              {portfolioData.candidateName} - {portfolioData.targetRole}
            </span>
            <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-slate-300">
              전체 화면 발표 모드
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="발표 모드 닫기"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="닫기 (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="flex-1 flex items-center justify-center py-6">
          <motion.div
            key={currentSlide?.id || currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`w-full max-w-5xl aspect-video ${activeThemeClass} rounded-3xl p-10 md:p-16 shadow-2xl flex flex-col justify-between border border-white/10 relative overflow-hidden`}
          >
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                SLIDE {currentIndex + 1} OF {slides.length}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
                {currentSlide?.title}
              </h2>
              <p className="text-base md:text-xl text-slate-300 font-medium max-w-3xl">
                {currentSlide?.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              {currentSlide?.elements.map((el) => (
                <div
                  key={el.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md"
                >
                  {el.title && <h4 className="font-bold text-emerald-300 text-sm mb-1">{el.title}</h4>}
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {el.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end border-t border-white/10 pt-4 text-xs text-slate-400 font-medium">
              <span>CareerCraft Evidence Portfolio</span>
              <span>{portfolioData.candidateName}</span>
            </div>
          </motion.div>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center text-white z-10">
          <div className="text-xs text-slate-400 font-bold">
            슬라이드 {currentIndex + 1} / {slides.length}
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              aria-label="이전 슬라이드"
              className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              disabled={currentIndex === slides.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              aria-label="다음 슬라이드"
              className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
