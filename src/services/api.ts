import { KnowledgeEntry, ApiResponse, PaginatedResponse } from '../types';
import { config } from '../config';

// Generic fetch function with error handling
export async function fetchApi<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<T> {
  try {
    // Get the authentication token from localStorage
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if token exists
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle token expiration (401 Unauthorized)
      if (response.status === 401 && errorData.message?.includes('expired')) {
        console.log('Token expired, redirecting to login');
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/login';
        throw new Error('Authentication expired. Please log in again.');
      }
      
      throw new Error(errorData.message || 'An error occurred');
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Knowledge API functions
export const knowledgeApi = {
  // Get all knowledge entries with pagination, search and domain filter
  getAll: (page = 1, limit = 10, search = '', domain = ''): Promise<PaginatedResponse<KnowledgeEntry>> => {
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      searchParams.append('search', search);
    }

    if (domain) {
      searchParams.append('domain', domain);
    }
    
    return fetchApi<PaginatedResponse<KnowledgeEntry>>(
      `/knowledge?${searchParams.toString()}`
    );
  },

  // Get a single knowledge entry by ID
  getById: (id: number): Promise<ApiResponse<KnowledgeEntry>> => {
    return fetchApi<ApiResponse<KnowledgeEntry>>(`/knowledge/${id}`);
  },

  // Create a new knowledge entry
  create: (entry: Omit<KnowledgeEntry, 'id'>): Promise<ApiResponse<KnowledgeEntry>> => {
    return fetchApi<ApiResponse<KnowledgeEntry>>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  // Update an existing knowledge entry
  update: (id: number, entry: Omit<KnowledgeEntry, 'id'>): Promise<ApiResponse<KnowledgeEntry>> => {
    return fetchApi<ApiResponse<KnowledgeEntry>>(`/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  },

  // Delete a knowledge entry
  delete: (id: number): Promise<ApiResponse<void>> => {
    return fetchApi<ApiResponse<void>>(`/knowledge/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Get count of unique knowledge numbers
  getUniqueKnowledgeCount: (): Promise<ApiResponse<{uniqueCount: number}>> => {
    return fetchApi<ApiResponse<{uniqueCount: number}>>('/knowledge/stats/unique-knowledge');
  },

  // Get all available domains
  getAvailableDomains: (): Promise<ApiResponse<string[]>> => {
    return fetchApi<ApiResponse<string[]>>('/knowledge/domains');
  }
};