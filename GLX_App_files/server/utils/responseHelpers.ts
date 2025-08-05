/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
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
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500
): void {
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
}/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
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
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500
): void {
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
  // Registration-specific error messages
  REGISTRATION_USER_EXISTS: 'An account with this email, phone, username, or wallet address already exists',
  REGISTRATION_EMAIL_EXISTS: 'An account with this email address already exists',
  REGISTRATION_PHONE_EXISTS: 'An account with this phone number already exists',
  REGISTRATION_USERNAME_EXISTS: 'This username is already taken',
  REGISTRATION_WALLET_EXISTS: 'An account with this wallet address already exists',
  REGISTRATION_DATABASE_ERROR: 'Unable to create account due to a technical issue. Please try again',
  REGISTRATION_VALIDATION_ERROR: 'Please check your information and try again',
  REGISTRATION_EMAIL_INVALID: 'Please enter a valid email address',
  REGISTRATION_PHONE_INVALID: 'Please enter a valid phone number',
  REGISTRATION_PASSWORD_WEAK: 'Password must be at least 8 characters long',
  REGISTRATION_USERNAME_INVALID: 'Username must be 3-30 characters and contain only letters, numbers, and underscores',
  // Login-specific error messages
  LOGIN_ACCOUNT_NOT_FOUND: 'No account found with this email, phone number, or username',
  LOGIN_INVALID_PASSWORD: 'The password you entered is incorrect',
  LOGIN_ACCOUNT_LOCKED: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or reset your password',
  LOGIN_EMAIL_NOT_VERIFIED: 'Please verify your email address before logging in. Check your inbox for a verification email',
  LOGIN_PHONE_NOT_VERIFIED: 'Please verify your phone number before logging in. Check your messages for a verification code',
  LOGIN_WALLET_NOT_FOUND: 'No account found with this wallet address',
  LOGIN_WALLET_CONNECTION_FAILED: 'Failed to connect to your wallet. Please check your MetaMask connection and try again',
  LOGIN_NETWORK_ERROR: 'Unable to connect to our servers. Please check your internet connection and try again',
  LOGIN_SERVER_ERROR: 'Our servers are experiencing issues. Please try again in a few moments',
  LOGIN_RATE_LIMITED: 'Too many login attempts. Please wait a few minutes before trying again',
  // Wallet-specific error messages
  WALLET_NOT_DETECTED: 'MetaMask wallet not detected. Please install MetaMask browser extension to continue',
  WALLET_CONNECTION_DENIED: 'Wallet connection was denied. Please approve the connection request in MetaMask',
  WALLET_ACCOUNT_UNAVAILABLE: 'No wallet accounts available. Please unlock your MetaMask wallet and try again',
  WALLET_NETWORK_MISMATCH: 'Please switch to the correct network in your MetaMask wallet',
  WALLET_TRANSACTION_REJECTED: 'Transaction was rejected in MetaMask wallet',
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