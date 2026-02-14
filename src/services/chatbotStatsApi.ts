export interface FeedbackStats {
    totalPositive: number;
    totalNegative: number;
    total: number;
    tagStats?: Record<string, number>;
}

export interface UserStats {
    username: string;
    messageCount: number;
}

export interface FeedbackStatsResponse {
    success: boolean;
    stats: FeedbackStats;
}

export interface UserStatsResponse {
    success: boolean;
    stats: UserStats[];
}

export const chatbotStatsApi = {
    getFeedbackStats: async (source?: 'chatbot' | 'conversation'): Promise<FeedbackStatsResponse> => {
        const token = localStorage.getItem('token');

        const url = source
            ? `/api/chatbot/feedback-stats?source=${source}`
            : '/api/chatbot/feedback-stats';

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch feedback stats: ${response.statusText}`);
        }

        return response.json();
    },

    getUserStats: async (): Promise<UserStatsResponse> => {
        const token = localStorage.getItem('token');

        const response = await fetch('/api/chatbot/user-stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user stats: ${response.statusText}`);
        }

        return response.json();
    }
};
