import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FolderPlus,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { ExperienceModal } from '../components/ExperienceModal';
import { Badge, Button, Card, CircularGauge, EmptyState, SectionHeading, cn } from '../components/ui';
import { JobPipeline } from '../types/job';

interface DashboardViewProps {
  onNavigate: (view: ViewState) => void;
}

// Real pipeline progress, derived from the status the backend actually reports.
// This used to be three literal `done: true` flags, so every application showed
// as fully complete regardless of how far it had got.
const STATUS_ORDER: JobPipeline['status'][] = ['jd_analysis', 'matching', 'strategy', 'editor', 'defense'];
const PIPELINE_STEPS: { key: JobPipeline['status']; label: string }[] = [
  { key: 'jd_analysis', label: '공고 분석' },
  { key: 'matching', label: '경험 매칭' },
  { key: 'strategy', label: '전략 추천' }
];
const hasReached = (status: JobPipeline['status'], step: JobPipeline['status']) =>
  STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(step);

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, experiences, experiencesLoading, pipelines, deletePipeline, setActivePipelineId, requestConfirm } =
    useApp();

  const [isExpModalOpen, setIsExpModalOpen] = useState(false);

  const openPipeline = (pipelineId: string) => {
    setActivePipelineId(pipelineId);
    onNavigate('editor');
  };

  const handleDeletePipeline = (id: string, companyName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm({
      title: '지원 내역을 삭제할까요?',
      message: `'${companyName}' 지원과 연결된 문서 작업 내역이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제하기',
      onConfirm: () => deletePipeline(id)
    });
  };

  // Average of the real coverage scores the matching engine returned for each job.
  const averageCoverage =
    pipelines.length > 0
      ? Math.round(pipelines.reduce((sum, p) => sum + (p.matchScore || 0), 0) / pipelines.length)
      : 0;

  return (
    <div className="space-y-6">
      <ExperienceModal isOpen={isExpModalOpen} onClose={() => setIsExpModalOpen(false)} />

      {/* Greeting */}
      <Card className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <Badge tone="success" icon={<ShieldCheck size={14} />} className="mb-3">
            근거 기반 지원 코파일럿
          </Badge>
          <h2 className="mb-1 text-3xl font-bold tracking-tight text-slate-900">반가워요, {user.name}님!</h2>
          <p className="text-sm text-slate-500">
            {user.targetRole ? `${user.targetRole} 직무` : '지원 직무'} 맞춤 경험으로 지원서 방어력을 높여보세요.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2.5 sm:flex-row">
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setIsExpModalOpen(true)}>
            경험 등록
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => onNavigate('pipeline')}>
            새 지원
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coverage summary */}
        <Card className="flex flex-col items-center lg:col-span-1">
          <h3 className="mb-1 w-full text-lg font-bold text-slate-900">지원 커버리지</h3>
          <p className="mb-6 w-full text-sm text-slate-500">
            등록한 지원 건들의 공고 요건 충족률 평균입니다.
          </p>

          {pipelines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <Database size={32} className="mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">
                아직 측정할 지원이 없습니다.
                <br />
                공고를 분석하면 실제 매칭 점수가 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              <CircularGauge
                value={averageCoverage}
                tone={averageCoverage >= 70 ? 'success' : averageCoverage >= 40 ? 'warning' : 'danger'}
                className="h-40 w-40"
              />
              <p className="mt-6 text-center text-sm text-slate-500">
                지원 {pipelines.length}건의 평균 커버리지입니다.
              </p>
            </>
          )}
        </Card>

        {/* Experience vault summary */}
        <Card className="flex flex-col justify-between lg:col-span-2">
          <div>
            <SectionHeading
              icon={<Database size={20} />}
              title="경험 보관함"
              description="지원서의 근거가 되는 내 경험 자산입니다."
              action={
                <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => setIsExpModalOpen(true)}>
                  추가
                </Button>
              }
              className="mb-5"
            />

            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-600">등록된 경험</span>
                {experiencesLoading ? (
                  <span className="h-4 w-10 animate-pulse rounded bg-slate-200" aria-hidden="true" />
                ) : (
                  <span className="text-base font-bold text-slate-900">{experiences.length}개</span>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-600">진행 중인 지원</span>
                <span className="text-base font-bold text-slate-900">{pipelines.length}건</span>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            fullWidth
            className="mt-6"
            onClick={() => onNavigate('vault')}
            icon={<ArrowRight size={15} />}
          >
            경험 전체 보기
          </Button>
        </Card>
      </div>

      {/* Active pipelines */}
      <section>
        <SectionHeading
          icon={<TrendingUp size={20} />}
          title="진행 중인 지원"
          description={`총 ${pipelines.length}건`}
          className="mb-4"
        />

        {pipelines.length === 0 ? (
          <EmptyState
            icon={<FolderPlus size={26} />}
            title="등록된 지원이 없습니다"
            description="목표 기업의 채용 공고(JD)를 입력하면 AI가 내 경험과 매칭한 지원 전략을 만들어줍니다."
            action={
              <Button icon={<Plus size={16} />} onClick={() => onNavigate('pipeline')}>
                첫 지원 시작하기
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {pipelines.map((p) => (
              <Card key={p.id} interactive onClick={() => openPipeline(p.id)} className="group">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge className="mb-1.5">{p.targetRole}</Badge>
                    <h4 className="truncate text-xl font-bold text-slate-900 transition-colors group-hover:text-brand-700">
                      {p.targetCompany}
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()} 생성
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge tone="success" icon={<ShieldCheck size={14} />}>
                      커버리지 {p.matchScore}%
                    </Badge>
                    <button
                      onClick={(e) => handleDeletePipeline(p.id, p.targetCompany, e)}
                      className="rounded-lg p-1.5 text-slate-300 transition-colors hover:text-rose-600"
                      aria-label={`${p.targetCompany} 지원 삭제`}
                      title="지원 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="my-5 grid grid-cols-3 gap-1 border-t border-slate-100 pt-4 text-center">
                  {PIPELINE_STEPS.map((s) => {
                    const done = hasReached(p.status, s.key);
                    return (
                      <div key={s.key} className="flex flex-col items-center gap-1.5">
                        <div
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full',
                            done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                          )}
                        >
                          <CheckCircle2 size={15} />
                        </div>
                        <span className={cn('text-xs font-medium', done ? 'text-slate-700' : 'text-slate-400')}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <Button
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    openPipeline(p.id);
                  }}
                  icon={<ArrowRight size={15} />}
                >
                  지원서 작성하러 가기
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardView;
