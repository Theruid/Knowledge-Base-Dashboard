export interface FeedbackRequest {
    message: string;
    response: string;
    feedbackType: 'positive' | 'negative';
    reason?: string;
}

export interface FeedbackResponse {
    success: boolean;
    message: string;
    feedbackId?: number;
}

export const chatbotFeedbackApi = {
    submitFeedback: async (feedback: FeedbackRequest): Promise<FeedbackResponse> => {
        const token = localStorage.getItem('token');

        const response = await fetch('/api/chatbot/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(feedback)
        });

        if (!response.ok) {
            throw new Error(`Failed to submit feedback: ${response.statusText}`);
        }

        return response.json();
    }
};
