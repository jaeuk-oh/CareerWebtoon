import React, { useState } from 'react';
import {
  Plus,
  LayoutDashboard,
  Database,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  FolderPlus,
  ArrowRight,
  Search,
  Edit3,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { ExperienceModal } from '../components/ExperienceModal';
import { NavigationHeader } from '../components/NavigationHeader';
import { Experience } from '../types/experience';

interface DashboardViewProps {
  onNavigate: (view: ViewState) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    user,
    experiences,
    pipelines,
    deleteExperience,
    deletePipeline,
    setActivePipelineId,
    loadDemoData,
    clearAllData,
    requestConfirm
  } = useApp();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'vault' | 'history'>('dashboard');
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenEditExp = (exp: Experience, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExperience(exp);
    setIsExpModalOpen(true);
  };

  const handleOpenCreateExp = () => {
    setEditingExperience(null);
    setIsExpModalOpen(true);
  };

  const handleOpenPipeline = (pipelineId: string) => {
    setActivePipelineId(pipelineId);
    onNavigate('editor');
  };

  const handleDeletePipeline = (id: string, companyName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm({
      title: '파이프라인을 삭제할까요?',
      message: `'${companyName}' 지원 파이프라인과 연결된 문서 작업 내역이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제하기',
      onConfirm: () => deletePipeline(id)
    });
  };

  const handleDeleteExperience = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm({
      title: '경험 자산을 삭제할까요?',
      message: `'${title}' 3C4P 경험 자산이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제하기',
      onConfirm: () => deleteExperience(id)
    });
  };

  const handleClearAllData = () => {
    requestConfirm({
      title: '모든 데이터를 초기화할까요?',
      message: '경험 자산, 지원 파이프라인, 작성 중인 문서를 포함한 모든 데이터가 영구적으로 삭제됩니다.',
      confirmLabel: '전체 초기화',
      onConfirm: clearAllData
    });
  };

  const filteredExperiences = experiences.filter((exp) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      exp.title.toLowerCase().includes(query) ||
      exp.organization.toLowerCase().includes(query) ||
      exp.c3p4.customer.toLowerCase().includes(query) ||
      exp.c3p4.problem.toLowerCase().includes(query) ||
      exp.c3p4.action.toLowerCase().includes(query) ||
      exp.c3p4.product.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <NavigationHeader currentView="dashboard" onNavigate={onNavigate} />

      <ExperienceModal
        isOpen={isExpModalOpen}
        onClose={() => {
          setIsExpModalOpen(false);
          setEditingExperience(null);
        }}
        editingExp={editingExperience}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 gap-8">
        {/* Left Desktop Navigation Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <button
              onClick={() => onNavigate('pipeline')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
            >
              <Plus size={16} /> 새 지원 파이프라인 생성
            </button>

            <nav className="flex flex-col gap-1 mt-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all w-full text-left ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard size={16} /> 통합 대시보드
                </span>
                <ChevronRight size={14} className={activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-300'} />
              </button>

              <button
                onClick={() => setActiveTab('vault')}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all w-full text-left ${
                  activeTab === 'vault'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Database size={16} /> Candidate Vault
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'vault' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {experiences.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all w-full text-left ${
                  activeTab === 'history'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText size={16} /> 지원 이력
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'history' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {pipelines.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Quick Demo Controls Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" /> 워크스페이스 관리
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              3C4P 샘플 데이터를 미리 확인하거나 전체 데이터를 초기화할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={loadDemoData}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
              >
                데모 로드
              </button>
              <button
                onClick={handleClearAllData}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Top Greeting Header */}
          <section className="mb-6 bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full text-emerald-800 text-xs font-bold mb-3">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Evidence-based Copilot Ready</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                반가워요, {user.name}님!
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                {user.targetRole ? `${user.targetRole} 직무` : '지원 직무'} 맞춤 3C4P 경험 자산으로 지원서 방어력을 극대화하세요.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleOpenCreateExp}
                className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus size={15} /> 3C4P 경험 등록
              </button>
              <button
                onClick={() => onNavigate('pipeline')}
                className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus size={15} /> 새 파이프라인
              </button>
            </div>
          </section>

          {/* VIEW TAB 1: INTEGRATED DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Candidate Vault Quick Summary Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
                          <Database size={16} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Candidate Vault</h3>
                      </div>
                      <button
                        onClick={handleOpenCreateExp}
                        className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> 추가
                      </button>
                    </div>

                    <div className="space-y-2.5 mb-6">
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-semibold text-slate-600">구조화된 3C4P 경험</span>
                        <span className="text-sm font-bold text-slate-900">{experiences.length}개</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-semibold text-slate-600">수치 검증 증거 자산</span>
                        <span className="text-sm font-bold text-emerald-700">{experiences.filter(e => e.c3p4?.product).length}건</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-semibold text-slate-600">진행 중 지원 파이프라인</span>
                        <span className="text-sm font-bold text-slate-900">{pipelines.length}건</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('vault')}
                    className="w-full py-2.5 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>경험 자산 전체 보기</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Active Pipelines List */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-600" />
                    <span>진행 중인 지원 파이프라인</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">총 {pipelines.length}건</span>
                </div>

                {pipelines.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                      <FolderPlus size={24} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-base mb-1">등록된 지원 파이프라인이 없습니다</h4>
                    <p className="text-xs text-slate-500 mb-5 max-w-md">
                      목표 지원 기업의 채용 공고(JD)를 입력하고 AI가 매칭한 최적 지원 전략을 수립하세요.
                    </p>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => onNavigate('pipeline')}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Plus size={15} /> 첫 파이프라인 생성
                      </button>
                      <button
                        onClick={loadDemoData}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
                      >
                        데모 데이터 체험
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipelines.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleOpenPipeline(p.id)}
                        className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 cursor-pointer shadow-xs hover:shadow-md hover:border-slate-300 transition-all relative group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 text-[11px] font-bold rounded-md mb-1.5">
                              {p.targetRole}
                            </span>
                            <h4 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">
                              {p.targetCompany}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                              <ShieldCheck size={14} className="text-emerald-600" /> 매칭률 {p.matchScore}%
                            </span>
                            <button
                              onClick={(e) => handleDeletePipeline(p.id, p.targetCompany, e)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors"
                              aria-label={`${p.targetCompany} 파이프라인 삭제`}
                              title="파이프라인 삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Pipeline Stepper Progress */}
                        <div className="grid grid-cols-5 gap-1 my-5 pt-3 border-t border-slate-100 text-center">
                          {[
                            { step: 'JD 분석', done: true },
                            { step: '경험 매칭', done: true },
                            { step: '전략 추천', done: true },
                            { step: '문서 생성', done: true },
                            { step: '방어 검증', done: true },
                          ].map((s, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-1">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  s.done ? 'bg-slate-900 text-emerald-400' : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                <CheckCircle2 size={13} />
                              </div>
                              <span className="text-[10px] font-medium text-slate-600">{s.step}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPipeline(p.id);
                            }}
                            className="flex-1 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <span>코파일럿 에디터 열기</span>
                            <ArrowRight size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('portfolio');
                            }}
                            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                          >
                            포트폴리오 전략
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW TAB 2: CANDIDATE VAULT DETAILS */}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Candidate Vault (3C4P 근거 자산 목록)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    카드를 클릭하면 3C4P 세부 내용을 수정하거나 업데이트할 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateExp}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={15} /> 3C4P 경험 등록
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="경험 제목, 조직, 3C4P 키워드 또는 수치로 검색..."
                  aria-label="경험 자산 검색"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 shadow-xs"
                />
              </div>

              {filteredExperiences.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <Database size={32} className="mx-auto text-slate-300 mb-3" />
                  <h4 className="font-bold text-slate-900 text-base mb-1">검색된 경험 자산이 없습니다</h4>
                  <p className="text-xs text-slate-500 mb-5">새 3C4P 경험을 추가하여 면접 방어 자산을 채워보세요.</p>
                  <button
                    onClick={handleOpenCreateExp}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs"
                  >
                    첫 3C4P 경험 등록하기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredExperiences.map((exp) => (
                    <div
                      key={exp.id}
                      onClick={(e) => handleOpenEditExp(exp, e)}
                      className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              {exp.organization} ({exp.period})
                            </span>
                            <h4 className="font-bold text-slate-900 text-base mt-2 group-hover:text-emerald-700 transition-colors">
                              {exp.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleOpenEditExp(exp, e)}
                              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors"
                              aria-label={`${exp.title} 수정`}
                              title="수정"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteExperience(exp.id, exp.title, e)}
                              className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                              aria-label={`${exp.title} 삭제`}
                              title="삭제"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Visual 3C4P Badges */}
                        <div className="space-y-2 my-3 text-xs">
                          <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                            <span className="font-bold text-blue-900 block text-[11px] mb-0.5">🎯 Customer</span>
                            <p className="text-slate-800">{exp.c3p4.customer}</p>
                          </div>
                          <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl">
                            <span className="font-bold text-amber-900 block text-[11px] mb-0.5">⚠️ Problem</span>
                            <p className="text-slate-800">{exp.c3p4.problem}</p>
                          </div>
                          <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                            <span className="font-bold text-indigo-900 block text-[11px] mb-0.5">⚡ Action</span>
                            <p className="text-slate-800">{exp.c3p4.action}</p>
                          </div>
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl">
                            <span className="font-bold text-emerald-900 block text-[11px] mb-0.5">📈 Product / Result</span>
                            <p className="text-emerald-800 font-bold">{exp.c3p4.product}</p>
                          </div>
                        </div>
                      </div>

                      {exp.evidenceSource && (
                        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Source: <strong className="text-slate-800 font-medium">{exp.evidenceSource}</strong></span>
                          <span className="text-emerald-600 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                            수정하기 <ChevronRight size={12} />
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW TAB 3: APPLICATION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                <h3 className="text-lg font-bold text-slate-900">지원 이력 및 관리</h3>
                <p className="text-xs text-slate-500 mt-0.5">생성된 지원 파이프라인 문서들의 버전 히스토리입니다.</p>
              </div>

              {pipelines.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-xs">
                  기록된 지원 이력이 없습니다.
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-4">지원 기업</th>
                        <th className="p-4">지원 직무</th>
                        <th className="p-4">매칭 점수</th>
                        <th className="p-4">생성일</th>
                        <th className="p-4 text-right">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelines.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{p.targetCompany}</td>
                          <td className="p-4 text-slate-600">{p.targetRole}</td>
                          <td className="p-4">
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              {p.matchScore}%
                            </span>
                          </td>
                          <td className="p-4 text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenPipeline(p.id)}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 transition-colors"
                            >
                              에디터 열기
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardView;
