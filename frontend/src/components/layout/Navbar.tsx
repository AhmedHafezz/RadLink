'use client';

import { useRouter } from 'next/navigation';
import { getAuthUser, clearAuthStorage } from '@/lib/auth';
import { Radio, Bell, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function Navbar() {
  const router = useRouter();
  const user = getAuthUser();

  const handleLogout = () => {
    clearAuthStorage();
    router.push('/');
  };

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'User';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <header className="h-14 bg-rad-surface border-b border-rad-border flex items-center px-4 gap-4 shrink-0 z-[var(--z-toolbar)]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 select-none">
        <div className="w-8 h-8 bg-rad-cyan-600 rounded-lg flex items-center justify-center shadow-rad-glow-sm">
          <Radio className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        <span className="text-base font-bold text-rad-text-primary tracking-tight">RadLink</span>
        <span className="hidden sm:inline text-xs text-rad-text-muted font-medium px-1.5 py-0.5 bg-rad-panel rounded border border-rad-border">
          Cloud PACS
        </span>
      </div>

      {/* Tenant name */}
      {user?.tenantName && (
        <span className="hidden md:block text-sm text-rad-text-muted border-l border-rad-border pl-4">
          {user.tenantName}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <button
          className="btn-ghost btn-icon relative"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 btn-ghost px-2.5 py-1.5 rounded-lg">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-rad-cyan-800 flex items-center justify-center text-xs font-semibold text-rad-cyan-200 select-none">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium text-rad-text-primary">
                {fullName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-rad-text-muted" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="bg-rad-card border border-rad-border rounded-lg p-1 min-w-52 shadow-rad-xl z-[var(--z-modal)] animate-fade-in"
              sideOffset={6}
              align="end"
            >
              {/* User info header */}
              <div className="px-3 py-2 border-b border-rad-border mb-1">
                <div className="text-sm font-semibold text-rad-text-primary">{fullName}</div>
                <div className="text-xs text-rad-text-muted">{user?.email}</div>
                {user?.role && (
                  <div className="text-xs text-rad-cyan-400 mt-0.5">{user.role}</div>
                )}
              </div>

              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-rad-text-secondary hover:text-rad-text-primary hover:bg-rad-panel rounded cursor-pointer outline-none transition-colors"
                onSelect={() => router.push('/admin')}
              >
                <Settings className="w-4 h-4 shrink-0" />
                Settings &amp; Admin
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-rad-text-secondary hover:text-rad-text-primary hover:bg-rad-panel rounded cursor-pointer outline-none transition-colors"
                onSelect={() => router.push('/admin/profile')}
              >
                <User className="w-4 h-4 shrink-0" />
                My Profile
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-rad-border my-1" />

              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-rad-error hover:text-red-300 hover:bg-rad-error-dim rounded cursor-pointer outline-none transition-colors"
                onSelect={handleLogout}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
