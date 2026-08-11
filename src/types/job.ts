export interface JobPipeline {
  id: string;
  targetCompany: string;
  targetRole: string;
  jdText: string;
  status: 'jd_analysis' | 'matching' | 'strategy' | 'editor' | 'defense';
  matchScore: number;
  extractedKeywords: string[];
  primaryStrategy?: string;
  secondaryStrategy?: string;
  excludedProjects?: string[];
  createdAt: string;
}
