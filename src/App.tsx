import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CustomerDashboard } from './components/CustomerDashboard.tsx';
import { CustomerTickets } from './components/CustomerTickets.tsx';
import { TicketCreate } from './components/TicketCreate.tsx';
import { TicketDetail } from './components/TicketDetail.tsx';
import { KnowledgeBase } from './components/KnowledgeBase.tsx';
import { NotificationsView } from './components/NotificationsView.tsx';
import { UserProfile } from './components/UserProfile.tsx';

// Admin Views
import { AdminOverview } from './components/AdminOverview.tsx';
import { AdminTickets } from './components/AdminTickets.tsx';
import { AdminUsers } from './components/AdminUsers.tsx';
import { AdminStaff } from './components/AdminStaff.tsx';
import { AdminCategories } from './components/AdminCategories.tsx';
import { AdminWebhooks } from './components/AdminWebhooks.tsx';
import { AdminEmailSettings } from './components/AdminEmailSettings.tsx';
import { AdminSlaSettings } from './components/AdminSlaSettings.tsx';
import { AdminAnalytics } from './components/AdminAnalytics.tsx';
import { AdminAuditLogs } from './components/AdminAuditLogs.tsx';
import { LogIn, UserPlus, BookOpen, LifeBuoy, Shield } from 'lucide-react';

