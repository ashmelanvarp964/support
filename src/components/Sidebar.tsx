import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Bell,
  BookOpen,
  User,
  LogOut,
  ShieldAlert,
  Users,
  UserCheck,
  FolderTree,
  Webhook,
  Mail,
  BarChart3,
  FileClock,
  Sliders,
  LifeBuoy,
  Clock,
  Lock,
  LogIn,
} from 'lucide-react';
import type { User as UserType } from '../types.ts';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  user: UserType | null;
  onLogout: () => void;
  openTicketCount?: number;
  unreadNotifsCount?: number;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  user,
  onLogout,
  openTicketCount = 0,
  unreadNotifsCount = 0,
  isOpen,
  onCloseMobile,
}) => {
  const isStaffOrAdmin = user && (user.role === 'STAFF' || user.role === 'ADMIN' || user.role === 'OWNER');

  const customerItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets', label: 'My Tickets', icon: Ticket, badge: openTicketCount > 0 ? openTicketCount : undefined },
    { id: 'ticket_new', label: 'Create Ticket', icon: PlusCircle, highlight: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined },
    { id: 'help', label: 'Knowledge Base', icon: BookOpen },
    { id: 'profile', label: 'Profile Settings', icon: User },
  ];

  const adminItems = [
    { id: 'admin', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'admin_tickets', label: 'Ticket Queue', icon: Ticket, badge: openTicketCount > 0 ? openTicketCount : undefined },
    { id: 'admin_users', label: 'Customer Accounts', icon: Users },
    { id: 'admin_staff', label: 'Staff Management', icon: UserCheck },
    { id: 'admin_categories', label: 'Categories', icon: FolderTree },
    { id: 'admin_webhooks', label: 'Discord Webhooks', icon: Webhook },
    { id: 'admin_email', label: 'Email & SMTP', icon: Mail },
    { id: 'admin_sla', label: 'SLA System', icon: Clock },
    { id: 'admin_analytics', label: 'Analytics & KPIs', icon: BarChart3 },
    { id: 'admin_audit', label: 'Security & Audit Logs', icon: FileClock },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800/80 bg-[#070b14]/95 backdrop-blur-2xl transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Customer Support Portal links */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Customer Portal
            </div>
            <nav className="space-y-1">
              {customerItems.map((item) => {
                const Icon = item.icon;
                const active = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => handleItemClick(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      active
                        ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-300 ring-1 ring-amber-500/30 font-semibold'
                        : item.highlight
                        ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-300 border border-amber-500/20'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Staff & Admin Section */}
          {isStaffOrAdmin && (
            <div>
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Staff & Admin Hub
                </span>
                <span className="rounded bg-purple-950 px-1 py-0.5 text-[8px] font-mono font-bold text-purple-300 border border-purple-800">
                  {user?.role}
                </span>
              </div>
              <nav className="space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-admin-nav-${item.id}`}
                      onClick={() => handleItemClick(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/40 font-semibold'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${active ? 'text-purple-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Hosting quick links info box */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0d1322]/60 p-3.5 text-xs text-slate-400 shadow-inner">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <LifeBuoy className="h-4 w-4 text-amber-400" />
              <span>Hosting Technical Support</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Enterprise DDoS filtering, AMD Ryzen 9 / EPYC compute nodes, and 24/7 engineer coverage.
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
              <span>Hypervisors: 100%</span>
              <span className="text-emerald-400">Online</span>
            </div>
          </div>
        </div>

        {/* Footer info & Logout */}
        <div className="border-t border-slate-800/80 p-3">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={user.avatar || '/logo.png'}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[110px]">{user.name}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{user.email}</span>
                </div>
              </div>
              <button
                id="sidebar-logout-btn"
                onClick={onLogout}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="sidebar-signin-btn"
              onClick={() => handleItemClick('open_auth')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/20 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/30 py-2.5 px-3 text-xs font-semibold text-amber-300 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5 text-amber-400" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
