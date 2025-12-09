/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Skill Matching Service
 * 
 * Copyright (c) 2025 [Your Name/Company]
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: [your-email@example.com] for licensing inquiries
 */

import { db } from './database.js';

/**
 * Skill categories and their related skills for better matching
 */
const SKILL_CATEGORIES: Record<string, string[]> = {
  technical: [
    'programming', 'web-development', 'mobile-development', 'data-science',
    'cybersecurity', 'networking', 'database', 'cloud-computing', 'devops',
    'machine-learning', 'ai', 'software-engineering', 'it-support'
  ],
  healthcare: [
    'first-aid', 'cpr', 'nursing', 'medical', 'mental-health', 'counseling',
    'physical-therapy', 'nutrition', 'elderly-care', 'childcare'
  ],
  education: [
    'teaching', 'tutoring', 'mentoring', 'training', 'language-teaching',
    'math', 'science', 'english', 'music', 'art'
  ],
  trades: [
    'plumbing', 'electrical', 'carpentry', 'hvac', 'construction',
    'automotive', 'welding', 'masonry', 'landscaping', 'painting'
  ],
  community: [
    'organizing', 'event-planning', 'fundraising', 'volunteer-coordination',
    'public-speaking', 'mediation', 'conflict-resolution', 'advocacy'
  ],
  emergency: [
    'emergency-response', 'search-rescue', 'firefighting', 'disaster-relief',
    'crisis-management', 'security', 'safety-training'
  ],
  creative: [
    'graphic-design', 'video-production', 'photography', 'writing',
    'content-creation', 'social-media', 'marketing', 'branding'
  ],
  legal: [
    'legal-advice', 'immigration', 'housing-rights', 'consumer-rights',
    'document-assistance', 'notary'
  ],
  transportation: [
    'driving', 'delivery', 'moving-assistance', 'transportation'
  ],
  general: [
    'cooking', 'cleaning', 'shopping', 'pet-care', 'gardening',
    'handyman', 'translation', 'interpretation'
  ]
};

/**
 * Interface for skill matching results
 */
export interface SkillMatchResult {
  userId: number;
  username: string;
  avatarUrl: string | null;
  reputationScore: number;
  matchScore: number;
  matchingSkills: string[];
  allSkills: string[];
  distance?: number;
}

/**
 * Interface for help request skill matching
 */
export interface HelpRequestMatch {
  helpRequestId: number;
  title: string;
  category: string;
  urgency: string;
  matchScore: number;
  matchingSkills: string[];
  requiredSkills: string[];
  distance?: number;
}

/**
 * Parse skills from JSON string safely
 * Only accepts string values in the array to prevent unexpected type coercion
 */
function parseSkills(skillsJson: string | null): string[] {
  if (!skillsJson) return [];
  try {
    const parsed = JSON.parse(skillsJson);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(s => typeof s === 'string')
        .map(s => s.toLowerCase().trim())
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Get the category for a given skill
 */
function getSkillCategory(skill: string): string | null {
  const normalizedSkill = skill.toLowerCase().trim();
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.includes(normalizedSkill)) {
      return category;
    }
  }
  return null;
}

/**
 * Calculate similarity between two skills
 * Returns a score between 0 and 1
 */
function calculateSkillSimilarity(skill1: string, skill2: string): number {
  const s1 = skill1.toLowerCase().trim();
  const s2 = skill2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Check if they're in the same category
  const cat1 = getSkillCategory(s1);
  const cat2 = getSkillCategory(s2);
  if (cat1 && cat2 && cat1 === cat2) return 0.5;
  
  // Levenshtein-based similarity for fuzzy matching
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - (distance / maxLength);
  
  // Only consider it a match if similarity is above threshold
  return similarity > 0.7 ? similarity * 0.6 : 0;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate match score between user skills and required skills
 * Returns a score between 0 and 100
 */
function calculateMatchScore(userSkills: string[], requiredSkills: string[]): {
  score: number;
  matchingSkills: string[];
} {
  if (requiredSkills.length === 0) {
    return { score: 50, matchingSkills: [] }; // Neutral score if no skills required
  }
  
  if (userSkills.length === 0) {
    return { score: 0, matchingSkills: [] };
  }
  
  const matchingSkills: string[] = [];
  let totalScore = 0;
  
  for (const requiredSkill of requiredSkills) {
    let bestMatch = 0;
    let bestMatchSkill = '';
    
    for (const userSkill of userSkills) {
      const similarity = calculateSkillSimilarity(userSkill, requiredSkill);
      if (similarity > bestMatch) {
        bestMatch = similarity;
        bestMatchSkill = userSkill;
      }
    }
    
    if (bestMatch > 0 && bestMatchSkill) {
      matchingSkills.push(bestMatchSkill);
    }
    totalScore += bestMatch;
  }
  
  // Normalize score to 0-100 range
  const normalizedScore = Math.round((totalScore / requiredSkills.length) * 100);
  
  return {
    score: Math.min(100, normalizedScore),
    matchingSkills: [...new Set(matchingSkills)]
  };
}

/**
 * Calculate distance between two coordinates in kilometers
 */
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find users who match the required skills for a help request
 */
export async function findMatchingUsers(
  requiredSkills: string[],
  options: {
    excludeUserId?: number;
    latitude?: number;
    longitude?: number;
    maxDistance?: number; // in km
    limit?: number;
    minScore?: number;
  } = {}
): Promise<SkillMatchResult[]> {
  const {
    excludeUserId,
    longitude,
    maxDistance = 50,
    limit = 20,
    minScore = 10
  } = options;
  
  // Get all users with skills
  let query = db
    .selectFrom('users')
    .select([
      'id',
      'username',
      'avatar_url',
      'reputation_score',
      'skills'
    ])
    .where('skills', '!=', '')
    .where('skills', '!=', '[]');
  
  if (excludeUserId) {
    query = query.where('id', '!=', excludeUserId);
  }
  
  const users = await query.execute();
  
  const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
  const results: SkillMatchResult[] = [];
  
  for (const user of users) {
    const userSkills = parseSkills(user.skills);
    if (userSkills.length === 0) continue;
    
    const { score, matchingSkills } = calculateMatchScore(userSkills, normalizedRequired);
    
    if (score < minScore) continue;
    
    let distance: number | undefined;
    
    // Calculate distance if location provided
    // Note: This would require user location data which we don't have in the current schema
    // For now, we'll skip distance filtering for users
    
    results.push({
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      reputationScore: user.reputation_score,
      matchScore: score,
      matchingSkills,
      allSkills: userSkills,
      distance
    });
  }
  
  // Sort by match score (and reputation as tiebreaker)
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return b.reputationScore - a.reputationScore;
  });
  
  return results.slice(0, limit);
}

