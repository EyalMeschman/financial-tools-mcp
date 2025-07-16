// API Configuration  
// For test environment, just return empty string
// For runtime, this will be replaced by Vite with the actual import.meta.env values

// Type for globalThis extensions that may exist in different environments
interface GlobalWithImportMeta {
  importMeta?: {
    env?: {
      VITE_API_BASE_URL?: string;
    };
  };
}

function getApiBaseUrl(): string {
  // Test environment check
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return '';
  }
  
  // Try to access import.meta.env in a way that won't break Jest
  try {
    // Use globalThis to avoid direct import.meta usage during Jest compilation
    const globalWithMeta = globalThis as GlobalWithImportMeta;
    const env = globalWithMeta.importMeta?.env || {};
    return env.VITE_API_BASE_URL || '';
  } catch {
    // Fallback - this will be replaced by Vite during build
    return '';
  }
}

export const API_BASE_URL = getApiBaseUrl();

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};