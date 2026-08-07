export interface Document {
  id: string;
  userId: string;
  jobId: string;
  type: 'resume' | 'career' | 'coverLetter';
  content: string;
  defenseScore?: number;
  status: 'draft' | 'review' | 'final';
  createdAt: string;
  updatedAt: string;
}
