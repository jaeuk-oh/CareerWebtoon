export interface Experience {
  id: string;
  userId: string;
  title: string;
  organization: string;
  startDate: string;
  endDate?: string;
  description: string;
  c3p4?: {
    customer?: string;
    problem?: string;
    action?: string;
    product?: string;
  };
  metrics?: string[];
  createdAt: string;
  updatedAt: string;
}
