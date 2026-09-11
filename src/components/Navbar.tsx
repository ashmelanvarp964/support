import React, { useState } from 'react';
import {
  Bell,
  Search,
  CheckCircle2,
  ExternalLink,
  LogOut,
  User as UserIcon,
  Shield,
  HelpCircle,
  Menu,
  X,
  Sparkles,
  LogIn,
} from 'lucide-react';
import type { User, Notification } from '../types.ts';

interface NavbarProps {
  user: User | null;
  notifications: Notification[];
  onOpenAuth: () => void;
  onLogout: () => void;
  onSelectTicket: (id: string) => void;
  onNavigate: (route: string) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  notifications,
  onOpenAuth,
  onLogout,
  onSelectTicket,
  onNavigate,
  onToggleSidebar,
  sidebarOpen,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'ADMIN':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'STAFF':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left branding & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div
            id="brand-logo-container"
            onClick={() => onNavigate(user ? (user.role === 'CUSTOMER' ? 'dashboard' : 'admin') : 'home')}
            className="flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600/30 via-orange-500/20 to-blue-500/10 p-1.5 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/15">
              <img src="/logo.png" alt="LumaCloud" className="h-full w-full object-contain drop-shadow" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-['Outfit']">LumaCloud</span>
                <span className="hidden rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30 sm:inline-block tracking-wider">
                  SUPPORT
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">Game & VPS Cloud Support Center</span>
            </div>
          </div>
        </div>

        {/* Center Search / Status Pill */}
        <div className="hidden lg:flex items-center gap-4">
          <div
            onClick={() => onNavigate('help')}
            className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-400 cursor-pointer hover:border-amber-500/40 hover:text-slate-200 transition-all shadow-inner"
          >
            <Search className="h-3.5 w-3.5 text-amber-400" />
            <span>Search articles, servers, troubleshooting...</span>
            <kbd className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">KB</kbd>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All Systems Operational (AMD EPYC & NVMe)</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Notifications Icon & Dropdown */}
              <div className="relative">
                <button
                  id="notifications-bell-btn"
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 shadow-md animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-[#0d1424]/95 p-3 shadow-2xl backdrop-blur-xl z-50">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={onMarkAllNotificationsRead}
                          className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-slate-800/50">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500">No notifications</div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              onMarkNotificationRead(n.id);
                              if (n.ticket_id) {
                                onSelectTicket(n.ticket_id);
                                setShowNotifs(false);
                              }
                            }}
                            className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                              !n.read ? 'bg-amber-950/25 hover:bg-amber-950/35 border-l-2 border-amber-500' : 'hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Menu */}
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 p-1 pr-3 hover:border-slate-700 transition-colors"
                >
                  <img
                    src={user.avatar || '/logo.png'}
                    alt={user.name}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-cyan-500/40"
                  />
                  <span className="hidden sm:inline-block max-w-[100px] truncate text-xs font-medium text-slate-200">
                    {user.name}
                  </span>
                  <span className={`hidden md:inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl z-50">
                    <div className="border-b border-slate-800/80 px-3 py-2.5">
                      <p className="text-xs font-semibold text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                        {user.email_verified && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setShowProfileMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <UserIcon className="h-4 w-4 text-slate-400" />
                        My Profile & Settings
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('help');
                          setShowProfileMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <HelpCircle className="h-4 w-4 text-slate-400" />
                        Knowledge Base
                      </button>
                      {user.role !== 'CUSTOMER' && (
                        <button
                          onClick={() => {
                            onNavigate('admin');
                            setShowProfileMenu(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-950/40"
                        >
                          <Shield className="h-4 w-4 text-cyan-400" />
                          Staff Control Panel
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-800/80 pt-1">
                      <button
                        id="navbar-logout-btn"
                        onClick={() => {
                          onLogout();
                          setShowProfileMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              id="navbar-sign-in-btn"
              onClick={onOpenAuth}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
