/*
 * Copyright © 2025 GALAX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GALAX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */


import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('Deployment Configuration Tests', () => {
  let deploymentCheck: ChildProcess;

  beforeAll(() => {
    // Ensure we're testing from the correct directory
    process.chdir(path.resolve(__dirname, '../..'));
  });

  afterAll(() => {
    if (deploymentCheck) {
      deploymentCheck.kill();
    }
  });

  describe('Required Directories', () => {
    it('should have data/logs directory', async () => {
      const fs = await import('fs');
      const logsPath = path.resolve('./data/logs');
      expect(fs.existsSync(logsPath)).toBe(true);
    });

    it('should have data/uploads directory', async () => {
      const fs = await import('fs');
      const uploadsPath = path.resolve('./data/uploads');
      expect(fs.existsSync(uploadsPath)).toBe(true);
    });

    it('should have data directory with proper permissions', async () => {
      const fs = await import('fs');
      const dataPath = path.resolve('./data');
      expect(fs.existsSync(dataPath)).toBe(true);

      const stats = fs.statSync(dataPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Environment Configuration Files', () => {
    it('should have .env.example file', async () => {
      const fs = await import('fs');
      const envExamplePath = path.resolve('./.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    it('should have .env.vercel file', async () => {
      const fs = await import('fs');
      const envVercelPath = path.resolve('./.env.vercel');
      expect(fs.existsSync(envVercelPath)).toBe(true);
    });

    it('should have .env.test file', async () => {
      const fs = await import('fs');
      const envTestPath = path.resolve('./.env.test');
      expect(fs.existsSync(envTestPath)).toBe(true);
    });

    it('.env.example should contain required variables', async () => {
      const fs = await import('fs');
      const envExamplePath = path.resolve('./.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      // Check for required environment variables documentation
      expect(content).toContain('NODE_ENV');
      expect(content).toContain('PORT');
      expect(content).toContain('DATA_DIRECTORY');
      expect(content).toContain('JWT_SECRET');
      expect(content).toContain('CLIENT_ORIGIN');
      expect(content).toContain('FRONTEND_URL');
    });
  });

  describe('Vercel Configuration', () => {
    it('should have vercel.json with correct build command', async () => {
      const fs = await import('fs');
      const vercelConfigPath = path.resolve('../vercel.json');
      expect(fs.existsSync(vercelConfigPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
      expect(config.buildCommand).toContain('npm run build');
      expect(config.outputDirectory).toBe('GALAX_App_files/dist/public');
    });
  });

  describe('Deployment Readiness', () => {
    it('should have deployment check script available', async () => {
      const fs = await import('fs');
      const deploymentCheckPath = path.resolve('./scripts/deployment-check.js');
      expect(fs.existsSync(deploymentCheckPath)).toBe(true);
    });

    it('should not be in not_ready state with basic env vars', async () => {
      // Test with minimal required environment variables
      // Use development mode to test basic functionality, not production deployment
      // Don't set DATABASE_URL to let it fall back to SQLite
      const env: Record<string, string | undefined> = {
        ...process.env,
        NODE_ENV: 'development', // Use development mode for basic functionality testing
        PORT: '3000',
        DATA_DIRECTORY: './data',
        JWT_SECRET: 'test-jwt-secret-for-deployment-check-32characters-long'
      };

      // Remove DATABASE_URL if it exists
      delete env.DATABASE_URL;

      const result = await new Promise<{ code: number; output: string }>((resolve) => {
        const proc = spawn('npm', ['run', 'deployment:check'], {
          env,
          stdio: 'pipe',
          timeout: 30000
        });

        let output = '';
        proc.stdout?.on('data', (data) => {
          output += data.toString();
        });
        proc.stderr?.on('data', (data) => {
          output += data.toString();
        });

        proc.on('close', (code) => {
          resolve({ code: code || 0, output });
        });

        proc.on('error', (error) => {
          resolve({ code: 1, output: `Error: ${error.message}` });
        });
      });

      // Should not be in NOT_READY state (which would return exit code 1)
      expect(result.output).not.toContain('Overall Status: ❌ NOT_READY');

      // Should show that deployment readiness completed (either WARNING or PASSED)
      const hasWarningOrPass = result.output.includes('Overall Status: ⚠️ WARNING') ||
                              result.output.includes('Overall Status: ✅ READY');
      expect(hasWarningOrPass).toBe(true);
    });
  });

  describe('Build Process', () => {
    it('should build successfully', async () => {
      const result = await new Promise<{ code: number; output: string }>((resolve) => {
        const proc = spawn('npm', ['run', 'build'], {
          stdio: 'pipe'
        });

        let output = '';
        proc.stdout?.on('data', (data) => {
          output += data.toString();
        });
        proc.stderr?.on('data', (data) => {
          output += data.toString();
        });

        proc.on('close', (code) => {
          resolve({ code: code || 0, output });
        });
      });

      expect(result.code).toBe(0);
      expect(result.output).toContain('✓ built');
    }, 60000); // 60 second timeout for build test

    it('should have created dist directory', async () => {
      const fs = await import('fs');
      const distPath = path.resolve('./dist');
      expect(fs.existsSync(distPath)).toBe(true);

      const publicPath = path.resolve('./dist/public');
      expect(fs.existsSync(publicPath)).toBe(true);
    });
  });
});