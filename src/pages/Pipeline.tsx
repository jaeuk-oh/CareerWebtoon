import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  FileSearch,
  Sparkles,
  ShieldCheck,
  Undo
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { ApiError, JDAnalysisResponse, MatchResponse, StrategyResponse } from '../lib/api';
import { Badge, Button, Card, SectionHeading, cn } from '../components/ui';

interface PipelineViewProps {
  onNavigate: (view: ViewState) => void;
}

const MATCH_TYPE_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  pilsal: { label: '강력 매칭', tone: 'success' },
  mipsal: { label: '보완 필요', tone: 'warning' },
  bilsal: { label: '매칭 약함', tone: 'neutral' }
};

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

const STEPS = [
  { num: 1, label: '공고 입력' },
  { num: 2, label: '경험 매칭' },
  { num: 3, label: '지원 전략' }
];

export const PipelineView: React.FC<PipelineViewProps> = ({ onNavigate }) => {
  const { experiences, analyzeJob, matchExperiences, generateStrategyForJob, finalizePipeline, showToast, handleActionError } = useApp();

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
      const isQuotaError = err instanceof ApiError && err.status === 429;
      setAnalyzeError(isQuotaError ? err.message : '채용 공고 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
      handleActionError(err, '채용 공고 분석에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBuildStrategy = async () => {
    if (!jd || isPlanning) return;
    setIsPlanning(true);
    try {
      setStrategy(await generateStrategyForJob(jd.id));
      setStep(3);
    } catch (err) {
      handleActionError(err, '지원 전략 수립에 실패했습니다. 잠시 후 다시 시도해주세요.');
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

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper */}
      <Card padded={false} className="px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} icon={<Undo size={14} />}>
            워크스페이스로
          </Button>

          <div className="flex items-center gap-2 sm:gap-5">
            {STEPS.map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    step === s.num
                      ? 'bg-brand-600 text-white shadow-sm'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {step > s.num ? <CheckCircle2 size={15} /> : s.num}
                </div>
                <span
                  className={cn(
                    'hidden text-sm font-bold sm:inline',
                    step === s.num ? 'text-slate-900' : 'text-slate-400'
                  )}
                >
                  {s.label}
                </span>
                {s.num < 3 && <ChevronRight size={15} className="hidden text-slate-300 sm:inline" />}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex justify-center">
        <Card className="w-full max-w-3xl md:p-10">
          {/* STEP 1 — JD input */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <SectionHeading
                icon={<FileSearch size={20} />}
                title="채용 공고 및 지원 정보 입력"
                description="등록해둔 내 경험과 대조해 최적의 지원 전략을 자동 분석합니다."
                className="mb-6"
              />

              {experiences.length === 0 && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    아직 등록된 경험이 없습니다. 경험 보관함에서 먼저 경험을 등록해야 매칭 결과가 나옵니다.
                  </span>
                </div>
              )}

              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <Sparkles size={15} className="text-brand-600" /> 샘플 공고 1-Click 자동 채우기
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_JDS.map((s, i) => (
                    <button
                      key={s.company}
                      onClick={() => handleFillSample(i)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:bg-brand-50 hover:text-brand-800"
                    >
                      + {s.company} ({s.role})
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pipeline-company" className="mb-1.5 block text-sm font-bold text-slate-800">
                      지원 기업명 *
                    </label>
                    <input
                      id="pipeline-company"
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="예: TechNova"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="pipeline-role" className="mb-1.5 block text-sm font-bold text-slate-800">
                      지원 직무 *
                    </label>
                    <input
                      id="pipeline-role"
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="예: 콘텐츠 기획자 / 웹툰 PD"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pipeline-jd" className="mb-1.5 block text-sm font-bold text-slate-800">
                    채용 공고 상세 *
                  </label>
                  <textarea
                    id="pipeline-jd"
                    className="h-52 w-full resize-none rounded-xl border border-slate-200 p-3.5 text-sm leading-relaxed text-slate-900 focus:border-brand-500 focus:outline-none"
                    placeholder="채용 공고의 주요 업무, 자격 요건, 우대 사항 등을 복사하여 붙여넣으세요..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  />
                </div>
              </div>

              {analyzeError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                  {analyzeError}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleStartAnalysis} isLoading={isAnalyzing} icon={!isAnalyzing ? <ArrowRight size={16} /> : undefined}>
                  {isAnalyzing ? '분석 중...' : '공고 분석 및 경험 매칭 시작'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — matching */}
          {step === 2 && match && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <SectionHeading
                icon={<Crosshair size={20} />}
                title="공고 × 내 경험 매칭 결과"
                description={`등록된 경험 ${experiences.length}개와 채용 공고 요건을 대조했습니다.`}
                action={<Badge tone="success" className="text-sm">{coveragePercent}% 커버리지</Badge>}
                className="mb-5 border-b border-slate-100 pb-5"
              />

              <div className="mb-6 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
                {sortedMatches.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    매칭할 수 있는 경험이 없습니다. 경험 보관함에서 경험을 등록하고 'AI 분석'으로 구조화한 뒤 다시 시도해주세요.
                  </p>
                ) : (
                  sortedMatches.map((m, idx) => {
                    const typeInfo = MATCH_TYPE_LABEL[m.match_type] || { label: m.match_type, tone: 'neutral' as const };
                    return (
                      <div
                        key={`${m.experience_id}-${m.anchor_id ?? idx}`}
                        className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
                          <div className="min-w-0">
                            <Badge tone={typeInfo.tone} className="mb-1.5">
                              {typeInfo.label}
                              {m.anchor_type ? ` · ${m.anchor_type}` : ''}
                            </Badge>
                            <p className="truncate text-base font-bold text-slate-900">{m.experience_title}</p>
                          </div>
                          <span className="flex-shrink-0 text-base font-bold text-slate-700">
                            {Math.round(m.match_score * 100)}점
                          </span>
                        </div>
                        <p className="bg-white p-4 text-sm leading-relaxed text-slate-700">{m.rationale}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  이전 단계
                </Button>
                <Button onClick={handleBuildStrategy} isLoading={isPlanning} icon={!isPlanning ? <ArrowRight size={16} /> : undefined}>
                  {isPlanning ? '전략 수립 중...' : '지원 전략 수립하기'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — strategy */}
          {step === 3 && strategy && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <SectionHeading
                icon={<ShieldCheck size={20} />}
                title="면접 방어 지원 전략"
                description="지원서에 배치할 대표 경험과 보완할 점을 AI가 정리했습니다."
                className="mb-6"
              />

              <div className="mb-6 space-y-4">
                <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-md">
                  <span className="mb-2 inline-block rounded-md border border-brand-800 bg-brand-950 px-2.5 py-1 text-xs font-bold text-brand-200">
                    핵심 전략
                  </span>
                  {strategy.primary_experience?.title && (
                    <h3 className="mb-2 flex items-center gap-1.5 text-lg font-bold">
                      <Briefcase size={16} className="flex-shrink-0 text-brand-300" />
                      {strategy.primary_experience.title}
                    </h3>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{strategy.strategy_text}</p>
                </div>

                {strategy.gaps.length > 0 && (
                  <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                      <AlertTriangle size={16} /> 보완이 필요한 부분
                    </h4>
                    {strategy.gaps.map((g, idx) => (
                      <p key={idx} className="text-sm leading-relaxed text-amber-800">
                        <strong className="text-amber-900">{g.competency}:</strong> {g.suggestion}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  이전 단계
                </Button>
                <Button onClick={handleFinalize} icon={<ArrowRight size={16} />}>
                  지원 시작하고 서류 작성하러 가기
                </Button>
              </div>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PipelineView;
