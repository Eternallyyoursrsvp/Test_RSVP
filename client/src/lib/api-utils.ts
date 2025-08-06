/**
 * API Utilities
 * 
 * This file provides standardized API request functions to ensure consistent
 * API interactions throughout the application.
 */
import { QueryFunction } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

/**
 * ========================================================
 * API REQUEST TYPES
 * ========================================================
 */

// Standard API request options
export interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: unknown;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  unauthorized?: "returnNull" | "throw";
}

// API response interface with improved typing
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// API error interface with more detailed information
export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: any;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isServerError?: boolean;
  isClientError?: boolean;
}

/**
 * ========================================================
 * ERROR HANDLING
 * ========================================================
 */

/**
 * Creates a detailed API error with additional context
 */
function createApiError(response: Response, errorText: string): ApiError {
  const apiError: ApiError = new Error(errorText) as ApiError;
  
  apiError.name = "ApiError";
  apiError.status = response.status;
  apiError.statusText = response.statusText;
  
  try {
    // Try to parse error data if it's JSON
    apiError.data = JSON.parse(errorText);
  } catch (e) {
    apiError.data = errorText;
  }
  
  // Classify the error
  apiError.isServerError = response.status >= 500;
  apiError.isClientError = response.status >= 400 && response.status < 500;
  
  return apiError;
}

/**
 * Helper to throw standardized error for non-OK responses
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text() || res.statusText;
    throw createApiError(res, text);
  }
}

/**
 * ========================================================
 * CORE API REQUEST FUNCTIONS
 * ========================================================
 */

/**
 * Main API request function that standardizes error handling and request configuration
 */
export async function apiRequest<T = any>(
  url: string,
  options: ApiRequestOptions = { method: "GET" }
): Promise<ApiResponse<T>> {
  const { 
    method, 
    data, 
    params, 
    headers = {}, 
    credentials = "include",
    unauthorized = "throw"
  } = options;
  
  // Build request headers
  const requestHeaders: Record<string, string> = {
    "Accept": "application/json",
    "Cache-Control": "no-cache",
    ...headers
  };
  
  if (data && !headers["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }
  
  // Add URL params if provided
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    const searchParamsString = searchParams.toString();
    if (searchParamsString) {
      url += (url.includes('?') ? '&' : '?') + searchParamsString;
    }
  }
  
  try {
    // Create timeout controller for deployment stability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for deployment
    
    // Make the fetch request with timeout
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Force include credentials for all requests
      signal: controller.signal
    });
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);
    
    // Handle unauthorized response based on the option
    if (unauthorized === "returnNull" && response.status === 401) {
      return {
        data: null as T,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
    }
    
    // Throw if the response is not OK
    await throwIfResNotOk(response);
    
    // Parse the response data
    const responseData = await response.json();
    
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    // Handle timeout and network errors
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError: ApiError = new Error('Request timeout - deployment network may be slow') as ApiError;
      timeoutError.name = 'TimeoutError';
      timeoutError.isTimeoutError = true;
      timeoutError.isNetworkError = true;
      throw timeoutError;
    }
    
    // Handle network connection errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const networkError: ApiError = new Error('Network connection failed - deployment server may be unreachable') as ApiError;
      networkError.name = 'NetworkError';
      networkError.isNetworkError = true;
      throw networkError;
    }
    
    // Handle specific error cases
    if ((error as ApiError).status === 401) {
      // Authentication error
      
      // Invalidate auth state
      queryClient.invalidateQueries(["/api/auth/user"]);
    } else if ((error as ApiError).status === 403) {
      // Authorization error
      
    } else if ((error as ApiError).isServerError) {
      // Server error (5xx)
      
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error
      const networkError = error as ApiError;
      networkError.isNetworkError = true;
      
    }
    
    throw error;
  }
}

/**
 * Shorthand for GET requests
 */
export function get<T = any>(url: string, params?: Record<string, string | number>, options?: Partial<ApiRequestOptions>): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "GET",
    params,
    ...options
  });
}

/**
 * Shorthand for POST requests
 */
export function post<T = any>(url: string, data?: unknown, options?: Partial<ApiRequestOptions>): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "POST",
    data,
    ...options
  });
}

/**
 * Shorthand for PUT requests
 */
export function put<T = any>(url: string, data?: unknown, options?: Partial<ApiRequestOptions>): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "PUT",
    data,
    ...options
  });
}

/**
 * Shorthand for PATCH requests
 */
export function patch<T = any>(url: string, data?: unknown, options?: Partial<ApiRequestOptions>): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "PATCH",
    data,
    ...options
  });
}

/**
 * Shorthand for DELETE requests
 */
export function del<T = any>(url: string, params?: Record<string, string | number>, options?: Partial<ApiRequestOptions>): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "DELETE",
    params,
    ...options
  });
}

/**
 * Create a TanStack Query queryFn that uses our standardized API utility
 */
export function createQueryFn<T>(options: { 
  unauthorized?: "returnNull" | "throw" 
} = {}): QueryFunction<T> {
  return async ({ queryKey }) => {
    // Handle array query keys for passing parameters
    let url = queryKey[0] as string;
    let params: Record<string, string | number> | undefined;
    
    // Check if there are query parameters to add
    if (queryKey.length > 1 && typeof queryKey[1] === 'object') {
      params = queryKey[1] as Record<string, string | number>;
    }
    
    const response = await get<T>(url, params, { 
      unauthorized: options.unauthorized 
    });
    
    return response.data;
  };
}

/**
 * ========================================================
 * RESOURCE OPERATIONS & CACHE MANAGEMENT
 * ========================================================
 */

