import { Experience } from '../types/experience';
import { JobPipeline } from '../types/job';
import { DocumentDraft } from '../types/document';

const API_BASE = '/api/v1';

export const api = {
  experiences: {
    list: (): Promise<Experience[]> => fetch(`${API_BASE}/experiences`).then(res => res.json()),
    get: (id: string): Promise<Experience> => fetch(`${API_BASE}/experiences/${id}`).then(res => res.json()),
    create: (data: Partial<Experience>): Promise<Experience> => fetch(`${API_BASE}/experiences`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data) 
    }).then(res => res.json()),
  },
  jobs: {
    list: (): Promise<JobPipeline[]> => fetch(`${API_BASE}/jobs`).then(res => res.json()),
  },
  documents: {
    list: (): Promise<DocumentDraft[]> => fetch(`${API_BASE}/documents`).then(res => res.json()),
    generate: (jobId: string, experienceIds: string[]): Promise<DocumentDraft> => fetch(`${API_BASE}/documents/generate`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, experienceIds }) 
    }).then(res => res.json()),
  },
};
