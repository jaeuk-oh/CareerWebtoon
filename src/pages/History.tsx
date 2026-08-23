import React from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { Badge, Button, Card, EmptyState, SectionHeading } from '../components/ui';

interface HistoryViewProps {
  onNavigate: (view: ViewState) => void;
}

const coverageTone = (score: number) => (score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger');

const HistoryView: React.FC<HistoryViewProps> = ({ onNavigate }) => {
  const { pipelines, setActivePipelineId, deletePipeline, requestConfirm } = useApp();

  const openPipeline = (id: string) => {
    setActivePipelineId(id);
    onNavigate('editor');
  };

  const handleDelete = (id: string, companyName: string) => {
    requestConfirm({
      title: '지원 내역을 삭제할까요?',
      message: `'${companyName}' 지원과 연결된 문서 작업 내역이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제하기',
      onConfirm: () => deletePipeline(id)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeading
          icon={<FileText size={20} />}
          title="지원 이력"
          description="지금까지 만든 지원 건과 생성된 문서들의 기록입니다."
          action={
            <Button icon={<Plus size={16} />} onClick={() => onNavigate('pipeline')}>
              새 지원
            </Button>
          }
        />
      </Card>

      {pipelines.length === 0 ? (
        <EmptyState
          icon={<FileText size={26} />}
          title="기록된 지원 이력이 없습니다"
          description="채용 공고를 분석하고 전략을 만들면 여기에 기록이 남습니다."
          action={
            <Button icon={<Plus size={16} />} onClick={() => onNavigate('pipeline')}>
              첫 지원 시작하기
            </Button>
          }
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="p-4">지원 기업</th>
                  <th className="p-4">지원 직무</th>
                  <th className="p-4">커버리지</th>
                  <th className="p-4">생성일</th>
                  <th className="p-4 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{p.targetCompany}</td>
                    <td className="p-4 text-slate-600">{p.targetRole}</td>
                    <td className="p-4">
                      <Badge tone={coverageTone(p.matchScore)}>{p.matchScore}%</Badge>
                    </td>
                    <td className="p-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" onClick={() => openPipeline(p.id)}>
                          지원서 열기
                        </Button>
                        <button
                          onClick={() => handleDelete(p.id, p.targetCompany)}
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:text-rose-600"
                          aria-label={`${p.targetCompany} 지원 삭제`}
                          title="지원 삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default HistoryView;
