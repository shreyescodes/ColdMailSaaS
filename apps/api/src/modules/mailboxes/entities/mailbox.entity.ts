import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsEmail, IsOptional, IsNumber, IsBoolean } from 'class-validator';

import { Organization } from '../../organizations/entities/organization.entity';
import { Domain } from '../../domains/entities/domain.entity';

export enum MailboxStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  FAILED = 'failed',
  WARMING_UP = 'warming_up',
}

export enum MailboxType {
  SMTP = 'smtp',
  SES = 'ses',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
  CUSTOM = 'custom',
}

export enum MailboxProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  YAHOO = 'yahoo',
  CUSTOM_SMTP = 'custom_smtp',
  AWS_SES = 'aws_ses',
  SENDGRID = 'sendgrid',
  MAILGUN = 'mailgun',
}

@Entity('mailboxes')
@Index(['email', 'organizationId'], { unique: true })
@Index(['status'])
@Index(['organizationId'])
@Index(['domainId'])
export class Mailbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column({
    type: 'enum',
    enum: MailboxType,
    default: MailboxType.SMTP,
  })
  type: MailboxType;

  @Column({
    type: 'enum',
    enum: MailboxProvider,
    default: MailboxProvider.CUSTOM_SMTP,
  })
  provider: MailboxProvider;

  @Column({
    type: 'enum',
    enum: MailboxStatus,
    default: MailboxStatus.PENDING,
  })
  status: MailboxStatus;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid', nullable: true })
  domainId?: string;

  @ManyToOne(() => Domain, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'domainId' })
  domain?: Domain;

  // SMTP Configuration
  @Column({ nullable: true })
  @IsOptional()
  smtpHost?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @Column({ default: false })
  @IsBoolean()
  smtpSecure: boolean;

  @Column({ nullable: true })
  @IsOptional()
  smtpUsername?: string;

  @Column({ nullable: true })
  @IsOptional()
  smtpPassword?: string;

  // Provider-specific settings
  @Column({ type: 'jsonb', nullable: true })
  providerSettings?: {
    apiKey?: string;
    region?: string;
    domain?: string;
    webhookUrl?: string;
    customHeaders?: Record<string, string>;
  };

  // Sending Configuration
  @Column({ type: 'jsonb', nullable: true })
  sendingConfig?: {
    maxEmailsPerDay: number;
    maxEmailsPerHour: number;
    maxEmailsPerMinute: number;
    warmupEnabled: boolean;
    warmupRate: number; // emails per day
    warmupIncrement: number; // daily increase
    currentWarmupRate: number;
    lastWarmupUpdate: Date;
    timezone: string;
    businessHoursOnly: boolean;
    businessHoursStart: string; // HH:MM
    businessHoursEnd: string; // HH:MM
    businessDays: number[]; // 0-6 (Sunday-Saturday)
  };

  // Authentication & Security
  @Column({ type: 'jsonb', nullable: true })
  security?: {
    requireAuthentication: boolean;
    useOAuth2: boolean;
    oauth2Config?: {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      accessToken: string;
      expiresAt: Date;
    };
    ipWhitelist: string[];
    lastPasswordChange: Date;
    passwordExpiresAt?: Date;
  };

  // Monitoring & Analytics
  @Column({ type: 'jsonb', nullable: true })
  monitoring?: {
    reputationScore: number;
    bounceRate: number;
    complaintRate: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    lastReputationCheck: Date;
    blacklistStatus: string[];
    dailyStats: {
      date: string;
      sent: number;
      delivered: number;
      bounced: number;
      complained: number;
    }[];
  };

  // Settings
  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    autoReplyEnabled: boolean;
    autoReplyMessage?: string;
    signatureEnabled: boolean;
    signatureText?: string;
    signatureHtml?: string;
    trackingEnabled: boolean;
    unsubscribeHeader: boolean;
    listUnsubscribeHeader: boolean;
    priority: number; // 1-10, higher = more important
    fallbackMailboxId?: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  suspendedAt?: Date;

  @Column({ type: 'text', nullable: true })
  suspensionReason?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isReady(): boolean {
    return this.isActive && this.status === MailboxStatus.ACTIVE;
  }

  get canSendEmails(): boolean {
    return this.isReady && this.hasValidCredentials;
  }

  get hasValidCredentials(): boolean {
    if (this.type === MailboxType.SMTP) {
      return !!(this.smtpHost && this.smtpPort && this.smtpUsername && this.smtpPassword);
    }
    if (this.type === MailboxType.SES) {
      return !!(this.providerSettings?.apiKey && this.providerSettings?.region);
    }
    return !!(this.providerSettings?.apiKey);
  }

  get isWarmingUp(): boolean {
    return this.status === MailboxStatus.WARMING_UP;
  }

  get currentDailyLimit(): number {
    if (!this.sendingConfig) return 0;
    
    if (this.sendingConfig.warmupEnabled) {
      return this.sendingConfig.currentWarmupRate;
    }
    
    return this.sendingConfig.maxEmailsPerDay;
  }

  get isInBusinessHours(): boolean {
    if (!this.sendingConfig?.businessHoursOnly) return true;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    
    // Check if it's a business day
    if (!this.sendingConfig.businessDays.includes(currentDay)) return false;
    
    const startTime = this.sendingConfig.businessHoursStart.split(':').map(Number);
    const endTime = this.sendingConfig.businessHoursEnd.split(':').map(Number);
    
    const currentTime = currentHour * 60 + currentMinute;
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];
    
    return currentTime >= startMinutes && currentTime <= endMinutes;
  }

  get smtpConfig(): any {
    if (this.type !== MailboxType.SMTP) return null;
    
    return {
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpSecure,
      auth: {
        user: this.smtpUsername,
        pass: this.smtpPassword,
      },
    };
  }
}