import type {
  User,
  Ticket,
  Category,
  Notification,
  KnowledgeArticle,
  DiscordWebhook,
  WebhookLog,
  SmtpConfig,
  EmailTemplate,
  EmailLog,
  AuditLog,
  SlaSettings,
} from './types.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // App data stores
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [kbArticles, setKbArticles] = useState<KnowledgeArticle[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [slaSettings, setSlaSettings] = useState<SlaSettings | null>(null);

  // Initial user check
  const fetchAuthUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Error fetching auth user', err);
      setCurrentUser(null);
    }
  };

  const fetchAppData = async () => {
    try {
      // Fetch Tickets
      const ticketsRes = await fetch('/api/tickets');
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.tickets || []);
      }

      // Fetch Categories
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }

      // Fetch Notifications
      const notifsRes = await fetch('/api/notifications');
      if (notifsRes.ok) {
        const data = await notifsRes.json();
        setNotifications(data.notifications || []);
      }

      // Fetch Knowledge Base
      const kbRes = await fetch('/api/kb');
      if (kbRes.ok) {
        const data = await kbRes.json();
        setKbArticles(data.articles || []);
      }

      // Fetch Admin Specifics if Staff/Admin/Owner
      const adminRes = await fetch('/api/admin/overview');
      if (adminRes.ok) {
        const data = await adminRes.json();
        setUsersList(data.users || []);
        setWebhooks(data.webhooks || []);
        setWebhookLogs(data.webhook_logs || []);
        setSmtpConfig(data.smtp || null);
        setEmailTemplates(data.templates || []);
        setEmailLogs(data.email_logs || []);
        setAuditLogs(data.audit_logs || []);
        setSlaSettings(data.sla_settings || null);
      }
    } catch (err) {
      console.error('Error fetching app data', err);
    }
  };

  useEffect(() => {
    fetchAuthUser();
  }, []);

  useEffect(() => {
    fetchAppData();
    const interval = setInterval(fetchAppData, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle Switch Role (Customer / Staff / Owner)
  const handleSwitchRole = async (role: 'CUSTOMER' | 'STAFF' | 'OWNER') => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        if (role === 'CUSTOMER') {
          if (currentRoute.startsWith('admin')) {
            setCurrentRoute('dashboard');
          }
        } else {
          if (currentRoute === 'dashboard') {
            setCurrentRoute('admin');
          }
        }
        await fetchAppData();
      }
    } catch (err) {
      console.error('Error switching role', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setCurrentRoute('dashboard');
      setIsAuthOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTicket = (id: string) => {
    setSelectedTicketId(id);
    setCurrentRoute('ticket_detail');
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Staff members for assignment dropdowns
  const staffMembers = usersList.filter(
    (u) => u.role === 'STAFF' || u.role === 'ADMIN' || u.role === 'OWNER'
  );

  const handleNavigate = (r: string) => {
    if (r === 'open_auth' || r === 'login') {
      setAuthInitialMode('login');
      setIsAuthOpen(true);
      return;
    }
    if (r === 'register') {
      setAuthInitialMode('register');
      setIsAuthOpen(true);
      return;
    }
    setSelectedTicketId(null);
    setCurrentRoute(r);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        notifications={notifications}
        onOpenAuth={() => {
          setAuthInitialMode('login');
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
        onSelectTicket={handleSelectTicket}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          user={currentUser}
          onLogout={handleLogout}
          openTicketCount={tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
          unreadNotifsCount={notifications.filter((n) => !n.read).length}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {/* Customer Routes */}
          {currentRoute === 'dashboard' && currentUser && (
            <CustomerDashboard
              user={currentUser}
              tickets={tickets.filter((t) => currentUser.role !== 'CUSTOMER' || t.customer_id === currentUser.id)}
              kbArticles={kbArticles}
              onSelectTicket={handleSelectTicket}
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'dashboard' && !currentUser && (
            <div className="max-w-4xl mx-auto py-6 space-y-8">
              {/* Clean Portal Header */}
              <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="max-w-2xl relative z-10">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 mb-4">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    LumaCloud Support Portal
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Outfit']">
                    High-Performance Hosting Support
                  </h1>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Submit support tickets, report service interruptions, and collaborate with support engineers. Please sign in manually with your registered email and password to access your account.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      id="guest-signin-btn"
                      onClick={() => {
                        setAuthInitialMode('login');
                        setIsAuthOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Sign In with Email & Password</span>
                    </button>
                    <button
                      id="guest-register-btn"
                      onClick={() => {
                        setAuthInitialMode('register');
                        setIsAuthOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <UserPlus className="h-4 w-4 text-amber-400" />
                      <span>Register Account</span>
                    </button>
                    <button
                      onClick={() => setCurrentRoute('help')}
                      className="flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-all"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Knowledge Base</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => {
                    setAuthInitialMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-amber-500/30 transition-all cursor-pointer group"
                >
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                    <LifeBuoy className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-amber-300">Submit a Ticket</h3>
                  <p className="mt-1 text-xs text-slate-400">Log in with your credentials to open technical, billing, or server inquiries.</p>
                </div>

                <div
                  onClick={() => setCurrentRoute('help')}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-amber-500/30 transition-all cursor-pointer group"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-blue-300">Knowledge Base</h3>
                  <p className="mt-1 text-xs text-slate-400">Public documentation for Minecraft servers, DDoS mitigation, and VPS networking.</p>
                </div>

                <div
                  onClick={() => {
                    setAuthInitialMode('register');
                    setIsAuthOpen(true);
                  }}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-amber-500/30 transition-all cursor-pointer group"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300">Create Account</h3>
                  <p className="mt-1 text-xs text-slate-400">Sign up in seconds to start tracking all your infrastructure tickets.</p>
                </div>
              </div>
            </div>
          )}

          {currentRoute === 'tickets' && (
            <CustomerTickets
              tickets={tickets.filter((t) => !currentUser || currentUser.role !== 'CUSTOMER' || t.customer_id === currentUser.id)}
              categories={categories}
              onSelectTicket={handleSelectTicket}
              onNavigateToCreate={() => setCurrentRoute('ticket_new')}
            />
          )}

          {currentRoute === 'ticket_new' && (
            <TicketCreate
              categories={categories}
              currentUser={currentUser}
              onRequireAuth={() => {
                setAuthInitialMode('login');
                setIsAuthOpen(true);
              }}
              onBack={() => setCurrentRoute(currentUser?.role === 'CUSTOMER' ? 'dashboard' : 'admin_tickets')}
              onSuccess={(ticketId) => {
                setSelectedTicketId(ticketId);
                setCurrentRoute('ticket_detail');
                fetchAppData();
              }}
              onNavigateToKb={() => setCurrentRoute('help')}
            />
          )}

          {currentRoute === 'ticket_detail' && selectedTicketId && currentUser && (
            <TicketDetail
              ticketId={selectedTicketId}
              currentUser={currentUser}
              onBack={() => {
                setSelectedTicketId(null);
                setCurrentRoute(currentUser.role === 'CUSTOMER' ? 'tickets' : 'admin_tickets');
              }}
              staffMembers={staffMembers}
            />
          )}

          {currentRoute === 'help' && (
            <KnowledgeBase
              articles={kbArticles}
              onNavigateToTicketCreate={() => setCurrentRoute('ticket_new')}
            />
          )}

          {currentRoute === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onSelectTicket={handleSelectTicket}
            />
          )}

          {currentRoute === 'profile' && currentUser && (
            <UserProfile user={currentUser} onRefresh={fetchAuthUser} />
          )}

          {/* Admin / Staff Views */}
          {currentRoute === 'admin' && (
            <AdminOverview
              tickets={tickets}
              customers={usersList.filter((u) => u.role === 'CUSTOMER')}
              staff={staffMembers}
              onSelectTicket={handleSelectTicket}
              onNavigate={setCurrentRoute}
            />
          )}

          {currentRoute === 'admin_tickets' && currentUser && (
            <AdminTickets
              tickets={tickets}
              categories={categories}
              staff={staffMembers}
              currentUser={currentUser}
              onSelectTicket={handleSelectTicket}
              onRefresh={fetchAppData}
            />
          )}

          {currentRoute === 'admin_users' && (
            <AdminUsers
              users={usersList}
              tickets={tickets}
              currentUser={currentUser}
              onRefresh={fetchAppData}
              onSelectTicket={handleSelectTicket}
            />
          )}

          {currentRoute === 'admin_staff' && currentUser && (
            <AdminStaff
              staff={staffMembers}
              tickets={tickets}
              currentUser={currentUser}
              onRefresh={fetchAppData}
            />
          )}

          {currentRoute === 'admin_categories' && (
            <AdminCategories
              categories={categories}
              tickets={tickets}
              onRefresh={fetchAppData}
            />
          )}

          {currentRoute === 'admin_webhooks' && (
            <AdminWebhooks
              webhooks={webhooks}
              logs={webhookLogs}
              onRefresh={fetchAppData}
            />
          )}

          {currentRoute === 'admin_email' && (
            <AdminEmailSettings
              smtpConfig={smtpConfig}
              templates={emailTemplates}
              logs={emailLogs}
              onRefresh={fetchAppData}
            />
          )}

          {currentRoute === 'admin_sla' && (
            <AdminSlaSettings
              settings={
                slaSettings || {
                  urgent_response_hours: 1,
                  high_response_hours: 4,
                  medium_response_hours: 12,
                  low_response_hours: 24,
                  auto_escalate: true,
                  notify_discord_on_breach: true,
                  notify_email_on_breach: true,
                }
              }
              onRefresh={fetchAppData}
            />
          )}

          {currentRoute === 'admin_analytics' && (
            <AdminAnalytics
              tickets={tickets}
              staff={staffMembers}
              categories={categories}
            />
          )}

          {currentRoute === 'admin_audit' && (
            <AdminAuditLogs
              logs={auditLogs}
              onRefresh={fetchAppData}
            />
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authInitialMode}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
          if (user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'STAFF') {
            setCurrentRoute('admin');
          } else {
            setCurrentRoute('dashboard');
          }
          fetchAppData();
        }}
      />
    </div>
  );
}
