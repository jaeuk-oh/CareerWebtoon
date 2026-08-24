import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, FileQuestion, Lightbulb, ShieldCheck, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, Card, CircularGauge, EmptyState } from './ui';

/**
 * A summary of what actually happened in this application's document + defence
 * practice — built only from real data (validation results, answered questions).
 *
 * The reference mock's report showed a "confidence index" and speech-pace metrics
 * derived from voice — there is no microphone pipeline here and no way to measure
 * those honestly, so this screen never fabricates a number it can't back up. Every
 * figure here traces back to something the backend actually computed.
 */
export const DefenseReport: React.FC = () => {
  const { documentDraft, evidenceValidation, defenseMessages } = useApp();

  const answeredQuestions = useMemo(
    () =>
      defenseMessages
        .filter((m) => m.sender === 'ai' && m.claimText)
        .map((q) => ({
          question: q,
          answers: defenseMessages.filter((m) => m.sender === 'user' && m.answersQuestionId === q.id),
          feedback: defenseMessages.find(
            (m) => m.sender === 'ai' && m.answersQuestionId === q.id && m.id !== q.id
          )
        }))
        .filter((entry) => entry.answers.length > 0),
    [defenseMessages]
  );

  const hasValidation = Boolean(evidenceValidation);
  const hasAnyAnswers = answeredQuestions.length > 0;

  if (!hasValidation && !hasAnyAnswers) {
    return (
      <EmptyState
        icon={<FileQuestion size={26} />}
        title="아직 리포트로 정리할 결과가 없습니다"
        description="지원서 작성 화면에서 근거 검증을 실행하거나, 옆의 '예상 질문 연습'에서 질문에 답변해보세요."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex flex-col items-center">
          <h3 className="mb-4 w-full text-sm font-bold uppercase tracking-wide text-slate-500">방어 점수</h3>
          {documentDraft.defenseScore > 0 ? (
            <CircularGauge
              value={documentDraft.defenseScore}
              tone={
                documentDraft.defenseScore >= 70
                  ? 'success'
                  : documentDraft.defenseScore >= 40
                    ? 'warning'
                    : 'danger'
              }
              className="h-32 w-32"
            />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">아직 답변 연습 기록이 없습니다.</p>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <ShieldCheck size={16} /> 근거 검증
          </h3>
          {hasValidation && evidenceValidation ? (
            <>
              <div className="mb-4 text-4xl font-bold text-slate-900">
                {Math.round(evidenceValidation.overall_score * 100)}
                <span className="text-lg font-normal text-slate-500">점</span>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-center text-emerald-800">
                  검증 {evidenceValidation.verified}
                </span>
                <span className="flex-1 rounded-lg border border-amber-200 bg-amber-50 py-1.5 text-center text-amber-800">
                  주의 {evidenceValidation.flagged}
                </span>
                <span className="flex-1 rounded-lg border border-rose-200 bg-rose-50 py-1.5 text-center text-rose-800">
                  미검증 {evidenceValidation.unverified}
                </span>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">아직 근거 검증을 실행하지 않았습니다.</p>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <TrendingUp size={16} /> 답변 연습
          </h3>
          <div className="text-4xl font-bold text-slate-900">
            {answeredQuestions.length}
            <span className="text-lg font-normal text-slate-500">건</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">답변을 제출한 예상 질문 수입니다.</p>
        </Card>
      </div>

      {hasAnyAnswers && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">문항별 상세 피드백</h2>
          <div className="space-y-4">
            {answeredQuestions.map(({ question, answers, feedback }, idx) => {
              const latestAnswer = answers[answers.length - 1];
              const scoreImpact = feedback?.scoreImpact;
              return (
                <Card key={question.id} padded={false} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
                    <div className="flex items-start gap-4">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                        Q{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-base font-bold leading-relaxed text-slate-900">{question.text}</h4>
                        {question.difficulty && (
                          <Badge tone="neutral" className="mt-2">
                            {question.difficulty}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {typeof scoreImpact === 'number' && (
                      <Badge tone={scoreImpact >= 0 ? 'success' : 'danger'} className="flex-shrink-0">
                        {scoreImpact >= 0 ? '+' : ''}
                        {scoreImpact}점
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                    <div>
                      <h5 className="mb-2 text-sm font-bold text-slate-900">내 답변</h5>
                      <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                        {latestAnswer.text}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {feedback && (
                        <div>
                          <h5 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-brand-700">
                            <Lightbulb size={15} /> AI 피드백
                          </h5>
                          <p className="text-sm leading-relaxed text-slate-700">{feedback.text}</p>
                        </div>
                      )}
                      {question.expectedAnswerHint && (
                        <div>
                          <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            {scoreImpact !== undefined && scoreImpact < 0 ? (
                              <AlertTriangle size={13} />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                            기대했던 답변 방향
                          </h5>
                          <p className="text-xs leading-relaxed text-slate-500">{question.expectedAnswerHint}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
