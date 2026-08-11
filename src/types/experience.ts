export interface Experience {
  id: string;
  userId?: string;
  title: string;
  organization: string;
  period: string; // e.g. "2023.01 - 2023.12"
  description: string;
  c3p4: {
    customer: string;
    problem: string;
    action: string;
    product: string;
  };
  metrics: string[];
  evidenceSource?: string;
  createdAt: string;
  updatedAt?: string;
}
