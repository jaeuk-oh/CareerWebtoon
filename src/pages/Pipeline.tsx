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
  Zap,
  Briefcase,
  Layers,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { NavigationHeader } from '../components/NavigationHeader';

interface PipelineViewProps {
  onNavigate: (view: ViewState) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ onNavigate }) => {
  const { experiences, createPipeline, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jdText, setJdText] = useState('');

  const [selectedPrimaryExpId, setSelectedPrimaryExpId] = useState<string>(experiences[0]?.id || '');
  const [selectedSecondaryExpId, setSelectedSecondaryExpId] = useState<string>(experiences[1]?.id || '');
  const [createError, setCreateError] = useState<string | null>(null);

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
    showToast(`'${sample.company}' 샘플 JD가 입력되었습니다.`, 'info');
  };

  const handleStartAnalysis = () => {
    if (!jdText.trim()) {
      showToast('지원하시려는 채용 공고(JD)를 입력해주세요.', 'warning');
      return;
    }
    setStep(2);
  };

  const handleCreateAndNavigate = async () => {
    setCreateError(null);
    setStep(4);
    try {
      await createPipeline(targetCompany, targetRole, jdText);
      onNavigate('editor');
    } catch (err) {
      console.error(err);
      setCreateError('파이프라인 생성에 실패했습니다. JD 내용을 확인하고 다시 시도해주세요.');
      showToast('파이프라인 생성에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  const stepsList = [
    { num: 1, label: 'JD 및 정보' },
    { num: 2, label: '3C4P 매칭' },
    { num: 3, label: '지원 전략' },
    { num: 4, label: '문서 생성' }
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
                {s.num < 4 && <ChevronRight size={14} className="text-slate-300 hidden sm:inline" />}
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
                  <h2 className="text-xl font-bold text-slate-900">채용 공고 (JD) 및 지원 정보 입력</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Candidate Vault 경험 데이터와 대조하여 3C4P 최적 지원 전략을 자동 분석합니다.
                  </p>
                </div>
              </div>

              {/* Preset Chips */}
              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" /> 샘플 JD 1-Click 자동 채우기:
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
                    채용 공고 상세 (JD Text) *
                  </label>
                  <textarea
                    className="w-full h-44 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-slate-900 resize-none font-sans"
                    placeholder="채용 공고의 주요 업무, 자격 요건, 우대 사항 등을 복사하여 붙여넣으세요..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleStartAnalysis}
                  className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xs transition-all text-xs"
                >
                  <span>JD 3C4P 매칭 분석 시작</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: MATCHING RESULT */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-xs">
                    <Crosshair size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">JD × Candidate 3C4P 매칭 분석</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Candidate Vault에 저장된 {experiences.length}개 경험 자산과 JD 요건을 매칭했습니다.
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  94% Match
                </span>
              </div>

              <div className="space-y-4 mb-6">
                {/* Primary Match Card */}
                <div className="border border-emerald-500/80 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="p-4 bg-emerald-50/80 flex justify-between items-center border-b border-emerald-200">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 inline-block mb-1">
                        🏆 필살기 매칭 (대표 경험 앵커)
                      </span>
                      <p className="text-slate-900 font-bold text-base">
                        {experiences[0]?.title || '서류 점검 자동화 및 프로세스 기획'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1">
                        <Zap size={13} className="text-emerald-600" /> 3C4P 경험 구조
                      </h4>
                      <ul className="space-y-1.5 text-slate-800">
                        <li>
                          <strong className="text-slate-500">Customer:</strong>{' '}
                          {experiences[0]?.c3p4.customer || 'B2B 사용자'}
                        </li>
                        <li>
                          <strong className="text-slate-500">Problem:</strong>{' '}
                          {experiences[0]?.c3p4.problem || '수작업 병목 7일 소요'}
                        </li>
                        <li>
                          <strong className="text-slate-500">Action:</strong>{' '}
                          {experiences[0]?.c3p4.action || '룰셋 기획 및 자동화'}
                        </li>
                      </ul>
                    </div>

                    <div className="border-l border-slate-100 pl-4">
                      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" /> 수치 검증 근거 (Evidence)
                      </h4>
                      <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/80">
                        <p className="font-bold text-emerald-900">
                          {experiences[0]?.c3p4.product || '소요시간 71.4% 단축 (7일 → 2일)'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Source: {experiences[0]?.evidenceSource || '기획서 v1.2'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gap Analysis Box */}
                <div className="p-4 border border-amber-200 bg-amber-50/70 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-xs">Gap Analysis (AI 검증 결과)</h4>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      JD 우대사항 중 '도메인 특화 알고리즘 경험'은 수치 근거가 다소 부족합니다. 과장 대신 3C4P 기반의 학습 능력과 프로세스 개선 역량을 강조하세요.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-500 font-bold px-4 py-2 hover:bg-slate-100 rounded-xl text-xs transition-colors"
                >
                  이전 단계
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 text-xs shadow-xs transition-all"
                >
                  <span>지원 전략 수립하기</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: STRATEGY RECOMMENDATION */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center font-bold shadow-xs">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">면접 방어 최적 지원 전략</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    지원서 자소서 1번 문항 및 이력서 대표 성과로 배치할 파이프라인 전략입니다.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="border border-slate-900 rounded-2xl p-5 bg-slate-900 text-white shadow-md">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-md mb-2 inline-block border border-emerald-800">
                    PRIMARY STRATEGY (대표 경험)
                  </span>
                  <h3 className="text-base font-bold mb-2">
                    {experiences.find(e => e.id === selectedPrimaryExpId)?.title || experiences[0]?.title}를 대표 앵커로 배치
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    채용 공고 핵심 역량과 94% 일치합니다. 자기소개서 1번 문항 상단에 3C4P 수치와 함께 전면 배치하여 첫인상을 압도합니다.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-md mb-2 inline-block">
                    SECONDARY STRATEGY (수치 검증 보조)
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {experiences.find(e => e.id === selectedSecondaryExpId)?.title || experiences[1]?.title}로 데이터 성과 보조
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    데이터 분석 능력 및 온보딩 이탈 개선 경험을 포트폴리오 슬라이드 2번에 보조로 배치합니다.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep(2)}
                  className="text-slate-500 font-bold px-4 py-2 hover:bg-slate-100 rounded-xl text-xs transition-colors"
                >
                  이전 단계
                </button>
                <button
                  onClick={handleCreateAndNavigate}
                  className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 text-xs shadow-xs transition-all"
                >
                  <span>파이프라인 생성 및 에디터 이동</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: GENERATING ANIMATION */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              {createError ? (
                <>
                  <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-900 mb-1">파이프라인 생성에 실패했습니다</h2>
                  <p className="text-xs text-slate-500 font-medium mb-5 max-w-sm mx-auto">{createError}</p>
                  <button
                    onClick={() => {
                      setCreateError(null);
                      setStep(3);
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-xs"
                  >
                    다시 시도하기
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="w-12 h-12 text-slate-900 animate-spin mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-900 mb-1">지원 전략 문서 생성 중...</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Evidence Validator가 3C4P 앵커 수치 근거의 정합성을 검증하고 있습니다.
                  </p>
                </>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PipelineView;
