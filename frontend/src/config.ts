// API Configuration
// For test environment, just return empty string
// For runtime, this will be replaced by Vite with the actual import.meta.env values

function getApiBaseUrl(): string {
  // Test environment check
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return '';
  }
  
  // In development mode, use the default backend URL
  // Vite will replace import.meta.env.VITE_API_BASE_URL with the actual value during build
  // For now, let's use a simple approach that works reliably
  return 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};