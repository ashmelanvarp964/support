import React, { useState } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Send,
  Lock,
  Save,
  RefreshCw,
  Sliders,
  FileCode,
  Eye,
  Info,
} from 'lucide-react';
import type { SmtpConfig, EmailTemplate, EmailLog } from '../types.ts';

interface AdminEmailSettingsProps {
  smtpConfig: SmtpConfig | null;
  templates: EmailTemplate[];
  logs: EmailLog[];
  onRefresh: () => void;
}

export const AdminEmailSettings: React.FC<AdminEmailSettingsProps> = ({
  smtpConfig,
  templates,
  logs,
  onRefresh,
}) => {
  const [host, setHost] = useState(smtpConfig?.host || 'smtp.lumacloud.xyz');
  const [port, setPort] = useState(smtpConfig?.port || 587);
  const [username, setUsername] = useState(smtpConfig?.username || 'support@lumacloud.xyz');
  const [password, setPassword] = useState(smtpConfig?.password || '••••••••••••');
  const [encryption, setEncryption] = useState<'NONE' | 'SSL' | 'STARTTLS'>(smtpConfig?.encryption || 'STARTTLS');
  const [fromName, setFromName] = useState(smtpConfig?.from_name || 'LumaCloud Support');
  const [fromEmail, setFromEmail] = useState(smtpConfig?.from_email || 'support@lumacloud.xyz');
  const [replyTo, setReplyTo] = useState(smtpConfig?.reply_to || 'support@lumacloud.xyz');

  const [testEmail, setTestEmail] = useState('admin@lumacloud.xyz');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Template editor
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(templates[0] || null);
  const [templateSubject, setTemplateSubject] = useState(templates[0]?.subject || '');
  const [templateBody, setTemplateBody] = useState(templates[0]?.body_html || '');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number(port),
          username,
          password,
          encryption,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestSmtp = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_email: testEmail }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        msg: data.message || (data.success ? 'SMTP connection test passed!' : 'SMTP connection failed'),
      });
      onRefresh();
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || 'Network error testing SMTP' });
    } finally {
      setTesting(false);
    }
  };

  const handleSelectTemplate = (tmpl: EmailTemplate) => {
    setSelectedTemplate(tmpl);
    setTemplateSubject(tmpl.subject);
    setTemplateBody(tmpl.body_html);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: templateSubject,
          body_html: templateBody,
        }),
      });
      if (res.ok) {
        alert('Template saved successfully');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800">
              COMMUNICATIONS
            </span>
            <span className="text-xs text-slate-400">SMTP Relay, TLS Encryption & Notification Templates</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Email & SMTP Architecture
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SMTP Service Ready</span>
          </div>
        </div>
      </div>

      {/* Grid: Left SMTP Configuration, Right Connection Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SMTP Form (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white font-['Outfit']">SMTP Server Credentials</h2>
            <span className="text-[11px] text-slate-400">RFC 5321 compliant relay</span>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>SMTP credentials updated successfully</span>
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">SMTP Host</label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Port</label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Username / Auth User</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Encryption Mode</label>
              <select
                value={encryption}
                onChange={(e: any) => setEncryption(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="STARTTLS">STARTTLS (Port 587 recommended)</option>
                <option value="SSL">SSL / TLS (Port 465)</option>
                <option value="NONE">None / Plain (Port 25)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">From Sender Name</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">From Email Address</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Reply-To Address</label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 shadow-lg shadow-cyan-600/20"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Test Panel (1 col) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Send className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-['Outfit']">Dispatch SMTP Ping</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Verify your mail exchanger credentials and firewall egress by sending a test diagnostic email.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Test Recipient Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testing ? 'Connecting to SMTP...' : 'Dispatch Test Email'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs border ${
                  testResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Info className="h-3.5 w-3.5 text-cyan-400" />
              <span>TLS Security Note</span>
            </div>
            <p>Ensure outbound port 587 or 465 is open in your cloud VPC network security groups.</p>
          </div>
        </div>
      </div>

      {/* Email Templates Manager */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white font-['Outfit']">
              Notification Email Templates ({templates.length})
            </h2>
            <p className="text-xs text-slate-400">
              Customize automated notification copy and variable tags for customer & staff events
            </p>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400">Variables available:</span>
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">{'{{user_name}}'}</code>
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">{'{{ticket_id}}'}</code>
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">{'{{ticket_url}}'}</code>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selection List */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {templates.map((t) => {
              const active = selectedTemplate?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-left rounded-xl p-3 text-xs transition-all ${
                    active
                      ? 'border border-cyan-500/40 bg-cyan-950/30 text-cyan-200'
                      : 'border border-slate-800/80 bg-slate-950/60 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{t.subject}</div>
                </button>
              );
            })}
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-2 space-y-4 text-xs">
            {selectedTemplate && (
              <>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">HTML Body Content</label>
                  <textarea
                    rows={8}
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-white font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Template: <code className="text-cyan-400">{selectedTemplate.template_key}</code>
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingTemplate ? 'Saving...' : 'Save Template'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sent Email History Logs */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white font-['Outfit']">Mail Relay Audit History</h2>
            <p className="text-xs text-slate-400">Log of outbound notifications dispatched to customers and engineers</p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] font-sans font-semibold">
                <th className="py-3 px-3">Recipient</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Template</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {logs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-slate-200">{log.recipient}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs truncate">{log.subject}</td>
                  <td className="py-2.5 px-3 text-cyan-400">{log.template_key}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        log.status === 'SENT' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
