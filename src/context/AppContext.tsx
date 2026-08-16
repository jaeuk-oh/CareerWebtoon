import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Experience } from '../types/experience';
import { JobPipeline } from '../types/job';
import { DocumentDraft, DefenseChatMessage } from '../types/document';
import { ensureSession, getUserId, supabase } from '../lib/supabase';
import {
  api,
  BackendExperience,
  FrontendDocType,
  ValidationResponse,
  JDAnalysisResponse,
  MatchResponse,
  StrategyResponse
} from '../lib/api';

const ANNOTATIONS_KEY = 'careercraft_exp_annotations';

// The backend's `experiences` table only stores title/company/role/period/description/skills.
// The richer C3P4/metrics/evidenceSource quick-fields the UI collects have no backend column
// (they're meant to come from the AI decompose step instead), so we keep them as a local
// annotation layered on top of the real, persisted experience record.
type ExperienceAnnotation = Pick<Experience, 'c3p4' | 'metrics' | 'evidenceSource'>;

const EMPTY_ANNOTATION: ExperienceAnnotation = {
  c3p4: { customer: '', problem: '', action: '', product: '' },
  metrics: [],
  evidenceSource: ''
};

const loadAnnotations = (): Record<string, ExperienceAnnotation> => {
  try {
    return JSON.parse(localStorage.getItem(ANNOTATIONS_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveAnnotation = (id: string, data: ExperienceAnnotation) => {
  const all = loadAnnotations();
  all[id] = data;
  localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
};

const removeAnnotation = (id: string) => {
  const all = loadAnnotations();
  delete all[id];
  localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
};

const mergeExperience = (be: BackendExperience, annotations: Record<string, ExperienceAnnotation>): Experience => ({
  id: be.id,
  userId: be.user_id,
  title: be.title,
  organization: be.company || '',
  period: be.period || '',
  description: be.description || '',
  ...(annotations[be.id] || EMPTY_ANNOTATION),
  createdAt: be.created_at || new Date().toISOString(),
  updatedAt: be.updated_at
});

interface UserProfile {
  name: string;
  targetRole: string;
  isLoggedIn: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

interface AppContextType {
  user: UserProfile;
  login: (name: string, targetRole: string) => void;
  logout: () => void;
  
  experiences: Experience[];
  experiencesLoading: boolean;
  addExperience: (exp: Omit<Experience, 'id' | 'createdAt'>) => Promise<Experience>;
  updateExperience: (id: string, exp: Partial<Experience>) => Promise<void>;
  deleteExperience: (id: string) => void;
  decomposeExperience: (id: string) => Promise<void>;

  pipelines: JobPipeline[];
  activePipelineId: string | null;
  setActivePipelineId: (id: string | null) => void;
  analyzeJob: (targetCompany: string, targetRole: string, jdText: string) => Promise<JDAnalysisResponse>;
  matchExperiences: (jobId: string) => Promise<MatchResponse>;
  generateStrategyForJob: (jobId: string) => Promise<StrategyResponse>;
  finalizePipeline: (
    jd: JDAnalysisResponse,
    targetCompany: string,
    targetRole: string,
    jdText: string,
    match: MatchResponse,
    strategy: StrategyResponse
  ) => JobPipeline;
  deletePipeline: (id: string) => void;

  documentDraft: DocumentDraft;
  updateDocumentContent: (docType: 'resume' | 'career' | 'coverLetter', text: string) => void;
  generateDocument: (docType: FrontendDocType) => Promise<void>;

  evidenceValidation: ValidationResponse | null;
  runEvidenceValidation: (docType: FrontendDocType) => Promise<void>;

  defenseMessages: DefenseChatMessage[];
  sendDefenseMessage: (text: string) => Promise<void>;
  runDefenseGeneration: (docType: FrontendDocType) => Promise<void>;

  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  confirmDialog: ConfirmDialogState | null;
  requestConfirm: (state: ConfirmDialogState) => void;
  closeConfirm: () => void;

  clearAllData: () => void;
}

const INITIAL_DOC: DocumentDraft = {
  id: 'doc-1',
  docType: 'coverLetter',
  coverLetterText: '',
  resumeText: '',
  careerText: '',
  defenseScore: 0,
  updatedAt: new Date().toISOString()
};

const INITIAL_DEFENSE_CHAT: DefenseChatMessage[] = [];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Local Storage Loaders
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('careercraft_user');
    return saved ? JSON.parse(saved) : { name: '사용자', targetRole: '', isLoggedIn: false };
  });

  const [experiences, setExperiences] = useState<Experience[]>(() => {
    const saved = localStorage.getItem('careercraft_experiences');
    return saved ? JSON.parse(saved) : [];
  });

  const [pipelines, setPipelines] = useState<JobPipeline[]>(() => {
    const saved = localStorage.getItem('careercraft_pipelines');
    return saved ? JSON.parse(saved) : [];
  });

  const [activePipelineId, setActivePipelineId] = useState<string | null>(() => {
    return localStorage.getItem('careercraft_active_pipeline_id') || null;
  });

  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>(() => {
    const saved = localStorage.getItem('careercraft_document');
    return saved ? JSON.parse(saved) : INITIAL_DOC;
  });

  const [defenseMessages, setDefenseMessages] = useState<DefenseChatMessage[]>(() => {
    const saved = localStorage.getItem('careercraft_defense_chat');
    return saved ? JSON.parse(saved) : INITIAL_DEFENSE_CHAT;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [experiencesLoading, setExperiencesLoading] = useState(true);
  const [evidenceValidation, setEvidenceValidation] = useState<ValidationResponse | null>(null);

  const requestConfirm = (state: ConfirmDialogState) => setConfirmDialog(state);
  const closeConfirm = () => setConfirmDialog(null);

  // Establish a real Supabase session (anonymous auth) and load the candidate's
  // actual saved experiences from the backend, replacing the local demo data.
  useEffect(() => {
    (async () => {
      try {
        await ensureSession();
        const backendExperiences = await api.experiences.list();
        const annotations = loadAnnotations();
        setExperiences(backendExperiences.map((be) => mergeExperience(be, annotations)));
      } catch (err) {
        console.error('Failed to load experiences from backend', err);
        showToast('경험 자산을 서버에서 불러오지 못했습니다. 백엔드 연결을 확인해주세요.', 'warning');
      } finally {
        setExperiencesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('careercraft_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('careercraft_experiences', JSON.stringify(experiences));
  }, [experiences]);

  useEffect(() => {
    localStorage.setItem('careercraft_pipelines', JSON.stringify(pipelines));
  }, [pipelines]);

  useEffect(() => {
    if (activePipelineId) localStorage.setItem('careercraft_active_pipeline_id', activePipelineId);
    else localStorage.removeItem('careercraft_active_pipeline_id');
  }, [activePipelineId]);

  useEffect(() => {
    localStorage.setItem('careercraft_document', JSON.stringify(documentDraft));
  }, [documentDraft]);

  useEffect(() => {
    localStorage.setItem('careercraft_defense_chat', JSON.stringify(defenseMessages));
  }, [defenseMessages]);

  // Toast System
  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Action
  const login = async (name: string, targetRole: string) => {
    setUser({ name, targetRole, isLoggedIn: true });
    try {
      await ensureSession();
      const uid = await getUserId();
      if (uid) {
        await supabase.from('profiles').upsert({ id: uid, display_name: name });
      }
    } catch (err) {
      console.error('Failed to sync profile to backend', err);
    }
    showToast(`${name}님 환영합니다! 프로필이 업데이트되었습니다.`, 'success');
  };

  const logout = () => {
    setUser((prev) => ({ ...prev, isLoggedIn: false }));
    showToast('로그아웃되었습니다.', 'info');
  };

  // Experiences Action
  const addExperience = async (data: Omit<Experience, 'id' | 'createdAt'>): Promise<Experience> => {
    const be = await api.experiences.create({
      title: data.title,
      company: data.organization,
      period: data.period,
      description: data.description
    });
    saveAnnotation(be.id, { c3p4: data.c3p4, metrics: data.metrics, evidenceSource: data.evidenceSource || '' });
    const newExp = mergeExperience(be, loadAnnotations());
    setExperiences((prev) => [newExp, ...prev]);
    showToast('새 3C4P 경험 자산이 등록되었습니다.', 'success');
    return newExp;
  };

  const updateExperience = async (id: string, data: Partial<Experience>) => {
    await api.experiences.update(id, {
      title: data.title,
      company: data.organization,
      period: data.period,
      description: data.description
    });
    if (data.c3p4 || data.metrics || data.evidenceSource !== undefined) {
      const existing = experiences.find((e) => e.id === id);
      saveAnnotation(id, {
        c3p4: data.c3p4 || existing?.c3p4 || EMPTY_ANNOTATION.c3p4,
        metrics: data.metrics || existing?.metrics || [],
        evidenceSource: data.evidenceSource ?? existing?.evidenceSource ?? ''
      });
    }
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e))
    );
    showToast('경험 자산이 정상 수정되었습니다.', 'success');
  };

  const deleteExperience = async (id: string) => {
    setExperiences((prev) => prev.filter((e) => e.id !== id));
    removeAnnotation(id);
    try {
      await api.experiences.delete(id);
      showToast('경험 자산이 삭제되었습니다.', 'info');
    } catch (err) {
      console.error('Failed to delete experience on backend', err);
      showToast('서버에서 삭제하지 못했습니다. 다시 시도해주세요.', 'error');
    }
  };

  // Runs the real AI 3C4P decomposition (experience-engine) and folds the result back
  // into the same customer/problem/action/product quick-fields the UI already renders.
  const decomposeExperience = async (id: string) => {
    const result = await api.experienceEngine.decompose(id);
    const c = result.three_c_four_p;
    const quantitative = result.evidence.filter((e) => e.is_quantitative);
    const annotation: ExperienceAnnotation = {
      c3p4: {
        customer: [c.customer?.target, c.customer?.problem, c.customer?.needs].filter(Boolean).join(' / '),
        problem: c.company_context?.situation || c.customer?.problem || '',
        action: (c.place?.actual_actions || []).join(', '),
        product: [...(c.product?.results || []), ...(c.product?.deliverables || [])].join(', ')
      },
      metrics: quantitative.length > 0
        ? quantitative.map((e) => `${e.claim}${e.evidence_text ? ` (${e.evidence_text})` : ''}`)
        : result.evidence.map((e) => e.claim),
      evidenceSource: result.anchors.map((a) => a.summary).filter(Boolean).join(' / ')
    };
    saveAnnotation(id, annotation);
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, ...annotation } : e)));
    showToast('AI가 경험을 분석하여 3C4P 구조로 자동 변환했습니다!', 'success');
  };

  // 지원 만들기 액션 — JD 분석 / 경험 매칭 / 전략 수립을 각 단계에서 따로 호출해서,
  // 지원 만들기 화면이 실제 API 응답을 단계별로 그대로 보여줄 수 있게 한다.
  const analyzeJob = async (targetCompany: string, targetRole: string, jdText: string) => {
    return api.jobs.analyze({
      company_name: targetCompany || undefined,
      position: targetRole || undefined,
      jd_raw_text: jdText
    });
  };

  const matchExperiences = async (jobId: string) => {
    return api.matching.match(jobId);
  };

  const generateStrategyForJob = async (jobId: string) => {
    return api.strategy.generate(jobId);
  };

  // 이미 앞 단계에서 받아온 실제 분석/매칭/전략 결과를 그대로 저장만 한다 (API를 다시 호출하지 않음).
  const finalizePipeline = (
    jd: JDAnalysisResponse,
    targetCompany: string,
    targetRole: string,
    jdText: string,
    match: MatchResponse,
    strategy: StrategyResponse
  ): JobPipeline => {
    const newPipeline: JobPipeline = {
      id: jd.id,
      targetCompany: targetCompany || jd.company_name || '새 지원 기업',
      targetRole: targetRole || jd.position || '직무 미정',
      jdText,
      status: 'strategy',
      matchScore: Math.round((match.coverage_score || 0) * 100),
      extractedKeywords: jd.culture_keywords,
      primaryStrategy: strategy.strategy_text,
      secondaryStrategy: strategy.gaps.map((g) => g.suggestion).join(' '),
      excludedProjects: strategy.excluded_reasons.map((r) => r.reason),
      createdAt: new Date().toISOString()
    };

    setPipelines((prev) => [newPipeline, ...prev]);
    setActivePipelineId(newPipeline.id);
    showToast(`'${newPipeline.targetCompany}' 지원이 생성되었습니다.`, 'success');
    return newPipeline;
  };

  const deletePipeline = async (id: string) => {
    setPipelines((prev) => prev.filter((p) => p.id !== id));
    if (activePipelineId === id) setActivePipelineId(null);
    try {
      await api.jobs.delete(id);
      showToast('지원 내역이 삭제되었습니다.', 'info');
    } catch (err) {
      console.error('Failed to delete job on backend', err);
      showToast('서버에서 삭제하지 못했습니다. 다시 시도해주세요.', 'error');
    }
  };

  // Document Editor Actions
  const updateDocumentContent = (docType: 'resume' | 'career' | 'coverLetter', text: string) => {
    setDocumentDraft((prev) => ({
      ...prev,
      docType,
      coverLetterText: docType === 'coverLetter' ? text : prev.coverLetterText,
      resumeText: docType === 'resume' ? text : prev.resumeText,
      careerText: docType === 'career' ? text : prev.careerText,
      updatedAt: new Date().toISOString()
    }));
  };

  // Calls document-engine to write a real AI draft for the active pipeline's job,
  // and remembers its generated_documents.id so evidence validation / defense
  // question generation (which both key off that id) can be run afterwards.
  const generateDocument = async (docType: FrontendDocType) => {
    if (!activePipelineId) {
      showToast('먼저 지원을 생성하거나 선택해주세요.', 'warning');
      return;
    }
    const doc = await api.documents.generate(activePipelineId, docType);
    setDocumentDraft((prev) => ({
      ...prev,
      docType,
      coverLetterText: docType === 'coverLetter' ? doc.content : prev.coverLetterText,
      resumeText: docType === 'resume' ? doc.content : prev.resumeText,
      careerText: docType === 'career' ? doc.content : prev.careerText,
      generatedDocIds: { ...prev.generatedDocIds, [docType]: doc.id },
      updatedAt: new Date().toISOString()
    }));
    setEvidenceValidation(null);
    showToast('AI가 지원서 초안을 생성했습니다.', 'success');
  };

  const runEvidenceValidation = async (docType: FrontendDocType) => {
    const docId = documentDraft.generatedDocIds?.[docType];
    if (!docId) {
      showToast('먼저 "AI 초안 생성"으로 문서를 만들어야 수치 검증을 실행할 수 있습니다.', 'warning');
      return;
    }
    const result = await api.validation.validate(docId);
    setEvidenceValidation(result);
    setDocumentDraft((prev) => ({
      ...prev,
      defenseScore: Math.round(result.overall_score * 100),
      updatedAt: new Date().toISOString()
    }));
    showToast('수치 검증이 완료되었습니다.', 'success');
  };

  // 방금 생성된 AI 질문 중 가장 최근 것을 찾아 그 질문에 대한 실제 답변 평가를 백엔드에 요청한다.
  const sendDefenseMessage = async (text: string) => {
    if (!text.trim()) return;

    const lastQuestion = [...defenseMessages].reverse().find((m) => m.sender === 'ai' && m.claimText);
    if (!lastQuestion) {
      showToast('먼저 "AI 예상 질문 만들기"로 답변할 질문을 생성해주세요.', 'warning');
      return;
    }

    const userMsg: DefenseChatMessage = {
      id: 'def-user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setDefenseMessages((prev) => [...prev, userMsg]);

    try {
      const result = await api.defense.answerFeedback({
        question: lastQuestion.text,
        claim_text: lastQuestion.claimText || '',
        expected_answer_hint: lastQuestion.expectedAnswerHint,
        user_answer: text
      });

      const aiMsg: DefenseChatMessage = {
        id: 'def-ai-' + Date.now(),
        sender: 'ai',
        text: result.feedback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scoreImpact: result.score_delta
      };
      setDefenseMessages((prev) => [...prev, aiMsg]);
      setDocumentDraft((prev) => ({
        ...prev,
        defenseScore: Math.max(0, Math.min(100, (prev.defenseScore || 0) + result.score_delta))
      }));
    } catch (err) {
      console.error('Failed to get answer feedback', err);
      showToast('답변 평가에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  // Calls defense-engine to generate real pressure-interview questions from the
  // document's flagged/weak claims (run evidence validation first for best results),
  // and seeds the chat with them as the AI's opening questions.
  const runDefenseGeneration = async (docType: FrontendDocType) => {
    const docId = documentDraft.generatedDocIds?.[docType];
    if (!docId) {
      showToast('먼저 "AI 초안 생성"으로 문서를 만들어야 예상 질문을 만들 수 있습니다.', 'warning');
      return;
    }
    const result = await api.defense.generate(docId);
    if (result.questions.length === 0) {
      showToast('추가로 방어가 필요한 취약한 주장이 없습니다. 수치 검증을 먼저 실행해보세요.', 'info');
      return;
    }
    const newMessages: DefenseChatMessage[] = result.questions.map((q) => ({
      id: 'def-q-' + q.id,
      sender: 'ai',
      text: q.question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      claimText: q.claim_text,
      expectedAnswerHint: q.expected_answer_hint
    }));
    setDefenseMessages((prev) => [...prev, ...newMessages]);
    showToast(`AI가 예상 면접 질문 ${result.questions.length}개를 만들었습니다.`, 'success');
  };

  const clearAllData = () => {
    setUser({ name: '사용자', targetRole: '', isLoggedIn: false });
    setExperiences([]);
    setPipelines([]);
    setActivePipelineId(null);
    setDocumentDraft({
      id: 'doc-empty',
      docType: 'coverLetter',
      coverLetterText: '',
      resumeText: '',
      careerText: '',
      defenseScore: 0,
      updatedAt: new Date().toISOString()
    });
    setDefenseMessages([]);
    localStorage.clear();
    showToast('모든 데이터가 초기화되었습니다.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        experiences,
        experiencesLoading,
        addExperience,
        updateExperience,
        deleteExperience,
        decomposeExperience,
        pipelines,
        activePipelineId,
        setActivePipelineId,
        analyzeJob,
        matchExperiences,
        generateStrategyForJob,
        finalizePipeline,
        deletePipeline,
        documentDraft,
        updateDocumentContent,
        generateDocument,
        evidenceValidation,
        runEvidenceValidation,
        defenseMessages,
        sendDefenseMessage,
        runDefenseGeneration,
        toasts,
        showToast,
        removeToast,
        confirmDialog,
        requestConfirm,
        closeConfirm,
        clearAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

