import { config } from '../config';

// Export and Import API functions
export const exportApi = {
  // Export knowledge entries as CSV
  exportKnowledge: (): Promise<Blob> => {
    return fetch(`${config.apiUrl}/export/knowledge`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to export knowledge entries');
      }
      return response.blob();
    });
  },

  // Export conversations as CSV
  exportConversations: (): Promise<Blob> => {
    return fetch(`${config.apiUrl}/export/conversations`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to export conversations');
      }
      return response.blob();
    });
  },

  // Export notes as CSV
  exportNotes: (): Promise<Blob> => {
    return fetch(`${config.apiUrl}/export/conversation-notes`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to export notes');
      }
      return response.blob();
    });
  },

  // Import conversations from CSV
  importConversations: (file: File): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return fetch(`${config.apiUrl}/import/conversations`, {
      method: 'POST',
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to import conversations');
      }
      return response.json();
    });
  },

  // Initiate vector database creation
  initiateVectorDB: (): Promise<{ success: boolean; message: string }> => {
    // Use the FastAPI endpoint instead of the old Express endpoint
    return fetch(`${config.fastApiUrl}/initiate_vdb`, {
      method: 'GET',
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to start vector database initialization');
      }
      return response.json();
    });
  }
};
