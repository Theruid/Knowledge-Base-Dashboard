// Knowledge entry type definition
export interface KnowledgeEntry {
  UniqueID: number;
  knowledge_number: number;
  problem: string;
  detailed_solution: string;
  domain?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  totalPages: number;
}