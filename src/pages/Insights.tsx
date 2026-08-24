import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Briefcase, ExternalLink, Globe, Plus, RefreshCw, Search, Sparkles, Tag } from 'lucide-react';
import { ViewState } from '../types/navigation';
import { api, ApiError, JobResponse, InterviewResearchResponse } from '../lib/api';
import { useApp } from '../context/AppContext';
import { Badge, BadgeTone, Button, Card, EmptyState, SectionHeading } from '../components/ui';
import { cn } from '../components/ui';

interface InsightsViewProps {
  onNavigate: (view: ViewState) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  technical: '기술',
  behavioral: '행동/역량',
  culture_fit: '컬처핏',
  pressure: '압박 질문'
};

const CATEGORY_TONE: Record<string, BadgeTone> = {
  technical: 'brand',
  behavioral: 'success',
  culture_fit: 'warning',
  pressure: 'danger'
};

const InsightsView: React.FC<InsightsViewProps> = ({ onNavigate }) => {
  const { showToast, handleActionError } = useApp();

  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [research, setResearch] = useState<InterviewResearchResponse | null>(null);
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.jobs.list();
        if (cancelled) return;
        setJobs(list);
        setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      } catch (err) {
        console.error('Failed to load jobs', err);
        if (!cancelled) {
          setFailed(true);
          showToast('채용 공고를 불러오지 못했습니다.', 'warning');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading the cached research is a plain GET (no LLM/search cost) — safe to run
  // automatically when the selected job changes. Only run() (the button below)
  // triggers an actual web-search + LLM synthesis pass.
  useEffect(() => {
    if (!selectedId) {
      setResearch(null);
      return;
    }
    let cancelled = false;
    setIsResearchLoading(true);
    setResearch(null);
    api.interviewResearch
      .get(selectedId)
      .then((result) => {
        if (!cancelled) setResearch(result);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setResearch(null);
        } else {
          console.error('Failed to load interview research', err);
        }
      })
      .finally(() => {
        if (!cancelled) setIsResearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = useMemo(() => jobs.find((j) => j.id === selectedId) || null, [jobs, selectedId]);

  const runResearch = async () => {
    if (!selectedId || isRunning) return;
    setIsRunning(true);
    try {
      const result = await api.interviewResearch.run(selectedId);
      setResearch(result);
      showToast('웹 리서치 기반 면접 인사이트를 생성했습니다.', 'success');
    } catch (err) {
      handleActionError(err, '리서치에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-64 animate-pulse" aria-busy="true">
          <span className="sr-only">채용 공고를 불러오는 중입니다...</span>
        </Card>
        <Card className="h-96 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  if (failed) {
    return (
      <EmptyState
        icon={<AlertTriangle size={26} />}
        title="공고를 불러오지 못했습니다"
        description="백엔드 연결을 확인한 뒤 다시 시도해주세요."
      />
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<Search size={26} />}
        title="분석된 공고가 없습니다"
        description="채용 공고를 등록하면 그 회사·팀에 대한 웹 리서치로 예상 면접 질문을 뽑아드립니다."
        action={
          <Button icon={<Plus size={16} />} onClick={() => onNavigate('pipeline')}>
            공고 분석하기
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Job list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-700">등록된 공고 {jobs.length}건</h3>
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => onNavigate('pipeline')}>
            추가
          </Button>
        </div>

        {jobs.map((job) => {
          const isActive = job.id === selectedId;
          return (
            <button
              key={job.id}
              onClick={() => setSelectedId(job.id)}
              className={cn(
                'w-full rounded-2xl border p-4 text-left shadow-sm transition-all',
                isActive
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <h4 className="font-bold text-slate-900">{job.company_name || '기업 미상'}</h4>
              <p className="mt-1 text-sm text-slate-600">{job.position || '직무 미상'}</p>
              <p className="mt-2.5 text-xs text-slate-400">
                {new Date(job.created_at).toLocaleDateString()} 분석됨
              </p>
            </button>
          );
        })}
      </div>

      {/* Research panel */}
      <div className="space-y-6">
        <Card>
          <SectionHeading
            icon={<Briefcase size={20} />}
            title={`${selected?.company_name || '기업 미상'} · ${selected?.position || '직무 미상'}`}
            description="회사·팀에 대한 웹 리서치(인터뷰 후기, 기술 블로그, 기사)를 바탕으로 예상 면접 질문을 뽑아냅니다."
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={isRunning ? undefined : research ? <RefreshCw size={14} /> : <Sparkles size={14} />}
                isLoading={isRunning}
                onClick={runResearch}
              >
                {isRunning ? '웹 리서치 중…' : research ? '다시 분석' : '심층 리서치 시작'}
              </Button>
            }
          />
        </Card>

        {isResearchLoading ? (
          <Card className="h-64 animate-pulse" aria-busy="true">
            <span className="sr-only">리서치 결과를 불러오는 중입니다...</span>
          </Card>
        ) : !research ? (
          <EmptyState
            icon={<Globe size={26} />}
            title="아직 리서치하지 않았습니다"
            description="'심층 리서치 시작'을 누르면 이 회사·팀의 인터뷰 후기와 기술 블로그를 찾아 예상 면접 질문을 정리해드립니다. 한 번 만든 결과는 저장되고, 다시 누를 때만 새로 분석합니다."
            action={
              <Button icon={<Sparkles size={16} />} isLoading={isRunning} onClick={runResearch}>
                심층 리서치 시작
              </Button>
            }
          />
        ) : (
          <>
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Sparkles size={19} className="text-brand-600" />
                예상 면접 질문
              </h3>
              {research.predicted_questions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  근거가 될 자료가 부족해 예상 질문을 만들지 못했습니다.
                </p>
              ) : (
                <ul className="space-y-3">
                  {research.predicted_questions.map((q, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{q.question}</span>
                        <Badge tone={CATEGORY_TONE[q.category] || 'neutral'} className="flex-shrink-0">
                          {CATEGORY_LABEL[q.category] || q.category}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">{q.rationale}</p>
                      {q.source_hint && (
                        <p className="mt-1.5 text-xs text-slate-400">근거: {q.source_hint}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="mb-1.5 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Globe size={19} className="text-emerald-600" />
                웹 서칭 인사이트
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                인터뷰 후기·기술 블로그·기사에서 확인된, 이 회사/팀이 최근 중요하게 여기는 것들입니다.
              </p>
              {research.web_insights.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  관련 자료를 충분히 찾지 못했습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {research.web_insights.map((insight, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{insight.topic}</span>
                        {insight.source_url && (
                          <a
                            href={insight.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-shrink-0 items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                          >
                            출처 <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">{insight.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Tag size={19} className="text-amber-600" />
                키워드 트렌드
              </h3>
              {research.keywords.length === 0 ? (
                <p className="text-sm text-slate-500">추출된 키워드가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {research.keywords.map((kw, i) => (
                    <Badge key={`${kw}-${i}`} tone="neutral" className="text-sm">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {research.sources.length > 0 && (
              <Card>
                <h3 className="mb-3 text-sm font-bold text-slate-700">참고한 출처</h3>
                <ul className="space-y-1.5">
                  {research.sources.map((s, i) => (
                    <li key={i}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
                      >
                        <ExternalLink size={12} className="flex-shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InsightsView;
