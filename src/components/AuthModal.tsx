import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { User as UserType } from '../types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType, token: string) => void;
  initialMode?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states - pure manual email and password inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccessMsg('Welcome to LumaCloud! Your account has been successfully created.');
      setTimeout(() => {
        onSuccess(data.user, data.token);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSuccessMsg(data.message || 'Reset link dispatched.');
    } catch (err: any) {
      setError(err.message || 'Error requesting password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      setSuccessMsg(data.message);
      setTimeout(() => setMode('login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600/30 via-orange-500/20 to-blue-500/10 p-2 ring-1 ring-amber-500/40 shadow-xl shadow-amber-500/15 mb-3">
            <img src="/logo.png" alt="LumaCloud" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create Customer Account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Set new password'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {mode === 'login' && 'Sign in to access your support tickets, service incidents, and cloud nodes.'}
            {mode === 'register' && 'Create your account to submit tickets and track customer complaints.'}
            {mode === 'forgot' && 'Enter your registered email to receive a secure recovery link.'}
            {mode === 'reset' && 'Choose a strong new password for your account.'}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode('forgot');
                  }}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-9 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In to Support</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setMode('register');
                }}
                className="font-semibold text-amber-400 hover:underline"
              >
                Create one now
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="register-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Miller"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="register-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password (min 8 chars)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="register-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-9 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="register-confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              id="submit-register-btn"
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <span>Creating Account...</span> : <span>Create Account</span>}
            </button>

            <div className="pt-2 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setMode('login');
                }}
                className="font-semibold text-amber-400 hover:underline"
              >
                Log In
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
            >
              {loading ? 'Sending link...' : 'Send Password Reset Link'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
