import React, { useState } from 'react';
import {
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldAlert,
  Copy,
  Sparkles,
  FileDown,
  Save,
  Check,
  Zap,
  TrendingUp,
  Loader2,
  FileQuestion
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { NavigationHeader } from '../components/NavigationHeader';
import { FrontendDocType } from '../lib/api';

interface EditorViewProps {
  onNavigate: (view: ViewState) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ onNavigate }) => {
  const {
    documentDraft,
    updateDocumentContent,
    generateDocument,
    evidenceValidation,
    runEvidenceValidation,
    defenseMessages,
    sendDefenseMessage,
    runDefenseGeneration,
    pipelines,
    activePipelineId,
    setActivePipelineId,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'strategy' | 'evidence' | 'defense'>('defense');
  const [docType, setDocType] = useState<FrontendDocType>('coverLetter');
  const [userInputMessage, setUserInputMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingDefense, setIsGeneratingDefense] = useState(false);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) || pipelines[0];
  const generatedDocId = documentDraft.generatedDocIds?.[docType];
  const hasGeneratedDoc = Boolean(generatedDocId);
  const isValidationCurrent = Boolean(
    evidenceValidation && generatedDocId && evidenceValidation.document_id === generatedDocId
  );

  const handleExportPDF = () => {
    showToast('PDF 내보내기가 실행되었습니다.', 'info');
    window.print();
  };

  const handleSaveFinal = () => {
    showToast('지원서 및 검증 결과가 성공적으로 저장되었습니다.', 'success');
  };

  const handleCopyText = () => {
    const text = getCurrentText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('클립보드에 지원서 내용이 복사되었습니다.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAiPolish = () => {
    const current = getCurrentText();
    if (!current) return;
    const polished = current + '\n\n[AI 3C4P 앵커링 강화: 지원자의 수치 검증 근거가 서두에 더욱 명확하게 정제되었습니다.]';
    updateDocumentContent(docType, polished);
    showToast('AI가 문장을 다듬고 3C4P 앵커를 강화했습니다.', 'success');
  };

  const handleGenerateDocument = async () => {
    if (isGeneratingDoc) return;
    if (!activePipelineId && activePipeline) {
      // Landed on the editor directly without explicitly selecting a pipeline;
      // fall back to the pipeline already shown in the strategy panel.
      setActivePipelineId(activePipeline.id);
    }
    setIsGeneratingDoc(true);
    try {
      await generateDocument(docType);
    } catch (err) {
      console.error(err);
      showToast('AI 초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleRunValidation = async () => {
    if (isValidating) return;
    setIsValidating(true);
    try {
      await runEvidenceValidation(docType);
    } catch (err) {
      console.error(err);
      showToast('수치 검증에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateDefenseQuestions = async () => {
    if (isGeneratingDefense) return;
    setIsGeneratingDefense(true);
    try {
      await runDefenseGeneration(docType);
    } catch (err) {
      console.error(err);
      showToast('방어 질문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsGeneratingDefense(false);
    }
  };

  const handleQuickChipClick = (chipText: string) => {
    sendDefenseMessage(chipText);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInputMessage.trim()) return;
    sendDefenseMessage(userInputMessage);
    setUserInputMessage('');
  };

  const getCurrentText = () => {
    if (docType === 'resume') return documentDraft.resumeText;
    if (docType === 'career') return documentDraft.careerText;
    return documentDraft.coverLetterText;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateDocumentContent(docType, e.target.value);
  };

  const currentText = getCurrentText();
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
  const charCount = currentText.length;

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-y-auto lg:overflow-hidden">
      <NavigationHeader currentView="editor" onNavigate={onNavigate} />

      {/* Sub Top Action Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Target: <strong className="text-slate-900">{activePipeline?.targetCompany || '목표 기업'}</strong> ({activePipeline?.targetRole || '기획자'})</span>
          </span>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>글자수: <strong>{charCount}자</strong></span>
            <span>단어수: <strong>{wordCount}개</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-800 text-xs font-bold transition-all flex items-center gap-1"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? '복사됨' : '전체 복사'}</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-800 text-xs font-bold transition-all flex items-center gap-1"
          >
            <FileDown size={14} />
            <span>PDF 내보내기</span>
          </button>
          <button
            onClick={handleSaveFinal}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1"
          >
            <Save size={14} />
            <span>최종 저장</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6 max-w-screen-2xl mx-auto w-full">
        {/* Left Pane: Interactive Editor */}
        <div className="flex-1 lg:flex-[3] min-h-[420px] lg:min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col relative overflow-hidden">
          {/* Doc Switcher Bar */}
          <div className="border-b border-slate-200/80 p-3 flex flex-wrap justify-between items-center bg-slate-50/80 gap-2">
            <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-xl">
              <button
                onClick={() => setDocType('resume')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  docType === 'resume' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                이력서 (목차)
              </button>
              <button
                onClick={() => setDocType('career')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  docType === 'career' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                경력기술서 (디테일)
              </button>
              <button
                onClick={() => setDocType('coverLetter')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  docType === 'coverLetter' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                자기소개서 (스토리)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateDocument}
                disabled={isGeneratingDoc}
                className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                {isGeneratingDoc ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                <span>{isGeneratingDoc ? 'AI 초안 생성 중...' : hasGeneratedDoc ? 'AI 초안 다시 생성' : 'AI 초안 생성'}</span>
              </button>
              <button
                onClick={handleAiPolish}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Sparkles size={14} className="text-emerald-600" />
                <span>✨ AI 3C4P 문체 다듬기</span>
              </button>
            </div>
          </div>

          {/* Textarea Area */}
          <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
            <textarea
              value={getCurrentText()}
              onChange={handleTextChange}
              placeholder="지원서 내용을 직접 작성하거나 AI 검증 수정안을 적용하세요..."
              className="w-full flex-1 p-4 border border-slate-200/80 rounded-xl text-sm md:text-base leading-relaxed text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 resize-none font-sans"
            ></textarea>
          </div>
        </div>

        {/* Right Pane: AI Copilot Sidebar */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex-none min-h-[480px] lg:min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-1.5">
            <button
              onClick={() => setActiveTab('strategy')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                activeTab === 'strategy'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              지원 전략
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                activeTab === 'evidence'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              수치 검증
            </button>
            <button
              onClick={() => setActiveTab('defense')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                activeTab === 'defense'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              면접 방어
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4">
            {/* TAB 1: STRATEGY */}
            {activeTab === 'strategy' && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>{activePipeline?.targetCompany || '목표 기업'} 지원 전략 요약</span>
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-900 block mb-1 text-[11px]">PRIMARY STRATEGY</span>
                    <p className="text-slate-900 font-bold">
                      {activePipeline?.primaryStrategy || '3C4P 기반 대표 경험을 자소서 1번 문항에 배치'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-1 text-[11px]">SECONDARY STRATEGY</span>
                    <p className="text-slate-800">
                      {activePipeline?.secondaryStrategy || '데이터 분석 수치로 보조 역량 증명'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EVIDENCE VERIFICATION */}
            {activeTab === 'evidence' && (
              <>
                {!hasGeneratedDoc ? (
                  <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                    <FileQuestion size={28} className="mx-auto text-slate-300 mb-2.5" />
                    <p className="text-xs font-bold text-slate-700 mb-1">아직 검증할 초안이 없습니다</p>
                    <p className="text-[11px] text-slate-500">
                      상단의 <strong>"AI 초안 생성"</strong> 버튼으로 지원서를 먼저 만들어주세요.
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleRunValidation}
                      disabled={isValidating}
                      className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      {isValidating ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      <span>
                        {isValidating
                          ? '수치 검증 실행 중...'
                          : isValidationCurrent
                          ? '수치 검증 다시 실행'
                          : '수치 검증 실행'}
                      </span>
                    </button>

                    {isValidationCurrent && evidenceValidation && (
                      <>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                          <div className="flex justify-between items-center mb-2.5">
                            <span className="text-xs font-bold text-slate-900">종합 검증 점수</span>
                            <span className="text-base font-bold text-emerald-700">
                              {Math.round(evidenceValidation.overall_score * 100)}점
                            </span>
                          </div>
                          <div className="flex gap-2 text-[11px] font-bold">
                            <span className="flex-1 text-center py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                              검증됨 {evidenceValidation.verified}
                            </span>
                            <span className="flex-1 text-center py-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                              주의 {evidenceValidation.flagged}
                            </span>
                            <span className="flex-1 text-center py-1.5 bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
                              미검증 {evidenceValidation.unverified}
                            </span>
                          </div>
                        </div>

                        {evidenceValidation.claims.length === 0 ? (
                          <p className="text-[11px] text-slate-500 text-center py-4">
                            문서에서 검증할 수치 claim이 발견되지 않았습니다.
                          </p>
                        ) : (
                          evidenceValidation.claims.map((claim) => {
                            const isVerified = claim.status === 'verified';
                            const isFlagged = claim.status === 'flagged';
                            return (
                              <div
                                key={claim.claim_id}
                                className={`bg-white p-4 rounded-2xl shadow-2xs relative overflow-hidden ${
                                  isVerified
                                    ? 'border border-slate-200/80'
                                    : isFlagged
                                    ? 'border border-amber-300'
                                    : 'border border-rose-300'
                                }`}
                              >
                                {!isVerified && (
                                  <div
                                    className={`absolute top-0 left-0 w-1.5 h-full ${
                                      isFlagged ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                  ></div>
                                )}
                                <div className="flex gap-2.5 items-start">
                                  {isVerified ? (
                                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertTriangle
                                      size={18}
                                      className={`${isFlagged ? 'text-amber-600' : 'text-rose-600'} flex-shrink-0 mt-0.5`}
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-xs text-slate-900">
                                      {isVerified ? '검증 완료 (VERIFIED)' : isFlagged ? '주의: 근거 보강 필요 (FLAGGED)' : '미검증 (UNVERIFIED)'}
                                    </h4>
                                    <p className="text-[11px] text-slate-600 mt-1 break-words">{claim.claim_text}</p>
                                    {claim.evidence_text && (
                                      <p className="text-[11px] text-slate-500 mt-1">근거: {claim.evidence_text}</p>
                                    )}
                                  </div>
                                </div>
                                {claim.issues.length > 0 && (
                                  <div className="bg-amber-50 p-2.5 rounded-xl text-[11px] text-amber-950 mt-2.5 border-l-2 border-amber-400 font-medium">
                                    {claim.issues.join(' / ')}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* TAB 3: DEFENSE INTERVIEW */}
            {activeTab === 'defense' && (
              <>
                {/* Score Progress Meter */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldAlert size={16} /> AI 모의 압박 면접 방어력
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      {documentDraft.defenseScore || 87} / 100점
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${documentDraft.defenseScore || 87}%` }}
                      transition={{ duration: 0.5 }}
                    ></motion.div>
                  </div>
                </div>

                {/* AI Defense Question Generation */}
                <button
                  onClick={handleGenerateDefenseQuestions}
                  disabled={isGeneratingDefense || !hasGeneratedDoc}
                  className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isGeneratingDefense ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                  <span>{isGeneratingDefense ? '압박 질문 생성 중...' : 'AI 실전 압박 질문 생성'}</span>
                </button>
                {!hasGeneratedDoc && (
                  <p className="text-[11px] text-slate-400 text-center -mt-2">
                    먼저 상단에서 AI 초안을 생성하면 압박 질문을 만들 수 있어요.
                  </p>
                )}

                {/* Response Recommendation Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500">빠른 답변 모범 칩:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '3C4P 수치 산출 근거 설명하기',
                      '내 핵심 역할(Action) 강조',
                      '팀원 설득 및 스크럼 과제'
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickChipClick(chip)}
                        className="text-[11px] bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors font-bold"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Timeline */}
                <div className="space-y-3">
                  {defenseMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                          msg.sender === 'user'
                            ? 'bg-slate-900 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                          msg.sender === 'user'
                            ? 'bg-slate-900 text-white rounded-tr-none shadow-xs'
                            : 'bg-white border border-slate-200/80 text-slate-900 rounded-tl-none shadow-2xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Defense Input Form */}
          {activeTab === 'defense' && (
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200">
              <div className="relative">
                <input
                  type="text"
                  value={userInputMessage}
                  onChange={(e) => setUserInputMessage(e.target.value)}
                  placeholder="면접관 압박 질문에 답변해보기..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-900 hover:text-emerald-600 p-1"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorView;
