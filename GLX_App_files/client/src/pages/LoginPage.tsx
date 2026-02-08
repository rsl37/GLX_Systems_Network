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

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageVerification } from '../hooks/usePageVerification';
import { useAccount, useConnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wallet, Mail, Phone, Zap, Sparkles, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';
import { Country } from '@/data/countries';

export function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithWallet } = useAuth();
  const { verificationToken, isVerifying, verificationError } = usePageVerification('login');
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  // Auto-login when wallet is connected
  useEffect(() => {
    if (isConnected && address && !isLoading) {
      handleWalletLogin(address);
    }
  }, [isConnected, address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Check if page verification is available
      if (verificationError) {
        throw new Error(`Security verification failed: ${verificationError}`);
      }

      // Format phone number with country code if it's a phone login
      const identifier =
        loginMethod === 'email' ? email : `${countryCode}${phone.replace(/^[\+\s0]+/, '')}`;
      await login(identifier, password, verificationToken);
      navigate('/dashboard');
    } catch (err) {
      // Provide more specific error messages
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError(
          'Unable to log in. Please check your credentials and try again. If the problem persists, contact support.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletLogin = async (walletAddress: string) => {
    setError('');
    setIsLoading(true);

    try {
      // Check if page verification is available
      if (verificationError) {
        throw new Error(`Security verification failed: ${verificationError}`);
      }

      await loginWithWallet(walletAddress, verificationToken);
      navigate('/dashboard');
    } catch (err) {
      // Handle wallet login errors
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Failed to connect to your wallet. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center p-4 glx-holographic'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='w-full max-w-md'
      >
        <Card className='glx-card animate-pulse-glow'>
          <CardHeader className='text-center pb-8'>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className='flex items-center justify-center gap-2 mb-4'
            >
              <Zap className='h-8 w-8 text-purple-500' />
              <CardTitle className='text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent'>
                GLX
              </CardTitle>
              <Sparkles className='h-8 w-8 text-coral-500' />
            </motion.div>
            <CardDescription className='text-lg text-gray-600'>
              Civic Network Platform
            </CardDescription>

            {/* Security verification indicator */}
            {process.env.NODE_ENV === 'production' && (
              <div className='mt-4'>
                {isVerifying ? (
                  <div className='flex items-center justify-center gap-2 text-sm text-gray-500'>
                    <div className='w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin'></div>
                    Verifying page security...
                  </div>
                ) : verificationToken ? (
                  <div className='flex items-center justify-center gap-2 text-sm text-green-600'>
                    <Shield className='h-4 w-4' />
                    Page verified and secure
                  </div>
                ) : verificationError ? (
                  <div className='flex items-center justify-center gap-2 text-sm text-red-500'>
                    <AlertCircle className='h-4 w-4' />
                    Security verification failed
                  </div>
                ) : null}
              </div>
            )}
          </CardHeader>

          <CardContent className='space-y-6'>
            {/* Login Method Toggle */}
            <div className='flex gap-2 p-1 bg-gray-100 rounded-xl'>
              <Button
                type='button'
                variant={loginMethod === 'email' ? 'default' : 'ghost'}
                className={`flex-1 ${loginMethod === 'email' ? 'glx-button' : ''}`}
                onClick={() => setLoginMethod('email')}
              >
                <Mail className='h-4 w-4 mr-2' />
                Email
              </Button>
              <Button
                type='button'
                variant={loginMethod === 'phone' ? 'default' : 'ghost'}
                className={`flex-1 ${loginMethod === 'phone' ? 'glx-button' : ''}`}
                onClick={() => setLoginMethod('phone')}
              >
                <Phone className='h-4 w-4 mr-2' />
                Phone
              </Button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='identifier'>
                  {loginMethod === 'email' ? 'Email' : 'Phone Number'}
                </Label>
                {loginMethod === 'phone' ? (
                  <div className='flex gap-2'>
                    <CountryCodeSelector
                      value={countryCode}
                      onChange={(dialCode: string, country: Country) => setCountryCode(dialCode)}
                      className='flex-shrink-0'
                    />
                    <Input
                      id='phone'
                      type='tel'
                      placeholder='Enter your phone number'
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className='glx-input flex-1'
                      required
                    />
                  </div>
                ) : (
                  <Input
                    id='email'
                    type='email'
                    placeholder='Enter your email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className='glx-input'
                    required
                  />
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  type='password'
                  placeholder='Enter your password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className='glx-input'
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl'
                >
                  <AlertCircle className='h-4 w-4' />
                  {error}
                </motion.div>
              )}

              <Button
                type='submit'
                className='w-full glx-button'
                disabled={
                  isLoading || (process.env.NODE_ENV === 'production' && !verificationToken)
                }
              >
                {isLoading ? (
                  <div className='flex items-center gap-2'>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className='text-center'>
              <Link
                to='/forgot-password'
                className='text-purple-600 hover:text-purple-700 text-sm hover:underline'
              >
                Forgot your password?
              </Link>
            </div>

            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t border-gray-300' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-white px-2 text-gray-500'>Or connect with wallet</span>
              </div>
            </div>

            {/* RainbowKit Connect Button - Supports MetaMask, WalletConnect, and more */}
            <div className='flex justify-center'>
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        style: {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                      className='w-full'
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <Button
                              onClick={openConnectModal}
                              variant='outline'
                              className='w-full glx-button-accent'
                              disabled={isLoading || (process.env.NODE_ENV === 'production' && !verificationToken)}
                            >
                              <Wallet className='h-4 w-4 mr-2' />
                              Connect Wallet
                            </Button>
                          );
                        }

                        return (
                          <div className='flex gap-2'>
                            <Button
                              onClick={openAccountModal}
                              variant='outline'
                              className='flex-1'
                            >
                              {account.displayName}
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>

            <div className='text-center text-sm'>
              <span className='text-gray-600'>Don't have an account? </span>
              <Link
                to='/register'
                className='text-purple-600 hover:text-purple-700 font-medium hover:underline'
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