/**
 * Find help requests that match a user's skills
 */
export async function findMatchingHelpRequests(
  userId: number,
  options: {
    latitude?: number;
    longitude?: number;
    maxDistance?: number; // in km
    limit?: number;
    minScore?: number;
    status?: string;
  } = {}
): Promise<HelpRequestMatch[]> {
  const {
    latitude,
    longitude,
    maxDistance = 50,
    limit = 20,
    minScore = 10,
    status = 'posted'
  } = options;
  
  // Get user's skills
  const user = await db
    .selectFrom('users')
    .select('skills')
    .where('id', '=', userId)
    .executeTakeFirst();
  
  if (!user) {
    return [];
  }
  
  const userSkills = parseSkills(user.skills);
  if (userSkills.length === 0) {
    // Return all requests with neutral score if user has no skills
    const helpRequests = await db
      .selectFrom('help_requests')
      .select([
        'id',
        'title',
        'category',
        'urgency',
        'skills_needed',
        'latitude',
        'longitude'
      ])
      .where('status', '=', status)
      .where('requester_id', '!=', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
    
    return helpRequests.map(hr => ({
      helpRequestId: hr.id,
      title: hr.title,
      category: hr.category,
      urgency: hr.urgency,
      matchScore: 50,
      matchingSkills: [],
      requiredSkills: parseSkills(hr.skills_needed)
    }));
  }
  
  // Get help requests that need skills
  const helpRequests = await db
    .selectFrom('help_requests')
    .select([
      'id',
      'title',
      'category',
      'urgency',
      'skills_needed',
      'latitude',
      'longitude'
    ])
    .where('status', '=', status)
    .where('requester_id', '!=', userId)
    .execute();
  
  const results: HelpRequestMatch[] = [];
  
  for (const hr of helpRequests) {
    const requiredSkills = parseSkills(hr.skills_needed);
    const { score, matchingSkills } = calculateMatchScore(userSkills, requiredSkills);
    
    if (score < minScore && requiredSkills.length > 0) continue;
    
    let distance: number | undefined;
    
    // Calculate distance if both user and request have location
    if (latitude && longitude && hr.latitude && hr.longitude) {
      distance = calculateDistance(latitude, longitude, hr.latitude, hr.longitude);
      if (distance > maxDistance) continue;
    }
    
    results.push({
      helpRequestId: hr.id,
      title: hr.title,
      category: hr.category,
      urgency: hr.urgency,
      matchScore: requiredSkills.length > 0 ? score : 50,
      matchingSkills,
      requiredSkills,
      distance
    });
  }
  
  // Sort by urgency priority, then match score
  const urgencyOrder: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  
  results.sort((a, b) => {
    const urgencyA = urgencyOrder[a.urgency] || 0;
    const urgencyB = urgencyOrder[b.urgency] || 0;
    
    // First sort by urgency
    if (urgencyB !== urgencyA) {
      return urgencyB - urgencyA;
    }
    
    // Then by match score
    return b.matchScore - a.matchScore;
  });
  
  return results.slice(0, limit);
}

/**
 * Get skill suggestions based on category
 */
export function getSkillSuggestions(category?: string): string[] {
  if (category && SKILL_CATEGORIES[category]) {
    return SKILL_CATEGORIES[category];
  }
  
  // Return a flat list of all skills
  return Object.values(SKILL_CATEGORIES).flat();
}

/**
 * Get all skill categories
 */
export function getSkillCategories(): string[] {
  return Object.keys(SKILL_CATEGORIES);
}

/**
 * Update the matching score for a help request in the database
 */
export async function updateHelpRequestMatchingScore(
  helpRequestId: number,
  matchingScore: number
): Promise<void> {
  await db
    .updateTable('help_requests')
    .set({
      matching_score: matchingScore,
      updated_at: new Date().toISOString()
    })
    .where('id', '=', helpRequestId)
    .execute();
}

/**
 * Export skill categories for external use
 */
export { SKILL_CATEGORIES };
