import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Experience } from '../types/experience';
import { JobPipeline } from '../types/job';
import { DocumentDraft, DefenseChatMessage } from '../types/document';
import { ensureSession, supabase, signInWithGoogle, signOutAndReload } from '../lib/supabase';
import {
  api,
  ApiError,
  BackendExperience,
  FrontendDocType,
  ValidationResponse,
  CritiqueResponse,
  JDAnalysisResponse,
  MatchResponse,
  StrategyResponse,
  ThreeCFourP,
  EvidenceItem,
  AnchorItem,
  DocumentListItem,
  RewriteResponse,
  UsageResponse,
  BACKEND_TO_FRONTEND_DOC_TYPE
} from '../lib/api';

const ANNOTATIONS_KEY = 'careercraft_exp_annotations';

// The backend's `experiences` table only stores title/company/role/period/description/skills.
// `c3p4` now has a real home (experience_3c4p, via api.experienceEngine.get3c4p/save3c4p) and
// survives a device change. `metrics`/`evidenceSource` still don't: they're free-text quick
// fields with no dedicated backend column for a manually-entered experience (evidence/anchors
// are LLM-shaped extraction results, not a place to store arbitrary user-typed strings), so
// they remain a local annotation layered on top of the real, persisted experience record.
type ExperienceAnnotation = Pick<Experience, 'metrics' | 'evidenceSource'>;

const EMPTY_ANNOTATION: ExperienceAnnotation = {
  metrics: [],
  evidenceSource: ''
};

const EMPTY_C3P4: Experience['c3p4'] = { customer: '', problem: '', action: '', product: '' };

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

// Turns the backend's rich 3C4P shape into the flat customer/problem/action/product
// quick-view fields the UI renders. Used for both an AI decomposition and a manually
// saved breakdown — the two are indistinguishable once persisted.
const flattenC3P4 = (c3p4: ThreeCFourP): Experience['c3p4'] => ({
  customer: [
    c3p4.customer?.primary && [c3p4.customer.primary.who, c3p4.customer.primary.needs].filter(Boolean).join(' — '),
    c3p4.customer?.secondary && [c3p4.customer.secondary.who, c3p4.customer.secondary.needs].filter(Boolean).join(' — ')
  ]
    .filter(Boolean)
    .join(' / '),
  // The cause is the more useful half to surface: the problem restates the symptom,
  // the cause is what the applicant actually had to figure out.
  problem: [c3p4.company_context?.problem, c3p4.company_context?.cause].filter(Boolean).join(' — '),
  action: (c3p4.place?.actual_actions || []).join(', '),
  product: [c3p4.product?.result, ...(c3p4.product?.significance || [])].filter(Boolean).join(', ')
});

// The inverse of flattenC3P4 — maps the flat quick fields the user typed by hand back onto
// the backend's richer shape, so a manual entry round-trips through flattenC3P4 unchanged
// after being saved and reloaded. Each flat field maps to exactly one backend field (rather
// than being spread across several, the way an AI decomposition might populate them), which
// keeps that round trip exact.
const inflateC3P4 = (flat: Experience['c3p4']): ThreeCFourP => ({
  customer: flat.customer ? { primary: { who: flat.customer } } : undefined,
  company_context: flat.problem ? { problem: flat.problem } : undefined,
  place: flat.action ? { actual_actions: [flat.action] } : undefined,
  product: flat.product ? { result: flat.product } : undefined
});

// metrics/evidenceSource still only have a local annotation, and only for evidence/anchors
// backfill from an AI decomposition — this is the derivation the on-load backfill effect
// and decomposeExperience() share.
const deriveAnnotationFromEvidence = (evidence: EvidenceItem[], anchors: AnchorItem[]): ExperienceAnnotation => {
  const quantitative = evidence.filter((e) => e.is_quantitative);
  return {
    metrics: quantitative.length > 0
      ? quantitative.map((e) => `${e.claim}${e.evidence_text ? ` (${e.evidence_text})` : ''}`)
      : evidence.map((e) => e.claim),
    evidenceSource: anchors.map((a) => a.summary).filter(Boolean).join(' / ')
  };
};

