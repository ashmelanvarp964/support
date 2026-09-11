import React, { useState, useMemo } from 'react';
import {
  Ticket as TicketIcon,
  Search,
  PlusCircle,
  Clock,
  ChevronRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import type { Ticket, Category } from '../types.ts';

interface CustomerTicketsProps {
  tickets: Ticket[];
  categories: Category[];
  onSelectTicket: (id: string) => void;
  onNavigateToCreate: () => void;
}

export const CustomerTickets: React.FC<CustomerTicketsProps> = ({
  tickets,
  categories,
  onSelectTicket,
  onNavigateToCreate,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        !search.trim() ||
        t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchCat = categoryFilter === 'ALL' || t.category_id === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

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
            My Support Tickets ({tickets.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track inquiries, technical investigations, and chat with LumaCloud support engineers.
          </p>
        </div>

        <button
          onClick={onNavigateToCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket ID or subject..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_CUSTOMER">Waiting for Reply</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl overflow-x-auto">
        {filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No tickets match your search.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Ticket ID</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Last Updated</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredTickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">
                    {t.ticket_number}
                  </td>
                  <td className="py-3.5 px-3 max-w-xs">
                    <div className="font-semibold text-slate-200 truncate group-hover:text-cyan-300">
                      {t.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-sm">
                      {t.description}
                    </div>
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
                  <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(t.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 group-hover:border-cyan-500 group-hover:text-cyan-300">
                      <span>View</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
