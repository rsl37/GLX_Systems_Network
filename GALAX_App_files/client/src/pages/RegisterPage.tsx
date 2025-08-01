/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageVerification } from '../hooks/usePageVerification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wallet, Mail, Phone, Zap, Sparkles, User, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';
import { Country } from '@/data/countries';

export function RegisterPage() {
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, registerWithWallet } = useAuth();
  const { verificationToken, isVerifying, verificationError } = usePageVerification('register');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Check if page verification is available
      if (verificationError) {
        throw new Error(`Security verification failed: ${verificationError}`);
      }

      // Format phone number with country code if it's a phone signup
      let identifier = email;
      if (signupMethod === 'phone') {
        // Clean the phone number: remove all non-digit characters except leading +
        // Remove all non-digit characters
        let cleanPhone = phone.replace(/[^\d]/g, '');
        
        // Check if phone starts with a plus sign and handle it separately
        if (phone.startsWith('+')) {
          cleanPhone = `+${cleanPhone}`;
        }
        
        // Check if phone already has a country code (starts with +)
        if (cleanPhone.startsWith('+')) {
          identifier = cleanPhone;
        } else {
          // Remove any leading zeros (only if followed by other digits) and add the selected country code
          const phoneWithoutLeadingZeros = cleanPhone.replace(/^0+(?=\d)/, '');
          if (!phoneWithoutLeadingZeros) {
            throw new Error('Invalid phone number: phone number cannot be empty after removing leading zeros.');
          }
          identifier = `${countryCode}${phoneWithoutLeadingZeros}`;
        }
      }
      
      await register(identifier, password, username, signupMethod, verificationToken);
      navigate('/dashboard');
    } catch (err) {
      // Provide more helpful error messages
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        // Enhanced fallback message with more actionable guidance
        setError('Unable to create account. Please verify your information is correct and try again. If the problem persists, contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletRegister = async () => {
    if (!username.trim()) {
      setError('Please enter a username to register with your wallet.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Check if page verification is available
      if (verificationError) {
        throw new Error(`Security verification failed: ${verificationError}`);
      }

      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          await registerWithWallet(accounts[0], username, verificationToken);
          navigate('/dashboard');
        } else {
          setError('No wallet accounts available. Please unlock your MetaMask wallet and try again.');
        }
      } else {
        setError('MetaMask wallet not detected. Please install MetaMask browser extension to continue.');
      }
    } catch (err) {
      // Handle specific wallet registration errors
      if (err instanceof Error) {
        if (err.message.includes('User rejected')) {
          setError('Wallet connection was denied. Please approve the connection request in MetaMask.');
        } else if (err.message.includes('wallet_requestPermissions')) {
          setError('MetaMask permissions denied. Please approve wallet access to continue.');
        } else {
          setError(err.message);
        }
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Failed to register with your wallet. Please check your MetaMask connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 galax-holographic">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="galax-card animate-pulse-glow">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <Zap className="h-8 w-8 text-purple-500" />
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                Join GALAX
              </CardTitle>
              <Sparkles className="h-8 w-8 text-coral-500" />
            </motion.div>
            <CardDescription className="text-lg text-gray-600">
              Create your civic network account
            </CardDescription>
            
            {/* Security verification indicator */}
            {process.env.NODE_ENV === 'production' && (
              <div className="mt-4">
                {isVerifying ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                    Verifying page security...
                  </div>
                ) : verificationToken ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                    <Shield className="h-4 w-4" />
                    Page verified and secure
                  </div>
                ) : verificationError ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    Security verification failed
                  </div>
                ) : null}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Signup Method Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <Button
                type="button"
                variant={signupMethod === 'email' ? 'default' : 'ghost'}
                className={`flex-1 ${signupMethod === 'email' ? 'galax-button' : ''}`}
                onClick={() => setSignupMethod('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                type="button"
                variant={signupMethod === 'phone' ? 'default' : 'ghost'}
                className={`flex-1 ${signupMethod === 'phone' ? 'galax-button' : ''}`}
                onClick={() => setSignupMethod('phone')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="galax-input"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {signupMethod === 'email' ? 'Email' : 'Phone Number'}
                </Label>
                {signupMethod === 'phone' ? (
                  <div className="flex gap-2">
                    <CountryCodeSelector
                      value={countryCode}
                      onChange={(dialCode: string, country: Country) => setCountryCode(dialCode)}
                      className="flex-shrink-0"
                    />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="galax-input flex-1"
                      required
                    />
                  </div>
                ) : (
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="galax-input"
                    required
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="galax-input"
                  required
                />
              </div>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}
              
              <Button
                type="submit"
                className="w-full galax-button"
                disabled={isLoading || (process.env.NODE_ENV === 'production' && !verificationToken)}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-username">Username for Wallet</Label>
              <Input
                id="wallet-username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="galax-input"
              />
            </div>

            <Button
              variant="outline"
              className="w-full galax-button-accent"
              onClick={handleWalletRegister}
              disabled={isLoading || (process.env.NODE_ENV === 'production' && !verificationToken)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Register with MetaMask
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium hover:underline">
                Sign in
              </Link>
            </div>
            
            {/* Verification Notice */}
            <div className="text-center text-xs text-gray-500 bg-blue-50 p-3 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <User className="h-4 w-4" />
                <span className="font-medium">Verification Required</span>
              </div>
              <p>Email/phone verification is required before you can use the app. KYC verification needed for token mining.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
