'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Database, Shield, Upload, Trash2, UserPlus, Crown,
  AlertCircle, CheckCircle2, Palette, Image
} from 'lucide-react';
import { tenantApi } from '@/lib/api';
import { isAuthenticated, getAuthUser, hasRole } from '@/lib/auth';
import type { Tenant, TenantUser, StorageUsage } from '@/types/tenant';

const TIER_COLORS: Record<string, string> = {
  Free: 'text-gray-400 bg-gray-700/50 border-gray-600',
  Basic: 'text-blue-300 bg-blue-700/20 border-blue-600/40',
  Professional: 'text-purple-300 bg-purple-700/20 border-purple-600/40',
  Enterprise: 'text-yellow-300 bg-yellow-700/20 border-yellow-600/40',
};

const ROLE_STYLES: Record<string, string> = {
  Admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  Radiologist: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Technician: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  Viewer: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

interface InviteModalProps {
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
}

function InviteModal({ onClose, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Radiologist');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErr('');
    try {
      await onInvite(email.trim(), role);
      onClose();
    } catch {
      setErr('Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-white mb-4">Invite New User</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@hospital.org"
              className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option>Radiologist</option>
              <option>Technician</option>
              <option>Viewer</option>
              <option>Admin</option>
            </select>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const user = getAuthUser();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/'); return; }
    if (!hasRole('Admin')) { router.replace('/dashboard'); }
  }, [router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantRes, storageRes, usersRes] = await Promise.allSettled([
        tenantApi.getSubscription(),
        tenantApi.getStorageUsage(),
        tenantApi.getUsers({ page: 1, pageSize: 50 }),
      ]);
      if (tenantRes.status === 'fulfilled') {
        const t = tenantRes.value as Tenant;
        setTenant(t);
        if (t.settings?.primaryColor) setPrimaryColor(t.settings.primaryColor);
        if (t.settings?.logoUrl) setLogoPreview(t.settings.logoUrl);
      }
      if (storageRes.status === 'fulfilled') setStorage(storageRes.value as StorageUsage);
      if (usersRes.status === 'fulfilled') {
        const data = usersRes.value as { items?: TenantUser[] } | TenantUser[];
        setUsers(Array.isArray(data) ? data : data.items ?? []);
      }
    } catch {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleInvite = async (email: string, role: string) => {
    await tenantApi.inviteUser({ email, role });
    await fetchAll();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Remove this user from the organization?')) return;
    try {
      await tenantApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert('Failed to remove user.');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await tenantApi.updateSettings({
        primaryColor,
        logoUrl: logoPreview ?? undefined,
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const storagePercent =
    storage && storage.usedGB !== undefined && storage.totalGB > 0
      ? Math.min(100, Math.round((storage.usedGB / storage.totalGB) * 100))
      : tenant && tenant.subscription
      ? Math.min(100, Math.round(((storage as unknown as { used?: number })?.used ?? 0) / tenant.subscription.maxStorageGB * 100))
      : 0;

  const usedGB = (storage as unknown as { usedGB?: number })?.usedGB ?? 0;
  const totalGB = tenant?.subscription?.maxStorageGB ?? 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage subscription, users, and organization settings
          </p>
        </div>
        {tenant && (
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${TIER_COLORS[tenant.subscriptionTier] ?? ''}`}>
            <Crown className="w-3.5 h-3.5 inline mr-1" />
            {tenant.subscriptionTier}
          </span>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-900/30 text-red-400 border border-red-800/30 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="px-6 py-6 max-w-screen-xl mx-auto space-y-8">
        {/* Subscription + Storage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subscription */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" /> Subscription
              </h2>
              <button className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
                <Crown className="w-3.5 h-3.5" /> Upgrade Plan
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-5 bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : tenant ? (
              <div className="space-y-2 text-sm">
                <Row label="Plan" value={<span className={`px-2 py-0.5 rounded-full font-medium border ${TIER_COLORS[tenant.subscriptionTier]}`}>{tenant.subscriptionTier}</span>} />
                <Row label="Max Users" value={tenant.subscription?.maxUsers ?? '—'} />
                <Row label="Max Storage" value={`${tenant.subscription?.maxStorageGB ?? '?'} GB`} />
                <Row label="Studies/Month" value={tenant.subscription?.maxStudiesPerMonth ?? '—'} />
                <Row label="Active" value={tenant.subscription?.isActive ? <span className="text-green-400">Yes</span> : <span className="text-red-400">No</span>} />
                {tenant.subscription?.endDate && (
                  <Row label="Renews" value={new Date(tenant.subscription.endDate).toLocaleDateString()} />
                )}
                <div className="pt-2">
                  <p className="text-gray-500 text-xs mb-1.5">Features</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tenant.subscription?.features?.map((f) => (
                      <span key={f} className="text-xs bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Storage */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" /> Storage Usage
            </h2>
            {loading ? (
              <div className="h-20 bg-gray-700 rounded animate-pulse" />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Used</span>
                  <span className="text-white font-medium">
                    {usedGB.toFixed(2)} GB / {totalGB} GB
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{storagePercent}% used</p>
                {storagePercent > 80 && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Storage is running low. Consider upgrading.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" /> Users
            </h2>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Invite User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Login</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-700/50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-700 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : users.length === 0
                  ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          No users found.
                        </td>
                      </tr>
                    )
                  : users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 text-white">{u.firstName} {u.lastName}</td>
                        <td className="px-4 py-3 text-gray-400">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[u.role] ?? ''}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="flex items-center gap-1 text-green-400 text-xs">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Remove user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* White-Label Settings */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-pink-400" /> White-Label Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-3">
              <label className="block text-sm text-gray-400">Organization Logo</label>
              <div
                className="relative w-full h-28 bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain p-3 rounded"
                  />
                ) : (
                  <div className="text-center">
                    <Image className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Click to upload logo</p>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
              {logoPreview && (
                <button
                  onClick={() => setLogoPreview(null)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove logo
                </button>
              )}
            </div>

            {/* Primary Color */}
            <div className="space-y-3">
              <label className="block text-sm text-gray-400">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-600 bg-transparent cursor-pointer"
                />
                <div>
                  <p className="text-white font-mono text-sm">{primaryColor.toUpperCase()}</p>
                  <p className="text-gray-500 text-xs">Used for buttons and accents</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setPrimaryColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: primaryColor === c ? 'white' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
            {settingsSaved && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvite={handleInvite} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
