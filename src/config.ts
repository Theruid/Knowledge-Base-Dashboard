// Configuration file for API endpoints

// Add type declaration for Vite's import.meta.env
// Using global augmentation for ImportMeta
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_API_URL?: string;
      readonly MODE?: string;
      readonly DEV?: boolean;
      readonly PROD?: boolean;
      [key: string]: string | boolean | undefined;
    };
  }
}

// Function to determine the API URL based on environment and browser location
function getApiBaseUrl() {
  console.log('Environment API URL:', import.meta.env.VITE_API_URL);
  
  // When explicitly set via env var, use that
  if (import.meta.env.VITE_API_URL) {
    // The API URL should already include the /api prefix
    return import.meta.env.VITE_API_URL;
  }
  
  // When running in browser, use the same host but with backend port
  if (typeof window !== 'undefined') {
    const location = window.location;
    console.log('Using browser location for API URL:', location.hostname);
    
    // Use the same hostname but change the port to 3001
    // The API URL should already include the /api prefix
    const apiUrl = `${location.protocol}//${location.hostname}:3001/api`;
    console.log('Constructed API URL:', apiUrl);
    return apiUrl;
  }
  
  // Fallback
  return 'http://localhost:3001/api';
}

// Get the base API URL for Node.js backend
const API_BASE_URL = getApiBaseUrl();

// Function to determine the FastAPI URL
function getFastApiBaseUrl() {
  // When running in browser, use the same host but with FastAPI port
  if (typeof window !== 'undefined') {
    const location = window.location;
    // In Docker, the retrieve service is available at port 8099
    const fastApiUrl = `${location.protocol}//${location.hostname}:8099`;
    console.log('Constructed FastAPI URL:', fastApiUrl);
    return fastApiUrl;
  }
  
  // Fallback
  return 'http://localhost:8099';
}

// Get the base FastAPI URL
const FASTAPI_BASE_URL = getFastApiBaseUrl();

export const config = {
  apiUrl: API_BASE_URL,
  fastApiUrl: FASTAPI_BASE_URL
};

export default config;
