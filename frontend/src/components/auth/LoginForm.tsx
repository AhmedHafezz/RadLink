'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/auth';
import { LoginResponse } from '@/types/tenant';
import { Eye, EyeOff, Radio, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const response = (await authApi.login(email, password, subdomain || undefined)) as LoginResponse;
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      toast.success(`Welcome back, ${response.user.firstName}!`);
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string }; status?: number } };
      if (err.response?.status === 401) {
        toast.error('Invalid email or password.');
      } else if (err.response?.status === 404) {
        toast.error('Organization not found. Check your subdomain.');
      } else {
        toast.error(err.response?.data?.message ?? 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rad-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-rad-cyan-600 rounded-2xl mb-4 shadow-rad-glow">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-rad-text-primary tracking-tight">RadLink</h1>
          <p className="text-rad-text-muted text-sm mt-1">Cloud PACS &amp; Web Viewer Platform</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-rad-text-primary mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Subdomain (optional) */}
            <div className="field">
              <label htmlFor="subdomain" className="field-label">
                Organization subdomain <span className="text-rad-text-muted">(optional)</span>
              </label>
              <input
                id="subdomain"
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().trim())}
                className="field-input"
                placeholder="your-clinic"
                autoComplete="organization"
                spellCheck={false}
              />
            </div>

            {/* Email */}
            <div className="field">
              <label htmlFor="email" className="field-label">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
                autoComplete="email"
                className="field-input"
                placeholder="radiologist@clinic.com"
              />
            </div>

            {/* Password */}
            <div className="field">
              <label htmlFor="password" className="field-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="field-input pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rad-text-muted hover:text-rad-text-primary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-rad-text-muted">
            Need an account?{' '}
            <a href="/register" className="text-rad-cyan-400 hover:text-rad-cyan-300 font-medium">
              Register your organization
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-rad-text-muted mt-6">
          Protected health information is encrypted at rest and in transit.
        </p>
      </div>
    </div>
  );
}
