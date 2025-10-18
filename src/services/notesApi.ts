// Notes API service
import { fetchApi } from './api';

export interface Note {
  id: number;
  conversation_id: number;
  username: string;
  note: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteRequest {
  conversationId: number;
  note: string;
  tags?: string[];
}

export interface UpdateNoteRequest {
  note: string;
  tags?: string[];
}

export const notesApi = {
  // Get all notes for a conversation
  getConversationNotes: (conversationId: number): Promise<Note[]> => {
    return fetchApi(`/notes/${conversationId}`, { method: 'GET' })
      .then(response => response.data);
  },
  
  // Add a note to a conversation
  addNote: (data: CreateNoteRequest): Promise<Note> => {
    return fetchApi('/notes', {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => response.data);
  },
  
  // Update a note
  updateNote: (id: number, data: UpdateNoteRequest): Promise<Note> => {
    return fetchApi(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }).then(response => response.data);
  },
  
  // Delete a note
  deleteNote: (id: number): Promise<void> => {
    return fetchApi(`/notes/${id}`, { method: 'DELETE' })
      .then(() => undefined);
  }
};
