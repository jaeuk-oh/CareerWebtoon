import { ensureSession } from './supabase';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await ensureSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// No Content-Type header here — the browser sets multipart/form-data with the
// correct boundary itself. Setting it manually (like `request` does for JSON)
// would send a boundary-less header and the server couldn't parse the body.
async function uploadRequest<T>(path: string, file: File): Promise<T> {
  const token = await ensureSession();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return res.json();
}

type StreamEvent =
  | { delta: string }
  | { error: string }
  | (GeneratedDocResponse & { done: true });

/**
 * Reads a Server-Sent Events response, calling onDelta as each text chunk arrives and
 * resolving with the final `{done: true, ...}` event once the stream ends. Not
 * EventSource: EventSource can't send an Authorization header, and every request this
 * app makes needs the Supabase bearer token.
 */
async function streamRequest(
  path: string,
  body: unknown,
  onDelta: (text: string) => void
): Promise<GeneratedDocResponse> {
  const token = await ensureSession();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });

  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      detail = ((await res.json()) as { detail?: string }).detail || detail;
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; each frame here is one `data: ...` line.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      const event = JSON.parse(line.slice(5).trim()) as StreamEvent;
      if ('error' in event) throw new ApiError(502, event.error);
      if ('delta' in event) onDelta(event.delta);
      else return event;
    }
  }

  throw new ApiError(502, '문서 생성 스트림이 완료되지 않고 종료되었습니다.');
}

const get = <T,>(path: string) => request<T>(path);
const post = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
const put = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined });
const del = <T,>(path: string) => request<T>(path, { method: 'DELETE' });

// ---- Backend response shapes (mirrors backend/app/modules/**/schemas.py) ----

