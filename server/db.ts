import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  User,
  StaffPermissions,
  Category,
  Ticket,
  Message,
  Attachment,
  TimelineEvent,
  Notification,
  Webhook,
  WebhookLog,
  EmailSettings,
  EmailTemplate,
  EmailLog,
  AuditLog,
  KnowledgeArticle,
  SlaSettings,
  SecuritySettings,
} from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lumacloud.db.json');

export interface Session {
  token: string;
  user_id: string;
  expires_at: string;
}

export interface PasswordReset {
  token: string;
  email: string;
  expires_at: string;
  used: boolean;
}

export interface EmailVerificationToken {
  token: string;
  email: string;
  expires_at: string;
  used: boolean;
}

export interface DatabaseSchema {
  users: (User & { password_hash: string; salt: string })[];
  sessions: Session[];
  tickets: Ticket[];
  messages: Message[];
  attachments: Attachment[];
  timeline: TimelineEvent[];
  categories: Category[];
  notifications: Notification[];
  staff_permissions: Record<string, StaffPermissions>;
  webhooks: (Webhook & { encrypted_url?: string })[];
  webhook_logs: WebhookLog[];
  email_settings: EmailSettings & { smtp_password?: string };
  email_templates: EmailTemplate[];
  email_logs: EmailLog[];
  sla_settings: SlaSettings;
  security_settings: SecuritySettings;
  kb_articles: KnowledgeArticle[];
  audit_logs: AuditLog[];
  password_resets: PasswordReset[];
  email_verifications: EmailVerificationToken[];
}

