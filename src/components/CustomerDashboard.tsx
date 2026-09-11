import React from 'react';
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  Inbox,
  PlusCircle,
  ArrowUpRight,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  Shield,
  Server,
  Zap,
} from 'lucide-react';
import type { Ticket, User, KnowledgeArticle } from '../types.ts';

interface CustomerDashboardProps {
  user: User;
  tickets: Ticket[];
  kbArticles: KnowledgeArticle[];
  onSelectTicket: (id: string) => void;
  onNavigate: (route: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  user,
  tickets,
  kbArticles,
  onSelectTicket,
  onNavigate,
}) => {
  const openCount = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const awaitingCount = tickets.filter((t) => t.status === 'WAITING_FOR_CUSTOMER').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const totalCount = tickets.length;

  const recentTickets = tickets.slice(0, 6);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'CLOSED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const formatStatus = (s: string) => {
    return s.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-amber-950/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-amber-400 tracking-wide uppercase">LumaCloud Support Portal</span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/30">Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Outfit']">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
              Track active investigations, request technical assistance, or contact our cloud operations engineers.
            </p>
          </div>

          <button
            id="dashboard-new-ticket-btn"
            onClick={() => onNavigate('ticket_new')}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Support Ticket</span>
          </button>
        </div>

        {/* Ambient Glow Graphic */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-amber-500/40 hover:bg-slate-900/70 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Tickets</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
              <Inbox className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-['Outfit']">{openCount}</span>
            <span className="text-xs text-slate-400">active</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Engineering Queue</span>
          </div>
        </div>

        {/* Awaiting Reply */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-amber-500/40 hover:bg-slate-900/70 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Awaiting Reply</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-['Outfit']">{awaitingCount}</span>
            <span className="text-xs text-slate-400">pending you</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400">
            <span>Requires your response</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-emerald-500/40 hover:bg-slate-900/70 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resolved</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-['Outfit']">{resolvedCount}</span>
            <span className="text-xs text-slate-400">closed</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400">
            <span>Issues resolved</span>
          </div>
        </div>

        {/* Total */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md transition-all hover:border-slate-700 hover:bg-slate-900/70 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 ring-1 ring-slate-700">
              <TicketIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-['Outfit']">{totalCount}</span>
            <span className="text-xs text-slate-400">history</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Lifetime requests</span>
          </div>
        </div>
      </div>

      {/* Recent Tickets Section */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-white font-['Outfit']">Recent Support Tickets</h2>
            <p className="text-xs text-slate-400">Review ticket updates, response status, and SLA timers</p>
          </div>
          <button
            onClick={() => onNavigate('tickets')}
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400 mb-3">
              <TicketIcon className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No active tickets</h3>
            <p className="text-xs text-slate-400 mt-1">
              Have a problem with your server, VPS, or billing? Our engineers are here to help.
            </p>
            <button
              onClick={() => onNavigate('ticket_new')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/20"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Submit First Ticket</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-3">Ticket ID</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {recentTickets.map((t) => (
                  <tr
                    key={t.id}
                    id={`ticket-row-${t.id}`}
                    onClick={() => onSelectTicket(t.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-amber-400 group-hover:text-amber-300">
                      {t.ticket_number}
                    </td>
                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="font-semibold text-slate-200 truncate group-hover:text-white">
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-sm">{t.description}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded-lg bg-slate-800/70 px-2 py-1 text-[11px] text-slate-300 border border-slate-700/50">
                        {t.category?.name || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                        {formatStatus(t.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(t.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helpful Quick Cards / Knowledge Base */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('help')}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 cursor-pointer hover:border-amber-500/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white group-hover:text-amber-300">Server & SSH Config</h3>
              <p className="text-[11px] text-slate-400">Configure SSH keys, security & firewall</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('help')}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 cursor-pointer hover:border-blue-500/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white group-hover:text-blue-300">Performance Tuning</h3>
              <p className="text-[11px] text-slate-400">Optimize server memory and thread allocation</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('help')}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 cursor-pointer hover:border-indigo-500/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white group-hover:text-indigo-300">Network & DDoS Info</h3>
              <p className="text-[11px] text-slate-400">Multi-terabit Anycast protection overview</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
