import React, { useState } from 'react';
import {
  Webhook,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Send,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { DiscordWebhook, WebhookLog } from '../types.ts';

interface AdminWebhooksProps {
  webhooks: DiscordWebhook[];
  logs: WebhookLog[];
  onRefresh: () => void;
}

const ALL_EVENTS = [
  { id: 'ticket_created', label: 'Ticket Created', desc: 'Dispatched when customer creates a new ticket' },
  { id: 'customer_registered', label: 'Customer Registered', desc: 'Dispatched when new user registers' },
  { id: 'customer_reply', label: 'Customer Reply', desc: 'Dispatched when customer posts a response' },
  { id: 'staff_reply', label: 'Staff Reply', desc: 'Dispatched when support staff posts a public reply' },
  { id: 'ticket_assigned', label: 'Ticket Assigned', desc: 'Dispatched when ticket is assigned to a staff member' },
  { id: 'status_changed', label: 'Status Changed', desc: 'Dispatched when ticket status transitions' },
  { id: 'priority_changed', label: 'Priority Changed', desc: 'Dispatched when priority level changes' },
  { id: 'ticket_resolved', label: 'Ticket Resolved', desc: 'Dispatched when marked as resolved' },
  { id: 'ticket_closed', label: 'Ticket Closed', desc: 'Dispatched when permanently closed' },
  { id: 'attachment_uploaded', label: 'Attachment Uploaded', desc: 'Dispatched when files/logs are attached' },
  { id: 'sla_breached', label: 'SLA Breached', desc: 'Urgent notification when SLA deadline expires' },
];

export const AdminWebhooks: React.FC<AdminWebhooksProps> = ({
  webhooks,
  logs,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [testStatus, setTestStatus] = useState<{ id: string; success: boolean; msg: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('LumaCloud Discord Alerts');
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(ALL_EVENTS.map((e) => e.id));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleEvent = (id: string) => {
    if (selectedEvents.includes(id)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== id));
    } else {
      setSelectedEvents([...selectedEvents, id]);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://discord.com/api/webhooks/')) {
      setFormError('Invalid Discord webhook URL. Must begin with https://discord.com/api/webhooks/...');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url,
          enabled,
          events: selectedEvents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create webhook');

      setShowAddModal(false);
      setUrl('');
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Error creating webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    setTestStatus(null);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestStatus({
        id,
        success: res.ok,
        msg: res.ok ? 'Discord test embed received successfully!' : (data.error || 'Test failed'),
      });
      onRefresh();
    } catch (err: any) {
      setTestStatus({ id, success: false, msg: err.message || 'Webhook test connection failed' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to remove this Discord webhook?')) return;
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const maskUrl = (raw: string) => {
    if (!raw) return '';
    const parts = raw.split('/');
    if (parts.length < 2) return raw;
    const end = parts[parts.length - 1];
    return raw.replace(end, '••••••••••••••••••••');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-800">
              DISCORD INTEGRATION
            </span>
            <span className="text-xs text-slate-400">Automated staff notification webhooks</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Discord Webhook Orchestrator
          </h1>
        </div>

        <button
          id="add-discord-webhook-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Discord Webhook</span>
        </button>
      </div>

      {/* Webhooks Cards List */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <Webhook className="h-10 w-10 text-slate-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No Discord webhooks configured</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your staff channel webhook to dispatch real-time alerts for customer inquiries and SLA breaches.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              Add First Webhook
            </button>
          </div>
        ) : (
          webhooks.map((wh) => (
            <div
              key={wh.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40">
                    <Webhook className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{wh.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {maskUrl(wh.url)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      wh.enabled
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {wh.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>

                  <button
                    id={`test-webhook-btn-${wh.id}`}
                    onClick={() => handleTestWebhook(wh.id)}
                    disabled={testingId === wh.id}
                    className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    <span>{testingId === wh.id ? 'Sending...' : 'Test Webhook'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:border-rose-500 hover:text-rose-400 transition-colors"
                    title="Delete webhook"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {testStatus && testStatus.id === wh.id && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                    testStatus.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {testStatus.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <span>{testStatus.msg}</span>
                </div>
              )}

              {/* Subscribed Events Pills */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Subscribed Events ({wh.events.length} of {ALL_EVENTS.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {wh.events.map((evt) => (
                    <span
                      key={evt}
                      className="rounded-lg bg-slate-800/80 px-2 py-1 text-[10px] font-mono text-cyan-300 border border-slate-700/60"
                    >
                      {evt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Webhook Delivery Logs Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white font-['Outfit']">Webhook Delivery Audit Logs</h2>
            <p className="text-xs text-slate-400">Chronological history of HTTP payloads delivered to Discord</p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">Event Type</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">HTTP Code</th>
                <th className="py-3 px-3">Response</th>
                <th className="py-3 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {logs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-cyan-300 font-sans font-medium">{log.event_type}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        log.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{log.http_status_code || 204}</td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{log.response_body || 'No content (204)'}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Webhook Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white font-['Outfit']">Add Discord Webhook</h2>

            {formError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateWebhook} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Webhook Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Support Alerts Channel"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Discord Webhook URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/123456789/abcdef..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Trigger Events</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-900/40">
                  {ALL_EVENTS.map((evt) => {
                    const checked = selectedEvents.includes(evt.id);
                    return (
                      <label
                        key={evt.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(evt.id)}
                          className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <span className="font-semibold text-slate-200">{evt.label}</span>
                          <p className="text-[10px] text-slate-500">{evt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                >
                  {saving ? 'Creating...' : 'Save Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
