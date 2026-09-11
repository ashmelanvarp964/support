import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Ban,
  ShieldCheck,
  RefreshCw,
  UserCog,
  Check,
} from 'lucide-react';
import type { User as UserType, Ticket as TicketType, UserRole } from '../types.ts';

interface AdminUsersProps {
  users: UserType[];
  tickets: TicketType[];
  currentUser?: UserType | null;
  onRefresh: () => void;
  onSelectTicket?: (id: string) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({
  users,
  tickets,
  currentUser,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'OWNER'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleSuccessMsg, setRoleSuccessMsg] = useState<string | null>(null);

  const isOwner = currentUser?.role === 'OWNER';

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (user: UserType, newRole: UserRole) => {
    if (user.role === 'OWNER' || user.email === 'support@lumacloud.xyz') {
      alert('The primary Owner account cannot have its role modified.');
      return;
    }

    if (!confirm(`Are you sure you want to change ${user.name}'s role from ${user.role} to ${newRole}?`)) {
      return;
    }

    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoleSuccessMsg(`Updated ${user.name} to ${newRole}`);
        setTimeout(() => setRoleSuccessMsg(null), 3000);
        onRefresh();
      } else {
        alert(data.error || 'Failed to update user role');
      }
    } catch (err: any) {
      alert(err.message || 'Network error updating user role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSuspend = async (user: UserType) => {
    if (user.role === 'OWNER') {
      alert('The Owner account cannot be suspended.');
      return;
    }
    const newStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    if (!confirm(`Are you sure you want to change ${user.name}'s status to ${newStatus}?`)) return;

    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
              USER ROSTER & PERMISSIONS
            </span>
            <span className="text-xs text-slate-400">Manage user accounts and assign staff/admin roles</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            User Directory ({users.length})
          </h1>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {roleSuccessMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{roleSuccessMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="admin-users-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by full name or email address..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'CUSTOMER', 'STAFF', 'ADMIN', 'OWNER'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3">User</th>
              <th className="py-3 px-3">Assigned Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Email Verified</th>
              <th className="py-3 px-3">Tickets</th>
              <th className="py-3 px-3">Registered On</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filteredUsers.map((u) => {
              const userTickets = tickets.filter((t) => t.customer_id === u.id || t.user_id === u.id);
              const isSuspended = u.status === 'SUSPENDED';
              const isPrimaryOwner = u.role === 'OWNER' || u.email === 'support@lumacloud.xyz';

              return (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar || '/logo.png'}
                        alt={u.name}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700"
                      />
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isPrimaryOwner && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                              Primary Owner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role Assignment */}
                  <td className="py-3.5 px-3">
                    {isPrimaryOwner ? (
                      <span className="inline-flex items-center gap-1 rounded bg-purple-950 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-800">
                        OWNER
                      </span>
                    ) : isOwner ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={u.role}
                          disabled={actionLoading === u.id}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="CUSTOMER">CUSTOMER (Client)</option>
                          <option value="STAFF">STAFF (Support Agent)</option>
                          <option value="ADMIN">ADMIN (Administrator)</option>
                        </select>
                      </div>
                    ) : (
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : u.role === 'STAFF'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        isSuspended
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    {u.email_verified ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Unverified</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 font-mono">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                      {userTickets.length} tickets
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(u.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>

                  <td className="py-3.5 px-3 text-right">
                    {!isPrimaryOwner && (
                      <button
                        onClick={() => handleToggleSuspend(u)}
                        disabled={actionLoading === u.id}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                          isSuspended
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                        }`}
                      >
                        <Ban className="h-3 w-3" />
                        <span>{isSuspended ? 'Reactivate' : 'Suspend'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Users className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs">No users found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};
