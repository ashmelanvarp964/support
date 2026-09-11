import React from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Ticket,
  AlertTriangle,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import type { Notification } from '../types.ts';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectTicket: (ticketId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelectTicket,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Notification Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time updates regarding your hosting tickets, agent replies, and incident status.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl divide-y divide-slate-800/60 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="h-10 w-10 text-slate-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No notifications</h3>
            <p className="text-xs text-slate-400 mt-1">You're completely caught up.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) onMarkRead(n.id);
                if (n.ticket_id) onSelectTicket(n.ticket_id);
              }}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                !n.read ? 'bg-cyan-950/20 hover:bg-cyan-950/30' : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${
                    !n.read
                      ? 'bg-cyan-500/20 text-cyan-300 ring-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 ring-slate-700'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{n.title}</h4>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-500 font-mono mt-2 block">
                    {new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>

              {n.ticket_id && (
                <button className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-400 hover:border-cyan-500 shrink-0">
                  <span>View Ticket</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
