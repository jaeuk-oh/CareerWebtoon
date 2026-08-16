import React, { useState } from 'react';
import {
  FileSearch,
  Crosshair,
  ShieldCheck,
  ArrowRight,
  Undo,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { NavigationHeader } from '../components/NavigationHeader';
import { JDAnalysisResponse, MatchResponse, StrategyResponse } from '../lib/api';

interface PipelineViewProps {
  onNavigate: (view: ViewState) => void;
}

const MATCH_TYPE_LABEL: Record<string, { label: string; className: string }> = {
  pilsal: { label: '강력 매칭', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  mipsal: { label: '보완 필요', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  bilsal: { label: '매칭 약함', className: 'bg-slate-100 text-slate-600 border-slate-200' }
};

export const PipelineView: React.FC<PipelineViewProps> = ({ onNavigate }) => {
  const { experiences, analyzeJob, matchExperiences, generateStrategyForJob, finalizePipeline, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jdText, setJdText] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [jd, setJd] = useState<JDAnalysisResponse | null>(null);
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);

  const SAMPLE_JDS = [
    {
      company: 'TechNova',
      role: '콘텐츠 기획 / 웹툰 PD',
      jd: '[TechNova 2024 웹툰 PD 채용]\n- 신규 웹툰 IP 발굴 및 기획\n- 작가 커뮤니케이션 및 스케줄링 관리\n- 사용자 이탈 및 작품 반응 데이터 분석 역량\n- 애자일 스크럼 및 타 직군 프로젝트 협업'
    },
    {
      company: 'FutureSaaS',
      role: '서비스 기획자 / PM',
      jd: '[FutureSaaS B2B PM 채용]\n- B2B 서비스 워크플로우 분석 및 UX 기획\n- 사용자 병목 문제 정의 및 체크리스트 자동화\n- 개발/디자인 팀과 애자일 스크럼 운영\n- 데이터 기반 기능 개선 수치 증명'
    },
    {
      company: 'DataCraft Labs',
      role: '데이터 분석가 / UX Analyst',
      jd: '[DataCraft GA4 Analyst 채용]\n- 유저 이탈 구간 데이터 로깅 및 코호트 분석\n- 온보딩 Funnel 개선 A/B 테스트 기획\n- 정량적 성과 수치 도출 및 면접 방어 자산 보유자'
    }
  ];

  const handleFillSample = (index: number) => {
    const sample = SAMPLE_JDS[index];
    setTargetCompany(sample.company);
    setTargetRole(sample.role);
    setJdText(sample.jd);
    showToast(`'${sample.company}' 샘플 공고가 입력되었습니다.`, 'info');
  };

  const handleStartAnalysis = async () => {
    if (!jdText.trim()) {
      showToast('지원하시려는 채용 공고를 입력해주세요.', 'warning');
      return;
    }
    if (isAnalyzing) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);
    try {
      const jdResult = await analyzeJob(targetCompany, targetRole, jdText);
      const matchResult = await matchExperiences(jdResult.id);
      setJd(jdResult);
      setMatch(matchResult);
      setStep(2);
    } catch (err) {
      console.error(err);
      setAnalyzeError('채용 공고 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
      showToast('채용 공고 분석에 실패했습니다.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBuildStrategy = async () => {
    if (!jd || isPlanning) return;
    setIsPlanning(true);
    try {
      const strategyResult = await generateStrategyForJob(jd.id);
      setStrategy(strategyResult);
      setStep(3);
    } catch (err) {
      console.error(err);
      showToast('지원 전략 수립에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleFinalize = () => {
    if (!jd || !match || !strategy) return;
    finalizePipeline(jd, targetCompany, targetRole, jdText, match, strategy);
    onNavigate('editor');
  };

  const sortedMatches = match ? [...match.matches].sort((a, b) => b.match_score - a.match_score) : [];
  const coveragePercent = match ? Math.round((match.coverage_score || 0) * 100) : 0;

  const stepsList = [
    { num: 1, label: '공고 입력' },
    { num: 2, label: '경험 매칭' },
    { num: 3, label: '지원 전략' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <NavigationHeader currentView="pipeline" onNavigate={onNavigate} />

      {/* Stepper Bar Header */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-bold text-xs transition-colors"
          >
            <Undo size={14} /> 워크스페이스로
          </button>

          <div className="flex items-center gap-2 sm:gap-6">
            {stepsList.map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-slate-900 text-emerald-400 shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 size={14} /> : s.num}
                </div>
                <span
                  className={`text-xs font-bold hidden sm:inline ${
                    step === s.num ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 3 && <ChevronRight size={14} className="text-slate-300 hidden sm:inline" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200/80 p-6 md:p-10 shadow-xs relative">
          {/* STEP 1: JD INPUT */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-xs">
                  <FileSearch size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">채용 공고 및 지원 정보 입력</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    등록해둔 내 경험과 대조해 최적의 지원 전략을 자동 분석합니다.
                  </p>
                </div>
              </div>

              {experiences.length === 0 && (
                <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>아직 등록된 경험이 없습니다. 워크스페이스에서 먼저 경험을 등록해야 매칭 결과가 나옵니다.</span>
                </div>
              )}

              {/* Preset Chips */}
              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" /> 샘플 공고 1-Click 자동 채우기:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_JDS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleFillSample(i)}
                      className="text-xs bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 font-bold px-3 py-1.5 rounded-lg transition-all border border-slate-200 shadow-2xs"
                    >
                      + {s.company} ({s.role})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">지원 기업명 *</label>
                    <input
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="예: TechNova"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">지원 직무 *</label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="예: 콘텐츠 기획자 / 웹툰 PD"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    채용 공고 상세 *
                  </label>
                  <textarea
                    className="w-full h-44 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-slate-900 resize-none font-sans"
                    placeholder="채용 공고의 주요 업무, 자격 요건, 우대 사항 등을 복사하여 붙여넣으세요..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  ></textarea>
                </div>
              </div>

              {analyzeError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  {analyzeError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing}
                  className="bg-slate-900 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xs transition-all text-xs"
                >
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <span>공고 분석 및 경험 매칭 시작</span>}
                  {!isAnalyzing && <ArrowRight size={16} />}
                  {isAnalyzing && <span>분석 중...</span>}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: MATCHING RESULT (real data) */}
          {step === 2 && match && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-xs">
                    <Crosshair size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">공고 × 내 경험 매칭 결과</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      등록된 경험 {experiences.length}개와 채용 공고 요건을 대조했습니다.
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex-shrink-0">
                  {coveragePercent}% 커버리지
                </span>
              </div>

              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-1">
                {sortedMatches.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    매칭할 수 있는 경험이 없습니다. 워크스페이스에서 경험을 등록하고 "AI 분석"으로 구조화한 뒤 다시 시도해주세요.
                  </div>
                ) : (
                  sortedMatches.map((m, idx) => {
                    const typeInfo = MATCH_TYPE_LABEL[m.match_type] || {
                      label: m.match_type,
                      className: 'bg-slate-100 text-slate-600 border-slate-200'
                    };
                    return (
                      <div key={`${m.experience_id}-${m.anchor_id ?? idx}`} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="p-4 bg-slate-50/80 flex justify-between items-center border-b border-slate-100 gap-3">
                          <div className="min-w-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block mb-1 ${typeInfo.className}`}>
                              {typeInfo.label}{m.anchor_type ? ` · ${m.anchor_type}` : ''}
                            </span>
                            <p className="text-slate-900 font-bold text-sm truncate">{m.experience_title}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-700 flex-shrink-0">
                            {Math.round(m.match_score * 100)}점
                          </span>
                        </div>
                        <div className="p-4 bg-white text-xs text-slate-700 leading-relaxed">
                          {m.rationale}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-500 font-bold px-4 py-2 hover:bg-slate-100 rounded-xl text-xs transition-colors"
                >
                  이전 단계
                </button>
                <button
                  onClick={handleBuildStrategy}
                  disabled={isPlanning}
                  className="bg-slate-900 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 text-xs shadow-xs transition-all"
                >
                  {isPlanning ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>{isPlanning ? '전략 수립 중...' : '지원 전략 수립하기'}</span>
                  {!isPlanning && <ArrowRight size={16} />}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: STRATEGY (real data) */}
          {step === 3 && strategy && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-xs">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">면접 방어 지원 전략</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    지원서에 배치할 대표 경험과 보완할 점을 AI가 정리했습니다.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="border border-slate-900 rounded-2xl p-5 bg-slate-900 text-white shadow-md">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-md mb-2 inline-block border border-emerald-800">
                    핵심 전략
                  </span>
                  {strategy.primary_experience?.title && (
                    <h3 className="text-base font-bold mb-2 flex items-center gap-1.5">
                      <Briefcase size={15} className="text-emerald-400 flex-shrink-0" />
                      {strategy.primary_experience.title}
                    </h3>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {strategy.strategy_text}
                  </p>
                </div>

                {strategy.gaps.length > 0 && (
                  <div className="p-4 border border-amber-200 bg-amber-50/70 rounded-2xl space-y-2.5">
                    <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      <AlertTriangle size={15} /> 보완이 필요한 부분
                    </h4>
                    {strategy.gaps.map((g, idx) => (
                      <div key={idx} className="text-xs text-amber-800 leading-relaxed">
                        <strong className="text-amber-900">{g.competency}:</strong> {g.suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep(2)}
                  className="text-slate-500 font-bold px-4 py-2 hover:bg-slate-100 rounded-xl text-xs transition-colors"
                >
                  이전 단계
                </button>
                <button
                  onClick={handleFinalize}
                  className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 text-xs shadow-xs transition-all"
                >
                  <span>지원 시작하고 서류 작성하러 가기</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PipelineView;
