import React, { useState } from 'react';
import {
  Bot,
  Type,
  Image as ImageIcon,
  LayoutGrid,
  Award,
  Plus,
  Trash2,
  ShieldCheck,
  Eye,
  Share2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Palette,
  Sparkles,
  Check
} from 'lucide-react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { NavigationHeader } from '../components/NavigationHeader';
import { PresentationModal } from '../components/PresentationModal';
import { PortfolioElement, PortfolioTheme } from '../types/portfolio';
import { useEscapeClose } from '../lib/hooks';

interface PortfolioViewProps {
  onNavigate: (view: ViewState) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onNavigate }) => {
  const {
    portfolioData,
    updatePortfolioTitle,
    updateSlideHeader,
    addPortfolioElement,
    updatePortfolioElement,
    movePortfolioElement,
    deletePortfolioElement,
    setPortfolioTheme,
    addSlide,
    deleteSlide,
    showToast,
    requestConfirm
  } = useApp();

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editingElement, setEditingElement] = useState<PortfolioElement | null>(null);

  const currentSlide = portfolioData.slides[currentSlideIndex] || portfolioData.slides[0];

  useEscapeClose(!!editingElement, () => setEditingElement(null));

  const handlePublish = () => {
    showToast('포트폴리오 공개 발행 기능은 현재 준비 중입니다. 곧 공개 URL 공유를 지원할 예정입니다.', 'info');
  };

  const handleOpenEditElement = (el: PortfolioElement) => {
    setEditingElement(el);
  };

  const handleSaveElementEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingElement) return;
    updatePortfolioElement(currentSlideIndex, editingElement.id, {
      title: editingElement.title,
      content: editingElement.content
    });
    setEditingElement(null);
  };

  const handleDeleteSlide = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm({
      title: '슬라이드를 삭제할까요?',
      message: `슬라이드 ${idx + 1}과 그 안의 모든 요소가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제하기',
      onConfirm: () => {
        deleteSlide(idx);
        if (currentSlideIndex >= portfolioData.slides.length - 1) {
          setCurrentSlideIndex(Math.max(0, portfolioData.slides.length - 2));
        }
      }
    });
  };

  const handleDeleteElement = (elementId: string) => {
    requestConfirm({
      title: '요소를 삭제할까요?',
      message: '슬라이드에서 이 요소가 영구적으로 삭제됩니다.',
      confirmLabel: '삭제하기',
      onConfirm: () => deletePortfolioElement(currentSlideIndex, elementId)
    });
  };

  const themes: { id: PortfolioTheme; name: string; colorClass: string }[] = [
    { id: 'navy', name: 'Executive Navy', colorClass: 'bg-slate-900 text-white' },
    { id: 'emerald', name: 'Emerald Tech', colorClass: 'bg-emerald-950 text-white' },
    { id: 'slate', name: 'Minimal Slate', colorClass: 'bg-slate-800 text-white' },
    { id: 'dark', name: 'Dark Pro', colorClass: 'bg-black text-white' },
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-y-auto lg:overflow-hidden">
      <NavigationHeader currentView="portfolio" onNavigate={onNavigate} />

      <PresentationModal
        isOpen={isPreviewMode}
        onClose={() => setIsPreviewMode(false)}
        portfolioData={portfolioData}
      />

      {/* Inline Element Edit Modal */}
      {editingElement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs"
          onClick={() => setEditingElement(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit3 size={18} className="text-emerald-600" />
              <span>포트폴리오 요소 수정</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">제목</label>
              <input
                type="text"
                value={editingElement.title || ''}
                onChange={(e) => setEditingElement({ ...editingElement, title: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">내용 및 3C4P 항목</label>
              <textarea
                rows={4}
                value={editingElement.content || ''}
                onChange={(e) => setEditingElement({ ...editingElement, content: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-slate-900 resize-none font-sans"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingElement(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                onClick={handleSaveElementEdit}
                className="px-5 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub Top Controls Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Palette size={16} className="text-emerald-600" />
            <span>슬라이드 테마:</span>
          </span>
          <div className="flex gap-1.5">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setPortfolioTheme(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  portfolioData.theme === t.id
                    ? 'bg-slate-900 text-emerald-400 border-slate-900 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewMode(true)}
            className="px-4 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Eye size={14} />
            <span>전체 화면 발표 미리보기</span>
          </button>
          <button
            onClick={handlePublish}
            className="px-4 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <Share2 size={14} />
            <span>발행하기</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Left Sidebar: Slide Navigation & AI Guide */}
        <aside className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col z-10 flex-shrink-0 max-h-[45vh] lg:max-h-none">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
              <Bot size={16} />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">AI 포트폴리오 전략 가이드</h3>
              <p className="text-[11px] text-slate-500">JD 요구 역량 배치 가이드라인</p>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-4 overflow-y-auto bg-slate-50/50 flex-1 text-xs">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-800">슬라이드 구성</span>
                <button
                  onClick={addSlide}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 text-[11px]"
                >
                  <Plus size={13} /> 추가
                </button>
              </div>
              <div className="space-y-1.5">
                {portfolioData.slides.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                      idx === currentSlideIndex
                        ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate max-w-[190px]">슬라이드 {idx + 1}: {s.title}</span>
                    {portfolioData.slides.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteSlide(idx, e)}
                        aria-label={`슬라이드 ${idx + 1} 삭제`}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200"></div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" /> 우선순위 앵커 추천
              </h4>
              <div className="bg-white p-3.5 border border-emerald-200 rounded-xl shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  필살기 프로젝트
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">서류 점검 자동화 시스템 기획</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  소요시간 71.4% 단축 수치가 가장 강력합니다. 첫장과 포트폴리오 요약에 전면 배치하세요.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Slide Canvas */}
        <main className="flex-1 bg-slate-100 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden min-h-[650px] flex flex-col">
            {/* Window Bar Header */}
            <div className="h-9 bg-slate-50 border-b border-slate-200 flex items-center px-4 justify-between">
              <div className="flex gap-1.5 items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                슬라이드 {currentSlideIndex + 1} / {portfolioData.slides.length}
              </span>
            </div>

            {/* Canvas Header & Elements */}
            <div className="p-8 sm:p-12 flex-1 flex flex-col gap-6">
              {/* Header Editor */}
              <div className="border-b border-slate-200 pb-5 space-y-2">
                <input
                  type="text"
                  value={currentSlide?.title || ''}
                  onChange={(e) =>
                    updateSlideHeader(currentSlideIndex, e.target.value, currentSlide.subtitle)
                  }
                  placeholder="슬라이드 제목을 입력하세요..."
                  className="w-full text-2xl md:text-3xl font-bold text-slate-900 border-none focus:outline-none focus:bg-slate-50 p-1.5 rounded-xl"
                />
                <input
                  type="text"
                  value={currentSlide?.subtitle || ''}
                  onChange={(e) =>
                    updateSlideHeader(currentSlideIndex, currentSlide.title, e.target.value)
                  }
                  placeholder="부제목 또는 핵심 요약을 작성하세요..."
                  className="w-full text-sm md:text-base text-slate-500 border-none focus:outline-none focus:bg-slate-50 p-1.5 rounded-xl font-medium"
                />
              </div>

              {/* Elements List */}
              <div className="flex-1 space-y-4">
                {currentSlide?.elements.length === 0 ? (
                  <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                    오른쪽 패널에서 텍스트 블록, 3C4P 그리드, 스킬 배지 요소를 추가하세요.
                  </div>
                ) : (
                  currentSlide?.elements.map((el, elIdx) => (
                    <div
                      key={el.id}
                      className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl relative group hover:border-slate-300 transition-all"
                    >
                      {/* Action buttons on hover */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg border border-slate-200 shadow-2xs">
                        <button
                          onClick={() => movePortfolioElement(currentSlideIndex, el.id, 'up')}
                          disabled={elIdx === 0}
                          className="text-slate-400 hover:text-slate-900 disabled:opacity-30 p-1"
                          aria-label="요소 위로 이동"
                          title="위로 이동"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => movePortfolioElement(currentSlideIndex, el.id, 'down')}
                          disabled={elIdx === currentSlide.elements.length - 1}
                          className="text-slate-400 hover:text-slate-900 disabled:opacity-30 p-1"
                          aria-label="요소 아래로 이동"
                          title="아래로 이동"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenEditElement(el)}
                          className="text-slate-400 hover:text-slate-900 p-1"
                          aria-label="요소 편집"
                          title="편집"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteElement(el.id)}
                          className="text-slate-300 hover:text-rose-600 p-1"
                          aria-label="요소 삭제"
                          title="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {el.type === 'badge' && (
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md inline-block">
                            {el.title}
                          </span>
                          <p className="text-sm font-bold text-slate-900 mt-1">{el.content}</p>
                        </div>
                      )}

                      {el.type === 'grid' && (
                        <div>
                          {el.title && <h4 className="font-bold text-xs text-slate-900 mb-1.5">{el.title}</h4>}
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                            {el.content}
                          </pre>
                        </div>
                      )}

                      {el.type === 'text' && (
                        <div>
                          {el.title && <h4 className="font-bold text-xs text-slate-900 mb-1">{el.title}</h4>}
                          <p className="text-xs text-slate-600 leading-relaxed">{el.content}</p>
                        </div>
                      )}

                      {el.type === 'image' && (
                        <div className="p-6 bg-slate-200/80 rounded-xl text-center text-xs text-slate-600 font-bold border border-slate-300/60">
                          [시각 자료 / 서비스 기획 인포그래픽 위치]
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Palette */}
        <aside className="w-full lg:w-60 bg-white border-l border-slate-200 flex flex-col z-10 flex-shrink-0">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">요소 추가</h3>
          </div>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            {[
              { type: 'text' as const, icon: Type, label: '텍스트 블록' },
              { type: 'grid' as const, icon: LayoutGrid, label: '3C4P 그리드' },
              { type: 'badge' as const, icon: Award, label: '스킬 배지' },
              { type: 'image' as const, icon: ImageIcon, label: '이미지 영역' }
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => addPortfolioElement(currentSlideIndex, item.type)}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 hover:border-slate-900 rounded-xl cursor-pointer hover:shadow-2xs transition-all text-left"
              >
                <item.icon size={16} className="text-slate-900" />
                <span className="text-xs font-bold text-slate-800">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PortfolioView;
