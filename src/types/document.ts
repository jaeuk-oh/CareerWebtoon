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
  // Backend generated_documents.id per doc type, once a real AI draft has been generated for it.
  generatedDocIds?: Partial<Record<'resume' | 'career' | 'coverLetter', string>>;
}

export interface DefenseChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  scoreImpact?: number;
  // Present on AI-generated question messages so a later reply can be graded
  // against the right claim (see AppContext.sendDefenseMessage).
  claimText?: string;
  expectedAnswerHint?: string;
}
