import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Briefcase, Eye, Plus, Search, Sparkles, Target } from 'lucide-react';
import { ViewState } from '../types/navigation';
import { api, JobResponse, JobRequirementItem } from '../lib/api';
import { useApp } from '../context/AppContext';
import { Badge, Button, Card, EmptyState, SectionHeading, cn } from '../components/ui';

interface InsightsViewProps {
  onNavigate: (view: ViewState) => void;
}

const PRIORITY_TONE = (priority: number): 'danger' | 'warning' | 'neutral' =>
  priority >= 5 ? 'danger' : priority >= 3 ? 'warning' : 'neutral';

const PRIORITY_LABEL = (priority: number) =>
  priority >= 5 ? '필수' : priority >= 3 ? '우대' : '참고';

const RequirementList: React.FC<{ items: JobRequirementItem[]; emptyText: string }> = ({
  items,
  emptyText
}) => {
  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {[...items]
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .map((item, i) => (
          <li key={`${item.competency}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">{item.competency}</span>
              <Badge tone={PRIORITY_TONE(item.priority)} className="flex-shrink-0">
                {PRIORITY_LABEL(item.priority)}
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
            )}
          </li>
        ))}
    </ul>
  );
};

const InsightsView: React.FC<InsightsViewProps> = ({ onNavigate }) => {
  const { showToast } = useApp();

  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = useMemo(() => jobs.find((j) => j.id === selectedId) || null, [jobs, selectedId]);
  const analysis = selected?.jd_analysis || null;

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
        description="채용 공고를 입력하면 AI가 명시적 요구사항, 드러나지 않은 요구사항, 조직 문화 키워드를 뽑아 여기에 정리합니다."
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
          <h3 className="text-sm font-bold text-slate-700">분석된 공고 {jobs.length}건</h3>
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

      {/* Insight panel */}
      <div className="space-y-6">
        <Card>
          <SectionHeading
            icon={<Briefcase size={20} />}
            title={`${selected?.company_name || '기업 미상'} · ${selected?.position || '직무 미상'}`}
            description="AI가 이 공고 원문에서 뽑아낸 요구사항입니다. 외부 웹 자료는 아직 참조하지 않습니다."
          />
        </Card>

        {!analysis ? (
          <EmptyState
            icon={<AlertTriangle size={26} />}
            title="이 공고에는 분석 결과가 없습니다"
            description="공고를 다시 분석하면 요구사항과 문화 키워드가 채워집니다."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Target size={19} className="text-brand-600" />
                  명시적 요구사항
                </h3>
                <RequirementList
                  items={analysis.requirements || []}
                  emptyText="추출된 명시적 요구사항이 없습니다."
                />
              </Card>

              <Card>
                <h3 className="mb-1.5 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Eye size={19} className="text-amber-600" />
                  드러나지 않은 요구사항
                </h3>
                <p className="mb-4 text-sm text-slate-500">
                  공고에 직접 쓰여 있지 않지만 맥락상 요구되는 역량입니다.
                </p>
                <RequirementList
                  items={analysis.hidden_requirements || []}
                  emptyText="추출된 암묵적 요구사항이 없습니다."
                />
              </Card>
            </div>

            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Sparkles size={19} className="text-emerald-600" />
                조직 문화 키워드
              </h3>
              {(analysis.culture_keywords || []).length === 0 ? (
                <p className="text-sm text-slate-500">추출된 문화 키워드가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analysis.culture_keywords!.map((kw, i) => (
                    <Badge key={`${kw}-${i}`} tone="neutral" className="text-sm">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default InsightsView;
