import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileDown,
  FileQuestion,
  Loader2,
  PencilLine,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  Wand2,
  ShieldCheck,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { api, CritiqueSpan, FrontendDocType, RewriteResponse } from '../lib/api';
import {
  CRITIQUE_CATEGORY_META,
  critiqueCardId,
  critiqueMarkId,
  locatableCritiqueSpanIds
} from '../lib/critique';
import { CritiqueCanvas } from '../components/CritiqueCanvas';
import { Badge, Button, EmptyState, cn } from '../components/ui';
import { wordDiff } from '../lib/diff';

interface EditorViewProps {
  onNavigate: (view: ViewState) => void;
}

const DOC_TYPES: { id: FrontendDocType; label: string; hint: string }[] = [
  { id: 'resume', label: '이력서', hint: '목차 중심' },
  { id: 'career', label: '경력기술서', hint: '디테일 중심' },
  { id: 'coverLetter', label: '자기소개서', hint: '스토리 중심' }
];

type PanelTab = 'strategy' | 'critique' | 'defense';
type CanvasMode = 'edit' | 'review';

export const EditorView: React.FC<EditorViewProps> = ({ onNavigate }) => {
  const {
    documentDraft,
    updateDocumentContent,
    generateDocument,
    importDocumentText,
    critique,
    runCritique,
    defenseMessages,
    sendDefenseMessage,
    runDefenseGeneration,
    saveDocument,
    rewriteClaim,
    applyRewrite,
    pipelines,
    activePipelineId,
    setActivePipelineId,
    showToast,
    handleActionError
  } = useApp();

  const [activeTab, setActiveTab] = useState<PanelTab>('critique');
  const [docType, setDocType] = useState<FrontendDocType>('coverLetter');
  const [mode, setMode] = useState<CanvasMode>('edit');
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [userInputMessage, setUserInputMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isCritiquing, setIsCritiquing] = useState(false);
  const [isGeneratingDefense, setIsGeneratingDefense] = useState(false);
  const [isSendingAnswer, setIsSendingAnswer] = useState(false);
  const [rewritingSpanId, setRewritingSpanId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<(RewriteResponse & { spanId: string }) | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Text last pushed to the server, per document. Seeded on first sight so simply
  // opening a document doesn't trigger a pointless write-back.
  const lastSavedRef = useRef<Record<string, string>>({});

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) || pipelines[0];
  const generatedDocId = documentDraft.generatedDocIds?.[docType];
  const hasGeneratedDoc = Boolean(generatedDocId);
  const isCritiqueCurrent = Boolean(
    critique && generatedDocId && critique.document_id === generatedDocId
  );

  const currentText =
    docType === 'resume'
      ? documentDraft.resumeText
      : docType === 'career'
      ? documentDraft.careerText
      : documentDraft.coverLetterText;

  const critiqueSpans = useMemo(
    () => (isCritiqueCurrent && critique ? critique.spans : []),
    [isCritiqueCurrent, critique]
  );

  // Spans are located in the document by exact string match, so editing a commented-on
  // sentence quietly drops its highlight. Surface that instead of letting the count in
  // the panel silently disagree with what's underlined in the text.
  const locatable = useMemo(() => locatableCritiqueSpanIds(currentText, critiqueSpans), [currentText, critiqueSpans]);
  const unlocatableCount = critiqueSpans.length - locatable.size;

  const canReview = critiqueSpans.length > 0;
  useEffect(() => {
    if (!canReview && mode === 'review') setMode('edit');
  }, [canReview, mode]);

  useEffect(() => {
    if (activeTab === 'defense') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [defenseMessages, activeTab, isSendingAnswer]);

  // Debounced autosave. This only pushes the text — re-running critique costs an LLM
  // call and is deferred until the user actually asks for it.
  useEffect(() => {
    if (!generatedDocId) return;
    if (lastSavedRef.current[generatedDocId] === undefined) {
      lastSavedRef.current[generatedDocId] = currentText;
      return;
    }
    if (lastSavedRef.current[generatedDocId] === currentText) return;

    const docId = generatedDocId;
    const pending = currentText;
    const timer = setTimeout(() => {
      setSaveState('saving');
      saveDocument(docType)
        .then(() => {
          lastSavedRef.current[docId] = pending;
          setSaveState('saved');
        })
        .catch((err) => {
          console.error('Failed to save document', err);
          setSaveState('error');
        });
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText, generatedDocId, docType]);

  const focusSpan = (spanId: string, target: 'card' | 'mark') => {
    setActiveSpanId(spanId);
    if (target === 'card') setActiveTab('critique');
    const id = target === 'card' ? critiqueCardId(spanId) : critiqueMarkId(spanId);
    // Let the panel switch render before scrolling to the element inside it.
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    showToast('클립보드에 지원서 내용이 복사되었습니다.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadExistingDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || isUploadingDoc) return;
    setIsUploadingDoc(true);
    try {
      const uploaded = await api.documentParser.upload(file);
      const parsed = await api.documentParser.get(uploaded.id);
      const text = (parsed.raw_text || '').trim();
      if (!text) {
        showToast('파일에서 텍스트를 추출하지 못했습니다.', 'warning');
        return;
      }
      await importDocumentText(docType, text);
      setMode('edit');
      showToast(`'${uploaded.file_name}'의 내용을 불러왔습니다.`, 'success');
    } catch (err) {
      handleActionError(err, '파일을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (isGeneratingDoc) return;
    if (!activePipelineId && activePipeline) setActivePipelineId(activePipeline.id);
    setIsGeneratingDoc(true);
    try {
      await generateDocument(docType);
      setMode('edit');
    } catch (err) {
      handleActionError(err, 'AI 초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleRunCritique = async () => {
    if (isCritiquing) return;
    setIsCritiquing(true);
    try {
      await runCritique(docType);
      setActiveTab('critique');
      setMode('review');
    } catch (err) {
      handleActionError(err, 'AI 첨삭에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleGenerateDefenseQuestions = async () => {
    if (isGeneratingDefense) return;
    setIsGeneratingDefense(true);
    try {
      await runDefenseGeneration(docType);
    } catch (err) {
      handleActionError(err, '방어 질문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsGeneratingDefense(false);
    }
  };

  const handleRewrite = async (span: CritiqueSpan) => {
    if (rewritingSpanId) return;
    setRewritingSpanId(span.span_id);
    setProposal(null);
    try {
      const instruction = `첨삭 의견: ${span.comment}`;
      const result = await rewriteClaim(docType, span.span_text, instruction);
      setProposal({ ...result, spanId: span.span_id });
    } catch (err) {
      handleActionError(err, '문장 재작성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setRewritingSpanId(null);
    }
  };

  const handleApplyProposal = () => {
    if (!proposal) return;
    applyRewrite(docType, proposal.original, proposal.rewritten);
    setProposal(null);
    setMode('edit');
    showToast('수정안을 본문에 적용했습니다. 첨삭을 다시 받아 확인해보세요.', 'success');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInputMessage.trim() || isSendingAnswer) return;
    const text = userInputMessage;
    setUserInputMessage('');
    setIsSendingAnswer(true);
    try {
      await sendDefenseMessage(text);
    } finally {
      setIsSendingAnswer(false);
    }
  };

  const charCount = currentText.length;
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
  const activeDocMeta = DOC_TYPES.find((d) => d.id === docType)!;

  // Document generation, critique and defence questions are all keyed to a job, so
  // there is nothing meaningful to show — or generate — before an application exists.
  if (!activePipeline) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          className="max-w-lg"
          icon={<FileQuestion size={26} />}
          title="아직 진행 중인 지원이 없습니다"
          description="채용 공고를 분석해 지원을 만들면, 그 공고에 맞춘 지원서 초안을 생성하고 AI 첨삭을 받을 수 있습니다."
          action={
            <Button icon={<ArrowRight size={16} />} onClick={() => onNavigate('pipeline')}>
              새 지원 시작하기
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Badge tone="success" icon={<ShieldCheck size={14} />}>
            {activePipeline?.targetCompany || '목표 기업'}
          </Badge>
          <span className="truncate text-sm text-slate-500">{activePipeline?.targetRole || '지원 직무'}</span>
          <span className="hidden text-sm text-slate-400 sm:inline">
            {charCount}자 · {wordCount}단어
          </span>
          {saveState !== 'idle' && (
            <span
              className={cn(
                'hidden text-xs font-bold md:inline',
                saveState === 'error' ? 'text-rose-600' : 'text-slate-400'
              )}
            >
              {saveState === 'saving' ? '저장 중...' : saveState === 'saved' ? '저장됨' : '저장 실패'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleCopyText} icon={copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}>
            {copied ? '복사됨' : '전체 복사'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()} icon={<FileDown size={14} />}>
            PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Document canvas */}
        <div className="flex min-h-[60vh] flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 md:px-10">
            {/* Doc type switcher */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDocType(d.id)}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-bold transition-colors',
                    docType === d.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  )}
                >
                  {d.label}
                  <span className={cn('ml-1.5 text-xs font-medium', docType === d.id ? 'text-brand-200' : 'text-slate-400')}>
                    {d.hint}
                  </span>
                </button>
              ))}
            </div>

            <header className="mb-6">
              <p className="mb-1 text-sm font-bold uppercase tracking-wider text-brand-600">
                {activeDocMeta.label}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {activePipeline?.targetCompany || '목표 기업'} {activeDocMeta.label}
              </h2>
            </header>

            {/* Mode toggle + generate */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setMode('edit')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-bold transition-colors',
                    mode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <PencilLine size={15} /> 편집
                </button>
                <button
                  onClick={() => canReview && setMode('review')}
                  disabled={!canReview}
                  title={canReview ? undefined : 'AI 첨삭을 받으면 본문에 첨삭 의견이 표시됩니다.'}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-bold transition-colors',
                    mode === 'review' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900',
                    !canReview && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Eye size={15} /> 첨삭 보기
                  {canReview && <span className="text-xs text-slate-400">{locatable.size}</span>}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleUploadExistingDoc}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={isUploadingDoc}
                  icon={isUploadingDoc ? undefined : <Upload size={15} />}
                  size="sm"
                >
                  {isUploadingDoc ? '불러오는 중...' : '기존 파일 업로드'}
                </Button>
                <Button
                  onClick={handleGenerateDocument}
                  isLoading={isGeneratingDoc}
                  icon={<Bot size={15} />}
                  size="sm"
                >
                  {isGeneratingDoc ? 'AI 초안 생성 중...' : hasGeneratedDoc ? 'AI 초안 다시 생성' : 'AI 초안 생성'}
                </Button>
              </div>
            </div>

            {mode === 'review' && unlocatableCount > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  첨삭 의견 {critiqueSpans.length}건 중 {unlocatableCount}건은 본문에서 찾지 못해 표시되지 않았습니다.
                  문서를 수정했다면 첨삭을 다시 받아주세요.
                </span>
              </div>
            )}

            {mode === 'review' ? (
              <CritiqueCanvas
                content={currentText}
                spans={critiqueSpans}
                activeSpanId={activeSpanId}
                onSelectSpan={(id) => focusSpan(id, 'card')}
              />
            ) : (
              <textarea
                value={currentText}
                onChange={(e) => updateDocumentContent(docType, e.target.value)}
                placeholder="직접 작성하거나 붙여넣거나, 위에서 '기존 파일 업로드' 또는 'AI 초안 생성'을 눌러 시작하세요..."
                className="min-h-[55vh] w-full resize-none border-0 bg-transparent p-0 text-base leading-[1.9] text-slate-800 outline-none placeholder:text-slate-400"
              />
            )}
          </div>
        </div>

        {/* Right rail */}
        <aside className="flex w-full flex-col border-t border-slate-200 bg-white lg:w-[380px] lg:flex-shrink-0 lg:border-t-0 lg:shadow-[-4px_0_16px_rgba(15,23,42,0.04)] xl:w-[420px]">
          <div className="flex gap-1.5 border-b border-slate-200 bg-slate-50 p-2">
            {([
              { id: 'strategy', label: '지원 전략' },
              { id: 'critique', label: '첨삭' },
              { id: 'defense', label: '면접 방어' }
            ] as { id: PanelTab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 rounded-xl py-2 text-center text-sm font-bold transition-colors',
                  activeTab === tab.id ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {/* --- Strategy --- */}
            {activeTab === 'strategy' && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                  <ShieldCheck size={17} className="text-emerald-600" />
                  {activePipeline?.targetCompany || '목표 기업'} 지원 전략
                </h4>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                  <span className="mb-1 block text-xs font-bold text-emerald-900">핵심 전략</span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
                    {activePipeline?.primaryStrategy || '경험을 등록하고 지원을 시작하면 AI가 핵심 전략을 만들어줍니다.'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="mb-1 block text-xs font-bold text-slate-600">보완할 점</span>
                  <p className="text-sm leading-relaxed text-slate-800">
                    {activePipeline?.secondaryStrategy || '아직 보완 제안이 없습니다.'}
                  </p>
                </div>
              </div>
            )}

            {/* --- Writing critique --- */}
            {activeTab === 'critique' && (
              <>
                {!hasGeneratedDoc ? (
                  <EmptyState
                    icon={<FileQuestion size={24} />}
                    title="첨삭할 초안이 없습니다"
                    description="'AI 초안 생성'으로 지원서를 먼저 만들어주세요."
                  />
                ) : (
                  <>
                    <Button
                      fullWidth
                      onClick={handleRunCritique}
                      isLoading={isCritiquing}
                      icon={<Sparkles size={15} />}
                    >
                      {isCritiquing ? 'AI 첨삭 중...' : isCritiqueCurrent ? 'AI 첨삭 다시 받기' : 'AI 첨삭 받기'}
                    </Button>

                    {isCritiqueCurrent && critique && (
                      <>
                        {critique.overall_comment && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-600">
                              총평
                            </span>
                            <p className="text-sm leading-relaxed text-slate-800">{critique.overall_comment}</p>
                          </div>
                        )}

                        {critiqueSpans.length === 0 ? (
                          <p className="py-4 text-center text-sm text-slate-500">
                            AI가 문장 단위로 첨삭할 부분을 찾지 못했습니다.
                          </p>
                        ) : (
                          critiqueSpans.map((span) => {
                            const meta = CRITIQUE_CATEGORY_META[span.category];
                            const canHighlight = locatable.has(span.span_id);
                            const isActive = activeSpanId === span.span_id;
                            const canRewrite = span.category !== 'strength';

                            return (
                              <div
                                key={span.span_id}
                                id={critiqueCardId(span.span_id)}
                                className={cn(
                                  'rounded-2xl border bg-white p-4 shadow-sm transition-all',
                                  span.category === 'strength'
                                    ? 'border-slate-200 border-l-4 border-l-emerald-500 opacity-70 hover:opacity-100'
                                    : span.category === 'improvement'
                                    ? 'border-amber-200 border-l-4 border-l-amber-500'
                                    : 'border-brand-200 border-l-4 border-l-brand-500',
                                  isActive && 'opacity-100 ring-2 ring-brand-400'
                                )}
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <Badge
                                    tone={meta.tone}
                                    icon={
                                      span.category === 'strength' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />
                                    }
                                  >
                                    {meta.label}
                                  </Badge>
                                  {canHighlight && (
                                    <button
                                      onClick={() => {
                                        setMode('review');
                                        focusSpan(span.span_id, 'mark');
                                      }}
                                      className="flex-shrink-0 text-xs font-bold text-brand-600 hover:underline"
                                    >
                                      본문에서 보기
                                    </button>
                                  )}
                                </div>

                                <p className="text-sm leading-relaxed text-slate-800">{span.span_text}</p>

                                <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                                  {span.comment}
                                </p>

                                {canRewrite && proposal?.spanId !== span.span_id && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="mt-3"
                                    icon={<Wand2 size={13} />}
                                    isLoading={rewritingSpanId === span.span_id}
                                    onClick={() => handleRewrite(span)}
                                  >
                                    {rewritingSpanId === span.span_id ? '다시 쓰는 중...' : '이 문장 다시 쓰기'}
                                  </Button>
                                )}

                                {proposal?.spanId === span.span_id && (
                                  <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                                    <span className="text-xs font-bold text-brand-900">AI 수정안</span>
                                    <p className="mt-1.5 text-sm leading-relaxed text-slate-900">
                                      {wordDiff(proposal.original, proposal.rewritten).map((seg, i) =>
                                        seg.added ? (
                                          <strong key={i} className="rounded bg-brand-100 px-0.5 font-bold text-brand-900">
                                            {seg.text}
                                          </strong>
                                        ) : (
                                          <React.Fragment key={i}>{seg.text}</React.Fragment>
                                        )
                                      )}
                                    </p>
                                    {proposal.rationale && (
                                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                        {proposal.rationale}
                                      </p>
                                    )}
                                    <div className="mt-3 flex gap-2">
                                      <Button size="sm" onClick={handleApplyProposal}>
                                        적용하기
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setProposal(null)}>
                                        무시
                                      </Button>
                                    </div>
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

            {/* --- Defense --- */}
            {activeTab === 'defense' && (
              <>
                <div className="rounded-2xl bg-slate-900 p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                      <ShieldAlert size={16} /> 모의 면접 방어력
                    </span>
                    <span className="text-base font-bold text-emerald-400">
                      {documentDraft.defenseScore > 0 ? `${documentDraft.defenseScore} / 100점` : '검증 전'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${documentDraft.defenseScore}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                <Button
                  fullWidth
                  onClick={handleGenerateDefenseQuestions}
                  isLoading={isGeneratingDefense}
                  disabled={!hasGeneratedDoc}
                  icon={<ShieldAlert size={15} />}
                >
                  {isGeneratingDefense ? '예상 질문 만드는 중...' : 'AI 예상 질문 만들기'}
                </Button>
                {!hasGeneratedDoc && (
                  <p className="-mt-2 text-center text-xs text-slate-400">
                    먼저 AI 초안을 생성하면 예상 질문을 만들 수 있어요.
                  </p>
                )}

                {defenseMessages.length === 0 && hasGeneratedDoc && (
                  <p className="py-2 text-center text-xs text-slate-400">
                    위 버튼을 눌러 예상 질문을 만들면 여기서 답변을 연습할 수 있어요.
                  </p>
                )}

                <div className="space-y-3">
                  {defenseMessages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-2.5', msg.sender === 'user' && 'flex-row-reverse')}>
                      <div
                        className={cn(
                          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white',
                          msg.sender === 'user' ? 'bg-slate-900' : 'bg-brand-600'
                        )}
                      >
                        {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed',
                          msg.sender === 'user'
                            ? 'rounded-tr-none bg-slate-900 text-white shadow-sm'
                            : 'rounded-tl-none border border-slate-200 bg-white text-slate-900 shadow-sm'
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isSendingAnswer && (
                    <div className="flex gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                        <Bot size={14} />
                      </div>
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-sm">
                        <Loader2 size={14} className="animate-spin" /> 답변을 평가하는 중...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </>
            )}
          </div>

          {activeTab === 'defense' && (
            <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-3">
              <div className="relative">
                <input
                  type="text"
                  value={userInputMessage}
                  onChange={(e) => setUserInputMessage(e.target.value)}
                  placeholder="예상 질문에 답변해보기..."
                  disabled={isSendingAnswer}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-brand-500 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isSendingAnswer}
                  aria-label="답변 보내기"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-brand-600 disabled:opacity-40"
                >
                  {isSendingAnswer ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
};

export default EditorView;
