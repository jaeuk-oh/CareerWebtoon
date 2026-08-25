import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Database, CheckCircle2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Experience } from '../types/experience';
import { useEscapeClose } from '../lib/hooks';

interface ExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExp?: Experience | null;
}

export const ExperienceModal: React.FC<ExperienceModalProps> = ({ isOpen, onClose, editingExp }) => {
  const { addExperience, updateExperience, decomposeExperience, showToast, handleActionError } = useApp();

  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [period, setPeriod] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [problem, setProblem] = useState('');
  const [action, setAction] = useState('');
  const [product, setProduct] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('');

  const [rawTextNote, setRawTextNote] = useState('');
  const [isAiStructuring, setIsAiStructuring] = useState(false);
  // Real AI structuring (experience-engine decompose) needs a saved backend row to
  // work against. We lazily create/update one behind the scenes the first time the
  // user clicks the AI button, then reuse its id for the rest of this modal session.
  const [savedExpId, setSavedExpId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingExp) {
      setTitle(editingExp.title || '');
      setOrganization(editingExp.organization || '');
      setPeriod(editingExp.period || '');
      setDescription(editingExp.description || '');
      setCustomer(editingExp.c3p4?.customer || '');
      setProblem(editingExp.c3p4?.problem || '');
      setAction(editingExp.c3p4?.action || '');
      setProduct(editingExp.c3p4?.product || '');
      setEvidenceSource(editingExp.evidenceSource || '');
      setSavedExpId(editingExp.id);
    } else {
      setTitle('');
      setOrganization('');
      setPeriod('');
      setDescription('');
      setCustomer('');
      setProblem('');
      setAction('');
      setProduct('');
      setEvidenceSource('');
      setRawTextNote('');
      setSavedExpId(null);
    }
  }, [editingExp, isOpen]);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleAiAutoStructure = async () => {
    if (!rawTextNote.trim() && !description.trim() && !title.trim()) {
      showToast('자유 메모 또는 설명란에 프로젝트 내용을 간단히 적어주세요.', 'warning');
      return;
    }
    if (!title.trim() || !organization.trim()) {
      showToast('AI 분석 전에 프로젝트명과 소속 조직을 먼저 입력해주세요.', 'warning');
      return;
    }

    setIsAiStructuring(true);
    try {
      // Real decompose (experience-engine) needs a persisted experience_id, so
      // silently save/update the record first if it isn't saved yet.
      let expId = savedExpId;
      const draft = {
        title: title.trim(),
        organization: organization.trim(),
        period: period.trim(),
        description: (rawTextNote || description || title).trim(),
        c3p4: { customer, problem, action, product },
        metrics: [] as string[],
        evidenceSource
      };
      // Saved silently: this row exists only so decompose has an id to work with,
      // and a "등록되었습니다" toast here would land while the AI is still running.
      // decomposeExperience announces completion once the analysis is actually done.
      if (expId) {
        await updateExperience(expId, draft, { silent: true });
      } else {
        const created = await addExperience(draft, { silent: true });
        expId = created.id;
        setSavedExpId(expId);
      }

      await decomposeExperience(expId);
    } catch (err) {
      handleActionError(err, 'AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAiStructuring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!title.trim() || !organization.trim()) {
      showToast('프로젝트명과 소속 조직은 필수 입력 사항입니다.', 'warning');
      return;
    }

    // Empty stays empty. These fields used to fall back to filler — a made-up period
    // ("2023 - 2024"), a made-up metric, a made-up evidence source, and the input
    // placeholders saved as if they were the user's own words. All of it then fed
    // matching, document generation, and evidence validation as real material, which
    // is precisely the fabrication this product exists to prevent.
    const expData = {
      title: title.trim(),
      organization: organization.trim(),
      period: period.trim(),
      description: description.trim() || title.trim(),
      c3p4: {
        customer: customer.trim(),
        problem: problem.trim(),
        action: action.trim(),
        product: product.trim()
      },
      metrics: product.trim() ? [product.trim()] : [],
      evidenceSource: evidenceSource.trim()
    };

    setIsSaving(true);
    try {
      if (savedExpId) {
        await updateExperience(savedExpId, expData);
      } else {
        await addExperience(expData);
      }
      onClose();
    } catch (err) {
      console.error(err);
      showToast('저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="experience-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 md:p-8 relative my-8"
        >
          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3.5 mb-6 border-b border-slate-100 pb-4">
            <div className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Database size={22} />
            </div>
            <div>
              <h2 id="experience-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
                {editingExp ? '3C4P 경험 자산 수정' : '새 3C4P 경험 자산 등록'}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                면접관 압박 질문을 완벽히 방어할 수 있도록 3C4P(Customer, Problem, Action, Product)로 구조화합니다.
              </p>
            </div>
          </div>

          {/* Quick AI Auto-Helper Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={15} className={`text-emerald-600 ${isAiStructuring ? 'animate-spin' : ''}`} />
                AI 3C4P 자동 구조화 어시스턴트
              </span>
              <button
                type="button"
                onClick={handleAiAutoStructure}
                disabled={isAiStructuring}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {isAiStructuring ? '분석 중...' : '메모 기반 3C4P 채우기'}
              </button>
            </div>
            <textarea
              rows={2}
              value={rawTextNote}
              onChange={(e) => setRawTextNote(e.target.value)}
              placeholder="자유롭게 경험했던 일이나 프로젝트 내용을 한두 문장으로 적어보세요..."
              className="w-full bg-white/80 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-brand-500 placeholder:text-slate-400 resize-none"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  경험 프로젝트명 <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 서류 점검 자동화 및 프로세스 기획"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  소속 / 조직 <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="소속 기업 / 학교 / 팀"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">수행 기간</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="예: 2023.03 - 2023.11"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">증거 원본 데이터 출처</label>
                <input
                  type="text"
                  value={evidenceSource}
                  onChange={(e) => setEvidenceSource(e.target.value)}
                  placeholder="예: GA4 로그 보고서 / 기획서 v1.2"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:border-brand-500"
                />
              </div>
            </div>

            {/* 3C4P Input Grid */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>3C4P 세부 구조화</span>
                <span className="text-xs text-slate-400 lowercase">c3p4 framework</span>
              </h3>

              <div>
                <label className="block text-sm font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Customer (대상 사용자 및 시장)
                </label>
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="예: B2B SaaS 사용자 및 내부 검증 운영팀"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Problem (해결하고자 한 직무 병목)
                </label>
                <input
                  type="text"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="예: 수작업 서류 점검 병목으로 처리 기간 평균 7일 소요"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Action (수행한 본인의 핵심 행동)
                </label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="예: 3개월간 반복 문의 500건 분석 및 자동 체크리스트 룰셋 기획"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Product / Result (검증 성과 수치)
                </label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="예: 자동화 시스템 런칭 (소요 시간 7일 → 2일 단축, 71.4% 감소)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>{isSaving ? '저장 중...' : editingExp ? '수정사항 저장' : '경험 자산 저장하기'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
