import React from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Server,
  Zap,
} from 'lucide-react';
import type { Ticket, User } from '../types.ts';

interface AdminOverviewProps {
  tickets: Ticket[];
  customers: User[];
  staff: User[];
  onSelectTicket: (id: string) => void;
  onNavigate: (route: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  tickets,
  customers,
  staff,
  onSelectTicket,
  onNavigate,
}) => {
  const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const unassignedTickets = tickets.filter((t) => !t.assigned_to && t.status !== 'CLOSED' && t.status !== 'RESOLVED');
  const slaBreachedTickets = tickets.filter((t) => t.sla_breached && t.status !== 'CLOSED' && t.status !== 'RESOLVED');
  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');

  // Category counts
  const categoryCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const catName = t.category?.name || 'General';
    categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-purple-950 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-800">
              STAFF COMMAND CENTER
            </span>
            <span className="text-xs text-slate-400">Real-time Operations & Incident Management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Support & SLA Overview
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('admin_tickets')}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-cyan-500 transition-all"
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Open Ticket Queue</span>
          </button>
          <button
            onClick={() => onNavigate('admin_webhooks')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600"
          >
            <span>Discord Webhooks</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Queue */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Queue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
              <Inbox className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-white font-['Outfit']">{openTickets.length}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Requires action</span>
            <span className="text-cyan-400 font-semibold">{tickets.length} total</span>
          </div>
        </div>

        {/* Unassigned */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unassigned</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-300 font-['Outfit']">{unassignedTickets.length}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Needs staff assignment</span>
            <span className="text-amber-400 font-medium">Pending</span>
          </div>
        </div>

        {/* SLA Breaches */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">SLA Breaches</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-rose-300 font-['Outfit']">{slaBreachedTickets.length}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Overdue target response</span>
            <span className={slaBreachedTickets.length > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {slaBreachedTickets.length > 0 ? 'Action Needed' : 'Normal'}
            </span>
          </div>
        </div>

        {/* Resolved Total */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resolved Today</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-300 font-['Outfit']">{resolvedTickets.length}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Client satisfaction 98%</span>
            <span className="text-emerald-400 font-semibold">14m avg</span>
          </div>
        </div>
      </div>

      {/* Main Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent & Unassigned Attention Queue (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white font-['Outfit']">Priority & Unassigned Attention Queue</h2>
              <p className="text-xs text-slate-400">Requires prompt response or assignment</p>
            </div>
            <button
              onClick={() => onNavigate('admin_tickets')}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              View All Tickets
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-800/60">
            {openTickets.slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-800/40 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-cyan-400">{t.ticket_number}</span>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 line-clamp-1">{t.subject}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>Customer: {t.customer?.name}</span>
                      <span>•</span>
                      <span>Category: {t.category?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                      t.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {t.priority}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: Category Breakdown & Staff Capacity */}
        <div className="space-y-6">
          {/* Categories card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Distribution by Hosting Service
            </h3>
            <div className="space-y-2">
              {Object.entries(categoryCounts).map(([name, count]) => {
                const percent = Math.round((count / (tickets.length || 1)) * 100);
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{name}</span>
                      <span className="font-mono text-slate-400">{count} ({percent}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Staff Members */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Staff on Duty ({staff.length})
              </h3>
              <button
                onClick={() => onNavigate('admin_staff')}
                className="text-[11px] text-purple-400 hover:underline"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={s.avatar || '/logo.png'}
                      alt={s.name}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-700"
                    />
                    <span className="text-slate-200 font-medium">{s.name}</span>
                  </div>
                  <span className="rounded bg-purple-950 px-1.5 py-0.5 text-[9px] font-bold text-purple-300 border border-purple-800">
                    {s.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
