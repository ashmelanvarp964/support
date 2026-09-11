import React, { useState } from 'react';
import {
  FileClock,
  Search,
  RefreshCw,
  Shield,
  Filter,
} from 'lucide-react';
import type { AuditLog } from '../types.ts';

interface AdminAuditLogsProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({
  logs,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filtered = logs.filter((l) => {
    const matchSearch =
      !search.trim() ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase()) ||
      l.ip_address?.includes(search);

    const matchAction = actionFilter === 'ALL' || l.action.startsWith(actionFilter);
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
              AUDIT TRAIL
            </span>
            <span className="text-xs text-slate-400">SOC-2 immutable operational event log</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Security & System Audit Logs
          </h1>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, email, IP address, or details..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
        >
          <option value="ALL">All Event Types</option>
          <option value="TICKET_">Ticket Events</option>
          <option value="AUTH_">Auth Events</option>
          <option value="WEBHOOK_">Webhook Events</option>
          <option value="SLA_">SLA Events</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] font-sans font-semibold">
              <th className="py-3 px-3">Action</th>
              <th className="py-3 px-3">Actor</th>
              <th className="py-3 px-3">Entity</th>
              <th className="py-3 px-3">IP Address</th>
              <th className="py-3 px-3">Details</th>
              <th className="py-3 px-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filtered.slice(0, 50).map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/30">
                <td className="py-3 px-3">
                  <span className="rounded bg-cyan-950/80 px-2 py-0.5 text-cyan-300 border border-cyan-800/60 text-[10px] font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-3 font-sans">
                  <div className="text-slate-200 text-xs">{log.user_email || 'System'}</div>
                </td>
                <td className="py-3 px-3 text-slate-400 text-[11px]">
                  {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                </td>
                <td className="py-3 px-3 text-slate-400 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                <td className="py-3 px-3 text-slate-300 font-sans max-w-sm truncate text-xs">
                  {log.details}
                </td>
                <td className="py-3 px-3 text-right text-slate-500 text-[11px]">
                  {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