// Password helpers
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.ensureOwnerUser(parsed);
        return parsed;
      } catch (err) {
        console.error('Error reading db file, re-initializing fresh database:', err);
      }
    }

    const initial = this.getInitialSeedData();
    this.ensureOwnerUser(initial);
    this.saveDatabase(initial);
    return initial;
  }

  private ensureOwnerUser(schema: DatabaseSchema) {
    const ownerEmail = (process.env.OWNER_EMAIL || 'support@lumacloud.xyz').toLowerCase();
    const ownerPassword = process.env.OWNER_PASSWORD || 'lumacloud1237693opp';
    const { hash: ownerHash, salt: ownerSalt } = hashPassword(ownerPassword);

    let owner = schema.users.find(
      (u) => u.email.toLowerCase() === ownerEmail || u.id === 'usr_owner_001'
    );

    if (owner) {
      owner.email = ownerEmail;
      owner.name = 'LumaCloud Owner';
      owner.role = 'OWNER';
      owner.status = 'ACTIVE';
      owner.email_verified = true;
      owner.password_hash = ownerHash;
      owner.salt = ownerSalt;
    } else {
      schema.users.unshift({
        id: 'usr_owner_001',
        name: 'LumaCloud Owner',
        email: ownerEmail,
        avatar: '/logo.png',
        role: 'OWNER',
        email_verified: true,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        password_hash: ownerHash,
        salt: ownerSalt,
      });
    }
  }

  private saveDatabase(dataToSave: DatabaseSchema = this.data) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public persist() {
    this.saveDatabase(this.data);
  }

  public get db(): DatabaseSchema {
    return this.data;
  }

  private getInitialSeedData(): DatabaseSchema {
    const ownerEmail = process.env.OWNER_EMAIL || 'support@lumacloud.xyz';
    const ownerPassword = process.env.OWNER_PASSWORD || 'lumacloud1237693opp';
    const { hash: ownerHash, salt: ownerSalt } = hashPassword(ownerPassword);

    const { hash: staffHash, salt: staffSalt } = hashPassword('Password123!');
    const { hash: customerHash, salt: customerSalt } = hashPassword('Password123!');

    const now = new Date().toISOString();

    const ownerUser: User & { password_hash: string; salt: string } = {
      id: 'usr_owner_001',
      name: 'LumaCloud Owner',
      email: ownerEmail,
      avatar: '/logo.png',
      role: 'OWNER',
      email_verified: true,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
      password_hash: ownerHash,
      salt: ownerSalt,
    };

    const staffUser: User & { password_hash: string; salt: string } = {
      id: 'usr_staff_001',
      name: 'Alex Vance',
      email: 'alex@lumacloud.xyz',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'STAFF',
      email_verified: true,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
      password_hash: staffHash,
      salt: staffSalt,
    };

    const customerUser: User & { password_hash: string; salt: string } = {
      id: 'usr_cust_001',
      name: 'Jordan Miller',
      email: 'jordan@example.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'CUSTOMER',
      email_verified: true,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
      password_hash: customerHash,
      salt: customerSalt,
    };

    const categories: Category[] = [
      { id: 'cat_tech', name: 'Technical Support', slug: 'technical-support', description: 'General server and system technical issues', is_active: true, icon: 'Wrench' },
      { id: 'cat_mc', name: 'Minecraft Hosting', slug: 'minecraft-hosting', description: 'Game server setup, paper/purpur, mods, and plugins', is_active: true, icon: 'Box' },
      { id: 'cat_vps', name: 'VPS Hosting', slug: 'vps-hosting', description: 'Virtual private servers, KVM nodes, Linux/Windows OS', is_active: true, icon: 'Server' },
      { id: 'cat_bill', name: 'Billing & Invoices', slug: 'billing', description: 'Subscriptions, invoice questions, and payment methods', is_active: true, icon: 'CreditCard' },
      { id: 'cat_acc', name: 'Account & Security', slug: 'account', description: 'Login assistance, 2FA, and password recovery', is_active: true, icon: 'Shield' },
      { id: 'cat_net', name: 'Network & Connectivity', slug: 'network', description: 'Routing, latency, IP assignments, and ports', is_active: true, icon: 'Globe' },
      { id: 'cat_ddos', name: 'DDoS / Security Attack', slug: 'ddos-security', description: 'Active mitigation, firewall rules, attack filtering', is_active: true, icon: 'Flame' },
      { id: 'cat_web', name: 'Website & Domains', slug: 'website', description: 'DNS records, SSL certificates, and web hosting', is_active: true, icon: 'Compass' },
      { id: 'cat_srv', name: 'Server Crash / Issue', slug: 'server-issue', description: 'Kernel panics, hardware restarts, daemon crashes', is_active: true, icon: 'AlertTriangle' },
      { id: 'cat_oth', name: 'Other Inquiries', slug: 'other', description: 'Sales inquiries and general partnership questions', is_active: true, icon: 'HelpCircle' },
    ];

    const staffPermissions: Record<string, StaffPermissions> = {
      usr_staff_001: {
        view_tickets: true,
        reply: true,
        assign_tickets: true,
        change_status: true,
        change_priority: true,
        view_customers: true,
        manage_categories: false,
        manage_webhooks: false,
        view_analytics: true,
      },
    };

    // Seed Tickets
    const ticket1: Ticket = {
      id: 'tkt_001024',
      ticket_number: '#LC-001024',
      user_id: customerUser.id,
      subject: 'VPS suddenly offline',
      description: 'Our production Node.js API server on VPS Node #4 (Debian 12) became unreachable approximately 20 minutes ago. SSH connection attempts time out on port 22. Ping to IP 194.26.112.44 returns Destination Host Unreachable. Please help urgently as production users are affected.',
      category_id: 'cat_vps',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigned_to: staffUser.id,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
      sla_deadline: new Date(Date.now() + 3600000 * 2).toISOString(),
      sla_breached: false,
    };

    const ticket2: Ticket = {
      id: 'tkt_001025',
      ticket_number: '#LC-001025',
      user_id: customerUser.id,
      subject: 'Minecraft server high tick lag on Purpur 1.21',
      description: 'We are experiencing server tick drop from 20 TPS down to 11 TPS whenever more than 15 players join our survival SMP. Attached timings report and spark profile. Can you check if the CPU thread allocation can be pinned or optimized?',
      category_id: 'cat_mc',
      priority: 'MEDIUM',
      status: 'OPEN',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      sla_deadline: new Date(Date.now() + 3600000 * 7).toISOString(),
      sla_breached: false,
    };

    const ticket3: Ticket = {
      id: 'tkt_001026',
      ticket_number: '#LC-001026',
      user_id: customerUser.id,
      subject: 'DDoS mitigation query for domain DNS',
      description: 'We noticed periodic SYN-flood spikes targeting port 25565. Does LumaCloud Layer 7 filter activate automatically or do we need specific BGP scrubbing route rules configured?',
      category_id: 'cat_ddos',
      priority: 'URGENT',
      status: 'RESOLVED',
      assigned_to: ownerUser.id,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      resolved_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      sla_deadline: new Date(Date.now() - 3600000 * 23).toISOString(),
      sla_breached: false,
    };

    // Seed Messages for Ticket 1
    const messages: Message[] = [
      {
        id: 'msg_001',
        ticket_id: ticket1.id,
        sender_id: customerUser.id,
        message: 'Our production Node.js API server on VPS Node #4 (Debian 12) became unreachable approximately 20 minutes ago. SSH connection attempts time out on port 22. Ping to IP 194.26.112.44 returns Destination Host Unreachable. Please help urgently as production users are affected.',
        is_internal: false,
        created_at: ticket1.created_at,
      },
      {
        id: 'msg_002',
        ticket_id: ticket1.id,
        sender_id: staffUser.id,
        message: 'Hello Jordan! Thank you for reaching out to LumaCloud Support. I am investigating KVM hypervisor Node #4 right now. I will check the internal bridge network and power state.',
        is_internal: false,
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 'msg_003',
        ticket_id: ticket1.id,
        sender_id: staffUser.id,
        message: 'Checked VPS node logs. Node appears healthy, but vNIC virtio interface experienced a silent kernel lockup. Resetting the virtual adapter now.',
        is_internal: true, // INTERNAL NOTE
        created_at: new Date(Date.now() - 3600000 * 1.2).toISOString(),
      },
      {
        id: 'msg_004',
        ticket_id: ticket1.id,
        sender_id: staffUser.id,
        message: 'We have reset the virtual network interface and verified ping response to 194.26.112.44 is normal now. Can you please confirm if your SSH and daemon services are responding?',
        is_internal: false,
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ];

    const timeline: TimelineEvent[] = [
      {
        id: 'tl_001',
        ticket_id: ticket1.id,
        user_id: customerUser.id,
        user_name: customerUser.name,
        user_role: 'CUSTOMER',
        action: 'CREATED',
        details: 'Ticket created with priority HIGH',
        created_at: ticket1.created_at,
      },
      {
        id: 'tl_002',
        ticket_id: ticket1.id,
        user_id: staffUser.id,
        user_name: staffUser.name,
        user_role: 'STAFF',
        action: 'ASSIGNED',
        details: 'Ticket assigned to Alex Vance',
        created_at: new Date(Date.now() - 3600000 * 1.8).toISOString(),
      },
      {
        id: 'tl_003',
        ticket_id: ticket1.id,
        user_id: staffUser.id,
        user_name: staffUser.name,
        user_role: 'STAFF',
        action: 'STATUS_CHANGED',
        details: 'Alex changed status from OPEN to IN PROGRESS',
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
    ];

    const notifications: Notification[] = [
      {
        id: 'notif_001',
        user_id: customerUser.id,
        ticket_id: ticket1.id,
        type: 'STAFF_REPLY',
        title: 'Staff Replied to Ticket #LC-001024',
        message: 'Alex Vance replied: "We have reset the virtual network interface..."',
        read: false,
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'notif_002',
        user_id: ownerUser.id,
        ticket_id: ticket2.id,
        type: 'TICKET_CREATED',
        title: 'New Support Ticket #LC-001025',
        message: 'Customer Jordan Miller opened a ticket in Minecraft Hosting',
        read: false,
        created_at: ticket2.created_at,
      },
    ];

    const emailTemplates: EmailTemplate[] = [
      {
        id: 'tpl_welcome',
        slug: 'welcome',
        name: 'Welcome to LumaCloud',
        subject: 'Welcome to LumaCloud Support, {{user_name}}!',
        body: 'Hello {{user_name}},\n\nWelcome to LumaCloud Support Center! Your account has been registered successfully.\n\nYou can access your dashboard anytime at: {{app_url}}\n\nBest regards,\nThe LumaCloud Team',
        variables: ['user_name', 'user_email', 'app_name', 'app_url'],
        updated_at: now,
      },
      {
        id: 'tpl_verify',
        slug: 'email-verification',
        name: 'Email Verification',
        subject: 'LumaCloud — Verify Your Email Address',
        body: 'Hello {{user_name}},\n\nPlease verify your email address by visiting the following link:\n\n{{verification_url}}\n\nThis verification link will expire in 24 hours.\n\nLumaCloud Support',
        variables: ['user_name', 'verification_url', 'app_name'],
        updated_at: now,
      },
      {
        id: 'tpl_reset',
        slug: 'password-reset',
        name: 'Password Reset',
        subject: 'Reset your LumaCloud password',
        body: 'Hello {{user_name}},\n\nA password reset was requested for your account. Click the link below to set a new password:\n\n{{reset_url}}\n\nIf you did not make this request, please ignore this email.\n\nLumaCloud Security',
        variables: ['user_name', 'reset_url', 'app_name'],
        updated_at: now,
      },
      {
        id: 'tpl_ticket_new',
        slug: 'new-ticket',
        name: 'Ticket Confirmation',
        subject: 'Support Ticket Registered: [{{ticket_id}}] {{ticket_subject}}',
        body: 'Hello {{user_name}},\n\nYour support ticket {{ticket_id}} has been received and assigned to our queue.\n\nSubject: {{ticket_subject}}\nPriority: {{ticket_priority}}\nStatus: {{ticket_status}}\n\nYou can track and reply to your ticket here:\n{{ticket_url}}\n\nLumaCloud Support',
        variables: ['user_name', 'ticket_id', 'ticket_subject', 'ticket_priority', 'ticket_status', 'ticket_url'],
        updated_at: now,
      },
      {
        id: 'tpl_staff_reply',
        slug: 'staff-reply',
        name: 'Staff Reply Notification',
        subject: 'New reply on ticket [{{ticket_id}}]: {{ticket_subject}}',
        body: 'Hello {{user_name}},\n\nOur support engineer {{staff_name}} has replied to your ticket {{ticket_id}}.\n\nView response:\n{{ticket_url}}\n\nLumaCloud Support',
        variables: ['user_name', 'ticket_id', 'ticket_subject', 'staff_name', 'ticket_url'],
        updated_at: now,
      },
      {
        id: 'tpl_ticket_resolved',
        slug: 'ticket-resolved',
        name: 'Ticket Resolved',
        subject: 'Resolved: [{{ticket_id}}] {{ticket_subject}}',
        body: 'Hello {{user_name}},\n\nYour support ticket {{ticket_id}} has been marked as RESOLVED.\n\nIf you still need assistance, simply reply to reopen the conversation.\n\n{{ticket_url}}\n\nLumaCloud Support',
        variables: ['user_name', 'ticket_id', 'ticket_subject', 'ticket_url'],
        updated_at: now,
      },
    ];

    const kbArticles: KnowledgeArticle[] = [
      {
        id: 'kb_001',
        title: 'Optimizing Minecraft Servers with Aikar Flags & Purpur',
        slug: 'optimizing-minecraft-servers-aikar-flags',
        category_id: 'cat_mc',
        category_name: 'Minecraft Hosting',
        excerpt: 'Step-by-step guide to garbage collection JVM tuning, view-distance optimization, and entity ticking config.',
        content: `### High-Performance Minecraft Configuration\n\nWhen running a Minecraft server on LumaCloud, default Java garbage collection can cause sporadic tick skips and stuttering.\n\n#### Recommended Java Startup Flags (Aikar Flags):\n\`\`\`bash\njava -Xms4G -Xmx4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -jar server.jar nogui\n\`\`\`\n\n#### Recommended Server Config Adjustments:\n1. In \`server.properties\`, set \`view-distance=6\` or \`simulation-distance=4\`.\n2. In \`purpur.yml\`, disable aggressive entity brain ticking for inactive mobs.\n3. Install **Spark** profiler plugin to trace lag sources.`,
        helpful_count: 42,
        not_helpful_count: 1,
        views: 312,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'kb_002',
        title: 'VPS Initial Setup: SSH Keys, Firewall & Fail2ban',
        slug: 'vps-initial-setup-ssh-keys-firewall',
        category_id: 'cat_vps',
        category_name: 'VPS Hosting',
        excerpt: 'Harden your Debian/Ubuntu cloud server against brute force attacks in under 5 minutes.',
        content: `### Securing Your LumaCloud VPS\n\nEvery new cloud server should be secured immediately upon deployment.\n\n#### 1. Generate SSH Key Pair (Local Computer)\n\`\`\`bash\nssh-keygen -t ed25519 -C "your_email@example.com"\nssh-copy-id root@YOUR_SERVER_IP\n\`\`\`\n\n#### 2. Disable Password Authentication\nEdit \`/etc/ssh/sshd_config\`:\n\`\`\`ini\nPasswordAuthentication no\nPermitRootLogin prohibit-password\n\`\`\`\nRestart SSH daemon:\n\`\`\`bash\nsystemctl restart sshd\n\`\`\`\n\n#### 3. Enable UFW Firewall\n\`\`\`bash\nufw default deny incoming\nufw default allow outgoing\nufw allow 22/tcp\nufw allow 80/tcp\nufw allow 443/tcp\nufw enable\n\`\`\``,
        helpful_count: 58,
        not_helpful_count: 2,
        views: 489,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'kb_003',
        title: 'Pterodactyl Panel Game Server File Management & SFTP',
        slug: 'pterodactyl-panel-file-management-sftp',
        category_id: 'cat_mc',
        category_name: 'Minecraft Hosting',
        excerpt: 'How to upload large modpacks, server worlds, and plugins using secure SFTP clients like Cyberduck or FileZilla.',
        content: `### Using SFTP with LumaCloud Game Panel\n\nWeb uploads in browser are limited to 100MB per file. For world folders and large modpacks, connect directly with SFTP.\n\n#### Connection Details:\n- **Host**: Look at the Settings tab in your server console (e.g. \`node1.lumacloud.xyz:2022\`).\n- **Username**: Your panel username followed by a period and server ID (e.g. \`user.7c18a9\`).\n- **Password**: Your main LumaCloud client area account password.`,
        helpful_count: 36,
        not_helpful_count: 0,
        views: 240,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'kb_004',
        title: 'LumaCloud DDoS Mitigation Architecture & DNS Configuration',
        slug: 'lumacloud-ddos-mitigation-architecture',
        category_id: 'cat_ddos',
        category_name: 'DDoS / Security Attack',
        excerpt: 'Understand how our multi-terabit Anycast BGP filtering protects your game and web ports.',
        content: `### Automatic Layer 3/4 and Layer 7 Filtering\n\nAll LumaCloud IP ranges are protected by always-on Anycast scrubbing centers with over 3.2 Tbps aggregate mitigation capacity.\n\n#### Protection Characteristics:\n- Sub-second detection of UDP reflection floods (NTP, DNS, Memcached).\n- SYN-cookie proxies for TCP services (Minecraft, web).\n- No additional configuration needed on the client side.`,
        helpful_count: 29,
        not_helpful_count: 1,
        views: 198,
        created_at: now,
        updated_at: now,
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'aud_001',
        user_id: ownerUser.id,
        user_name: ownerUser.name,
        user_role: 'OWNER',
        action: 'SYSTEM_INITIALIZED',
        target_type: 'SYSTEM',
        target_id: 'sys_001',
        metadata: 'LumaCloud Support Center initialized with default schema & owner account',
        ip_address: '127.0.0.1',
        created_at: now,
      },
    ];

    return {
      users: [ownerUser, staffUser, customerUser],
      sessions: [],
      tickets: [ticket1, ticket2, ticket3],
      messages,
      attachments: [],
      timeline,
      categories,
      notifications,
      staff_permissions: staffPermissions,
      webhooks: [],
      webhook_logs: [],
      email_settings: {
        id: 'email_settings_001',
        smtp_host: process.env.SMTP_HOST || '',
        smtp_port: Number(process.env.SMTP_PORT) || 587,
        smtp_username: process.env.SMTP_USERNAME || '',
        smtp_password: process.env.SMTP_PASSWORD || '',
        smtp_password_set: !!process.env.SMTP_PASSWORD,
        smtp_encryption: (process.env.SMTP_ENCRYPTION as any) || 'STARTTLS',
        from_name: process.env.SMTP_FROM_NAME || 'LumaCloud Support',
        from_email: process.env.SMTP_FROM_EMAIL || 'support@lumacloud.xyz',
        reply_to: process.env.SMTP_REPLY_TO || 'support@lumacloud.xyz',
        status: process.env.SMTP_HOST ? 'CONNECTED' : 'NOT_CONFIGURED',
        updated_at: now,
      },
      email_templates: emailTemplates,
      email_logs: [],
      sla_settings: {
        low_hours: 24,
        medium_hours: 12,
        high_hours: 4,
        urgent_hours: 1,
        notify_discord_on_breach: true,
      },
      security_settings: {
        require_email_verification: false,
        max_upload_size_mb: 10,
        rate_limit_per_minute: 60,
      },
      kb_articles: kbArticles,
      audit_logs: auditLogs,
      password_resets: [],
      email_verifications: [],
    };
  }
}

export const dbInstance = new Database();
export default dbInstance;
