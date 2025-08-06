/*
<<<<<<< HEAD
 * Copyright (c) 2025 GALAX Civic Networking App
=======
 * Copyright (c) 2025 GLX Civic Networking App
>>>>>>> main
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

<<<<<<< HEAD
import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "./errorHandler.js";
=======
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler.js';
>>>>>>> main

// SQL injection patterns to detect and block
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL meta-characters
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, // Typical SQL injection
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // "OR" variations
  /((\%27)|(\'))union/i, // UNION keyword
  /exec(\s|\+)+(s|x)p\w+/i, // Stored procedures
  /((\%27)|(\'))|((\%3D)|(=))|((\%3B)|(;))|((\%2D)|(\-))|((\%2B)|(\+))|((\%25)|(\%))/i,
];

// XSS patterns to detect and block - using safer non-greedy patterns
const XSS_PATTERNS = [
  /<script\b[^>]*?>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe\b[^>]*?>/i,
  /<object\b[^>]*?>/i,
  /<embed\b[^>]*?>/i,
  /<link\b[^>]*?>/i,
  /expression\s*\(/i,
  /vbscript:/i,
  /data:text\/html/i,
];

// Enhanced input sanitization function
const sanitizeAgainstInjection = (value: string): boolean => {
<<<<<<< HEAD
  if (typeof value !== "string") return true;
=======
  if (typeof value !== 'string') return true;
>>>>>>> main

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return false;
    }
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return false;
    }
  }

  return true;
};

// Helper to check validation results
<<<<<<< HEAD
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
=======
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
>>>>>>> main
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
<<<<<<< HEAD
      .map((error) => error.msg)
      .join(", ");
=======
      .map(error => error.msg)
      .join(', ');
>>>>>>> main
    throw new ValidationError(errorMessages);
  }
  next();
};

// Security validation middleware for request body size
<<<<<<< HEAD
export const validateRequestSize = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const contentLength = parseInt(req.get("Content-Length") || "0");
  const maxSize = 50 * 1024 * 1024; // 50MB global limit

  if (contentLength > maxSize) {
    throw new ValidationError("Request body too large. Maximum size is 50MB.");
=======
export const validateRequestSize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 50 * 1024 * 1024; // 50MB global limit

  if (contentLength > maxSize) {
    throw new ValidationError('Request body too large. Maximum size is 50MB.');
>>>>>>> main
  }

  next();
};

// Enhanced security validation for all text inputs
<<<<<<< HEAD
export const validateSecureInput = (
  fieldName: string,
  required: boolean = false,
) => {
=======
export const validateSecureInput = (fieldName: string, required: boolean = false) => {
>>>>>>> main
  const chain = required
    ? body(fieldName).notEmpty().withMessage(`${fieldName} is required`)
    : body(fieldName).optional();

  return chain
    .trim()
    .escape() // XSS protection
    .custom((value: string) => {
      if (!sanitizeAgainstInjection(value)) {
<<<<<<< HEAD
        throw new Error(
          `${fieldName} contains invalid or potentially malicious content`,
        );
=======
        throw new Error(`${fieldName} contains invalid or potentially malicious content`);
>>>>>>> main
      }
      return true;
    });
};

// User registration validation
export const validateRegistration = [
<<<<<<< HEAD
  validateSecureInput("username", true)
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
    .escape(), // XSS protection

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number")
    .escape(), // XSS protection

  body("password")
    .optional()
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
    )
    .custom((value: string) => {
      if (!sanitizeAgainstInjection(value)) {
        throw new Error("Password contains invalid characters");
=======
  validateSecureInput('username', true)
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .escape(), // XSS protection

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .escape(), // XSS protection

  body('password')
    .optional()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    )
    .custom((value: string) => {
      if (!sanitizeAgainstInjection(value)) {
        throw new Error('Password contains invalid characters');
>>>>>>> main
      }
      return true;
    }),

<<<<<<< HEAD
  body("walletAddress")
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("Invalid wallet address format")
=======
  body('walletAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format')
>>>>>>> main
    .escape(), // XSS protection

  // Custom validation to ensure either email+password, phone+password, or walletAddress
  body().custom((value, { req }) => {
    const { email, phone, password, walletAddress } = req.body;

    if (!email && !phone && !walletAddress) {
<<<<<<< HEAD
      throw new Error(
        "Either email, phone number, or wallet address is required",
      );
    }

    if ((email || phone) && !password) {
      throw new Error(
        "Password is required when registering with email or phone",
      );
    }

    if (email && phone) {
      throw new Error("Please use either email or phone number, not both");
=======
      throw new Error('Either email, phone number, or wallet address is required');
    }

    if ((email || phone) && !password) {
      throw new Error('Password is required when registering with email or phone');
    }

    if (email && phone) {
      throw new Error('Please use either email or phone number, not both');
>>>>>>> main
    }

    return true;
  }),

<<<<<<< HEAD
  body("phone")
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Invalid phone number format")
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone number must be between 10 and 20 characters")
=======
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters')
>>>>>>> main
    .escape(), // XSS protection

  // Custom validation to ensure either email+password, phone+password, or walletAddress
  body().custom((value, { req }) => {
    const { email, phone, password, walletAddress } = req.body;

    if (!email && !phone && !walletAddress) {
<<<<<<< HEAD
      throw new Error(
        "Either email, phone number, or wallet address is required",
      );
    }

    if ((email || phone) && !password) {
      throw new Error(
        "Password is required when registering with email or phone",
      );
=======
      throw new Error('Either email, phone number, or wallet address is required');
    }

    if ((email || phone) && !password) {
      throw new Error('Password is required when registering with email or phone');
>>>>>>> main
    }

    return true;
  }),

  handleValidationErrors,
];

// User login validation
export const validateLogin = [
<<<<<<< HEAD
  body("email")
    .optional()
    .notEmpty()
    .withMessage("Email/username is required for email login")
    .trim(),

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number")
    .escape() // XSS protection
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Invalid phone number format")
    .trim()
    .escape(), // XSS protection

  body("password")
    .optional()
    .notEmpty()
    .withMessage("Password is required for email/phone login"),

  body("walletAddress")
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("Invalid wallet address format"),
=======
  body('email')
    .optional()
    .notEmpty()
    .withMessage('Email/username is required for email login')
    .trim(),

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .escape() // XSS protection
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format')
    .trim()
    .escape(), // XSS protection

  body('password').optional().notEmpty().withMessage('Password is required for email/phone login'),

  body('walletAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
>>>>>>> main

  // Custom validation to ensure proper login method
  body().custom((value, { req }) => {
    const { email, phone, password, walletAddress } = req.body;

    if (!email && !phone && !walletAddress) {
<<<<<<< HEAD
      throw new Error("Either email, phone, or wallet address is required");
    }

    if ((email || phone) && !password) {
      throw new Error("Password is required for email/phone login");
    }

    if (email && phone) {
      throw new Error("Please use either email or phone number, not both");
=======
      throw new Error('Either email, phone, or wallet address is required');
    }

    if ((email || phone) && !password) {
      throw new Error('Password is required for email/phone login');
    }

    if (email && phone) {
      throw new Error('Please use either email or phone number, not both');
>>>>>>> main
    }

    return true;
  }),

  handleValidationErrors,
];

// Profile update validation
export const validateProfileUpdate = [
<<<<<<< HEAD
  validateSecureInput("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
    .escape(), // XSS protection

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number")
    .escape(), // XSS protection

  validateSecureInput("skills")
    .isLength({ max: 500 })
    .withMessage("Skills description cannot exceed 500 characters"),

  validateSecureInput("bio")
    .isLength({ max: 1000 })
    .withMessage("Bio cannot exceed 1000 characters"),
=======
  validateSecureInput('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .escape(), // XSS protection

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .escape(), // XSS protection

  validateSecureInput('skills')
    .isLength({ max: 500 })
    .withMessage('Skills description cannot exceed 500 characters'),

  validateSecureInput('bio')
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
>>>>>>> main

  handleValidationErrors,
];

// Help request validation
export const validateHelpRequest = [
<<<<<<< HEAD
  validateSecureInput("title", true)
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),

  validateSecureInput("description", true)
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),

  body("category")
    .isIn([
      "emergency",
      "transportation",
      "food",
      "housing",
      "healthcare",
      "education",
      "technology",
      "other",
    ])
    .withMessage("Invalid category")
    .escape(), // XSS protection

  body("urgency")
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid urgency level")
    .escape(), // XSS protection

  body("latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),

  body("longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),

  body("skillsNeeded")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Skills needed cannot exceed 10 items"),
=======
  validateSecureInput('title', true)
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),

  validateSecureInput('description', true)
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),

  body('category')
    .isIn([
      'emergency',
      'transportation',
      'food',
      'housing',
      'healthcare',
      'education',
      'technology',
      'other',
    ])
    .withMessage('Invalid category')
    .escape(), // XSS protection

  body('urgency')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency level')
    .escape(), // XSS protection

  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),

  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),

  body('skillsNeeded')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Skills needed cannot exceed 10 items'),
>>>>>>> main

  handleValidationErrors,
];

// Crisis alert validation
export const validateCrisisAlert = [
<<<<<<< HEAD
  validateSecureInput("title", true)
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),

  validateSecureInput("description", true)
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),

  body("severity")
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid severity level")
    .escape(), // XSS protection

  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Valid latitude is required"),

  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Valid longitude is required"),

  body("radius")
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage("Radius must be between 100 and 50000 meters"),
=======
  validateSecureInput('title', true)
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),

  validateSecureInput('description', true)
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level')
    .escape(), // XSS protection

  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),

  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),

  body('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters'),
>>>>>>> main

  handleValidationErrors,
];

// Proposal validation
export const validateProposal = [
<<<<<<< HEAD
  validateSecureInput("title", true)
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),

  validateSecureInput("description", true)
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be between 20 and 2000 characters"),

  body("category")
    .isIn([
      "infrastructure",
      "budget",
      "policy",
      "community",
      "environment",
      "other",
    ])
    .withMessage("Invalid category")
    .escape(), // XSS protection

  body("deadline")
    .isISO8601()
    .withMessage("Invalid deadline format")
    .custom((value) => {
=======
  validateSecureInput('title', true)
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),

  validateSecureInput('description', true)
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category')
    .isIn(['infrastructure', 'budget', 'policy', 'community', 'environment', 'other'])
    .withMessage('Invalid category')
    .escape(), // XSS protection

  body('deadline')
    .isISO8601()
    .withMessage('Invalid deadline format')
    .custom(value => {
>>>>>>> main
      const deadline = new Date(value);
      const now = new Date();
      const minDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      if (deadline <= minDeadline) {
<<<<<<< HEAD
        throw new Error("Deadline must be at least 24 hours in the future");
=======
        throw new Error('Deadline must be at least 24 hours in the future');
>>>>>>> main
      }

      return true;
    }),

  handleValidationErrors,
];

// Vote validation
export const validateVote = [
<<<<<<< HEAD
  param("id").isInt({ min: 1 }).withMessage("Invalid proposal ID"),

  body("vote_type")
    .isIn(["for", "against"])
=======
  param('id').isInt({ min: 1 }).withMessage('Invalid proposal ID'),

  body('vote_type')
    .isIn(['for', 'against'])
>>>>>>> main
    .withMessage('Vote type must be either "for" or "against"'),

  handleValidationErrors,
];

// Password reset validation
export const validatePasswordReset = [
<<<<<<< HEAD
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
=======
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
>>>>>>> main

  handleValidationErrors,
];

export const validatePasswordResetConfirm = [
<<<<<<< HEAD
  body("token")
    .isLength({ min: 32, max: 128 })
    .withMessage("Invalid reset token")
    .trim(),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
=======
  body('token').isLength({ min: 32, max: 128 }).withMessage('Invalid reset token').trim(),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
>>>>>>> main
    ),

  handleValidationErrors,
];

// Email verification validation
export const validateEmailVerification = [
<<<<<<< HEAD
  body("token")
    .isLength({ min: 32, max: 128 })
    .withMessage("Invalid verification token")
    .trim(),
=======
  body('token').isLength({ min: 32, max: 128 }).withMessage('Invalid verification token').trim(),
>>>>>>> main

  handleValidationErrors,
];

// Phone verification validation
export const validatePhoneVerification = [
<<<<<<< HEAD
  body("phone")
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),
=======
  body('phone').isMobilePhone('any').withMessage('Please provide a valid phone number'),
>>>>>>> main

  handleValidationErrors,
];

export const validatePhoneVerificationConfirm = [
<<<<<<< HEAD
  body("phone")
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),

  body("code")
    .isLength({ min: 4, max: 8 })
    .withMessage("Invalid verification code")
    .isNumeric()
    .withMessage("Verification code must be numeric"),
=======
  body('phone').isMobilePhone('any').withMessage('Please provide a valid phone number'),

  body('code')
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid verification code')
    .isNumeric()
    .withMessage('Verification code must be numeric'),
>>>>>>> main

  handleValidationErrors,
];

// General pagination validation
export const validatePagination = [
<<<<<<< HEAD
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
=======
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
>>>>>>> main

  handleValidationErrors,
];

// Enhanced file upload validation with comprehensive security
<<<<<<< HEAD
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
=======
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
>>>>>>> main
  if (!req.file) {
    return next();
  }

  const file = req.file;

  // Allowed MIME types with more comprehensive list
  const allowedMimeTypes = [
<<<<<<< HEAD
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/ogg",
    "application/pdf", // Allow PDFs for documents
=======
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/ogg',
    'application/pdf', // Allow PDFs for documents
>>>>>>> main
  ];

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ValidationError(
<<<<<<< HEAD
      "Invalid file type. Only images, videos, audio files, and PDFs are allowed.",
=======
      'Invalid file type. Only images, videos, audio files, and PDFs are allowed.'
>>>>>>> main
    );
  }

  // Check file size (10MB for media, 5MB for PDFs)
<<<<<<< HEAD
  const maxSize =
    file.mimetype === "application/pdf" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    const limit = file.mimetype === "application/pdf" ? "5MB" : "10MB";
=======
  const maxSize = file.mimetype === 'application/pdf' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    const limit = file.mimetype === 'application/pdf' ? '5MB' : '10MB';
>>>>>>> main
    throw new ValidationError(`File size too large. Maximum size is ${limit}.`);
  }

  // Check file extension matches MIME type (security against spoofing)
<<<<<<< HEAD
  const extension = file.originalname.split(".").pop()?.toLowerCase();
  const mimeToExtension: { [key: string]: string[] } = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/gif": ["gif"],
    "image/webp": ["webp"],
    "video/mp4": ["mp4"],
    "video/quicktime": ["mov"],
    "video/x-msvideo": ["avi"],
    "video/webm": ["webm"],
    "audio/mpeg": ["mp3"],
    "audio/wav": ["wav"],
    "audio/mp4": ["m4a"],
    "audio/ogg": ["ogg"],
    "application/pdf": ["pdf"],
=======
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  const mimeToExtension: { [key: string]: string[] } = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'video/mp4': ['mp4'],
    'video/quicktime': ['mov'],
    'video/x-msvideo': ['avi'],
    'video/webm': ['webm'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/mp4': ['m4a'],
    'audio/ogg': ['ogg'],
    'application/pdf': ['pdf'],
>>>>>>> main
  };

  const allowedExtensions = mimeToExtension[file.mimetype];
  if (!extension || !allowedExtensions?.includes(extension)) {
<<<<<<< HEAD
    throw new ValidationError("File extension does not match file type.");
=======
    throw new ValidationError('File extension does not match file type.');
>>>>>>> main
  }

  // Check for malicious file names
  if (
<<<<<<< HEAD
    file.originalname.includes("..") ||
    file.originalname.includes("/") ||
    file.originalname.includes("\\")
  ) {
    throw new ValidationError("Invalid file name.");
=======
    file.originalname.includes('..') ||
    file.originalname.includes('/') ||
    file.originalname.includes('\\')
  ) {
    throw new ValidationError('Invalid file name.');
>>>>>>> main
  }

  // Basic file header validation for common formats
  const buffer = file.buffer || Buffer.alloc(0);
  if (buffer.length >= 4) {
    const header = buffer.slice(0, 4);
    const magicNumbers: { [key: string]: Buffer[] } = {
<<<<<<< HEAD
      "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
      "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
      "image/gif": [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      "application/pdf": [Buffer.from([0x25, 0x50, 0x44, 0x46])],
=======
      'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
      'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
>>>>>>> main
    };

    const expectedHeaders = magicNumbers[file.mimetype];
    if (expectedHeaders) {
<<<<<<< HEAD
      const isValidHeader = expectedHeaders.some((expected) =>
        header.slice(0, expected.length).equals(expected),
      );
      if (!isValidHeader) {
        throw new ValidationError(
          "File appears to be corrupted or not a valid file of the specified type.",
=======
      const isValidHeader = expectedHeaders.some(expected =>
        header.slice(0, expected.length).equals(expected)
      );
      if (!isValidHeader) {
        throw new ValidationError(
          'File appears to be corrupted or not a valid file of the specified type.'
>>>>>>> main
        );
      }
    }
  }

  // Log file upload for security monitoring
<<<<<<< HEAD
  console.log("🔍 File upload security check passed:", {
=======
  console.log('🔍 File upload security check passed:', {
>>>>>>> main
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  next();
};

// Comprehensive endpoint security validation
export const validateEndpointSecurity = [
  validateRequestSize,
<<<<<<< HEAD
  body("*")
    .optional()
    .custom((value, { path }) => {
      // Apply security validation to all string fields
      if (typeof value === "string" && !sanitizeAgainstInjection(value)) {
        throw new Error(
          `Field '${path}' contains potentially malicious content`,
        );
=======
  body('*')
    .optional()
    .custom((value, { path }) => {
      // Apply security validation to all string fields
      if (typeof value === 'string' && !sanitizeAgainstInjection(value)) {
        throw new Error(`Field '${path}' contains potentially malicious content`);
>>>>>>> main
      }
      return true;
    }),
  handleValidationErrors,
];

// JSON payload size validation
<<<<<<< HEAD
export const validateJsonPayload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.is("application/json")) {
    const jsonString = JSON.stringify(req.body);
    const payloadSize = Buffer.byteLength(jsonString, "utf8");
    const maxJsonSize = 1024 * 1024; // 1MB for JSON payloads

    if (payloadSize > maxJsonSize) {
      throw new ValidationError("JSON payload too large. Maximum size is 1MB.");
=======
export const validateJsonPayload = (req: Request, res: Response, next: NextFunction) => {
  if (req.is('application/json')) {
    const jsonString = JSON.stringify(req.body);
    const payloadSize = Buffer.byteLength(jsonString, 'utf8');
    const maxJsonSize = 1024 * 1024; // 1MB for JSON payloads

    if (payloadSize > maxJsonSize) {
      throw new ValidationError('JSON payload too large. Maximum size is 1MB.');
>>>>>>> main
    }
  }
  next();
};
