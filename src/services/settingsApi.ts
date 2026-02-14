import { fetchApi } from './api';

interface SettingsResponse {
    success: boolean;
    message?: string;
    environment?: 'dev' | 'prod';
}

export const settingsApi = {
    // Get current chatbot environment setting
    getChatbotEnvironment: (): Promise<SettingsResponse> => {
        return fetchApi<SettingsResponse>('/settings/chatbot-environment');
    },

    // Update chatbot environment setting (admin only)
    updateChatbotEnvironment: (environment: 'dev' | 'prod'): Promise<SettingsResponse> => {
        return fetchApi<SettingsResponse>('/settings/chatbot-environment', {
            method: 'PUT',
            body: JSON.stringify({ environment }),
        });
    }
};
