import React, { useState } from 'react';
import {
  UserCheck,
  PlusCircle,
  Shield,
  Key,
  CheckCircle2,
  Trash2,
  Lock,
  RefreshCw,
  Edit,
  Sliders,
} from 'lucide-react';
import type { User as UserType, Ticket, StaffPermissions } from '../types.ts';

interface AdminStaffProps {
  staff: UserType[];
  tickets: Ticket[];
  currentUser: UserType;
  onRefresh: () => void;
}

const DEFAULT_PERMISSIONS: StaffPermissions = {
  can_assign: true,
  can_resolve: true,
  can_close: true,
  can_reopen: true,
  can_edit_internal_notes: true,
  can_manage_staff: false,
  can_view_audit_logs: false,
};

export const AdminStaff: React.FC<AdminStaffProps> = ({
  staff,
  tickets,
  currentUser,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserType | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [permissions, setPermissions] = useState<StaffPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnerOrAdmin = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          permissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create staff member');

      setShowAddModal(false);
      setName('');
      setEmail('');
      setPassword('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error creating staff');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/${editingStaff.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      if (res.ok) {
        setEditingStaff(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'ADMIN':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      default:
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-purple-950 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-800">
              STAFF COMMAND
            </span>
            <span className="text-xs text-slate-400">Team roles, assignments, and ticket handling rights</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Support Engineering Staff ({staff.length})
          </h1>
        </div>

        {isOwnerOrAdmin && (
          <button
            id="create-staff-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Staff Member</span>
          </button>
        )}
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((s) => {
          const assignedTickets = tickets.filter((t) => t.assigned_to === s.id && t.status !== 'CLOSED');

          return (
            <div
              key={s.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={s.avatar || '/logo.png'}
                      alt={s.name}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-cyan-500/30"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white">{s.name}</h3>
                      <p className="text-[11px] text-slate-400">{s.email}</p>
                    </div>
                  </div>

                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${getRoleBadge(s.role)}`}>
                    {s.role}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-950/60 p-2.5">
                    <span className="text-[10px] text-slate-400 block">Active Tickets</span>
                    <span className="text-base font-bold text-cyan-300 font-mono">
                      {assignedTickets.length}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 p-2.5">
                    <span className="text-[10px] text-slate-400 block">SLA Compliance</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">100%</span>
                  </div>
                </div>

                {/* Permissions summary */}
                <div className="mt-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Permissions:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.permissions &&
                      Object.entries(s.permissions)
                        .filter(([_, allowed]) => allowed)
                        .map(([perm]) => (
                          <span
                            key={perm}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-300"
                          >
                            {perm.replace('can_', '')}
                          </span>
                        ))}
                  </div>
                </div>
              </div>

              {isOwnerOrAdmin && s.role !== 'OWNER' && (
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setEditingStaff(s);
                      setPermissions(s.permissions || DEFAULT_PERMISSIONS);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500 hover:text-cyan-300 transition-colors"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Edit Permissions</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white font-['Outfit']">Create Support Staff</h2>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@lumacloud.xyz"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role Designation</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white"
                >
                  <option value="STAFF">STAFF (Support Agent)</option>
                  <option value="ADMIN">ADMIN (Full Management)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white font-['Outfit']">
              Permissions for {editingStaff.name}
            </h2>

            <form onSubmit={handleUpdatePermissions} className="space-y-3 text-xs">
              {Object.keys(DEFAULT_PERMISSIONS).map((k) => {
                const key = k as keyof StaffPermissions;
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
                  >
                    <span className="font-mono text-slate-300">{key.replace('can_', '').replace(/_/g, ' ')}</span>
                    <input
                      type="checkbox"
                      checked={!!permissions[key]}
                      onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                    />
                  </label>
                );
              })}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                >
                  {loading ? 'Updating...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
