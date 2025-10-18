import { fetchApi } from './api';

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    is_activated: number;
  };
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  // Login user
  login: (username: string, password: string): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // Register new user
  signup: (username: string, email: string, password: string): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  // Get current user info
  getCurrentUser: (): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>('/auth/me');
  },

  // Change user password
  changePassword: (data: PasswordChangeRequest): Promise<AuthResponse> => {
    return fetchApi<AuthResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};
