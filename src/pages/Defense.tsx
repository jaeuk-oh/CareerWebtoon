import React, { useMemo, useState } from 'react';
import { Bot, Flame, Loader2, Send, ShieldAlert, ShieldCheck, Sparkles, User } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { FrontendDocType } from '../lib/api';
import { DefenseChatMessage } from '../types/document';
import { DefenseReport } from '../components/DefenseReport';
import { Badge, Button, Card, CircularGauge, EmptyState, SectionHeading, cn } from '../components/ui';

interface DefenseViewProps {
  onNavigate: (view: ViewState) => void;
}

// The backend stores these on defense_questions.difficulty; the editor's flat chat
// never used them, so 27 questions arrived as one undifferentiated list.
const DIFFICULTY_GROUPS: { key: string; label: string; hint: string; tone: 'success' | 'warning' | 'danger'; icon: React.ReactNode }[] = [
  { key: 'basic', label: '기본', hint: '먼저 확실히 답할 수 있어야 하는 질문', tone: 'success', icon: <ShieldCheck size={16} /> },
  { key: 'pressure', label: '압박', hint: '근거가 약한 지점을 파고드는 질문', tone: 'warning', icon: <Flame size={16} /> },
  { key: 'deep', label: '심화', hint: '판단의 이유까지 묻는 질문', tone: 'danger', icon: <Sparkles size={16} /> }
];

