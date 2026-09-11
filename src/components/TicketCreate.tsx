import React, { useState, useRef, useEffect } from 'react';
import {
  HelpCircle,
  Paperclip,
  UploadCloud,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Bold,
  Italic,
  Code,
  List,
  Quote,
  ArrowLeft,
  Send,
  Sparkles,
  Save,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { Category, TicketPriority, User } from '../types.ts';

interface TicketCreateProps {
  categories: Category[];
  currentUser?: User | null;
  onRequireAuth?: () => void;
  onBack: () => void;
  onSuccess: (ticketId: string) => void;
  onNavigateToKb: () => void;
}

const DRAFT_STORAGE_KEY = 'lumacloud_ticket_draft_v2';
const LEGACY_STORAGE_KEYS = ['lumacloud_ticket_draft_v1', 'lioncloud_ticket_draft_v1', 'lumacloud_ticket_draft'];

const clearAllDraftStorage = () => {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
};

export const TicketCreate: React.FC<TicketCreateProps> = ({
  categories,
  currentUser,
  onRequireAuth,
  onBack,
  onSuccess,
  onNavigateToKb,
}) => {
  const [subject, setSubject] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_tech');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save & LocalStorage state
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialMount = useRef(true);

  // 1. Restore draft from localStorage on component mount
  useEffect(() => {
    try {
      let stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) {
        for (const k of LEGACY_STORAGE_KEYS) {
          const val = localStorage.getItem(k);
          if (val) {
            stored = val;
            break;
          }
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          let hasContent = false;
          if (parsed.subject && typeof parsed.subject === 'string') {
            setSubject(parsed.subject);
            hasContent = true;
          }
          if (parsed.categoryId && typeof parsed.categoryId === 'string') {
            setCategoryId(parsed.categoryId);
          }
          if (parsed.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(parsed.priority)) {
            setPriority(parsed.priority);
          }
          if (parsed.description && typeof parsed.description === 'string') {
            setDescription(parsed.description);
            hasContent = true;
          }
          if (Array.isArray(parsed.attachments) && parsed.attachments.length > 0) {
            setAttachments(parsed.attachments);
            hasContent = true;
          }

          if (hasContent) {
            setIsDraftRestored(true);
            if (parsed.savedAt) {
              const date = new Date(parsed.savedAt);
              setLastSavedAt(
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              );
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not read ticket draft from localStorage', err);
    }
  }, []);

  // 2. Automatically save draft state to localStorage whenever fields change
  useEffect(() => {
    // Avoid re-saving immediately on initial mount before draft was loaded
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasAnyValue =
      subject.trim().length > 0 ||
      description.trim().length > 0 ||
      attachments.length > 0;

    if (!hasAnyValue) {
      // Clean storage if form has been completely cleared
      clearAllDraftStorage();
      setLastSavedAt(null);
      return;
    }

    setIsSaving(true);
    const handler = setTimeout(() => {
      try {
        const now = Date.now();
        const payload = {
          subject,
          categoryId,
          priority,
          description,
          attachments,
          savedAt: now,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
        const date = new Date(now);
        setLastSavedAt(
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        setIsSaving(false);
      } catch (err) {
        console.warn('Failed saving ticket draft to localStorage', err);
        setIsSaving(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [subject, categoryId, priority, description, attachments]);

  // 3. Guarantee immediate save if user navigates away or refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      const hasAnyValue =
        subject.trim().length > 0 ||
        description.trim().length > 0 ||
        attachments.length > 0;
      if (hasAnyValue) {
        try {
          const payload = {
            subject,
            categoryId,
            priority,
            description,
            attachments,
            savedAt: Date.now(),
          };
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [subject, categoryId, priority, description, attachments]);

  // Discard draft handler
  const handleDiscardDraft = () => {
    clearAllDraftStorage();
    setSubject('');
    setCategoryId(categories[0]?.id || 'cat_tech');
    setPriority('MEDIUM');
    setDescription('');
    setAttachments([]);
    setIsDraftRestored(false);
    setLastSavedAt(null);
    setShowDiscardConfirm(false);
  };

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = description;
    const selected = current.substring(start, end);
    const updated = current.substring(0, start) + before + selected + after + current.substring(end);
    setDescription(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, end + before.length);
      }
    }, 50);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);

    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.txt', '.log', '.pdf', '.zip'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!allowedExtensions.includes(ext)) {
        setError(`File ${file.name} is not supported. Allowed: PNG, JPG, WEBP, TXT, LOG, PDF, ZIP`);
        setIsUploading(false);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} exceeds maximum limit of 10MB`);
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload file');
        setAttachments((prev) => [...prev, data.attachment]);
      } catch (err: any) {
        setError(err.message || 'File upload error');
      }
    }
    setIsUploading(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please provide a subject for your ticket');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a detailed description of your issue');
      return;
    }

    if (!currentUser && onRequireAuth) {
      setError('Please sign in with your email and password to submit this ticket. Your draft is safely saved in local storage.');
      onRequireAuth();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          category_id: categoryId,
          priority,
          description,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');

      // Clear draft upon successful submission
      clearAllDraftStorage();

      onSuccess(data.ticket.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* Top navigation & Auto-save Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tickets</span>
        </button>

        {/* Auto-save live indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-300">
            <span
              className={`h-2 w-2 rounded-full ${
                isSaving
                  ? 'bg-amber-400 animate-ping'
                  : lastSavedAt
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span>
              {isSaving
                ? 'Saving draft...'
                : lastSavedAt
                ? `Draft auto-saved at ${lastSavedAt}`
                : 'Auto-save active (localStorage)'}
            </span>
          </div>

          {(subject || description || attachments.length > 0) && (
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-400 transition-colors"
              title="Clear draft and start fresh"
            >
              Discard Draft
            </button>
          )}
        </div>
      </div>

      {/* Draft Restored Banner */}
      {isDraftRestored && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md shadow-lg shadow-amber-950/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                Unsaved Progress Restored
                <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300 border border-amber-500/30">
                  LocalStorage
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                We safely recovered your draft from your browser's local storage so you didn't lose your work.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => setIsDraftRestored(false)}
              className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-3.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-all"
            >
              Keep Draft
            </button>
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Discard Saved Draft?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear your subject, message description, and any uploaded attachments from your browser storage. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
              >
                Yes, Discard Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Support Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md shadow-lg">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              LumaCloud Support Desk
              <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Engineers Online
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit your inquiry or technical issue below. Our team reviews tickets in priority order.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateToKb}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all shrink-0"
        >
          <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
          <span>Knowledge Base</span>
        </button>
      </div>

      {/* Ticket Form Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="border-b border-slate-800/80 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-['Outfit'] flex items-center gap-2.5">
              <span>Create New Ticket</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Provide specific details so our support team can diagnose and assist rapidly.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Save className="h-3.5 w-3.5 text-amber-400" />
            <span>Auto-saving draft locally</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Subject <span className="text-amber-400">*</span>
            </label>
            <input
              id="ticket-subject-input"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. VPS node unreachable / Minecraft paper server tick lag / Discord Bot port forwarding"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Category <span className="text-amber-400">*</span>
              </label>
              <select
                id="ticket-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Priority Level <span className="text-amber-400">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map((lvl) => {
                  const active = priority === lvl;
                  let activeColors = 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm shadow-amber-500/20';
                  if (lvl === 'URGENT') activeColors = 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-sm shadow-rose-500/20';
                  if (lvl === 'HIGH') activeColors = 'border-orange-500 bg-orange-500/20 text-orange-300 shadow-sm shadow-orange-500/20';
                  if (lvl === 'LOW') activeColors = 'border-blue-500 bg-blue-500/20 text-blue-300';
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      className={`rounded-xl border py-2 text-center text-[11px] font-bold transition-all ${
                        active
                          ? activeColors
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description with formatting toolbar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Detailed Description <span className="text-amber-400">*</span>
              </label>
              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1">
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('```\n', '\n```')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Code Block"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('> ')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Quote"
                >
                  <Quote className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- ')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Bullet List"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <textarea
              id="ticket-description-textarea"
              ref={textareaRef}
              rows={8}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain your issue in detail. Include console logs, server IP/node ID, crash dumps, and exact reproduction steps. Your inputs are saved automatically to your browser so you won't lose your work."
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed font-mono transition-colors"
            />
          </div>

          {/* Attachments Section */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Attachments (Crash Reports, Screenshots, Configs)
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/40 p-6 text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
            >
              <UploadCloud className="h-8 w-8 text-amber-400 mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                Click to browse or drag & drop files here
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                PNG, JPG, WEBP, TXT, LOG, PDF, ZIP (Max 10MB per file)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.txt,.log,.pdf,.zip"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            {/* Uploaded File Pills */}
            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200"
                  >
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    <span className="max-w-[150px] truncate">{att.original_name || att.filename}</span>
                    <span className="text-[10px] text-slate-500">
                      ({(att.file_size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit & Progress Safety Row */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Draft saved locally • Ticket ID formats as <code className="text-amber-400 font-mono">#LC-XXXXXX</code>
              </span>
            </div>

            <button
              id="submit-ticket-btn"
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-6 py-3 text-xs font-bold text-slate-950 shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <span>Submitting Ticket...</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-slate-950" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