/**
 * Utility function to invalidate related query cache
 * after a mutation operation on a resource
 */
export function invalidateRelatedQueries(resourcePath: string, id?: number | string): void {
  // Invalidate collection
  queryClient.invalidateQueries([resourcePath]);
  
  // Invalidate specific resource if ID is provided
  if (id !== undefined) {
    queryClient.invalidateQueries([`${resourcePath}/${id}`]);
  }
}

/**
 * Utility to handle common operations with proper error handling and cache invalidation
 */
export const apiOperations = {
  /**
   * Create a new resource
   */
  create: async <T = any, R = any>(resourcePath: string, data: T): Promise<R> => {
    const response = await post<R>(resourcePath, data);
    invalidateRelatedQueries(resourcePath);
    return response.data;
  },
  
  /**
   * Fetch a collection of resources
   */
  fetchAll: async <T = any>(resourcePath: string, params?: any): Promise<T[]> => {
    const response = await get<T[]>(resourcePath, params);
    return response.data;
  },
  
  /**
   * Fetch a single resource by ID
   */
  fetchById: async <T = any>(resourcePath: string, id: number | string, params?: any): Promise<T> => {
    const response = await get<T>(`${resourcePath}/${id}`, params);
    return response.data;
  },
  
  /**
   * Update a resource
   */
  update: async <T = any, R = any>(resourcePath: string, id: number | string, data: T): Promise<R> => {
    const response = await patch<R>(`${resourcePath}/${id}`, data);
    invalidateRelatedQueries(resourcePath, id);
    return response.data;
  },
  
  /**
   * Delete a resource
   */
  delete: async <R = any>(resourcePath: string, id: number | string): Promise<R> => {
    const response = await del<R>(`${resourcePath}/${id}`);
    invalidateRelatedQueries(resourcePath, id);
    return response.data;
  },
};

/**
 * ========================================================
 * REACT-QUERY HOOKS (TANSTACK QUERY)
 * ========================================================
 */

/**
 * Default query options for TanStack Query
 */
export const defaultQueryOptions = {
  staleTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchInterval: false,
  retry: false,
};

/**
 * Function to get the default query function for queryClient
 */
export function getQueryFn<T>({ on401 = "throw" }: { on401?: "returnNull" | "throw" } = {}): QueryFunction<T> {
  return async ({ queryKey }) => {
    // Use our standardized API request function
    const url = queryKey[0] as string;
    const params = queryKey.length > 1 && typeof queryKey[1] === 'object' 
      ? queryKey[1] as Record<string, string | number>
      : undefined;
    
    const response = await get<T>(url, params, { unauthorized: on401 });
    return response.data;
  };
}

/**
 * ========================================================
 * BACKWARD COMPATIBILITY
 * ========================================================
 */



/**
 * Constants for common API endpoints
 */
export const ApiEndpoints = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    REGISTER: "/api/auth/register",
    USER: "/api/auth/user",
  },
  EVENTS: {
    BASE: "/api/events",
    DETAILS: (id: number | string) => `/api/events/${id}`,
    CEREMONIES: (id: number | string) => `/api/events/${id}/ceremonies`,
    GUESTS: (id: number | string) => `/api/events/${id}/guests`,
    SETTINGS: (id: number | string) => `/api/events/${id}/settings`,
  },
  GUESTS: {
    BASE: "/api/guests",
    DETAILS: (id: number | string) => `/api/guests/${id}`,
    RSVP: (id: number | string) => `/api/guests/${id}/rsvp`,
  },
  RSVP: {
    VERIFY: "/api/rsvp/verify",
    SUBMIT: "/api/rsvp/submit",
    STAGE1: "/api/rsvp/stage1",
    STAGE2: "/api/rsvp/stage2",
  },
  HOTELS: {
    BASE: "/api/hotels",
    DETAILS: (id: number | string) => `/api/hotels/${id}`,
    BY_EVENT: "/api/hotels/by-event",
  },
  ACCOMMODATIONS: {
    BASE: "/api/accommodations",
    DETAILS: (id: number | string) => `/api/accommodations/${id}`,
    BY_EVENT: "/api/events",
    BY_HOTEL: (id: number | string) => `/api/hotels/${id}/accommodations`,
  },
  ROOM_ALLOCATIONS: {
    BASE: "/api/room-allocations",
    BY_EVENT: (id: number | string) => `/api/events/${id}/room-allocations`,
    BY_GUEST: (id: number | string) => `/api/guests/${id}/room-allocations`,
    BY_ACCOMMODATION: (id: number | string) => `/api/accommodations/${id}/allocations`,
  },
  COMMUNICATIONS: {
    TEST_EMAIL: "/api/test-email",
    EMAIL_TEMPLATES: "/api/email-templates",
    WHATSAPP_TEMPLATES: "/api/whatsapp-templates",
    FOLLOW_UP: "/api/rsvp-followup",
  },
  ADMIN: {
    USERS: "/api/users",
    STATS: "/api/stats",
  },
};

/**
 * Common error handling for form submissions using react-hook-form
 */
export function handleApiValidationErrors(error: any, setError: any): void {
  if (error?.data?.errors) {
    // Handle structured validation errors
    const validationErrors = error.data.errors;
    Object.keys(validationErrors).forEach((field) => {
      setError(field, {
        type: "server",
        message: validationErrors[field],
      });
    });
  } else if (error?.data?.message) {
    // Handle general error message
    setError("root.serverError", {
      type: "server",
      message: error.data.message,
    });
  } else {
    // Handle unknown error
    setError("root.serverError", {
      type: "server",
      message: "An unexpected error occurred. Please try again.",
    });
  }
}