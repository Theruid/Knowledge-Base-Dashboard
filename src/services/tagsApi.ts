// Tags API service
import { fetchApi } from './api';

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name: string;
  color?: string;
}

export interface TagStats {
  id: number;
  name: string;
  color: string;
  count: number;
  percentage: number;
}

export interface TagStatsResponse {
  totalWithNotes: number;
  tags: TagStats[];
}

export const tagsApi = {
  // Get all tags
  getAllTags: (): Promise<Tag[]> => {
    return fetchApi<{data: Tag[]}>('/tags', { method: 'GET' })
      .then(response => response.data);
  },
  
  // Add a new tag
  addTag: (data: CreateTagRequest): Promise<Tag> => {
    return fetchApi<{data: Tag}>('/tags', {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.data);
  },
  
  // Update a tag
  updateTag: (id: number, data: UpdateTagRequest): Promise<Tag> => {
    return fetchApi<{data: Tag}>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }).then(response => response.data);
  },
  
  // Delete a tag
  deleteTag: (id: number): Promise<void> => {
    return fetchApi(`/tags/${id}`, { method: 'DELETE' })
      .then(() => undefined);
  },
  
  // Get tag statistics
  getTagStats: (): Promise<TagStatsResponse> => {
    return fetchApi<{data: TagStatsResponse}>('/tags/stats', { method: 'GET' })
      .then(response => response.data);
  }
};
