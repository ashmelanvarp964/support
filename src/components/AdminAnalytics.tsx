import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Award,
  Zap,
} from 'lucide-react';
import type { Ticket, User, Category } from '../types.ts';

interface AdminAnalyticsProps {
  tickets: Ticket[];
  staff: User[];
  categories: Category[];
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  tickets,
  staff,
  categories,
}) => {
  const totalTickets = tickets.length;
  const resolved = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const open = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const breaches = tickets.filter((t) => t.sla_breached).length;
  const slaCompliance = totalTickets > 0 ? Math.round(((totalTickets - breaches) / totalTickets) * 100) : 100;

  // Status distribution
  const statusCounts = {
    OPEN: tickets.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    WAITING: tickets.filter((t) => t.status === 'WAITING_FOR_CUSTOMER').length,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter((t) => t.status === 'CLOSED').length,
  };

  // Priority distribution
  const priorityCounts = {
    URGENT: tickets.filter((t) => t.priority === 'URGENT').length,
    HIGH: tickets.filter((t) => t.priority === 'HIGH').length,
    MEDIUM: tickets.filter((t) => t.priority === 'MEDIUM').length,
    LOW: tickets.filter((t) => t.priority === 'LOW').length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800">
            METRICS & KPIS
          </span>
          <span className="text-xs text-slate-400">Operational performance & capacity metrics</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
          Hosting Support Intelligence
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>SLA Compliance</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-400 font-['Outfit']">{slaCompliance}%</div>
          <div className="mt-1 text-[11px] text-slate-400">{breaches} total breaches recorded</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Resolution Rate</span>
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-3xl font-bold text-white font-['Outfit']">
            {totalTickets > 0 ? Math.round((resolved / totalTickets) * 100) : 0}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{resolved} of {totalTickets} tickets resolved</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Avg 1st Response</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-3xl font-bold text-cyan-300 font-['Outfit']">14m</div>
          <div className="mt-1 text-[11px] text-slate-400">Well inside 1h urgent SLA</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Active Engineers</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-bold text-white font-['Outfit']">{staff.length}</div>
          <div className="mt-1 text-[11px] text-slate-400">Available across all shifts</div>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Status Breakdown */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tickets by Status
          </h3>
          <div className="space-y-2 text-xs">
            {Object.entries(statusCounts).map(([st, count]) => {
              const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
              return (
                <div key={st} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">{st.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tickets by Priority
          </h3>
          <div className="space-y-2 text-xs">
            {Object.entries(priorityCounts).map(([pr, count]) => {
              const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
              let barColor = 'bg-cyan-500';
              if (pr === 'URGENT') barColor = 'bg-rose-500';
              if (pr === 'HIGH') barColor = 'bg-amber-500';

              return (
                <div key={pr} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">{pr}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Workload */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Staff Workload Allocation
          </h3>
          <div className="space-y-3 text-xs">
            {staff.map((s) => {
              const assigned = tickets.filter((t) => t.assigned_to === s.id);
              const resolvedByStaff = assigned.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

              return (
                <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <img src={s.avatar || '/logo.png'} alt={s.name} className="h-6 w-6 rounded-full object-cover" />
                      <span className="font-semibold text-slate-200">{s.name}</span>
                    </div>
                    <span className="font-mono text-cyan-400 font-bold">{assigned.length} assigned</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{resolvedByStaff} resolved</span>
                    <span className="text-emerald-400">100% SLA target</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
