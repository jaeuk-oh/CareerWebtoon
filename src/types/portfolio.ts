export interface PortfolioElement {
  id: string;
  type: 'text' | 'image' | 'grid' | 'badge';
  title?: string;
  content: string;
  badgeType?: 'primary' | 'success' | 'warning';
}

export interface PortfolioSlide {
  id: string;
  slideNumber: number;
  title: string;
  subtitle: string;
  elements: PortfolioElement[];
}

export type PortfolioTheme = 'navy' | 'emerald' | 'slate' | 'dark';

export interface PortfolioData {
  id: string;
  candidateName: string;
  targetRole: string;
  theme?: PortfolioTheme;
  slides: PortfolioSlide[];
  publishedUrl?: string;
  updatedAt: string;
}

