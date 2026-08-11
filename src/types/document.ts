export interface EvidenceAnnotation {
  id: string;
  originalText: string;
  type: 'verified' | 'unverified';
  source?: string;
  suggestedFix?: string;
  fixExplanation?: string;
}

export interface DocumentDraft {
  id: string;
  pipelineId?: string;
  docType: 'resume' | 'career' | 'coverLetter';
  coverLetterText: string;
  resumeText: string;
  careerText: string;
  defenseScore: number;
  updatedAt: string;
}

export interface DefenseChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  scoreImpact?: number;
}