const mergeExperience = (be: BackendExperience, annotations: Record<string, ExperienceAnnotation>): Experience => ({
  id: be.id,
  userId: be.user_id,
  title: be.title,
  organization: be.company || '',
  period: be.period || '',
  description: be.description || '',
  c3p4: EMPTY_C3P4, // filled in by the on-load 3C4P fetch once it resolves
  ...(annotations[be.id] || EMPTY_ANNOTATION),
  createdAt: be.created_at || new Date().toISOString(),
  updatedAt: be.updated_at
});

interface UserProfile {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  targetRole: string;
  // True only once the Supabase session is a real (non-anonymous) identity —
  // i.e. the user has actually signed in with Google, not just opened the app.
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

/**
 * The in-progress "새 지원" wizard, held here rather than in the Pipeline screen so
 * a run that takes tens of seconds isn't thrown away when the user navigates off.
 */
export interface PipelineRun {
  step: number;
  targetCompany: string;
  targetRole: string;
  jdText: string;
  jd: JDAnalysisResponse | null;
  match: MatchResponse | null;
  strategy: StrategyResponse | null;
  status: 'idle' | 'analyzing' | 'planning';
  error: string | null;
}

const INITIAL_PIPELINE_RUN: PipelineRun = {
  step: 1,
  targetCompany: '',
  targetRole: '',
  jdText: '',
  jd: null,
  match: null,
  strategy: null,
  status: 'idle',
  error: null
};

interface AppContextType {
  user: UserProfile;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateTargetRole: (targetRole: string) => void;

  usage: UsageResponse | null;
  refreshUsage: () => Promise<void>;
  // Shared by every AI-triggering action's catch block: shows the backend's real
  // "이번 달 한도를 모두 사용했습니다" message (and refreshes the usage badge) on a
  // 429, or the caller's own fallback message for anything else — instead of a
  // generic failure toast that hides the real reason an AI action didn't run.
  handleActionError: (err: unknown, fallbackMessage: string) => void;

  experiences: Experience[];
  experiencesLoading: boolean;
  addExperience: (
    exp: Omit<Experience, 'id' | 'createdAt'>,
    opts?: { silent?: boolean }
  ) => Promise<Experience>;
  updateExperience: (
    id: string,
    exp: Partial<Experience>,
    opts?: { silent?: boolean }
  ) => Promise<void>;
  deleteExperience: (id: string) => void;
  importExperiencesFromFile: (file: File) => Promise<number>;
  decomposeExperience: (id: string) => Promise<void>;

  pipelines: JobPipeline[];
  activePipelineId: string | null;
  setActivePipelineId: (id: string | null) => void;
  analyzeJob: (targetCompany: string, targetRole: string, jdText: string) => Promise<JDAnalysisResponse>;
  matchExperiences: (jobId: string) => Promise<MatchResponse>;
  generateStrategyForJob: (jobId: string) => Promise<StrategyResponse>;
  pipelineRun: PipelineRun;
  runPipelineAnalysis: (targetCompany: string, targetRole: string, jdText: string) => Promise<void>;
  runPipelineStrategy: () => Promise<void>;
  setPipelineStep: (step: number) => void;
  updatePipelineDraft: (patch: Partial<PipelineRun>) => void;
  resetPipelineRun: () => void;
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
  importDocumentText: (docType: FrontendDocType, text: string) => Promise<void>;
  saveDocument: (docType: FrontendDocType) => Promise<void>;
  rewriteClaim: (docType: FrontendDocType, claimText: string, instruction?: string) => Promise<RewriteResponse>;
  applyRewrite: (docType: FrontendDocType, original: string, rewritten: string) => void;

  evidenceValidation: ValidationResponse | null;
  runEvidenceValidation: (docType: FrontendDocType) => Promise<void>;

  critique: CritiqueResponse | null;
  runCritique: (docType: FrontendDocType) => Promise<void>;

  defenseMessages: DefenseChatMessage[];
  sendDefenseMessage: (text: string, target?: DefenseChatMessage) => Promise<void>;
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
    return saved
      ? JSON.parse(saved)
      : { name: '사용자', email: null, avatarUrl: null, targetRole: '', isLoggedIn: false };
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
  const [critique, setCritique] = useState<CritiqueResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [pipelineRun, setPipelineRun] = useState<PipelineRun>(INITIAL_PIPELINE_RUN);
  // Async callbacks below close over the state at call time; this ref lets them read
  // the current run without being re-created on every keystroke in the JD textarea.
  const pipelineRunRef = useRef(pipelineRun);
  pipelineRunRef.current = pipelineRun;

