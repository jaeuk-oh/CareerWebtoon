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

export interface GeneratedDocResponse {
  id: string;
  job_id: string;
  doc_type: string;
  content: string;
  version: number;
  claims_count: number;
  created_at: string;
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

// Backend doc_type values differ from the frontend's docType union.
export type FrontendDocType = 'resume' | 'career' | 'coverLetter';
const DOC_TYPE_TO_BACKEND: Record<FrontendDocType, string> = {
  resume: 'resume',
  career: 'career_desc',
  coverLetter: 'cover_letter',
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
  },
  experienceEngine: {
    decompose: (experienceId: string) => post<DecomposeResponse>('/experience-engine/decompose', { experience_id: experienceId }),
  },
  jobs: {
    analyze: (data: { company_name?: string; position?: string; jd_raw_text: string }) =>
      post<JDAnalysisResponse>('/jobs', data),
    delete: (jobId: string) => del<{ message: string }>(`/jobs/${jobId}`),
  },
  matching: {
    match: (jobId: string) => post<MatchResponse>('/matching/match', { job_id: jobId }),
  },
  strategy: {
    generate: (jobId: string) => post<StrategyResponse>('/strategy/strategy', { job_id: jobId }),
  },
  documents: {
    generate: (jobId: string, docType: FrontendDocType) =>
      post<GeneratedDocResponse>('/documents/generate/documents/generate', {
        job_id: jobId,
        doc_type: DOC_TYPE_TO_BACKEND[docType],
      }),
  },
  validation: {
    validate: (generatedDocumentId: string) =>
      post<ValidationResponse>('/validation/validation/', { generated_document_id: generatedDocumentId }),
  },
  defense: {
    generate: (generatedDocumentId: string) =>
      post<DefenseResponse>('/defense/defense/', { generated_document_id: generatedDocumentId }),
  },
};
