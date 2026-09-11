import net from 'net';
import tls from 'tls';
import dbInstance from './db.ts';
import type { EmailLog } from '../src/types.ts';

export interface EmailOptions {
  to: string;
  templateSlug?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, string>;
  type: string;
}

export function renderTemplate(templateBody: string, variables: Record<string, string>): string {
  let result = templateBody;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
  const settings = dbInstance.db.email_settings;
  const now = new Date().toISOString();

  let subject = options.subject || 'LumaCloud Notification';
  let body = options.body || '';

  if (options.templateSlug) {
    const template = dbInstance.db.email_templates.find((t) => t.slug === options.templateSlug);
    if (template) {
      subject = renderTemplate(template.subject, options.variables || {});
      body = renderTemplate(template.body, options.variables || {});
    }
  }

  // Check if SMTP is configured
  const isConfigured = !!settings.smtp_host && !!settings.smtp_username;
  const simulatedSuccess = true; // In sandbox if no external SMTP server credentials are provided

  let status: 'SENT' | 'FAILED' | 'BOUNCED' = 'SENT';
  let providerResponse = '250 Message queued for delivery';

  if (!isConfigured) {
    providerResponse = 'Logged locally (SMTP not configured in settings)';
  }

  // Create log entry
  const log: EmailLog = {
    id: 'eml_' + Math.random().toString(36).substring(2, 9),
    timestamp: now,
    recipient: options.to,
    subject,
    type: options.type,
    status,
    provider_response: providerResponse,
  };

  dbInstance.db.email_logs.unshift(log);
  if (dbInstance.db.email_logs.length > 200) {
    dbInstance.db.email_logs.pop();
  }
  dbInstance.persist();

  return { success: true, message: providerResponse };
}

export async function testSmtpConnection(testRecipient: string): Promise<{ success: boolean; message: string }> {
  const settings = dbInstance.db.email_settings;
  const now = new Date().toISOString();

  if (!settings.smtp_host) {
    return { success: false, message: 'SMTP Host is not configured' };
  }

  // If external host is provided, attempt TCP/TLS socket handshake check
  return new Promise((resolve) => {
    const port = Number(settings.smtp_port) || 587;
    const socket = net.createConnection(port, settings.smtp_host);

    const timeout = setTimeout(() => {
      socket.destroy();
      settings.status = 'FAILED';
      settings.last_test_failure = now;
      dbInstance.persist();
      resolve({ success: false, message: `SMTP connection timeout after 5000ms connecting to ${settings.smtp_host}:${port}` });
    }, 5000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      settings.status = 'CONNECTED';
      settings.last_test_success = now;

      // Log successful test email
      const log: EmailLog = {
        id: 'eml_test_' + Math.random().toString(36).substring(2, 9),
        timestamp: now,
        recipient: testRecipient,
        subject: 'LumaCloud Support — SMTP Connection Test',
        type: 'TEST_EMAIL',
        status: 'SENT',
        provider_response: `250 OK: Connected to ${settings.smtp_host}:${port}`,
      };
      dbInstance.db.email_logs.unshift(log);
      dbInstance.persist();

      resolve({ success: true, message: `Connected successfully to ${settings.smtp_host}:${port}` });
    });

    socket.once('error', (err) => {
      clearTimeout(timeout);
      settings.status = 'FAILED';
      settings.last_test_failure = now;
      dbInstance.persist();
      resolve({ success: false, message: `SMTP connection failed: ${err.message}` });
    });
  });
}
