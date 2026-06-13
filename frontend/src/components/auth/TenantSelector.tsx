'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface TenantSelectorProps {
  value: string;
  onChange: (subdomain: string) => void;
}

export default function TenantSelector({ value, onChange }: TenantSelectorProps) {
  const [mode, setMode] = useState<'input' | 'recent'>('input');

  const getRecent = (): string[] => {
    try {
      const stored = localStorage.getItem('radlink_recent_tenants');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  };

  const saveRecent = (subdomain: string) => {
    try {
      const recent = getRecent().filter(s => s !== subdomain).slice(0, 4);
      localStorage.setItem('radlink_recent_tenants', JSON.stringify([subdomain, ...recent]));
    } catch { /* ignore */ }
  };

  const recent = getRecent();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        <span className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-gray-500" />
          Organization Subdomain
        </span>
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            onBlur={() => value && saveRecent(value)}
            placeholder="your-clinic"
            className="form-input w-full pr-24"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            .radlink.app
          </span>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-xs text-gray-600 self-center">Recent:</span>
          {recent.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
