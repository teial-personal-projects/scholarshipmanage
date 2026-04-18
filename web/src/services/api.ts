/**
 * API client utility for making authenticated requests to the backend
 *
 * Features:
 * - Automatic JWT token management
 * - Token refresh on 401 errors
 * - Comprehensive error handling with typed errors
 * - Rate limit handling
 * - Network error handling
 */

import { parseResponseError, handleNetworkError, ApiException, logError } from '../utils/error-handling';

const API_BASE_URL = '/api';

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Get the access token from the session
 */
async function getAccessToken(): Promise<string | null> {
  // Try to get session from Supabase
  const { supabase } = await import('../config/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Refresh the access token
 * Returns the new access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { supabase } = await import('../config/supabase');
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error('Token refresh failed:', error);
        // Sign out and redirect to login
        await supabase.auth.signOut();
        window.location.href = '/login';
        return null;
      }

      return data.session.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Sign out and redirect to login on error
      const { supabase } = await import('../config/supabase');
      await supabase.auth.signOut();
      window.location.href = '/login';
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No authentication token available');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    // Handle network errors (offline, DNS failure, etc.)
    const networkError = handleNetworkError(error);
    logError(networkError, `${options.method || 'GET'} ${endpoint}`);
    throw new ApiException(networkError);
  }

  // Handle 401 Unauthorized - attempt token refresh and retry
  if (response.status === 401) {
    console.log('Received 401, attempting to refresh token...');

    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry the request with the new token
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };

      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });

      // If retry succeeds, return the response
      if (retryResponse.ok) {
        const contentType = retryResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return retryResponse.json();
        }
        return {} as T;
      }

      // If retry also fails, parse and throw typed error
      const apiError = await parseResponseError(retryResponse);
      logError(apiError, `${options.method || 'GET'} ${endpoint} (after token refresh)`);
      throw new ApiException(apiError);
    }

    // If refresh failed, user has already been redirected to login
    throw new Error('Authentication failed. Please log in again.');
  }

  // Handle all other non-OK responses
  if (!response.ok) {
    const apiError = await parseResponseError(response);
    logError(apiError, `${options.method || 'GET'} ${endpoint}`);
    throw new ApiException(apiError);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return {} as T;
}

/**
 * GET request
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'GET',
  });
}

/**
 * POST request
 */
export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
export async function apiPatch<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
  });
}

