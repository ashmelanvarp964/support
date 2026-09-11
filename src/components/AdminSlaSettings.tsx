import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Save,
  Shield,
  Bell,
  RefreshCw,
} from 'lucide-react';
import type { SlaSettings } from '../types.ts';

interface AdminSlaSettingsProps {
  settings: SlaSettings;
  onRefresh: () => void;
}

export const AdminSlaSettings: React.FC<AdminSlaSettingsProps> = ({
  settings,
  onRefresh,
}) => {
  const [urgentHours, setUrgentHours] = useState(settings?.urgent_response_hours ?? 1);
  const [highHours, setHighHours] = useState(settings?.high_response_hours ?? 4);
  const [mediumHours, setMediumHours] = useState(settings?.medium_response_hours ?? 12);
  const [lowHours, setLowHours] = useState(settings?.low_response_hours ?? 24);
  const [autoEscalate, setAutoEscalate] = useState(settings?.auto_escalate ?? true);
  const [discordAlert, setDiscordAlert] = useState(settings?.notify_discord_on_breach ?? true);
  const [emailAlert, setEmailAlert] = useState(settings?.notify_email_on_breach ?? true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/sla', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urgent_response_hours: Number(urgentHours),
          high_response_hours: Number(highHours),
          medium_response_hours: Number(mediumHours),
          low_response_hours: Number(lowHours),
          auto_escalate: autoEscalate,
          notify_discord_on_breach: discordAlert,
          notify_email_on_breach: emailAlert,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-800">
              SLA POLICIES
            </span>
            <span className="text-xs text-slate-400">Response time commitments & escalation triggers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Service Level Agreement Configuration
          </h1>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>SLA policies and breach response rules saved successfully</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Thresholds Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Clock className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white font-['Outfit']">
              Target Maximum First-Response Time
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/15 p-4">
              <label className="block text-rose-300 font-bold mb-1">
                URGENT Priority (Hours)
              </label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                required
                value={urgentHours}
                onChange={(e) => setUrgentHours(Number(e.target.value))}
                className="w-full rounded-xl border border-rose-500/40 bg-slate-950 px-3 py-2 text-white font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Production outage or critical network failure</span>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4">
              <label className="block text-amber-300 font-bold mb-1">
                HIGH Priority (Hours)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={highHours}
                onChange={(e) => setHighHours(Number(e.target.value))}
                className="w-full rounded-xl border border-amber-500/40 bg-slate-950 px-3 py-2 text-white font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Severe degradation or inaccessible services</span>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/15 p-4">
              <label className="block text-cyan-300 font-bold mb-1">
                MEDIUM Priority (Hours)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={mediumHours}
                onChange={(e) => setMediumHours(Number(e.target.value))}
                className="w-full rounded-xl border border-cyan-500/40 bg-slate-950 px-3 py-2 text-white font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">General hosting assistance and configurations</span>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
              <label className="block text-slate-300 font-bold mb-1">
                LOW Priority (Hours)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={lowHours}
                onChange={(e) => setLowHours(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">General questions, tips, and inquiries</span>
            </div>
          </div>
        </div>

        {/* Breach Action Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-['Outfit']">
              Automated Breach Actions & Notifications
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
              <div>
                <span className="font-semibold text-slate-200">Auto-Escalate Priority to URGENT</span>
                <p className="text-[11px] text-slate-400">
                  Automatically elevate ticket priority and ping active engineering tier on breach
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoEscalate}
                onChange={(e) => setAutoEscalate(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
              <div>
                <span className="font-semibold text-slate-200">Dispatch Discord Breach Webhook</span>
                <p className="text-[11px] text-slate-400">
                  Post high-priority embed alert into configured Discord staff channel
                </p>
              </div>
              <input
                type="checkbox"
                checked={discordAlert}
                onChange={(e) => setDiscordAlert(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
              <div>
                <span className="font-semibold text-slate-200">Send Admin Alert Email</span>
                <p className="text-[11px] text-slate-400">
                  Transmit SMTP notification to support management team
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailAlert}
                onChange={(e) => setEmailAlert(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 h-4 w-4"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-xs font-semibold text-white hover:bg-cyan-500 shadow-xl shadow-cyan-600/20"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Apply SLA Policy'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