export interface BackendExperience {
  id: string;
  user_id: string;
  title: string;
  company?: string | null;
  role?: string | null;
  period?: string | null;
  description?: string | null;
  skills: string[];
  source_document_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ThreeCFourP {
  customer?: { target?: string; problem?: string; needs?: string };
  company_context?: { organization?: string; team?: string; role?: string; situation?: string; opportunity?: string };
  competitor?: { research?: string; references?: string; alternatives?: string };
  place?: { actual_actions?: string[] };
  product?: { deliverables?: string[]; results?: string[] };
  price?: { time_invested?: string; cost_saved?: string; efficiency_gain?: string };
  promotion?: { sharing?: string; impact?: string };
}

export interface EvidenceItem {
  id?: string;
  claim: string;
  evidence_text?: string;
  source?: string;
  status: string;
  is_quantitative: boolean;
}

export interface AnchorItem {
  id?: string;
  anchor_type: string;
  summary?: string;
  skills: string[];
}

export interface DecomposeResponse {
  three_c_four_p: ThreeCFourP;
  evidence: EvidenceItem[];
  anchors: AnchorItem[];
  experience_grade?: string;
  message: string;
}

export interface JobRequirementItem {
  competency: string;
  priority: number;
  is_explicit: boolean;
  description?: string;
}

export interface JDAnalysisResponse {
  id: string;
  company_name?: string;
  position?: string;
  requirements: JobRequirementItem[];
  hidden_requirements: JobRequirementItem[];
  culture_keywords: string[];
  message: string;
}

export interface JobResponse {
  id: string;
  user_id: string;
  company_name?: string | null;
  position?: string | null;
  jd_raw_text: string;
  jd_analysis?: { requirements?: JobRequirementItem[]; hidden_requirements?: JobRequirementItem[]; culture_keywords?: string[] } | null;
  created_at: string;
}

export interface MatchItem {
  experience_id: string;
  experience_title: string;
  anchor_id?: string;
  anchor_type?: string;
  match_score: number;
  match_type: string;
  rationale: string;
}

export interface MatchResponse {
  job_id: string;
  matches: MatchItem[];
  coverage_score: number;
  message: string;
}

export interface GapItem {
  competency: string;
  gap_type: string;
  suggestion: string;
}

export interface StrategyResponse {
  id: string;
  job_id: string;
  primary_experience?: { id: string; title?: string } | null;
  secondary_experience?: { id: string; title?: string } | null;
  gaps: GapItem[];
  excluded_reasons: { experience_id: string; reason: string }[];
  strategy_text: string;
  message: string;
}

export interface UsageResponse {
  free_used: number;
  free_limit: number;
  credit_balance: number;
  resets_at: string;
}

export interface CreditPackInfo {
  pack_id: string;
  name: string;
  amount: number;
  credits: number;
}

export interface CheckoutResponse {
  order_id: string;
  order_name: string;
  amount: number;
  client_key: string;
}

export interface ContactInquiryResponse {
  id: string;
  created_at: string;
}

export interface WebInsight {
  topic: string;
  summary: string;
  source_url?: string | null;
}

export interface PredictedQuestion {
  question: string;
  category: string;
  rationale: string;
  source_hint?: string | null;
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface InterviewResearchResponse {
  job_id: string;
  web_insights: WebInsight[];
  predicted_questions: PredictedQuestion[];
  keywords: string[];
  sources: ResearchSource[];
  cached: boolean;
  created_at: string;
}

export interface DocumentUploadResponse {
  id: string;
  file_name: string;
  doc_type: string;
  sections_count: number;
  message: string;
}

export interface ExperienceExtractResponse {
  extracted_count: number;
  experiences: BackendExperience[];
  message: string;
}

export interface GeneratedDocResponse {
  id: string;
  job_id: string;
  doc_type: string;
  content: string;
  version: number;
  claims_count: number;
  created_at: string;
}

export interface DocumentListItem {
  id: string;
  job_id: string;
  doc_type: string;
  version: number;
  created_at: string;
}

export interface RewriteResponse {
  original: string;
  rewritten: string;
  rationale: string;
}

export interface ClaimValidation {
  claim_id: string;
  claim_text: string;
  status: string;
  evidence_text?: string;
  defense_score: number;
  issues: string[];
}

export interface ValidationResponse {
  document_id: string;
  total_claims: number;
  verified: number;
  flagged: number;
  unverified: number;
  overall_score: number;
  claims: ClaimValidation[];
  message: string;
}

export interface DefenseQuestion {
  id: string;
  claim_text: string;
  question: string;
  difficulty: string;
  expected_answer_hint?: string;
}

export interface DefenseResponse {
  document_id: string;
  questions: DefenseQuestion[];
  flagged_claims_count: number;
  message: string;
}

export interface AnswerFeedbackResponse {
  feedback: string;
  is_strong: boolean;
  score_delta: number;
}

// Backend doc_type values differ from the frontend's docType union.
export type FrontendDocType = 'resume' | 'career' | 'coverLetter';
const DOC_TYPE_TO_BACKEND: Record<FrontendDocType, string> = {
  resume: 'resume',
  career: 'career_desc',
  coverLetter: 'cover_letter',
};
export const BACKEND_TO_FRONTEND_DOC_TYPE: Record<string, FrontendDocType> = {
  resume: 'resume',
  career_desc: 'career',
  cover_letter: 'coverLetter',
};

export const api = {
  experiences: {
    list: () => get<BackendExperience[]>('/experiences'),
    create: (data: {
      title: string;
      company?: string;
      role?: string;
      period?: string;
      description?: string;
      skills?: string[];
    }) => post<BackendExperience>('/experiences', data),
    update: (
      id: string,
      data: Partial<{ title: string; company: string; role: string; period: string; description: string; skills: string[] }>
    ) => put<BackendExperience>(`/experiences/${id}`, data),
    delete: (id: string) => del<{ message: string; id: string }>(`/experiences/${id}`),
    // Extracts experiences (via LLM) from a document already uploaded through
    // documentParser.upload, and persists them straight into the vault.
    extract: (documentId: string) => post<ExperienceExtractResponse>('/experiences/extract', { document_id: documentId }),
  },
  documentParser: {
    // PDF/DOCX/TXT upload — a portfolio, resume, or any other document the user
    // wants the AI to read. Feeds experiences.extract, and from there flows into
    // matching/strategy/document generation/defense like any other experience.
    upload: (file: File) => uploadRequest<DocumentUploadResponse>('/documents/upload', file),
  },
  experienceEngine: {
    decompose: (experienceId: string) => post<DecomposeResponse>('/experience-engine/decompose', { experience_id: experienceId }),
    get3c4p: (experienceId: string) => get<ThreeCFourP & { id: string; experience_id: string } | null>(`/experience-engine/${experienceId}/3c4p`),
    // Persists a hand-entered 3C4P breakdown against the same table decompose() writes
    // to, so it survives a device change instead of living only in localStorage.
    save3c4p: (experienceId: string, data: ThreeCFourP) =>
      put<ThreeCFourP & { id: string; experience_id: string }>(`/experience-engine/${experienceId}/3c4p`, data),
    getEvidence: (experienceId: string) => get<EvidenceItem[]>(`/experience-engine/${experienceId}/evidence`),
    getAnchors: (experienceId: string) => get<AnchorItem[]>(`/experience-engine/${experienceId}/anchors`),
  },
  jobs: {
    analyze: (data: { company_name?: string; position?: string; jd_raw_text: string }) =>
      post<JDAnalysisResponse>('/jobs', data),
    list: () => get<JobResponse[]>('/jobs'),
    delete: (jobId: string) => del<{ message: string }>(`/jobs/${jobId}`),
  },
  matching: {
    match: (jobId: string) => post<MatchResponse>('/matching/match', { job_id: jobId }),
    getMatches: (jobId: string) => get<MatchResponse>(`/matching/${jobId}/matches`),
  },
  strategy: {
    generate: (jobId: string) => post<StrategyResponse>('/strategy/strategy', { job_id: jobId }),
    getStrategy: (jobId: string) => get<StrategyResponse>(`/strategy/${jobId}/strategy`),
  },
  documents: {
    generate: (jobId: string, docType: FrontendDocType) =>
      post<GeneratedDocResponse>('/documents/generate/documents/generate', {
        job_id: jobId,
        doc_type: DOC_TYPE_TO_BACKEND[docType],
      }),
    // Renders tokens as they arrive instead of a spinner for the whole generation.
    // onDelta receives each chunk; the returned promise resolves once the document
    // (and its extracted claims) are fully saved server-side.
    generateStream: (jobId: string, docType: FrontendDocType, onDelta: (text: string) => void) =>
      streamRequest(
        '/documents/generate/documents/generate/stream',
        { job_id: jobId, doc_type: DOC_TYPE_TO_BACKEND[docType] },
        onDelta
      ),
    list: (jobId: string) => get<DocumentListItem[]>(`/documents/generate/documents/${jobId}/list`),
    get: (docId: string) => get<GeneratedDocResponse>(`/documents/generate/documents/${docId}`),
    // reextractClaims costs an LLM call, so autosave leaves it off and only the
    // pre-validation save turns it on.
    update: (docId: string, content: string, reextractClaims = false) =>
      put<GeneratedDocResponse>(`/documents/generate/documents/${docId}`, {
        content,
        reextract_claims: reextractClaims,
      }),
    rewrite: (docId: string, claimText: string, instruction?: string) =>
      post<RewriteResponse>(`/documents/generate/documents/${docId}/rewrite`, {
        claim_text: claimText,
        instruction,
      }),
  },
  validation: {
    validate: (generatedDocumentId: string) =>
      post<ValidationResponse>('/validation/validation/', { generated_document_id: generatedDocumentId }),
    get: (generatedDocumentId: string) => get<ValidationResponse>(`/validation/validation/${generatedDocumentId}`),
  },
  defense: {
    generate: (generatedDocumentId: string) =>
      post<DefenseResponse>('/defense/defense/', { generated_document_id: generatedDocumentId }),
    answerFeedback: (data: {
      question: string;
      claim_text: string;
      expected_answer_hint?: string;
      user_answer: string;
    }) => post<AnswerFeedbackResponse>('/defense/defense/answer', data),
    get: (generatedDocumentId: string) => get<DefenseResponse>(`/defense/defense/${generatedDocumentId}`),
  },
  billing: {
    getUsage: () => get<UsageResponse>('/billing/usage'),
    getPacks: () => get<CreditPackInfo[]>('/billing/packs'),
    checkout: (packId: string) => post<CheckoutResponse>('/billing/checkout', { pack_id: packId }),
    confirmPayment: (paymentKey: string, orderId: string, amount: number) =>
      post<UsageResponse>('/billing/confirm', { payment_key: paymentKey, order_id: orderId, amount }),
  },
  support: {
    createInquiry: (message: string, email?: string) =>
      post<ContactInquiryResponse>('/support/inquiries', { message, email }),
  },
  interviewResearch: {
    // Cached — returns 404 (thrown as ApiError) until run() has been called for this job.
    get: (jobId: string) => get<InterviewResearchResponse>(`/interview-research/${jobId}`),
    // Costs an LLM+search call. Only call from an explicit user action (never on page load).
    run: (jobId: string) => post<InterviewResearchResponse>(`/interview-research/${jobId}`),
  },
};
