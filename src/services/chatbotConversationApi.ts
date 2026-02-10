import { fetchApi } from './api';

export interface SaveMessageRequest {
    session_id: string;
    role: 'user' | 'assistant';
    message: string;
}

export interface ConversationSession {
    session_id: string;
    username: string;
    user_id: number;
    message_count: number;
    last_message_time: string;
    last_message: string;
}

export interface ConversationMessage {
    id: number;
    role: 'user' | 'assistant';
    message: string;
    created_at: string;
}

export const chatbotConversationApi = {
    saveMessage: async (data: SaveMessageRequest) => {
        return await fetchApi('/chatbot/conversation/save', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    getAllSessions: async (page: number = 1, limit: number = 10, search: string = '') => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search
        });
        return await fetchApi(`/chatbot/conversations?${params.toString()}`);
    },

    getSession: async (sessionId: string) => {
        return await fetchApi(`/chatbot/conversations/${sessionId}`);
    }
};
