/**
 * FieldPulse Application Configuration
 * Allows dynamic configuration of the backend API URL (Node.js/Postgres or PHP/MySQL on cPanel)
 */

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Builds an absolute or relative API URL
 */
export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};
