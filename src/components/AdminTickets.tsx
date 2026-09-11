import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Ticket as TicketIcon,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import type { Ticket, User as UserType, Category } from '../types.ts';

interface AdminTicketsProps {
  tickets: Ticket[];
  categories: Category[];
  staff: UserType[];
  currentUser: UserType;
  onSelectTicket: (id: string) => void;
  onRefresh: () => void;
}

export const AdminTickets: React.FC<AdminTicketsProps> = ({
  tickets,
  categories,
  staff,
  currentUser,
  onSelectTicket,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        !search.trim() ||
        t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        t.customer?.email.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
      const matchCategory = categoryFilter === 'ALL' || t.category_id === categoryFilter;

      let matchAssignee = true;
      if (assigneeFilter === 'UNASSIGNED') matchAssignee = !t.assigned_to;
      else if (assigneeFilter === 'ME') matchAssignee = t.assigned_to === currentUser.id;
      else if (assigneeFilter !== 'ALL') matchAssignee = t.assigned_to === assigneeFilter;

      return matchSearch && matchStatus && matchPriority && matchCategory && matchAssignee;
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter, assigneeFilter, currentUser]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'CLOSED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Master Ticket Queue
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage incoming inquiries, assign engineering staff, and monitor response SLAs.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl shadow-lg space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="admin-ticket-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket #LC-..., client name, email, or subject keyword..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Assignee
            </label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500"
            >
              <option value="ALL">All Staff</option>
              <option value="ME">Assigned to Me</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between pb-3 text-xs text-slate-400 border-b border-slate-800">
          <span>Showing <b>{filteredTickets.length}</b> of {tickets.length} tickets</span>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No tickets match your filter criteria.
          </div>
        ) : (
          <table className="w-full text-left text-xs mt-2">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Ticket ID</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Assignee</th>
                <th className="py-3 px-3">SLA Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredTickets.map((t) => {
                const isBreached = t.sla_breached;
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">
                      {t.ticket_number}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-200">{t.customer?.name}</div>
                      <div className="text-[10px] text-slate-500">{t.customer?.email}</div>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="font-semibold text-slate-200 truncate group-hover:text-cyan-300">
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700/60">
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
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {t.assigned_staff ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={t.assigned_staff.avatar || '/logo.png'}
                            alt={t.assigned_staff.name}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                          <span className="text-slate-300">{t.assigned_staff.name}</span>
                        </div>
                      ) : (
                        <span className="text-amber-400 font-mono text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      {isBreached ? (
                        <span className="flex items-center gap-1 text-rose-400 text-[10px] font-bold">
                          <AlertTriangle className="h-3 w-3" /> SLA BREACHED
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px]">Within SLA</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 group-hover:border-cyan-500 group-hover:text-cyan-300">
                        <span>Open</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
