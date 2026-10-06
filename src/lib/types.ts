export interface UserSession {
  id: string;
  email: string;
  name?: string | null;
}

export interface SnippetDTO {
  id: string;
  title: string;
  description?: string | null;
  code: string;
  language: string;
  tags: string[];
  summary?: string | null;
  isPublic: boolean;
  userId: string;
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysisResult {
  tags: string[];
  summary: string;
  source: 'gemini' | 'heuristic-fallback';
}

export interface CreateSnippetInput {
  title: string;
  description?: string;
  code: string;
  language?: string;
  tags?: string[];
  summary?: string;
  isPublic?: boolean;
}

export interface UpdateSnippetInput {
  title?: string;
  description?: string;
  code?: string;
  language?: string;
  tags?: string[];
  summary?: string;
  isPublic?: boolean;
}
