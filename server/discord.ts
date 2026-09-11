import dbInstance from './db.ts';
import type { WebhookLog } from '../src/types.ts';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color?: number; // integer decimal color, e.g. 0x00b4d8
  fields?: DiscordEmbedField[];
  author?: {
    name: string;
    icon_url?: string;
    url?: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface DiscordPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

const LUMACLOUD_CYAN = 0x00b4d8;
const LUMACLOUD_ALERT = 0xf59e0b;
const LUMACLOUD_DANGER = 0xef4444;
const LUMACLOUD_SUCCESS = 0x10b981;

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordPayload,
  webhookId?: string,
  webhookName?: string,
  eventName?: string
): Promise<{ success: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const isSuccess = res.status >= 200 && res.status < 300;
    const resultStatus = res.status;
    let errorMessage: string | undefined;

    if (!isSuccess) {
      try {
        const text = await res.text();
        errorMessage = `HTTP ${res.status}: ${text.slice(0, 150)}`;
      } catch {
        errorMessage = `HTTP Error ${res.status}`;
      }
    }

    if (webhookId && webhookName && eventName) {
      const log: WebhookLog = {
        id: 'whl_' + Math.random().toString(36).substring(2, 9),
        webhook_id: webhookId,
        webhook_name: webhookName,
        event: eventName,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        response_code: resultStatus,
        error_message: errorMessage,
        created_at: new Date().toISOString(),
      };
      dbInstance.db.webhook_logs.unshift(log);
      if (dbInstance.db.webhook_logs.length > 200) {
        dbInstance.db.webhook_logs.pop();
      }
      dbInstance.persist();
    }

    return { success: isSuccess, status: resultStatus, error: errorMessage };
  } catch (err: any) {
    const safeMsg = err?.message || 'Network error delivering webhook';
    if (webhookId && webhookName && eventName) {
      const log: WebhookLog = {
        id: 'whl_' + Math.random().toString(36).substring(2, 9),
        webhook_id: webhookId,
        webhook_name: webhookName,
        event: eventName,
        status: 'FAILED',
        response_code: 0,
        error_message: safeMsg,
        created_at: new Date().toISOString(),
      };
      dbInstance.db.webhook_logs.unshift(log);
      dbInstance.persist();
    }
    return { success: false, status: 0, error: safeMsg };
  }
}

