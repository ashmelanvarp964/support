import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  Shield,
  User,
  Paperclip,
  Send,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Smile,
  ChevronDown,
  RefreshCw,
  XCircle,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
import type { Ticket, Message, Attachment, TimelineEvent, User as UserType } from '../types.ts';

interface TicketDetailProps {
  ticketId: string;
  currentUser: UserType;
  onBack: () => void;
  staffMembers?: any[];
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  currentUser,
  onBack,
  staffMembers = [],
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer states
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newAttachments, setNewAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Staff control states
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStaff = currentUser.role === 'STAFF' || currentUser.role === 'ADMIN' || currentUser.role === 'OWNER';

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load ticket');
      setTicket(data.ticket);
      setMessages(data.messages);
      setAttachments(data.attachments);
      setTimeline(data.timeline);
    } catch (err: any) {
      setError(err.message || 'Error loading ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 6000); // Polling sync
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, timeline]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          is_internal: isStaff && isInternal,
          attachments: newAttachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');

      setReplyText('');
      setNewAttachments([]);
      setIsInternal(false);
      await fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Could not send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setShowStatusMenu(false);
      await fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update priority');
      setShowPriorityMenu(false);
      await fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Priority update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: staffId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign staff');
      setShowAssignMenu(false);
      await fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          setNewAttachments((prev) => [...prev, data.attachment]);
        }
      } catch (err) {
        console.error('File upload error', err);
      }
    }
    setIsUploading(false);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading conversation history...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white">Unable to view ticket</h3>
        <p className="text-xs text-rose-300 mt-1">{error || 'Ticket not found or access restricted.'}</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          Back to Ticket List
        </button>
      </div>
    );
  }

  // Calculate SLA Remaining
  let slaRemainingText = 'No SLA limit';
  let isSlaBreached = ticket.sla_breached;
  if (ticket.sla_deadline) {
    const diffMs = new Date(ticket.sla_deadline).getTime() - Date.now();
    if (diffMs <= 0 || ticket.sla_breached) {
      isSlaBreached = true;
      slaRemainingText = 'SLA BREACHED';
    } else {
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      slaRemainingText = `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m remaining`;
    }
  }

  // Combine messages & timeline into ordered stream
  const conversationItems = [
    ...messages.map((m) => ({ type: 'message' as const, data: m, date: new Date(m.created_at).getTime() })),
    ...timeline.map((t) => ({ type: 'timeline' as const, data: t, date: new Date(t.created_at).getTime() })),
  ].sort((a, b) => a.date - b.date);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-6xl mx-auto pb-4">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 backdrop-blur-xl shadow-xl shrink-0 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-cyan-400">{ticket.ticket_number}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                  {ticket.category?.name || 'General Support'}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                    ticket.priority === 'URGENT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : ticket.priority === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {ticket.priority}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white mt-0.5 line-clamp-1">{ticket.subject}</h1>
            </div>
          </div>

          {/* Right Status & SLA */}
          <div className="flex items-center gap-3">
            {/* SLA Badge */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-medium border ${
                isSlaBreached
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                  : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{slaRemainingText}</span>
            </div>

            {/* Status Badge */}
            <div className="rounded-xl bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 border border-slate-700">
              {ticket.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Staff Action Controls (if Staff / Admin / Owner) */}
        {isStaff && (
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Staff Controls:</span>

              {/* Status Selector */}
              <div className="relative">
                <button
                  id="ticket-status-btn"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:border-cyan-500/40"
                >
                  <span>Status: <b>{ticket.status.replace(/_/g, ' ')}</b></span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {showStatusMenu && (
                  <div className="absolute left-0 mt-1 w-44 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl z-40">
                    {['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:border-cyan-500/40"
                >
                  <span>Priority: <b>{ticket.priority}</b></span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {showPriorityMenu && (
                  <div className="absolute left-0 mt-1 w-32 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl z-40">
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((pr) => (
                      <button
                        key={pr}
                        onClick={() => handlePriorityChange(pr)}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
                      >
                        {pr}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignee Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowAssignMenu(!showAssignMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:border-cyan-500/40"
                >
                  <UserCheck className="h-3 w-3 text-cyan-400" />
                  <span>Assigned: <b>{ticket.assigned_staff?.name || 'Unassigned'}</b></span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {showAssignMenu && (
                  <div className="absolute left-0 mt-1 w-48 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl z-40">
                    <button
                      onClick={() => handleAssignStaff('')}
                      className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Unassigned
                    </button>
                    {staffMembers.map((stf) => (
                      <button
                        key={stf.id}
                        onClick={() => handleAssignStaff(stf.id)}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-300 truncate"
                      >
                        {stf.name} ({stf.role})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              {ticket.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleStatusChange('RESOLVED')}
                  disabled={actionLoading}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Resolved</span>
                </button>
              )}
              {ticket.status !== 'CLOSED' && (
                <button
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={actionLoading}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-750"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Close Ticket</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 sm:p-6 space-y-4 shadow-inner">
        {/* Initial Customer Info Banner */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-cyan-400" />
            <span>Customer: <b className="text-white">{ticket.customer?.name}</b> ({ticket.customer?.email})</span>
          </div>
          <span className="font-mono text-[11px]">
            Created: {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>

        {/* Message and Timeline items */}
        {conversationItems.map((item, idx) => {
          if (item.type === 'timeline') {
            const tl = item.data as TimelineEvent;
            return (
              <div key={`tl_${idx}`} className="flex items-center justify-center my-2">
                <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1 text-[11px] text-slate-400 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>{tl.details}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(tl.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          }

          const msg = item.data as Message;
          const isStaffSender = msg.sender?.role && msg.sender.role !== 'CUSTOMER';
          const isMe = msg.sender_id === currentUser.id;

          // Internal Note Display (Staff Only)
          if (msg.is_internal) {
            return (
              <div
                key={`msg_${msg.id}`}
                className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-md backdrop-blur-sm"
              >
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                      Internal Note (Visible Only to Staff)
                    </span>
                    <span className="text-xs text-slate-300 font-medium">by {msg.sender?.name}</span>
                  </div>
                  <span className="text-[11px] text-amber-400/70 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-amber-100 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              </div>
            );
          }

          // Regular Public Message
          return (
            <div
              key={`msg_${msg.id}`}
              className={`flex gap-3 ${isStaffSender ? 'flex-row' : 'flex-row'}`}
            >
              <img
                src={msg.sender?.avatar || '/logo.png'}
                alt={msg.sender?.name || 'User'}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0 mt-1"
              />

              <div className="flex-1 max-w-3xl">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold text-white">{msg.sender?.name || 'User'}</span>

                  {isStaffSender ? (
                    <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 border border-cyan-800">
                      LumaCloud Support • STAFF
                    </span>
                  ) : (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                      CUSTOMER
                    </span>
                  )}

                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap shadow-md ${
                    isStaffSender
                      ? 'border border-cyan-900/50 bg-slate-900/90 text-slate-100'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-200'
                  }`}
                >
                  {msg.message}

                  {/* Attached Files */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.storage_path}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 text-xs text-cyan-300 hover:border-cyan-500 hover:text-cyan-200 transition-all"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="max-w-[160px] truncate">{att.original_name || att.filename}</span>
                          <Download className="h-3 w-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 backdrop-blur-xl shadow-2xl mt-3 shrink-0">
        {/* Toggle between Public Reply and Internal Note */}
        {isStaff && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setIsInternal(false)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                !isInternal ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Public Reply
            </button>
            <button
              type="button"
              onClick={() => setIsInternal(true)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                isInternal ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Lock className="h-3 w-3" />
              <span>Internal Note (Staff Only)</span>
            </button>
          </div>
        )}

        {/* Reply input */}
        <form onSubmit={handleSendReply}>
          <div className="relative">
            <textarea
              id="ticket-reply-textarea"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder={isInternal ? 'Write an internal note for staff review...' : 'Write your reply... (Ctrl+Enter to send)'}
              className={`w-full rounded-xl border p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all resize-none ${
                isInternal
                  ? 'border-amber-500/40 bg-amber-950/20 focus:border-amber-500 focus:ring-amber-500'
                  : 'border-slate-800 bg-slate-950/80 focus:border-cyan-500 focus:ring-cyan-500'
              }`}
            />
          </div>

          {/* Pending attachments preview */}
          {newAttachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {newAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200"
                >
                  <FileText className="h-3 w-3 text-cyan-400" />
                  <span className="max-w-[120px] truncate">{att.original_name || att.filename}</span>
                  <button
                    type="button"
                    onClick={() => setNewAttachments((p) => p.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Composer actions */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-750 transition-colors"
              >
                <Paperclip className="h-3.5 w-3.5 text-cyan-400" />
                <span>{isUploading ? 'Uploading...' : 'Attach File'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              {/* Emoji quick insertion */}
              <div className="hidden sm:flex items-center gap-1">
                {['👍', '🚀', '✅', '🔧', '🙏'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setReplyText((prev) => prev + ' ' + emoji)}
                    className="rounded p-1 text-sm hover:bg-slate-800"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="ticket-send-reply-btn"
              type="submit"
              disabled={isSending || !replyText.trim()}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 ${
                isInternal
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSending ? 'Sending...' : isInternal ? 'Save Internal Note' : 'Send Reply'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
