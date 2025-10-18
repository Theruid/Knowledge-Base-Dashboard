import { ApiResponse, PaginatedResponse } from '../types';
import { config } from '../config';

// Generic fetch function with error handling
async function fetchApi<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'An error occurred');
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Conversation message type
export interface ConversationMessage {
  Conversation_ID: number;
  IS_BOT: number;
  message: string;
  Time: string;
  LockNumber: number;
  Metric1?: string;
  Metric2?: string;
}

// Conversation summary type for list view
export interface ConversationSummary {
  Conversation_ID: number;
  message_count: number;
  first_message_time: string;
  last_message_time: string;
  analyzed?: number; // Flag to indicate if conversation has notes/tags (1 = true, 0 = false)
}

// Conversation statistics type
export interface ConversationStats {
  totalMessages: number;
  botMessages: number;
  userMessages: number;
}

// Conversation API functions
export const conversationApi = {
  // Get paginated list of conversations with optional search and sorting
  getConversationList: (
    page = 1, 
    limit = 10, 
    search = '', 
    sortField: 'Conversation_ID' | 'message_count' = 'Conversation_ID',
    sortDirection: 'asc' | 'desc' = 'desc',
    onlyAnalyzed = false
  ): Promise<PaginatedResponse<ConversationSummary>> => {
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortField,
      sortDirection
    });
    
    if (search) {
      searchParams.append('search', search);
    }
    
    if (onlyAnalyzed) {
      searchParams.append('onlyAnalyzed', 'true');
    }
    
    return fetchApi<PaginatedResponse<ConversationSummary>>(`/conversation/list?${searchParams.toString()}`);
  },
  
  // Get all conversation IDs (legacy)
  getConversationIds: (): Promise<ApiResponse<number[]>> => {
    return fetchApi<ApiResponse<number[]>>('/conversation/ids');
  },

  // Get conversation messages by ID
  getConversation: (id: number): Promise<ApiResponse<ConversationMessage[]>> => {
    return fetchApi<ApiResponse<ConversationMessage[]>>(`/conversation/${id}`);
  },

  // Get conversation statistics
  getConversationStats: (id: number): Promise<ApiResponse<ConversationStats>> => {
    return fetchApi<ApiResponse<ConversationStats>>(`/conversation/stats/${id}`);
  },
  
  // Get count of analyzed conversations
  getAnalyzedCount: (): Promise<ApiResponse<number>> => {
    return fetchApi<ApiResponse<number>>('/conversation/analyzed-count');
  },
  
  // Get daily conversation counts for the last N days
  getDailyCounts: (days = 10): Promise<ApiResponse<{date: string, count: number}[]>> => {
    return fetchApi<ApiResponse<{date: string, count: number}[]>>(`/conversation/daily-counts?days=${days}`);
  },
  
  // Get conversation IDs by LOCK number
  getConversationsByLock: (lockNumber: number): Promise<ApiResponse<number[]>> => {
    return fetchApi<ApiResponse<number[]>>(`/conversation/by-lock/${lockNumber}`);
  }
};
