export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'OWNER';

export interface User {
  id: string;
  google_id?: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  email_verified: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface StaffPermissions {
  view_tickets?: boolean;
  reply?: boolean;
  assign_tickets?: boolean;
  change_status?: boolean;
  change_priority?: boolean;
  view_customers?: boolean;
  manage_categories?: boolean;
  manage_webhooks?: boolean;
  view_analytics?: boolean;
  can_assign?: boolean;
  can_resolve?: boolean;
  can_close?: boolean;
  can_reopen?: boolean;
  can_edit_internal_notes?: boolean;
  can_manage_staff?: boolean;
  can_view_audit_logs?: boolean;
}

export interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  permissions: StaffPermissions;
  status: 'ACTIVE' | 'DISABLED';
  created_at: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  icon?: string;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  filename: string;
  original_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender?: User;
  attachments?: Attachment[];
}

export interface TimelineEvent {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  details: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  category_id: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  customer?: User;
  assigned_staff?: User;
  category?: Category;
  sla_deadline?: string;
  sla_breached?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  ticket_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface WebhookEvents {
  ticket_created: boolean;
  customer_registered: boolean;
  customer_reply: boolean;
  staff_reply: boolean;
  ticket_assigned: boolean;
  status_changed: boolean;
  priority_changed: boolean;
  ticket_resolved: boolean;
  ticket_closed: boolean;
  attachment_uploaded: boolean;
  sla_breached: boolean;
}

export interface Webhook {
  id: string;
  name: string;
  url: string; // Stored encrypted or masked in responses
  enabled: boolean;
  events: WebhookEvents;
  created_at: string;
  updated_at: string;
}

export type DiscordWebhook = Webhook;

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: 'NONE' | 'SSL' | 'STARTTLS';
  from_name: string;
  from_email: string;
  reply_to: string;
  connected?: boolean;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  webhook_name: string;
  event: string;
  status: 'SUCCESS' | 'FAILED';
  response_code: number;
  error_message?: string;
  created_at: string;
}

export interface EmailSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password_set: boolean;
  smtp_encryption: 'None' | 'SSL' | 'STARTTLS';
  from_name: string;
  from_email: string;
  reply_to: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'FAILED';
  last_test_success?: string;
  last_test_failure?: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  slug?: string;
  template_key?: string;
  name: string;
  subject: string;
  body?: string;
  body_html?: string;
  variables: string[];
  updated_at: string;
}

export interface EmailLog {
  id: string;
  timestamp?: string;
  created_at?: string;
  recipient: string;
  subject: string;
  type?: string;
  template_key?: string;
  status: 'SENT' | 'FAILED' | 'BOUNCED';
  provider_response?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: UserRole;
  action: string;
  entity_type?: string;
  entity_id?: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  metadata?: string;
  ip_address?: string;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  category_name: string;
  content: string;
  excerpt: string;
  helpful_count: number;
  not_helpful_count: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface SlaSettings {
  low_hours?: number;
  medium_hours?: number;
  high_hours?: number;
  urgent_hours?: number;
  urgent_response_hours?: number;
  high_response_hours?: number;
  medium_response_hours?: number;
  low_response_hours?: number;
  auto_escalate?: boolean;
  notify_discord_on_breach: boolean;
  notify_email_on_breach?: boolean;
}

export interface SecuritySettings {
  require_email_verification: boolean;
  max_upload_size_mb: number;
  rate_limit_per_minute: number;
}
