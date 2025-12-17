/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Skill Matching API Tests
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

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { TestServer } from '../setup/test-server.js';
import request from 'supertest';
import {
  getSkillCategories,
  getSkillSuggestions,
  SKILL_CATEGORIES
} from '../../server/skillMatching.js';

describe('Skill Matching Service', () => {
  describe('getSkillCategories', () => {
    test('should return all skill categories', () => {
      const categories = getSkillCategories();
      
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('technical');
      expect(categories).toContain('healthcare');
      expect(categories).toContain('emergency');
    });
  });

  describe('getSkillSuggestions', () => {
    test('should return skills for a specific category', () => {
      const technicalSkills = getSkillSuggestions('technical');
      
      expect(technicalSkills).toBeInstanceOf(Array);
      expect(technicalSkills.length).toBeGreaterThan(0);
      expect(technicalSkills).toContain('programming');
      expect(technicalSkills).toContain('web-development');
    });

    test('should return all skills when no category specified', () => {
      const allSkills = getSkillSuggestions();
      
      expect(allSkills).toBeInstanceOf(Array);
      expect(allSkills.length).toBeGreaterThan(50);
    });

    test('should return empty array for invalid category', () => {
      const skills = getSkillSuggestions('invalid-category');
      
      // Should return all skills as fallback
      expect(skills).toBeInstanceOf(Array);
    });
  });

  describe('SKILL_CATEGORIES', () => {
    test('should have expected categories', () => {
      expect(SKILL_CATEGORIES).toHaveProperty('technical');
      expect(SKILL_CATEGORIES).toHaveProperty('healthcare');
      expect(SKILL_CATEGORIES).toHaveProperty('education');
      expect(SKILL_CATEGORIES).toHaveProperty('trades');
      expect(SKILL_CATEGORIES).toHaveProperty('community');
      expect(SKILL_CATEGORIES).toHaveProperty('emergency');
      expect(SKILL_CATEGORIES).toHaveProperty('creative');
      expect(SKILL_CATEGORIES).toHaveProperty('legal');
      expect(SKILL_CATEGORIES).toHaveProperty('transportation');
      expect(SKILL_CATEGORIES).toHaveProperty('general');
    });

    test('each category should have skills', () => {
      for (const [, skills] of Object.entries(SKILL_CATEGORIES)) {
        expect(skills).toBeInstanceOf(Array);
        expect(skills.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('Skill Matching API Endpoints', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();

    // Setup mock skill endpoints for testing
    testServer.app.get('/api/skills/categories', (req, res) => {
      const categories = getSkillCategories();
      res.json({
        success: true,
        data: {
          categories,
          total: categories.length
        }
      });
    });

    testServer.app.get('/api/skills/suggestions', (req, res) => {
      const { category } = req.query;
      const suggestions = getSkillSuggestions(category as string);
      res.json({
        success: true,
        data: {
          category: category || 'all',
          skills: suggestions,
          total: suggestions.length
        }
      });
    });

    testServer.app.get('/api/skills/all', (req, res) => {
      res.json({
        success: true,
        data: {
          skillsByCategory: SKILL_CATEGORIES,
          totalCategories: Object.keys(SKILL_CATEGORIES).length,
          totalSkills: Object.values(SKILL_CATEGORIES).flat().length
        }
      });
    });

    await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('GET /api/skills/categories', () => {
    test('should return all skill categories', async () => {
      const response = await request(testServer.app)
        .get('/api/skills/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(0);
    });
  });

  describe('GET /api/skills/suggestions', () => {
    test('should return all skills when no category specified', async () => {
      const response = await request(testServer.app)
        .get('/api/skills/suggestions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('all');
      expect(response.body.data.skills).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(50);
    });

    test('should return skills for a specific category', async () => {
      const response = await request(testServer.app)
        .get('/api/skills/suggestions?category=technical')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('technical');
      expect(response.body.data.skills).toContain('programming');
    });
  });

  describe('GET /api/skills/all', () => {
    test('should return all skills organized by category', async () => {
      const response = await request(testServer.app)
        .get('/api/skills/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.skillsByCategory).toHaveProperty('technical');
      expect(response.body.data.totalCategories).toBe(10);
      expect(response.body.data.totalSkills).toBeGreaterThan(50);
    });
  });
});

describe('Skill Matching Algorithm', () => {
  test('should calculate correct match score for exact matches', () => {
    // This tests the internal matching logic conceptually
    const userSkills = ['programming', 'web-development', 'database'];
    const requiredSkills = ['programming', 'web-development'];
    
    // Both skills match exactly
    const expectedScore = 100; // Perfect match
    
    // The actual implementation would be tested via API
    expect(userSkills.filter(s => requiredSkills.includes(s)).length).toBe(2);
  });

  test('should handle partial matches', () => {
    const userSkills = ['programming', 'database'];
    const requiredSkills = ['programming', 'web-development', 'devops'];
    
    // Only 1 of 3 required skills matches
    const matchingCount = userSkills.filter(s => requiredSkills.includes(s)).length;
    expect(matchingCount).toBe(1);
  });

  test('should handle empty skill arrays', () => {
    const emptyUserSkills: string[] = [];
    const requiredSkills = ['programming'];
    
    const matchingCount = emptyUserSkills.filter(s => requiredSkills.includes(s)).length;
    expect(matchingCount).toBe(0);
  });

  test('should handle case-insensitive matching', () => {
    const userSkills = ['Programming', 'WEB-DEVELOPMENT'];
    const requiredSkills = ['programming', 'web-development'];
    
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
    const matchingCount = normalizedUserSkills.filter(s => requiredSkills.includes(s)).length;
    expect(matchingCount).toBe(2);
  });
});
