'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Activity, Shield, Cloud, Cpu } from 'lucide-react';
import { authApi } from '@/lib/api';

const TENANT_SUGGESTIONS = [
  { subdomain: 'demo', name: 'RadLink Demo' },
  { subdomain: 'general', name: 'General Hospital' },
  { subdomain: 'metro', name: 'Metro Radiology' },
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', subdomain: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.subdomain) {
      toast.error('All fields are required');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({
        email: form.email,
        password: form.password,
        subdomain: form.subdomain,
      });
      const { accessToken, refreshToken, user, tenant } = res;
      localStorage.setItem('radlink_token', accessToken);
      localStorage.setItem('radlink_refresh_token', refreshToken);
      localStorage.setItem('radlink_user', JSON.stringify(user));
      localStorage.setItem('radlink_tenant', JSON.stringify(tenant));
      toast.success(`Welcome back, ${user.firstName}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rad-bg flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-rad-surface via-rad-panel to-rad-bg border-r border-rad-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rad-cyan-gradient flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-rad-text-primary">RadLink</span>
          <span className="text-xs text-rad-text-muted bg-rad-card px-2 py-0.5 rounded-full border border-rad-border">
            Cloud PACS
          </span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-rad-text-primary leading-tight">
              Professional Radiology
              <br />
              <span className="text-rad-cyan-400">in the Cloud</span>
            </h1>
            <p className="mt-4 text-rad-text-secondary text-lg leading-relaxed">
              HIPAA-compliant DICOM viewer, AI-assisted reporting, and seamless
              multi-site collaboration — all from your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: Shield,
                title: 'HIPAA Compliant',
                desc: 'End-to-end encryption, audit logs, and PHI anonymization',
              },
              {
                icon: Cloud,
                title: 'Zero-footprint Viewer',
                desc: 'Cornerstone3D-powered browser-native DICOM rendering',
              },
              {
                icon: Cpu,
                title: 'AI-Assisted Reports',
                desc: 'Structured templates, PDF generation with QR verification',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-4 p-4 rounded-xl bg-rad-card border border-rad-border"
              >
                <div className="w-9 h-9 rounded-lg bg-rad-cyan-900/40 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-rad-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-rad-text-primary">{title}</p>
                  <p className="text-xs text-rad-text-secondary mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-rad-text-muted">
          &copy; {new Date().getFullYear()} RadLink Technologies &middot; All rights reserved
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="w-9 h-9 rounded-lg bg-rad-cyan-gradient flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-rad-text-primary">RadLink</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-rad-text-primary">Sign in to your workspace</h2>
            <p className="mt-1 text-sm text-rad-text-secondary">
              Enter your facility credentials to access the platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tenant / subdomain */}
            <div>
              <label className="block text-sm font-medium text-rad-text-secondary mb-1.5">
                Facility / Subdomain
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.subdomain}
                  onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                  placeholder="your-facility"
                  className="w-full bg-rad-card border border-rad-border rounded-lg px-4 py-2.5 text-rad-text-primary placeholder-rad-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-rad-cyan-500 focus:border-transparent transition-all"
                  autoComplete="organization"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rad-text-muted">
                  .radlink.io
                </span>
              </div>
              {/* Quick-select suggestions */}
              <div className="mt-2 flex flex-wrap gap-2">
                {TENANT_SUGGESTIONS.map((t) => (
                  <button
                    key={t.subdomain}
                    type="button"
                    onClick={() => setForm({ ...form, subdomain: t.subdomain })}
                    className="text-xs px-2.5 py-1 rounded-full bg-rad-panel border border-rad-border text-rad-text-muted hover:text-rad-cyan-400 hover:border-rad-cyan-700 transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-rad-text-secondary mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="radiologist@hospital.com"
                className="w-full bg-rad-card border border-rad-border rounded-lg px-4 py-2.5 text-rad-text-primary placeholder-rad-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-rad-cyan-500 focus:border-transparent transition-all"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-rad-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-rad-card border border-rad-border rounded-lg px-4 py-2.5 pr-10 text-rad-text-primary placeholder-rad-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-rad-cyan-500 focus:border-transparent transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rad-text-muted hover:text-rad-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rad-cyan-gradient text-white font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rad-cyan-500 focus:ring-offset-2 focus:ring-offset-rad-bg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-rad-glow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs text-rad-text-muted">
              New facility?{' '}
              <a href="/admin/register" className="text-rad-cyan-400 hover:underline">
                Register your organisation
              </a>
            </p>
          </div>

          <div className="border-t border-rad-border pt-4 text-center">
            <p className="text-2xs text-rad-text-muted">
              Protected by TLS 1.3 &middot; HIPAA compliant &middot; SOC 2 Type II
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
