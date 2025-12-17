/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

import { useMemo } from 'react';

// Lean civic action types for efficient reputation calculation
export type CivicActionType =
  | 'help_provided'
  | 'help_requested'
  | 'community_organized'
export type CivicActionType =
  | 'help_provided'
  | 'help_requested'
  | 'community_organized'
  | 'governance_participated'
  | 'crisis_response'
  | 'verification_completed';

export interface CivicAction {
  id: string;
  type: CivicActionType;
  user_id: string;
  impact_score: number;
  verified: boolean;
  timestamp: Date;
  location?: string;
}

export interface CivicAchievement {
  id: string;
  type: CivicActionType;
  impact_score: number;
  verified: boolean;
  earned_at: Date;
}

// Lean weight system for civic actions - optimized for performance
const ACTION_WEIGHTS: Record<CivicActionType, number> = {
  help_provided: 10,
  help_requested: 2,
  community_organized: 15,
  governance_participated: 8,
  crisis_response: 20,
  verification_completed: 5,
};

const IMPACT_THRESHOLD = 5;

/**
 * Lean reputation calculation hook with memoization
 * Implements efficient scoring as mentioned in the lean strategy
 */
export const useCivicReputation = () => {
  const calculateUserReputation = useMemo(() => {
    return (actions: CivicAction[]): number => {
      return actions.reduce((score, action) => {
        const weight = ACTION_WEIGHTS[action.type] || 1;
        const verificationMultiplier = action.verified ? 1 : 0.5;
        const impactBonus = action.impact_score > IMPACT_THRESHOLD ? 1.2 : 1;


        return score + (weight * verificationMultiplier * impactBonus);
        return score + weight * verificationMultiplier * impactBonus;
      }, 0);
    };
  }, []);

  const calculateCivicMatches = useMemo(() => {
    return (userLocation: string, helpRequests: any[]): any[] => {
      // Lean matching algorithm - prioritize proximity and verified users
      return helpRequests
        .filter(request => request.status === 'active')
        .sort((a, b) => {
          // Simple distance-based sorting (in real app would use proper geolocation)
          const aDistance = Math.abs(a.location.localeCompare(userLocation));
          const bDistance = Math.abs(b.location.localeCompare(userLocation));

          if (aDistance !== bDistance) {
            return aDistance - bDistance;
          }


          if (aDistance !== bDistance) {
            return aDistance - bDistance;
          }

          // Secondary sort by priority and verification
          return (b.priority || 0) - (a.priority || 0);
        })
        .slice(0, 20); // Limit to 20 matches for performance
    };
  }, []);

  const updateUserAchievements = useMemo(() => {
    return (action: CivicAction, existingAchievements: CivicAchievement[]): CivicAchievement[] => {
      // Minimal processing for maximum civic engagement
      if (!action.verified || action.impact_score <= IMPACT_THRESHOLD) {
        return existingAchievements;
      }

      // Check if already has this type of achievement recently
      const recentAchievement = existingAchievements.find(achievement =>
      const recentAchievement = existingAchievements.find(achievement =>
        achievement.type === action.type &&
        Date.now() - achievement.earned_at.getTime() < 24 * 60 * 60 * 1000 // 24 hours
      const recentAchievement = existingAchievements.find(
        achievement =>
          achievement.type === action.type &&
          Date.now() - achievement.earned_at.getTime() < 24 * 60 * 60 * 1000 // 24 hours
      );

      if (recentAchievement) {
        return existingAchievements;
      }

      // Add new achievement
      const newAchievement: CivicAchievement = {
        id: `${action.type}-${Date.now()}`,
        type: action.type,
        impact_score: action.impact_score,
        verified: true,
        earned_at: new Date(),
      };

      return [...existingAchievements, newAchievement];
    };
  }, []);

  return {
    calculateUserReputation,
    calculateCivicMatches,
    updateUserAchievements,
    ACTION_WEIGHTS,
    IMPACT_THRESHOLD,
  };
};

/**
 * Lean civic data utilities for efficient client-side processing
 */
export const civicDataUtils = {
  /**
   * Efficient filtering for civic data - reduce server calls
   */
  filterActiveHelpRequests: (requests: any[]) => {
    return requests.filter(request =>
      request.status === 'active' &&
    return requests.filter(request =>
      request.status === 'active' &&
      new Date(request.created_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
    return requests.filter(
      request =>
        request.status === 'active' &&
        new Date(request.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
  },

  /**
   * Client-side civic data validation to reduce server load
   */
  validateCivicAction: (action: Partial<CivicAction>): boolean => {
    return !!(
      action.type &&
      action.user_id &&
      typeof action.impact_score === 'number' &&
      action.impact_score >= 0 &&
      action.timestamp
    );
  },

  /**
   * Lean data compression for storage/transmission
   */
  compressCivicData: (data: any) => {
    // Remove undefined values and compress for lean storage
    return JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (value === undefined || value === null) {
          return undefined;
        }
        return value;
      })
    );
  },

  /**
   * Efficient batch processing for civic actions
   */
  batchCivicActions: (actions: CivicAction[], batchSize: number = 10): CivicAction[][] => {
    const batches: CivicAction[][] = [];
    for (let i = 0; i < actions.length; i += batchSize) {
      batches.push(actions.slice(i, i + batchSize));
    }
    return batches;
  },
};

export default {
  useCivicReputation,
  civicDataUtils,
};
