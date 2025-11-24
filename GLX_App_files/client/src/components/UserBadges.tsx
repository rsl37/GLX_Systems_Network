/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Mail,
  Phone,
  Wallet,
  Shield,
  Key,
  Award,
  Crown,
  CheckCircle,
  Lock,
  Plus,
} from 'lucide-react';

interface User {
  id: number;
  email: string | null;
  username: string;
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  phone?: string;
  wallet_address?: string | null;
  created_at?: string;
  // Note: KYC verification would need to be added to the User interface
  kyc_verified?: boolean;
  // Track which method was used for signup
  signup_method?: 'email' | 'phone' | 'wallet';
}

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  earned: boolean;
  visible: boolean;
  earnedDate?: string;
  requirement?: string;
  color: string;
}

interface UserBadgesProps {
  user: User;
  className?: string;
}

export function UserBadges({ user, className = '' }: UserBadgesProps) {
  const getBadges = (): BadgeInfo[] => {
    const signupMethod = user.signup_method || 'email'; // Default to email if not specified

    // Count verified authentication methods
    const verifiedMethods = [
      user.email_verified && user.email,
      user.phone_verified && user.phone,
      user.wallet_address,
    ].filter(Boolean).length;

    // Count total available authentication methods
    const totalMethods = [user.email, user.phone, user.wallet_address].filter(Boolean).length;

    // Check if original signup method is verified
    let originalMethodVerified = false;
    switch (signupMethod) {
      case 'email':
        originalMethodVerified = user.email_verified && !!user.email;
        break;
      case 'phone':
        originalMethodVerified = user.phone_verified && !!user.phone;
        break;
      case 'wallet':
        originalMethodVerified = !!user.wallet_address;
        break;
    }

    // Check if user has added one other form of verification
    const hasOneOtherForm = totalMethods > 1;

    // Check if user has all three forms of verification
    const hasAllThreeForms = totalMethods === 3;

    // Check if user qualifies for Master Verifier
    const isMasterVerifier =
      user.email_verified &&
      user.phone_verified &&
      user.wallet_address &&
      (user.kyc_verified || false);

    const badges: BadgeInfo[] = [
      {
        id: 'account-creation',
        name: 'Account Creator',
        description: 'Created a GLX account',
        icon: <User className="h-4 w-4" />,
        description: 'Created a GLX account',
        icon: <User className='h-4 w-4' />,
        earned: true,
        visible: true,
        earnedDate: user.created_at,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      {
        id: 'email-verification',
        name: 'Email Verified',
        description: 'Verified email address',
        icon: <Mail className='h-4 w-4' />,
        earned: user.email_verified && !!user.email,
        visible: true,
        color: 'bg-green-100 text-green-800 border-green-200',
      },
      {
        id: 'phone-verification',
        name: 'Phone Verified',
        description: 'Verified phone number',
        icon: <Phone className='h-4 w-4' />,
        earned: user.phone_verified && !!user.phone,
        visible: true,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      {
        id: 'wallet-verification',
        name: 'Wallet Verified',
        description: 'Connected and verified wallet address',
        icon: <Wallet className='h-4 w-4' />,
        earned: !!user.wallet_address,
        visible: true,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
      },
      {
        id: 'kyc-verification',
        name: 'KYC Verified',
        description: 'Completed Know Your Customer verification',
        icon: <Shield className='h-4 w-4' />,
        earned: user.kyc_verified || false,
        visible: true,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      },
      {
        id: '2fa-setup',
        name: '2FA Enabled',
        description: 'Set up two-factor authentication',
        icon: <Key className='h-4 w-4' />,
        earned: user.two_factor_enabled,
        visible: true,
        color: 'bg-red-100 text-red-800 border-red-200',
      },
      {
        id: 'multi-auth-1',
        name: 'Multi-Auth User',
        description: 'Added one additional authentication method',
        icon: <Plus className='h-4 w-4' />,
        earned: hasOneOtherForm && originalMethodVerified,
        visible: originalMethodVerified,
        requirement: originalMethodVerified
          ? undefined
          : 'Verify your original signup method first',
        color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      },
      {
        id: 'multi-auth-2',
        name: 'Triple Verified',
        description: 'Added two additional authentication methods',
        icon: <Award className='h-4 w-4' />,
        earned: hasAllThreeForms && originalMethodVerified,
        visible: hasOneOtherForm && originalMethodVerified,
        requirement:
          hasOneOtherForm && originalMethodVerified
            ? undefined
            : 'Earn Multi-Auth User badge first',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      {
        id: 'master-verifier',
        name: 'Master Verifier',
        description: 'Completed all verification methods: email, phone, wallet, and KYC',
        icon: <Crown className='h-4 w-4' />,
        earned: isMasterVerifier,
        visible: true,
        color: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-400',
      },
    ];

    return badges;
  };

  const badges = getBadges();
  const earnedBadges = badges.filter(badge => badge.earned && badge.visible);
  const availableBadges = badges.filter(badge => !badge.earned && badge.visible);
  const lockedBadges = badges.filter(badge => !badge.visible);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Award className='h-5 w-5' />
          Achievements & Badges
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div>
            <h4 className='font-medium text-gray-900 mb-3 flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-green-600' />
              Earned Badges ({earnedBadges.length})
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {earnedBadges.map(badge => (
                <div key={badge.id} className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                  <Badge className={`${badge.color} flex items-center gap-1`}>
                    {badge.icon}
                    {badge.name}
                  </Badge>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm text-gray-600 truncate'>{badge.description}</p>
                    {badge.earnedDate && (
                      <p className='text-xs text-gray-500'>
                        Earned: {new Date(badge.earnedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Badges */}
        {availableBadges.length > 0 && (
          <div>
            <h4 className='font-medium text-gray-900 mb-3 flex items-center gap-2'>
              <Award className='h-4 w-4 text-blue-600' />
              Available Badges ({availableBadges.length})
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {availableBadges.map(badge => (
                <div
                  key={badge.id}
                  className='flex items-center gap-3 p-3 border border-gray-200 rounded-lg opacity-75'
                >
                  <Badge variant='outline' className='flex items-center gap-1'>
                    {badge.icon}
                    {badge.name}
                  </Badge>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm text-gray-600 truncate'>{badge.description}</p>
                    {badge.requirement && (
                      <p className='text-xs text-orange-600 font-medium'>
                        Requirement: {badge.requirement}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <div>
            <h4 className='font-medium text-gray-900 mb-3 flex items-center gap-2'>
              <Lock className='h-4 w-4 text-gray-500' />
              Locked Badges ({lockedBadges.length})
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {lockedBadges.map(badge => (
                <div
                  key={badge.id}
                  className='flex items-center gap-3 p-3 border border-gray-200 rounded-lg opacity-50'
                >
                  <Badge variant='secondary' className='flex items-center gap-1'>
                    <Lock className='h-3 w-3' />
                    {badge.name}
                  </Badge>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm text-gray-600 truncate'>{badge.description}</p>
                    <p className='text-xs text-gray-500'>
                      {badge.requirement || 'Complete prerequisites to unlock'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Summary */}
        <div className='border-t pt-4'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-gray-600'>Badge Progress:</span>
            <span className='font-medium'>
              {earnedBadges.length} of {badges.length} earned
            </span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2 mt-2'>
            <div
              className='bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300'
              style={{ width: `${(earnedBadges.length / badges.length) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
