export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  category: 'security' | 'tutorials' | 'business' | 'conversions' | 'compliance' | 'tech';
  categoryLabel: string;
  publishedDate: string;
  readTimeMinutes: number;
  author: string;
  summary: string;
  content: string; // Markdown or rich formatted text
  targetToolId?: string;
  targetToolActionText?: string;
}
