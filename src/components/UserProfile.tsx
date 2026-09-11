import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
  KeyRound,
  Calendar,
} from 'lucide-react';
import type { User as UserType } from '../types.ts';

interface UserProfileProps {
  user: UserType;
  onRefresh: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onRefresh }) => {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', msg: 'New password and confirmation do not match' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setStatusMsg({ type: 'success', msg: 'Profile updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', msg: err.message || 'Profile update failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
          Profile & Account Security
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage personal credentials, role permissions, and authentication security.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
            statusMsg.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMsg.msg}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={user.avatar || '/logo.png'}
            alt={user.name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-cyan-500/40"
          />
          <div>
            <h2 className="text-lg font-bold text-white font-['Outfit']">{user.name}</h2>
            <p className="text-xs text-slate-400">{user.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800">
                {user.role}
              </span>
              {user.email_verified && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Verified Email
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 sm:text-right font-mono">
          <div>Member ID: #{user.id.slice(0, 8)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Joined {new Date(user.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white font-['Outfit'] border-b border-slate-800 pb-3">
            Account Details
          </h3>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-400 text-xs cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Email addresses cannot be changed directly for fraud prevention reasons.
            </span>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white font-['Outfit'] border-b border-slate-800 pb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-cyan-400" />
            <span>Update Password (Leave blank to keep current)</span>
          </h3>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">New Password</label>
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 shadow-xl shadow-cyan-600/25"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
