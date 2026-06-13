'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Upload, FileText, Settings, LogOut,
  Activity, ChevronLeft, ChevronRight, Shield, Crown, Menu, X
} from 'lucide-react';
import { getAuthUser, clearAuthStorage } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', labelAr: 'الرئيسية' },
  { href: '/upload', icon: Upload, label: 'Upload Study', labelAr: 'رفع دراسة' },
  { href: '/reports', icon: FileText, label: 'Reports', labelAr: 'التقارير' },
  { href: '/admin', icon: Settings, label: 'Admin', labelAr: 'الإدارة', adminOnly: true },
];

const TIER_COLORS: Record<string, string> = {
  Basic: 'bg-gray-700 text-gray-300',
  Professional: 'bg-blue-900/50 text-blue-300',
  Enterprise: 'bg-purple-900/50 text-purple-300',
  Free: 'bg-gray-800 text-gray-400',
};

interface SidebarProps {
  tenantTier?: string;
}

function SidebarInner({
  collapsed,
  setCollapsed,
  onMobileClose,
  tenantTier,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onMobileClose?: () => void;
  tenantTier: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAuthUser();

  const handleLogout = () => {
    clearAuthStorage();
    router.replace('/');
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  return (
    <aside className={`flex flex-col h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-500" />
            <span className="font-bold text-white text-lg tracking-tight">RadLink</span>
          </div>
        )}
        {collapsed && <Activity className="w-6 h-6 text-cyan-500 mx-auto" />}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800 transition-colors hidden md:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800 transition-colors md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map(item => {
          if (item.adminOnly && user?.role !== 'Admin') return null;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info + Subscription + Logout */}
      <div className="border-t border-gray-800 p-3 space-y-2">
        {/* Subscription tier badge */}
        {!collapsed && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${TIER_COLORS[tenantTier] ?? TIER_COLORS.Basic}`}>
            <Crown className="w-3 h-3" />
            {tenantTier} Plan
          </div>
        )}

        {/* User info */}
        {!collapsed && user && (
          <div className="px-1">
            <p className="text-xs font-medium text-white truncate">{user.firstName} {user.lastName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-500">{user.role}</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar({ tenantTier = 'Basic' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-400 hover:text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen flex-shrink-0">
        <SidebarInner
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          tenantTier={tenantTier}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden flex">
            <SidebarInner
              collapsed={false}
              setCollapsed={() => {}}
              onMobileClose={() => setMobileOpen(false)}
              tenantTier={tenantTier}
            />
          </div>
        </>
      )}
    </>
  );
}
