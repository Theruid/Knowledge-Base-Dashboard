// Chatbot API service
import { config } from '../config';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatbotResponse {
    answer: string;
    history: ChatMessage[];
    // Add other fields if returned by the API
}

export const chatbotApi = {
    // Send message to Chatbot
    sendMessage: (text: string, history: ChatMessage[] = []): Promise<ChatbotResponse> => {
        return fetch(`${config.apiUrl}/proxy/rag-chatbot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, history }),
        })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to get response from Chatbot');
                }
                return data;
            });
    }
};
