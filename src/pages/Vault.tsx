import React, { useRef, useState } from 'react';
import { ChevronRight, Database, Edit3, FileUp, Plus, Search, Trash2 } from 'lucide-react';
import { ViewState } from '../types/navigation';
import { useApp } from '../context/AppContext';
import { ExperienceModal } from '../components/ExperienceModal';
import { Button, Card, EmptyState, SectionHeading } from '../components/ui';
import { Experience } from '../types/experience';

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.txt';

interface VaultViewProps {
  onNavigate: (view: ViewState) => void;
}

const C3P4_FIELDS: { key: keyof Experience['c3p4']; label: string; className: string }[] = [
  { key: 'customer', label: 'Customer', className: 'bg-blue-50 border-blue-100 text-blue-900' },
  { key: 'problem', label: 'Problem', className: 'bg-amber-50 border-amber-100 text-amber-900' },
  { key: 'action', label: 'Action', className: 'bg-brand-50 border-brand-100 text-brand-900' },
  { key: 'product', label: 'Product / Result', className: 'bg-emerald-50 border-emerald-200 text-emerald-900' }
];

const VaultView: React.FC<VaultViewProps> = () => {
  const { experiences, experiencesLoading, deleteExperience, requestConfirm, importExperiencesFromFile, handleActionError } =
    useApp();

  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setIsImporting(true);
    try {
      await importExperiencesFromFile(file);
    } catch (err) {
      handleActionError(err, '문서를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsImporting(false);
    }
  };

  const openEdit = (exp: Experience, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExperience(exp);
    setIsExpModalOpen(true);
  };

  const openCreate = () => {
    setEditingExperience(null);
    setIsExpModalOpen(true);
  };

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm({
      title: '경험을 삭제할까요?',
      message: `'${title}' 경험이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제하기',
      onConfirm: () => deleteExperience(id)
    });
  };

  const filtered = experiences.filter((exp) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      exp.title.toLowerCase().includes(q) ||
      exp.organization.toLowerCase().includes(q) ||
      exp.c3p4.customer.toLowerCase().includes(q) ||
      exp.c3p4.problem.toLowerCase().includes(q) ||
      exp.c3p4.action.toLowerCase().includes(q) ||
      exp.c3p4.product.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <ExperienceModal
        isOpen={isExpModalOpen}
        onClose={() => {
          setIsExpModalOpen(false);
          setEditingExperience(null);
        }}
        editingExp={editingExperience}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileSelected}
        className="hidden"
      />

      <Card>
        <SectionHeading
          icon={<Database size={20} />}
          title="경험 보관함"
          description="카드를 클릭하면 세부 내용을 수정하거나 AI로 다시 구조화할 수 있습니다."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon={isImporting ? undefined : <FileUp size={16} />}
                isLoading={isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                {isImporting ? '분석 중…' : 'PDF/포트폴리오 업로드'}
              </Button>
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                경험 등록
              </Button>
            </div>
          }
        />
      </Card>

      <div className="relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="경험 제목, 조직, 3C4P 키워드 또는 수치로 검색..."
          aria-label="경험 자산 검색"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      {experiencesLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">경험 자산을 불러오는 중입니다...</span>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse space-y-3" aria-hidden="true">
              <div className="h-4 w-1/3 rounded-md bg-slate-100" />
              <div className="h-5 w-2/3 rounded-md bg-slate-200" />
              <div className="mt-3 h-12 rounded-xl bg-slate-100" />
              <div className="h-12 rounded-xl bg-slate-100" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Database size={26} />}
          title={searchQuery ? '검색된 경험이 없습니다' : '등록된 경험이 없습니다'}
          description="경험을 등록하면 AI가 3C4P 구조로 분해하고, 채용 공고와 매칭할 근거로 사용합니다. PDF 포트폴리오나 이력서를 올리면 AI가 대신 읽고 경험을 추출해드려요."
          action={
            !searchQuery && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  icon={isImporting ? undefined : <FileUp size={16} />}
                  isLoading={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isImporting ? '분석 중…' : 'PDF/포트폴리오 업로드'}
                </Button>
                <Button icon={<Plus size={16} />} onClick={openCreate}>
                  첫 경험 등록하기
                </Button>
              </div>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((exp) => (
            <Card key={exp.id} interactive onClick={(e) => openEdit(exp, e)} className="group flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {exp.organization}
                      {exp.period ? ` (${exp.period})` : ''}
                    </span>
                    <h4 className="mt-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-brand-700">
                      {exp.title}
                    </h4>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => openEdit(exp, e)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-slate-700"
                      aria-label={`${exp.title} 수정`}
                      title="수정"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(exp.id, exp.title, e)}
                      className="rounded-lg p-1.5 text-slate-300 transition-colors hover:text-rose-600"
                      aria-label={`${exp.title} 삭제`}
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="my-3 space-y-2">
                  {C3P4_FIELDS.map((field) => {
                    const value = exp.c3p4[field.key];
                    if (!value) return null;
                    return (
                      <div key={field.key} className={`rounded-xl border p-3 ${field.className}`}>
                        <span className="mb-0.5 block text-xs font-bold">{field.label}</span>
                        <p className="text-sm leading-relaxed text-slate-800">{value}</p>
                      </div>
                    );
                  })}
                  {!exp.c3p4.customer && !exp.c3p4.problem && !exp.c3p4.action && !exp.c3p4.product && (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      아직 3C4P로 구조화되지 않았습니다. 카드를 열어 'AI 분석'을 실행해보세요.
                    </p>
                  )}
                </div>
              </div>

              {exp.evidenceSource && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="min-w-0 truncate">
                    앵커: <strong className="font-medium text-slate-800">{exp.evidenceSource}</strong>
                  </span>
                  <span className="inline-flex flex-shrink-0 items-center gap-0.5 font-bold text-brand-600 transition-transform group-hover:translate-x-1">
                    수정하기 <ChevronRight size={13} />
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultView;
