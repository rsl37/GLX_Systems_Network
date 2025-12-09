/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

import { Response } from 'express';

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: any;
  pagination?: any;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
  };
}

/**
 * Send a standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    meta?: any;
    pagination?: any;
  }
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (options?.meta) {
    response.meta = options.meta;
  }

  if (options?.pagination) {
    response.pagination = options.pagination;
  }

  res.status(options?.statusCode || 200).json(response);
}

/**
 * Send a standardized error response
 */
export function sendError(res: Response, message: string, statusCode: number = 500): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      message,
      statusCode,
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  INVALID_TOKEN: 'Invalid authentication token',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  FORBIDDEN: 'Access forbidden',
} as const;

/**
 * Common status codes
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

/**
 * Handle authentication validation
 */
export function validateAuthUser(userId: any): number {
  if (!userId || typeof userId !== 'number') {
    throw new Error(ErrorMessages.INVALID_TOKEN);
  }
  return userId;
}

/**
 * Validate numeric ID parameter
 */
export function validateNumericId(id: string, paramName: string = 'ID'): number {
  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error(`Invalid ${paramName}`);
  }
  return numericId;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  currentPage: number,
  perPage: number,
  totalItems: number,
  basePath: string
) {
  const totalPages = Math.ceil(totalItems / perPage);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  const offset = (currentPage - 1) * perPage;

  return {
    current_page: currentPage,
    per_page: perPage,
    total_items: totalItems,
    total_pages: totalPages,
    has_next_page: hasNext,
    has_previous_page: hasPrev,
    next_page: hasNext ? currentPage + 1 : null,
    previous_page: hasPrev ? currentPage - 1 : null,
    first_item: offset + 1,
    last_item: Math.min(offset + perPage, totalItems),
    links: {
      first: `${basePath}?page=1&limit=${perPage}`,
      last: `${basePath}?page=${totalPages}&limit=${perPage}`,
      next: hasNext ? `${basePath}?page=${currentPage + 1}&limit=${perPage}` : null,
      prev: hasPrev ? `${basePath}?page=${currentPage - 1}&limit=${perPage}` : null,
    },
  };
}
