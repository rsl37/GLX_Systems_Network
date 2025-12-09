---
title: "Privacy Controls and Badge System Implementation"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "documentation"
maintainer: "rsl37"
version: "1.0.0"
tags: []
relatedDocs: []
---

# Privacy Controls and Badge System Implementation

This document outlines the comprehensive privacy controls and badge system implemented for the GLX Civic Networking App profile system.

## Features Implemented

### 🔐 Privacy Controls

#### Hidden by Default
All sensitive user information is now hidden by default on public profiles:
- Email addresses
- Phone numbers  
- Wallet addresses

#### Privacy Settings Tab
New Privacy tab in Account Settings allows users to control visibility of their information with toggle switches.

#### Wallet Address Security Warning
When users want to make their wallet address public, they receive a security warning dialog with two options:

1. **Tip Button Only (Recommended)**
   - Shows "Wallet Verified" badge
   - Includes a tip button for receiving payments
   - Keeps actual wallet address private

2. **Show Full Address** 
   - Displays complete wallet address on profile
   - Shows security warning about transaction history visibility
   - Requires explicit user confirmation

### 🏆 Badge System

#### Progressive Badge Unlocking
The badge system implements smart visibility logic based on verification status:

**Always Visible:**
- Account Creation badge (earned on account creation)
- Email Verification badge (when email is verified)
- Phone Verification badge (when phone is verified)
- Wallet Verification badge (when wallet is connected)
- KYC Verification badge (when KYC is complete)
- 2FA Setup badge (when two-factor auth is enabled)
- Master Verifier badge (when all requirements met)

**Hidden Until Prerequisites Met:**
- **Multi-Auth User** badge: Hidden until original signup method is verified, then shown when 1 additional authentication method is added
- **Triple Verified** badge: Hidden until Multi-Auth User badge is earned, then shown when all 3 authentication methods are added

#### Master Verifier Badge
Special badge earned when user has verified:
- Email address
- Phone number
- Wallet address
- KYC verification

### 💾 Technical Implementation

#### Database Schema
New `user_privacy` table:
```sql
CREATE TABLE user_privacy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  show_email INTEGER DEFAULT 0,
  show_phone INTEGER DEFAULT 0,
  show_wallet INTEGER DEFAULT 0,
  wallet_display_mode TEXT DEFAULT 'hidden',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### API Endpoints
- `GET /api/user/privacy-settings` - Fetch user's privacy preferences
- `PUT /api/user/privacy-settings` - Update privacy preferences

#### Frontend Components
- `PrivacySettings.tsx` - Privacy control interface with wallet warning dialog
- `UserBadges.tsx` - Comprehensive badge display with progressive unlocking
- Updated `ProfilePage.tsx` - Respects privacy settings for information display
- Updated `AccountSettings.tsx` - Includes privacy settings tab

### 🛡️ Security Features

#### Privacy Protection
- Information hidden by default
- User-controlled visibility toggles
- Clear security warnings for sensitive data sharing

#### Verification-Based Logic
- Badge visibility tied to actual verification status
- Progressive unlocking prevents confusion
- Prerequisites clearly communicated to users

#### Type Safety
- Full TypeScript support
- Proper database schema types
- Client-server type compatibility

## Usage Examples

### Setting Privacy Preferences
Users can access privacy settings through:
1. Profile page → Settings button → Privacy tab
2. Toggle switches for each information type
3. Special wallet display mode selection with security warnings

### Badge Progression
Example progression for user who signed up with email:
1. Account Creation badge (immediate)
2. Email Verification badge (after email verification)
3. Phone Verification badge (after adding and verifying phone)
4. Multi-Auth User badge (unlocked after email verified, earned after phone added)
5. Wallet Verification badge (after connecting wallet)
6. Triple Verified badge (unlocked after Multi-Auth earned, earned after all 3 methods added)
7. 2FA Setup badge (after enabling two-factor authentication)
8. KYC Verification badge (after completing KYC process)
9. Master Verifier badge (after all verifications complete)

## Benefits

### User Experience
- Clear control over personal information sharing
- Visual progress tracking through badge system
- Intuitive security warnings and recommendations

### Security
- Privacy-first approach to sensitive information
- User education about wallet address risks
- Verification-based trust indicators

### Scalability
- Database-backed privacy preferences
- Extensible badge system for future achievements
- Type-safe implementation for maintainability