export async function dispatchDiscordEvent(
  event: keyof typeof EVENT_NAMES,
  data: any
) {
  const webhooks = dbInstance.db.webhooks.filter((w) => w.enabled && w.events && (w.events as any)[event]);
  if (webhooks.length === 0) return;

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const logoUrl = `${appUrl}/logo.png`;

  let embed: DiscordEmbed = {
    title: 'LumaCloud Support Notification',
    color: LUMACLOUD_CYAN,
    footer: {
      text: 'LumaCloud Support Center',
      icon_url: logoUrl,
    },
    timestamp: new Date().toISOString(),
  };

  switch (event) {
    case 'ticket_created':
      embed = {
        title: `NEW SUPPORT TICKET • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: data.ticket.priority === 'URGENT' ? LUMACLOUD_DANGER : LUMACLOUD_CYAN,
        description: data.ticket.subject,
        fields: [
          { name: 'Customer', value: data.customer.name, inline: true },
          { name: 'Email', value: data.customer.email, inline: true },
          { name: 'Category', value: data.categoryName || 'Support', inline: true },
          { name: 'Priority', value: data.ticket.priority, inline: true },
          { name: 'Status', value: data.ticket.status, inline: true },
          { name: 'Ticket Link', value: `[Open in Dashboard](${appUrl}/tickets/${data.ticket.id})`, inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'customer_registered':
      embed = {
        title: 'NEW CUSTOMER REGISTERED',
        color: LUMACLOUD_SUCCESS,
        fields: [
          { name: 'Name', value: data.user.name, inline: true },
          { name: 'Email', value: data.user.email, inline: true },
          { name: 'Method', value: data.user.google_id ? 'Google OAuth' : 'Local Account', inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'customer_reply':
    case 'staff_reply':
      embed = {
        title: event === 'staff_reply' ? `STAFF REPLY • ${data.ticket.ticket_number}` : `CUSTOMER REPLY • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: event === 'staff_reply' ? LUMACLOUD_CYAN : LUMACLOUD_ALERT,
        description: data.ticket.subject,
        fields: [
          { name: 'Sender', value: `${data.sender.name} (${data.sender.role})`, inline: true },
          { name: 'Preview', value: (data.message || '').slice(0, 200) + ((data.message || '').length > 200 ? '...' : ''), inline: false },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'status_changed':
      embed = {
        title: `TICKET STATUS UPDATED • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: data.newStatus === 'RESOLVED' ? LUMACLOUD_SUCCESS : LUMACLOUD_CYAN,
        fields: [
          { name: 'Ticket', value: data.ticket.ticket_number, inline: true },
          { name: 'Previous Status', value: data.oldStatus, inline: true },
          { name: 'New Status', value: data.newStatus, inline: true },
          { name: 'Changed by', value: `${data.user.name} (${data.user.role})`, inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'priority_changed':
      embed = {
        title: `TICKET PRIORITY UPDATED • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: data.newPriority === 'URGENT' ? LUMACLOUD_DANGER : LUMACLOUD_ALERT,
        fields: [
          { name: 'Ticket', value: data.ticket.ticket_number, inline: true },
          { name: 'Previous Priority', value: data.oldPriority, inline: true },
          { name: 'New Priority', value: data.newPriority, inline: true },
          { name: 'Changed by', value: data.user.name, inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'ticket_assigned':
      embed = {
        title: `TICKET ASSIGNED • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: LUMACLOUD_CYAN,
        fields: [
          { name: 'Ticket', value: data.ticket.ticket_number, inline: true },
          { name: 'Assigned Staff', value: data.assignedStaffName, inline: true },
          { name: 'Assigned by', value: data.user.name, inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'ticket_resolved':
    case 'ticket_closed':
      embed = {
        title: event === 'ticket_resolved' ? `TICKET RESOLVED • ${data.ticket.ticket_number}` : `TICKET CLOSED • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: LUMACLOUD_SUCCESS,
        fields: [
          { name: 'Ticket', value: data.ticket.ticket_number, inline: true },
          { name: 'Customer', value: data.ticket.customer?.name || 'Customer', inline: true },
          { name: 'Action by', value: data.user.name, inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'sla_breached':
      embed = {
        title: `⚠️ SLA BREACHED • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: LUMACLOUD_DANGER,
        fields: [
          { name: 'Subject', value: data.ticket.subject, inline: false },
          { name: 'Priority', value: data.ticket.priority, inline: true },
          { name: 'Status', value: data.ticket.status, inline: true },
          { name: 'Assigned To', value: data.ticket.assigned_staff?.name || 'Unassigned', inline: true },
        ],
        footer: { text: 'LumaCloud Support Center SLA Warning', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;

    case 'attachment_uploaded':
      embed = {
        title: `ATTACHMENT UPLOADED • ${data.ticket.ticket_number}`,
        url: `${appUrl}/tickets/${data.ticket.id}`,
        color: LUMACLOUD_CYAN,
        fields: [
          { name: 'File', value: data.filename, inline: true },
          { name: 'Size', value: `${(data.fileSize / 1024).toFixed(1)} KB`, inline: true },
          { name: 'Uploaded by', value: data.user.name, inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: logoUrl },
        timestamp: new Date().toISOString(),
      };
      break;
  }

  const payload: DiscordPayload = {
    username: 'LumaCloud Support',
    avatar_url: logoUrl,
    embeds: [embed],
  };

  // Dispatch concurrently
  await Promise.allSettled(
    webhooks.map((w) =>
      sendDiscordWebhook(w.url, payload, w.id, w.name, EVENT_NAMES[event])
    )
  );
}

export const EVENT_NAMES = {
  ticket_created: 'Ticket Created',
  customer_registered: 'Customer Registered',
  customer_reply: 'Customer Reply',
  staff_reply: 'Staff Reply',
  ticket_assigned: 'Ticket Assigned',
  status_changed: 'Status Changed',
  priority_changed: 'Priority Changed',
  ticket_resolved: 'Ticket Resolved',
  ticket_closed: 'Ticket Closed',
  attachment_uploaded: 'Attachment Uploaded',
  sla_breached: 'SLA Breached',
};