const DefenseView: React.FC<DefenseViewProps> = ({ onNavigate }) => {
  const {
    defenseMessages,
    sendDefenseMessage,
    runDefenseGeneration,
    documentDraft,
    pipelines,
    activePipelineId,
    showToast
  } = useApp();

  const [docType] = useState<FrontendDocType>('coverLetter');
  const [tab, setTab] = useState<'practice' | 'report'>('practice');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) || pipelines[0];
  const hasGeneratedDoc = Boolean(documentDraft.generatedDocIds?.[docType]);

  const questions = useMemo(
    () => defenseMessages.filter((m) => m.sender === 'ai' && m.claimText),
    [defenseMessages]
  );

  const grouped = useMemo(() => {
    const known = new Set(DIFFICULTY_GROUPS.map((g) => g.key));
    return DIFFICULTY_GROUPS.map((group) => ({
      ...group,
      items: questions.filter((q) => {
        const d = (q.difficulty || '').toLowerCase();
        // Questions with a missing or unrecognised difficulty land in 기본 rather than
        // disappearing from the screen entirely.
        return d === group.key || (group.key === 'basic' && !known.has(d));
      })
    }));
  }, [questions]);

  const selected = questions.find((q) => q.id === selectedId) || null;
  const thread = defenseMessages.filter((m) => selected && m.answersQuestionId === selected.id);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      await runDefenseGeneration(docType);
    } catch (err) {
      console.error(err);
      showToast('예상 질문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !selected || isSending) return;
    const text = answer;
    setAnswer('');
    setIsSending(true);
    try {
      await sendDefenseMessage(text, selected);
    } finally {
      setIsSending(false);
    }
  };

  if (!activePipeline) {
    return (
      <EmptyState
        icon={<ShieldAlert size={26} />}
        title="아직 진행 중인 지원이 없습니다"
        description="지원을 만들고 지원서 초안을 생성하면, 그 문서의 약한 주장을 근거로 압박 질문을 만들어드립니다."
        action={<Button onClick={() => onNavigate('pipeline')}>새 지원 시작하기</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <SectionHeading
          icon={<ShieldAlert size={20} />}
          title={`${activePipeline.targetCompany} 면접 방어`}
          description="검증에서 근거가 약하다고 표시된 주장을 파고드는 예상 질문입니다."
        />
        <div className="flex flex-shrink-0 items-center gap-5">
          {documentDraft.defenseScore > 0 && (
            <CircularGauge
              value={documentDraft.defenseScore}
              tone={documentDraft.defenseScore >= 70 ? 'success' : documentDraft.defenseScore >= 40 ? 'warning' : 'danger'}
              className="h-24 w-24"
            />
          )}
          <Button
            onClick={handleGenerate}
            isLoading={isGenerating}
            disabled={!hasGeneratedDoc}
            icon={<ShieldAlert size={15} />}
          >
            {questions.length > 0 ? '예상 질문 다시 만들기' : 'AI 예상 질문 만들기'}
          </Button>
        </div>
      </Card>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {([
          { key: 'practice', label: '예상 질문 연습' },
          { key: 'report', label: '결과 리포트' }
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors',
              tab === t.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'report' ? (
        <DefenseReport />
      ) : !hasGeneratedDoc ? (
        <EmptyState
          icon={<ShieldAlert size={26} />}
          title="검증할 지원서 초안이 없습니다"
          description="지원서 작성 화면에서 AI 초안을 만들고 근거 검증을 실행하면, 약한 주장에 대한 질문이 생성됩니다."
          action={<Button onClick={() => onNavigate('editor')}>지원서 작성으로 이동</Button>}
        />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={26} />}
          title="아직 생성된 예상 질문이 없습니다"
          description="위의 'AI 예상 질문 만들기'를 눌러주세요. 근거 검증을 먼저 실행하면 더 정확한 질문이 나옵니다."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          {/* Questions by difficulty */}
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.key}>
                <div className="mb-3 flex items-center gap-2.5">
                  <Badge tone={group.tone} icon={group.icon}>
                    {group.label} {group.items.length}
                  </Badge>
                  <span className="text-sm text-slate-500">{group.hint}</span>
                </div>

                {group.items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    이 난이도의 질문은 생성되지 않았습니다.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {group.items.map((q) => {
                      const isActive = selectedId === q.id;
                      const answered = defenseMessages.some(
                        (m) => m.answersQuestionId === q.id && m.sender === 'user'
                      );
                      return (
                        <button
                          key={q.id}
                          onClick={() => setSelectedId(q.id)}
                          className={cn(
                            'w-full rounded-2xl border p-4 text-left shadow-sm transition-all',
                            isActive
                              ? 'border-brand-600 bg-brand-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <p className="text-base font-bold leading-relaxed text-slate-900">{q.text}</p>
                            {answered && (
                              <Badge tone="success" className="flex-shrink-0">
                                답변함
                              </Badge>
                            )}
                          </div>
                          {q.claimText && (
                            <p className="mt-2 border-l-2 border-slate-200 pl-2.5 text-sm text-slate-500">
                              대상 주장: {q.claimText}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Answer practice rail */}
          <Card padded={false} className="flex h-fit flex-col lg:sticky lg:top-4">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-base font-bold text-slate-900">답변 연습</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {selected ? '이 질문에 답하면 AI가 근거의 강약을 평가합니다.' : '왼쪽에서 질문을 선택하세요.'}
              </p>
            </div>

            <div className="max-h-[28rem] flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {!selected ? (
                <p className="py-8 text-center text-sm text-slate-400">선택된 질문이 없습니다.</p>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <p className="text-sm font-bold leading-relaxed text-slate-900">{selected.text}</p>
                    {selected.expectedAnswerHint && (
                      <p className="mt-2.5 rounded-xl bg-brand-50 p-2.5 text-xs leading-relaxed text-brand-900">
                        힌트: {selected.expectedAnswerHint}
                      </p>
                    )}
                  </div>

                  {thread.map((msg) => (
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
                            ? 'rounded-tr-none bg-slate-900 text-white'
                            : 'rounded-tl-none border border-slate-200 bg-white text-slate-900'
                        )}
                      >
                        {msg.text}
                        {typeof msg.scoreImpact === 'number' && msg.scoreImpact !== 0 && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              'mt-2 block text-xs font-bold',
                              msg.scoreImpact > 0 ? 'text-emerald-600' : 'text-rose-600'
                            )}
                          >
                            방어 점수 {msg.scoreImpact > 0 ? '+' : ''}
                            {msg.scoreImpact}
                          </motion.span>
                        )}
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> 답변을 평가하는 중...
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleAnswer} className="border-t border-slate-200 p-3">
              <div className="relative">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={selected ? '이 질문에 답해보기...' : '질문을 먼저 선택하세요'}
                  disabled={!selected || isSending}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-brand-500 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!selected || isSending}
                  aria-label="답변 보내기"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-brand-600 disabled:opacity-40"
                >
                  {isSending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DefenseView;
