// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};