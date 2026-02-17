/**
 * Unified API Response Types
 * =============================================
 * Standard response shapes for all services
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  limit?: number;
}

export type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
