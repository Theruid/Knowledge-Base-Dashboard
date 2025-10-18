// RAG API service
import { config } from '../config';

// RAG API functions
export const ragApi = {
  // Retrieve data from RAG
  retrieveFromRag: (text: string): Promise<any> => {
    return fetch(`${config.apiUrl}/proxy/rag/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to retrieve data from RAG');
      }
      return response.json();
    });
  }
};
