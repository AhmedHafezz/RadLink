'use client';

import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check, History } from 'lucide-react';

interface TenantSelectorProps {
  value: string;
  onChange: (subdomain: string) => void;
  /** Optional email to suggest tenants for */
  email?: string;
}

const WELL_KNOWN_TENANTS = [
  { subdomain: 'demo', label: 'RadLink Demo' },
  { subdomain: 'general', label: 'General Hospital' },
  { subdomain: 'metro', label: 'Metro Medical Center' },
];

const STORAGE_KEY = 'radlink_recent_tenants';

function getRecentTenants(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentTenant(subdomain: string): void {
  if (!subdomain) return;
  try {
    const recent = getRecentTenants().filter((s) => s !== subdomain).slice(0, 4);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([subdomain, ...recent]));
  } catch { /* ignore */ }
}

export default function TenantSelector({ value, onChange, email }: TenantSelectorProps) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecentTenants());
  }, []);

  // Save to localStorage when a tenant is selected
  const select = (subdomain: string) => {
    onChange(subdomain);
    saveRecentTenant(subdomain);
    setRecent(getRecentTenants());
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleInputBlur = () => {
    if (value) {
      saveRecentTenant(value);
      setRecent(getRecentTenants());
    }
    // Delay close to allow click events on dropdown
    setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300">
        <Building2 className="w-4 h-4 text-gray-500" />
        Organization
      </label>

      <div className="relative">
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onBlur={handleInputBlur}
            placeholder="your-clinic"
            autoComplete="off"
            className="flex-1 bg-transparent text-white px-3 py-2.5 text-sm focus:outline-none placeholder-gray-600"
          />
          <span className="text-xs text-gray-500 pr-2 flex-shrink-0 pointer-events-none">
            .radlink.app
          </span>
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="px-2 text-gray-500 hover:text-white transition-colors border-l border-gray-700 h-full py-2.5"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Recent tenants */}
            {recent.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-xs text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3" /> Recent
                </p>
                {recent.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => select(s)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700 text-left transition-colors"
                  >
                    <span className="text-sm text-gray-200">{s}.radlink.app</span>
                    {value === s && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Well-known tenants */}
            <div className={recent.length > 0 ? 'border-t border-gray-700' : ''}>
              <p className="px-3 py-1.5 text-xs text-gray-600 uppercase tracking-wider">
                Suggested
              </p>
              {WELL_KNOWN_TENANTS.map((t) => (
                <button
                  key={t.subdomain}
                  type="button"
                  onMouseDown={() => select(t.subdomain)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700 text-left transition-colors"
                >
                  <div>
                    <p className="text-sm text-gray-200">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.subdomain}.radlink.app</p>
                  </div>
                  {value === t.subdomain && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {value && (
        <p className="text-xs text-gray-500">
          Logging in at{' '}
          <span className="text-blue-400 font-mono">{value}.radlink.app</span>
        </p>
      )}
    </div>
  );
}
