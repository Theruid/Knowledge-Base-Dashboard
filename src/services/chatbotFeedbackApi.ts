import { fetchApi } from './api';

export interface FeedbackRequest {
    message: string;
    response: string;
    feedbackType: 'positive' | 'negative';
    reason?: string;
    source?: 'chatbot' | 'conversation';
    conversationId?: string;
    messageIndex?: number;
    sessionId?: string;
    tag?: string;
}

export interface FeedbackResponse {
    success: boolean;
    message: string;
    feedbackId?: number;
}

export interface Feedback {
    id: number;
    user_id: number;
    username: string;
    message: string;
    response: string;
    feedback_type: 'positive' | 'negative';
    reason?: string;
    source: 'chatbot' | 'conversation';
    conversation_id?: string;
    session_id?: string;
    message_index?: number;
    created_at: string;
    tag?: string;
}

export const chatbotFeedbackApi = {
    submitFeedback: async (feedback: FeedbackRequest): Promise<FeedbackResponse> => {
        return await fetchApi<FeedbackResponse>('/chatbot/feedback', {
            method: 'POST',
            body: JSON.stringify(feedback)
        });
    },

    getAllFeedback: async (filters?: { feedbackType?: string; source?: string }) => {
        const params = new URLSearchParams();
        if (filters?.feedbackType) params.append('feedbackType', filters.feedbackType);
        if (filters?.source) params.append('source', filters.source);

        const queryString = params.toString();
        const url = `/chatbot/feedback${queryString ? `?${queryString}` : ''}`;

        return await fetchApi(url);
    },

    deleteFeedback: async (id: number) => {
        return await fetchApi(`/chatbot/feedback/${id}`, { method: 'DELETE' });
    },
};
