/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { useEffect, useState } from 'react';

/**
 * Hook for managing page verification for auth endpoints
 * This ensures that authentication requests only come from verified app pages
 */
export function usePageVerification(pageType: 'login' | 'register') {
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    verifyPage();
  }, [pageType]);

  const verifyPage = async () => {
    // Skip verification in development mode (NODE_ENV undefined or 'development')
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      setVerificationToken('dev-mode-skip-verification');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      // Get page content for verification
      const pageContent = document.documentElement.outerHTML;
      
      // Create a simple checksum of key page elements
      const keyElements = extractKeyElements(pageType);
      const checksum = await createChecksum(keyElements.join(''));

      const response = await fetch('/api/verify-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageType,
          pageContent: keyElements.join(' '),
          checksum,
        }),
      });

      if (!response.ok) {
        throw new Error('Page verification failed');
      }

      const data = await response.json();
      if (data.success && data.data.verificationToken) {
        setVerificationToken(data.data.verificationToken);
        console.log(`✅ Page verified for ${pageType}`);
      } else {
        throw new Error('Invalid verification response');
      }
    } catch (error) {
      console.error('Page verification error:', error);
      setVerificationError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const extractKeyElements = (pageType: 'login' | 'register'): string[] => {
    const elements: string[] = [];
    
    // Extract text content from key elements
    const title = document.querySelector('title')?.textContent || '';
    if (title) elements.push(title);
    
    // Look for GALAX branding
    const galaxText = document.body.innerText.match(/GALAX[^a-z]*/gi);
    if (galaxText) elements.push(...galaxText);
    
    // Look for page-specific elements
    if (pageType === 'login') {
      const loginElements = [
        'Sign In',
        'Email',
        'Phone',
        'Password',
        'Connect MetaMask',
        'Forgot your password',
        'Sign up'
      ];
      
      loginElements.forEach(text => {
        if (document.body.innerText.includes(text)) {
          elements.push(text);
        }
      });
    } else if (pageType === 'register') {
      const registerElements = [
        'Create Account',
        'Username',
        'Email',
        'Phone',
        'Password',
        'Join GALAX',
        'Create your civic network account'
      ];
      
      registerElements.forEach(text => {
        if (document.body.innerText.includes(text)) {
          elements.push(text);
        }
      });
    }
    
    return elements;
  };

  const createChecksum = async (content: string): Promise<string> => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for environments without crypto.subtle
      return btoa(content).slice(0, 32);
    }
  };

  return {
    verificationToken,
    isVerifying,
    verificationError,
    verifyPage,
  };
}

/**
 * Enhanced fetch function that includes page verification token
 */
export async function fetchWithPageVerification(
  url: string,
  options: RequestInit = {},
  verificationToken: string | null
): Promise<Response> {
  const enhancedOptions = {
    ...options,
    headers: {
      ...options.headers,
      ...(verificationToken && {
        'X-Page-Verification-Token': verificationToken,
      }),
    },
  };

  return fetch(url, enhancedOptions);
}