  const requestConfirm = (state: ConfirmDialogState) => setConfirmDialog(state);
  const closeConfirm = () => setConfirmDialog(null);

  // Establish a real Supabase session (anonymous auth, upgraded to Google once the
  // user signs in) and load the candidate's actual saved experiences from the backend.
  useEffect(() => {
    let cancelled = false;

    const syncUserFromSession = (session: import('@supabase/supabase-js').Session | null) => {
      if (cancelled) return;
      if (session && !session.user.is_anonymous) {
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || meta.name || session.user.email || '사용자';
        setUser((prev) => ({
          ...prev,
          name,
          email: session.user.email ?? null,
          avatarUrl: meta.avatar_url || meta.picture || null,
          isLoggedIn: true
        }));
        supabase
          .from('profiles')
          .upsert({ id: session.user.id, display_name: name, email: session.user.email ?? null })
          .then(({ error }) => {
            if (error) console.error('Failed to sync profile to backend', error);
          });
      } else {
        setUser((prev) => ({ ...prev, isLoggedIn: false, email: null, avatarUrl: null }));
      }
    };

    (async () => {
      try {
        await ensureSession();
        const { data } = await supabase.auth.getSession();
        syncUserFromSession(data.session);
        refreshUsage();
        const backendExperiences = await api.experiences.list();
        const annotations = loadAnnotations();
        if (!cancelled) setExperiences(backendExperiences.map((be) => mergeExperience(be, annotations)));

        // c3p4 is now server-sourced (experience_3c4p) rather than cached locally, so it has
        // to be fetched for every experience on load — whether it was AI-decomposed or
        // hand-entered (both write to the same table now), and regardless of a browser/device
        // switch. A missing row (never decomposed or saved) just leaves the card blank.
        backendExperiences.forEach(async (be) => {
          try {
            const c3p4 = await api.experienceEngine.get3c4p(be.id);
            if (!c3p4 || cancelled) return;
            const flat = flattenC3P4(c3p4);
            setExperiences((prev) => prev.map((e) => (e.id === be.id ? { ...e, c3p4: flat } : e)));
          } catch (err) {
            console.error(`Failed to load 3C4P for experience ${be.id}`, err);
          }
        });

        // metrics/evidenceSource still only have a local annotation. An experience already
        // AI-decomposed on a different browser/device has no local cache for them here, but
        // the real evidence/anchor rows are safe in the backend, so re-derive from those
        // instead of leaving the quick fields blank.
        const missingAnnotationIds = backendExperiences.filter((be) => !annotations[be.id]).map((be) => be.id);
        missingAnnotationIds.forEach(async (id) => {
          try {
            const [evidence, anchors] = await Promise.all([
              api.experienceEngine.getEvidence(id),
              api.experienceEngine.getAnchors(id)
            ]);
            if (evidence.length === 0 && anchors.length === 0) return; // never decomposed either
            const annotation = deriveAnnotationFromEvidence(evidence, anchors);
            saveAnnotation(id, annotation);
            if (!cancelled) setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, ...annotation } : e)));
          } catch (err) {
            console.error(`Failed to backfill metrics/evidence for experience ${id}`, err);
          }
        });
      } catch (err) {
        console.error('Failed to load experiences from backend', err);
        showToast('경험 자산을 서버에서 불러오지 못했습니다. 백엔드 연결을 확인해주세요.', 'warning');
      } finally {
        if (!cancelled) setExperiencesLoading(false);
      }
    })();

    // Reconstruct "진행 중인 지원" from the backend. This used to live only in
    // localStorage, so it silently vanished on a new browser/device even though
    // the underlying job/match/strategy rows were safely saved server-side —
    // rebuild the same JobPipeline shape finalizePipeline() produces, from the
    // real data.
    (async () => {
      try {
        const backendJobs = await api.jobs.list();
        const rebuilt = await Promise.all(
          backendJobs.map(async (job): Promise<JobPipeline | null> => {
            let strategy: StrategyResponse;
            try {
              strategy = await api.strategy.getStrategy(job.id);
            } catch {
              // No strategy yet — this job never made it past step 1/2, matching
              // finalizePipeline's own rule of only listing a pipeline once a
              // strategy exists. Skip rather than show a dead-end card.
              return null;
            }
            let coverageScore = 0;
            try {
              const matches = await api.matching.getMatches(job.id);
              coverageScore = matches.coverage_score || 0;
            } catch {
              coverageScore = 0;
            }
            return {
              id: job.id,
              targetCompany: job.company_name || '지원 기업',
              targetRole: job.position || '직무 미정',
              jdText: job.jd_raw_text,
              status: 'strategy',
              matchScore: Math.round(coverageScore * 100),
              extractedKeywords: job.jd_analysis?.culture_keywords || [],
              primaryStrategy: strategy.strategy_text,
              secondaryStrategy: strategy.gaps.map((g) => g.suggestion).join(' '),
              excludedProjects: strategy.excluded_reasons.map((r) => r.reason),
              createdAt: job.created_at
            };
          })
        );
        if (!cancelled) setPipelines(rebuilt.filter((p): p is JobPipeline => p !== null));
      } catch (err) {
        console.error('Failed to load pipelines from backend', err);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserFromSession(session);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
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

  // Tracks which pipeline's documents are currently reflected in `documentDraft`,
  // so opening a pipeline (new or from a previous session) loads that job's real
  // saved content from the backend instead of leaving stale data behind from
  // whatever pipeline was last active — without this, documentDraft/evidenceValidation/
  // defenseMessages were single global slots never keyed to a specific job.
  const loadedPipelineRef = useRef<string | null>(null);

  // The document text whose claims are currently stored server-side, keyed by generated
  // document id. Editing invalidates those claims, so validation compares against this
  // to decide whether it has to pay for a re-extraction before grading.
  const claimsSyncedContentRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!activePipelineId) {
      if (loadedPipelineRef.current !== null) {
        loadedPipelineRef.current = null;
        setDocumentDraft({ ...INITIAL_DOC, id: 'doc-empty' });
        setEvidenceValidation(null);
        setDefenseMessages([]);
      }
      return;
    }
    if (loadedPipelineRef.current === activePipelineId) return;
    loadedPipelineRef.current = activePipelineId;

    (async () => {
      try {
        const docs = await api.documents.list(activePipelineId);
        if (docs.length === 0) {
          setDocumentDraft({ ...INITIAL_DOC, id: 'doc-' + activePipelineId, pipelineId: activePipelineId });
          setEvidenceValidation(null);
          setDefenseMessages([]);
          return;
        }

        // Newest draft per doc type. Version is primary, created_at is the tiebreak:
        // rows written before version numbering was fixed are all version 1, and
        // without the tiebreak a stale draft wins purely on database row order.
        const latestByType = new Map<string, DocumentListItem>();
        for (const d of docs) {
          const existing = latestByType.get(d.doc_type);
          const isNewer =
            !existing ||
            d.version > existing.version ||
            (d.version === existing.version && d.created_at > existing.created_at);
          if (isNewer) latestByType.set(d.doc_type, d);
        }

        const draft: DocumentDraft = { ...INITIAL_DOC, pipelineId: activePipelineId, generatedDocIds: {} };
        let mostRecent: { docId: string; createdAt: string } | null = null;

        for (const meta of latestByType.values()) {
          const full = await api.documents.get(meta.id);
          const feType = BACKEND_TO_FRONTEND_DOC_TYPE[meta.doc_type];
          if (!feType) continue;
          if (feType === 'coverLetter') draft.coverLetterText = full.content;
          if (feType === 'resume') draft.resumeText = full.content;
          if (feType === 'career') draft.careerText = full.content;
          draft.generatedDocIds![feType] = full.id;
          claimsSyncedContentRef.current[full.id] = full.content;
          draft.docType = feType;
          if (!mostRecent || meta.created_at > mostRecent.createdAt) {
            mostRecent = { docId: full.id, createdAt: meta.created_at };
          }
        }

        if (mostRecent) {
          try {
            const validation = await api.validation.get(mostRecent.docId);
            if (validation.total_claims > 0) {
              draft.defenseScore = Math.round(validation.overall_score * 100);
              setEvidenceValidation(validation);
            } else {
              setEvidenceValidation(null);
            }
          } catch {
            setEvidenceValidation(null);
          }

          try {
            const defense = await api.defense.get(mostRecent.docId);
            setDefenseMessages(
              defense.questions.map((q) => ({
                id: 'def-q-' + q.id,
                sender: 'ai',
                text: q.question,
                timestamp: '',
                claimText: q.claim_text,
                expectedAnswerHint: q.expected_answer_hint,
                difficulty: q.difficulty
              }))
            );
          } catch {
            setDefenseMessages([]);
          }
        } else {
          setEvidenceValidation(null);
          setDefenseMessages([]);
        }

        setDocumentDraft(draft);
      } catch (err) {
        console.error('Failed to load saved documents for this pipeline', err);
      }
    })();
  }, [activePipelineId]);

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

  // Usage/billing
  const refreshUsage = async () => {
    try {
      setUsage(await api.billing.getUsage());
    } catch (err) {
      console.error('Failed to load usage', err);
    }
  };

  const handleActionError = (err: unknown, fallbackMessage: string) => {
    console.error(err);
    if (err instanceof ApiError && err.status === 429) {
      showToast(err.message, 'warning');
      refreshUsage();
      return;
    }
    // 4xx responses carry a message written for the user — it says what's wrong and
    // what to do about it, which a generic "실패했습니다" throws away. 5xx keeps the
    // fallback, since those messages are for us, not for them.
    if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.message) {
      showToast(err.message, 'warning');
      return;
    }
    showToast(fallbackMessage, 'error');
  };

  // Auth Actions — real Supabase/Google auth. loginWithGoogle triggers a redirect;
  // the actual "logged in" state is picked up by the onAuthStateChange listener
  // above once the user lands back here.
  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in failed', err);
      showToast('Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  const logout = async () => {
    await signOutAndReload();
  };

  const updateTargetRole = (targetRole: string) => {
    setUser((prev) => ({ ...prev, targetRole }));
  };

  const hasC3P4Content = (c3p4?: Experience['c3p4']) =>
    Boolean(c3p4 && (c3p4.customer || c3p4.problem || c3p4.action || c3p4.product));

  // Experiences Action
  // `silent` exists for the AI-structuring flow, which saves the row only so the
  // decompose call has an id to work with. Announcing "등록되었습니다" there would
  // claim the work is done while the AI is still running.
  const addExperience = async (
    data: Omit<Experience, 'id' | 'createdAt'>,
    opts?: { silent?: boolean }
  ): Promise<Experience> => {
    const be = await api.experiences.create({
      title: data.title,
      company: data.organization,
      period: data.period,
      description: data.description
    });
    saveAnnotation(be.id, { metrics: data.metrics, evidenceSource: data.evidenceSource || '' });
    if (hasC3P4Content(data.c3p4)) {
      await api.experienceEngine.save3c4p(be.id, inflateC3P4(data.c3p4));
    }
    const newExp = { ...mergeExperience(be, loadAnnotations()), c3p4: data.c3p4 };
    setExperiences((prev) => [newExp, ...prev]);
    if (!opts?.silent) showToast('새 3C4P 경험 자산이 등록되었습니다.', 'success');
    return newExp;
  };

  const updateExperience = async (
    id: string,
    data: Partial<Experience>,
    opts?: { silent?: boolean }
  ) => {
    await api.experiences.update(id, {
      title: data.title,
      company: data.organization,
      period: data.period,
      description: data.description
    });
    if (data.metrics || data.evidenceSource !== undefined) {
      const existing = experiences.find((e) => e.id === id);
      saveAnnotation(id, {
        metrics: data.metrics || existing?.metrics || [],
        evidenceSource: data.evidenceSource ?? existing?.evidenceSource ?? ''
      });
    }
    if (hasC3P4Content(data.c3p4)) {
      await api.experienceEngine.save3c4p(id, inflateC3P4(data.c3p4!));
    }
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e))
    );
    if (!opts?.silent) showToast('경험 자산이 정상 수정되었습니다.', 'success');
  };

  // Uploads a PDF/DOCX/TXT (portfolio, resume, whatever) and has the AI extract
  // experiences straight into the vault. From there they flow through the same
  // matching/strategy/document/defense pipeline as a manually-entered experience.
  const importExperiencesFromFile = async (file: File): Promise<number> => {
    const upload = await api.documentParser.upload(file);
    const { extracted_count, experiences: extracted } = await api.experiences.extract(upload.id);
    const annotations = loadAnnotations();
    setExperiences((prev) => [...extracted.map((be) => mergeExperience(be, annotations)), ...prev]);
    showToast(
      extracted_count > 0
        ? `'${upload.file_name}'에서 경험 ${extracted_count}건을 가져왔습니다.`
        : `'${upload.file_name}'에서 추출할 수 있는 경험을 찾지 못했습니다.`,
      extracted_count > 0 ? 'success' : 'warning'
    );
    return extracted_count;
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
    // decompose() already persisted three_c_four_p server-side — only metrics/evidenceSource
    // still need a local annotation.
    const annotation = deriveAnnotationFromEvidence(result.evidence, result.anchors);
    saveAnnotation(id, annotation);
    const c3p4 = flattenC3P4(result.three_c_four_p);
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, ...annotation, c3p4 } : e)));
    showToast('AI가 경험을 분석하여 3C4P 구조로 자동 변환했습니다!', 'success');
  };

  // JD 분석 + 경험 매칭은 합쳐서 수십 초가 걸린다. 이 진행 상태를 Pipeline 화면의 로컬
  // state로 들고 있으면 사용자가 다른 메뉴로 이동하는 순간 컴포넌트가 언마운트되면서
  // 결과를 받을 곳이 사라진다 — 서버 작업은 끝나 있는데 화면만 처음으로 돌아가는 것이다.
  // 그래서 실행 상태를 앱 전체가 공유하는 이곳에 둔다. 화면을 떠나도 계속 돌고, 돌아오면
  // 진행 중이면 진행 중인 채로, 끝났으면 결과가 채워진 채로 이어진다.
  const runPipelineAnalysis = async (targetCompany: string, targetRole: string, jdText: string) => {
    setPipelineRun((prev) => ({
      ...prev,
      targetCompany,
      targetRole,
      jdText,
      status: 'analyzing',
      error: null
    }));
    try {
      const jd = await analyzeJob(targetCompany, targetRole, jdText);
      const match = await matchExperiences(jd.id);
      setPipelineRun((prev) => ({ ...prev, jd, match, step: 2, status: 'idle' }));
    } catch (err) {
      const isQuota = err instanceof ApiError && err.status === 429;
      setPipelineRun((prev) => ({
        ...prev,
        status: 'idle',
        error: isQuota
          ? (err as ApiError).message
          : '채용 공고 분석에 실패했습니다. 잠시 후 다시 시도해주세요.'
      }));
      handleActionError(err, '채용 공고 분석에 실패했습니다.');
    }
  };

  const runPipelineStrategy = async () => {
    const jd = pipelineRunRef.current.jd;
    if (!jd) return;
    setPipelineRun((prev) => ({ ...prev, status: 'planning', error: null }));
    try {
      const strategy = await generateStrategyForJob(jd.id);
      setPipelineRun((prev) => ({ ...prev, strategy, step: 3, status: 'idle' }));
    } catch (err) {
      setPipelineRun((prev) => ({ ...prev, status: 'idle' }));
      handleActionError(err, '지원 전략 수립에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const setPipelineStep = (step: number) => setPipelineRun((prev) => ({ ...prev, step }));
  const updatePipelineDraft = (patch: Partial<PipelineRun>) =>
    setPipelineRun((prev) => ({ ...prev, ...patch }));
  const resetPipelineRun = () => setPipelineRun(INITIAL_PIPELINE_RUN);

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
  // Streams tokens into the editor as they generate instead of leaving a spinner up
  // for the whole call — document_engine already supports this server-side
  // (generate_document_stream), this is the piece that was missing to actually use it.
  const generateDocument = async (docType: FrontendDocType) => {
    if (!activePipelineId) {
      showToast('먼저 지원을 생성하거나 선택해주세요.', 'warning');
      return;
    }
    setEvidenceValidation(null);
    setCritique(null);
    // Clear the field first so a regeneration doesn't show new tokens landing on top
    // of the previous draft.
    setDocumentDraft((prev) => ({
      ...prev,
      docType,
      coverLetterText: docType === 'coverLetter' ? '' : prev.coverLetterText,
      resumeText: docType === 'resume' ? '' : prev.resumeText,
      careerText: docType === 'career' ? '' : prev.careerText
    }));

    const doc = await api.documents.generateStream(activePipelineId, docType, (delta) => {
      setDocumentDraft((prev) => ({
        ...prev,
        coverLetterText: docType === 'coverLetter' ? prev.coverLetterText + delta : prev.coverLetterText,
        resumeText: docType === 'resume' ? prev.resumeText + delta : prev.resumeText,
        careerText: docType === 'career' ? prev.careerText + delta : prev.careerText
      }));
    });

    claimsSyncedContentRef.current[doc.id] = doc.content;
    setDocumentDraft((prev) => ({
      ...prev,
      docType,
      // Overwrite with the server's saved copy rather than trusting the accumulated
      // deltas, in case anything was lost in transit.
      coverLetterText: docType === 'coverLetter' ? doc.content : prev.coverLetterText,
      resumeText: docType === 'resume' ? doc.content : prev.resumeText,
      careerText: docType === 'career' ? doc.content : prev.careerText,
      generatedDocIds: { ...prev.generatedDocIds, [docType]: doc.id },
      updatedAt: new Date().toISOString()
    }));
    showToast('AI가 지원서 초안을 생성했습니다.', 'success');
  };

  // For an upload/paste of an existing resume: if a generated_documents row
  // already exists for this docType, the normal autosave (debounced off
  // updateDocumentContent) picks it up. If not — nothing has been generated yet
  // for this docType — there's no id for autosave to save against, so this
  // creates that row directly from the given text (no LLM write, just claim
  // extraction), the same way generateDocument's tail does after a real draft.
  const importDocumentText = async (docType: FrontendDocType, text: string) => {
    if (!activePipelineId) {
      showToast('먼저 지원을 생성하거나 선택해주세요.', 'warning');
      return;
    }
    if (documentDraft.generatedDocIds?.[docType]) {
      updateDocumentContent(docType, text);
      return;
    }
    const doc = await api.documents.import(activePipelineId, docType, text);
    claimsSyncedContentRef.current[doc.id] = doc.content;
    setEvidenceValidation(null);
    setCritique(null);
    setDocumentDraft((prev) => ({
      ...prev,
      docType,
      coverLetterText: docType === 'coverLetter' ? doc.content : prev.coverLetterText,
      resumeText: docType === 'resume' ? doc.content : prev.resumeText,
      careerText: docType === 'career' ? doc.content : prev.careerText,
      generatedDocIds: { ...prev.generatedDocIds, [docType]: doc.id },
      updatedAt: new Date().toISOString()
    }));
  };

  const contentFor = (draft: DocumentDraft, docType: FrontendDocType) =>
    docType === 'resume' ? draft.resumeText : docType === 'career' ? draft.careerText : draft.coverLetterText;

  const withContent = (draft: DocumentDraft, docType: FrontendDocType, text: string): DocumentDraft => ({
    ...draft,
    docType,
    coverLetterText: docType === 'coverLetter' ? text : draft.coverLetterText,
    resumeText: docType === 'resume' ? text : draft.resumeText,
    careerText: docType === 'career' ? text : draft.careerText,
    updatedAt: new Date().toISOString()
  });

  // Edits used to live only in localStorage, so the server kept serving — and grading —
  // the originally generated text. This pushes the current text up without re-deriving
  // claims, which is cheap enough for the editor to call on a debounce.
  const saveDocument = async (docType: FrontendDocType) => {
    const docId = documentDraft.generatedDocIds?.[docType];
    if (!docId) return;
    await api.documents.update(docId, contentFor(documentDraft, docType), false);
  };

  const rewriteClaim = async (docType: FrontendDocType, claimText: string, instruction?: string) => {
    const docId = documentDraft.generatedDocIds?.[docType];
    if (!docId) throw new Error('먼저 AI 초안을 생성해주세요.');
    // The rewrite is located by exact match against the document the SERVER holds, so
    // make sure that is the text the user is actually looking at before asking.
    await api.documents.update(docId, contentFor(documentDraft, docType), false);
    return api.documents.rewrite(docId, claimText, instruction);
  };

  const applyRewrite = (docType: FrontendDocType, original: string, rewritten: string) => {
    setDocumentDraft((prev) => {
      const current = contentFor(prev, docType);
      if (!current.includes(original)) return prev;
      return withContent(prev, docType, current.replace(original, rewritten));
    });
  };

  const runEvidenceValidation = async (docType: FrontendDocType) => {
    const docId = documentDraft.generatedDocIds?.[docType];
    if (!docId) {
      showToast('먼저 "AI 초안 생성"으로 문서를 만들어야 근거 검증을 실행할 수 있습니다.', 'warning');
      return;
    }

    // Claims are extracted from the document text. If it changed since the last
    // extraction, validating now would grade sentences that no longer exist — so push
    // the current text up and re-derive the claims first.
    const content = contentFor(documentDraft, docType);
    if (claimsSyncedContentRef.current[docId] !== content) {
      await api.documents.update(docId, content, true);
      claimsSyncedContentRef.current[docId] = content;
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

  // Writing-quality critique (structure/flow/expression), independent of evidence
  // validation. Not persisted server-side, so this always makes a fresh LLM call —
  // push the on-screen text up first so the critique reads what the user is looking at.
  const runCritique = async (docType: FrontendDocType) => {
    const docId = documentDraft.generatedDocIds?.[docType];
    if (!docId) {
      showToast('먼저 "AI 초안 생성"으로 문서를 만들어야 첨삭을 받을 수 있습니다.', 'warning');
      return;
    }
    await saveDocument(docType);
    const result = await api.documents.critique(docId);
    setCritique(result);
    showToast('AI 첨삭이 완료되었습니다.', 'success');
  };

  // 방금 생성된 AI 질문 중 가장 최근 것을 찾아 그 질문에 대한 실제 답변 평가를 백엔드에 요청한다.
  // `target` lets a caller answer a specific question (the defence screen lists them
  // all); without it we fall back to the most recent question, which is what the
  // editor's linear chat wants.
  const sendDefenseMessage = async (text: string, target?: DefenseChatMessage) => {
    if (!text.trim()) return;

    const lastQuestion =
      target || [...defenseMessages].reverse().find((m) => m.sender === 'ai' && m.claimText);
    if (!lastQuestion) {
      showToast('먼저 "AI 예상 질문 만들기"로 답변할 질문을 생성해주세요.', 'warning');
      return;
    }

    const userMsg: DefenseChatMessage = {
      id: 'def-user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      answersQuestionId: lastQuestion.id
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
        scoreImpact: result.score_delta,
        answersQuestionId: lastQuestion.id
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
      expectedAnswerHint: q.expected_answer_hint,
      difficulty: q.difficulty
    }));
    setDefenseMessages((prev) => [...prev, ...newMessages]);
    showToast(`AI가 예상 면접 질문 ${result.questions.length}개를 만들었습니다.`, 'success');
  };

  const clearAllData = () => {
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
    // Only this app's own cached keys — never the Supabase session key, or a
    // logged-in Google user would get silently signed out by a local reset.
    [
      'careercraft_user',
      'careercraft_experiences',
      'careercraft_exp_annotations',
      'careercraft_pipelines',
      'careercraft_active_pipeline_id',
      'careercraft_document',
      'careercraft_defense_chat'
    ].forEach((key) => localStorage.removeItem(key));
    showToast('로컬에 저장된 작업 내역이 초기화되었습니다.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loginWithGoogle,
        logout,
        updateTargetRole,
        usage,
        refreshUsage,
        handleActionError,
        experiences,
        experiencesLoading,
        addExperience,
        updateExperience,
        deleteExperience,
        importExperiencesFromFile,
        decomposeExperience,
        pipelines,
        activePipelineId,
        setActivePipelineId,
        analyzeJob,
        matchExperiences,
        generateStrategyForJob,
        pipelineRun,
        runPipelineAnalysis,
        runPipelineStrategy,
        setPipelineStep,
        updatePipelineDraft,
        resetPipelineRun,
        finalizePipeline,
        deletePipeline,
        documentDraft,
        updateDocumentContent,
        generateDocument,
        importDocumentText,
        saveDocument,
        rewriteClaim,
        applyRewrite,
        evidenceValidation,
        runEvidenceValidation,
        critique,
        runCritique,
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

