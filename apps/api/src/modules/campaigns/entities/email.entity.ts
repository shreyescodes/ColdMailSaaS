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
import { IsNotEmpty, IsOptional, IsEmail, IsDateString, IsNumber } from 'class-validator';

import { Organization } from '../../organizations/entities/organization.entity';
import { Campaign } from './campaign.entity';
import { Contact } from './contact.entity';
import { Mailbox } from '../../mailboxes/entities/mailbox.entity';

export enum EmailStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  UNSUBSCRIBED = 'unsubscribed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum EmailType {
  CAMPAIGN = 'campaign',
  SEQUENCE = 'sequence',
  DRIP = 'drip',
  TEST = 'test',
  TRANSACTIONAL = 'transactional',
}

export enum BounceType {
  HARD = 'hard',
  SOFT = 'soft',
  BLOCKED = 'blocked',
  UNKNOWN = 'unknown',
}

@Entity('emails')
@Index(['organizationId'])
@Index(['campaignId'])
@Index(['contactId'])
@Index(['mailboxId'])
@Index(['status'])
@Index(['sentAt'])
@Index(['messageId'])
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid', nullable: true })
  campaignId?: string;

  @ManyToOne(() => Campaign, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaignId' })
  campaign?: Campaign;

  @Column({ type: 'uuid' })
  contactId: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ type: 'uuid' })
  mailboxId: string;

  @ManyToOne(() => Mailbox, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mailboxId' })
  mailbox: Mailbox;

  // Email Configuration
  @Column({
    type: 'enum',
    enum: EmailType,
    default: EmailType.CAMPAIGN,
  })
  type: EmailType;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  status: EmailStatus;

  @Column()
  @IsNotEmpty()
  @IsEmail()
  toEmail: string;

  @Column()
  @IsNotEmpty()
  toName: string;

  @Column()
  @IsNotEmpty()
  fromEmail: string;

  @Column()
  @IsNotEmpty()
  fromName: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @Column()
  @IsNotEmpty()
  subject: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  htmlContent?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  textContent?: string;

  // Message Tracking
  @Column({ unique: true })
  messageId: string;

  @Column({ nullable: true })
  @IsOptional()
  externalMessageId?: string;

  @Column({ nullable: true })
  @IsOptional()
  threadId?: string;

  @Column({ nullable: true })
  @IsOptional()
  inReplyTo?: string;

  @Column({ nullable: true })
  @IsOptional()
  references?: string;

  // Sequence & Campaign Tracking
  @Column({ nullable: true })
  @IsOptional()
  sequenceId?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber()
  stepNumber?: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber()
  sequenceStep?: number;

  // Sending Information
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  queuedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  openedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  clickedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  repliedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  bouncedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  complainedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  unsubscribedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  failedAt?: Date;

  // Engagement Tracking
  @Column({ type: 'jsonb', nullable: true })
  tracking?: {
    openCount: number;
    clickCount: number;
    lastOpenedAt?: Date;
    lastClickedAt?: Date;
    openIpAddresses?: string[];
    clickIpAddresses?: string[];
    userAgents?: string[];
    locations?: Array<{
      country?: string;
      region?: string;
      city?: string;
      ip?: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  clicks?: Array<{
    url: string;
    clickedAt: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
  }>;

  // Bounce & Complaint Information
  @Column({ type: 'jsonb', nullable: true })
  bounceInfo?: {
    type: BounceType;
    reason: string;
    code?: string;
    diagnosticCode?: string;
    action?: string;
    status?: string;
    isPermanent: boolean;
    feedbackId?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  complaintInfo?: {
    reason: string;
    feedbackId?: string;
    userAgent?: string;
    ipAddress?: string;
    reportedAt: Date;
  };

  // Unsubscribe Information
  @Column({ type: 'jsonb', nullable: true })
  unsubscribeInfo?: {
    reason?: string;
    source?: string;
    ipAddress?: string;
    userAgent?: string;
    canResubscribe: boolean;
  };

  // Reply Information
  @Column({ type: 'jsonb', nullable: true })
  replyInfo?: {
    subject?: string;
    content?: string;
    fromEmail?: string;
    fromName?: string;
    receivedAt: Date;
    threadId?: string;
  };

  // Delivery & SMTP Information
  @Column({ type: 'jsonb', nullable: true })
  deliveryInfo?: {
    smtpResponse?: string;
    smtpCode?: string;
    serverIp?: string;
    serverName?: string;
    deliveryAttempts: number;
    lastAttemptAt?: Date;
    retryCount: number;
    maxRetries: number;
  };

  // Performance Metrics
  @Column({ type: 'jsonb', nullable: true })
  metrics?: {
    sendTime?: number; // milliseconds
    deliveryTime?: number; // milliseconds
    openTime?: number; // milliseconds from sent to first open
    clickTime?: number; // milliseconds from sent to first click
    replyTime?: number; // milliseconds from sent to reply
    size: number; // bytes
    priority?: number;
  };

  // Error Information
  @Column({ type: 'jsonb', nullable: true })
  errorInfo?: {
    error: string;
    code?: string;
    details?: string;
    retryable: boolean;
    attempts: number;
    maxAttempts: number;
  };

  // Compliance & Security
  @Column({ type: 'jsonb', nullable: true })
  compliance?: {
    dkimVerified: boolean;
    spfVerified: boolean;
    dmarcVerified: boolean;
    spamScore?: number;
    virusScanPassed: boolean;
    contentFilterPassed: boolean;
    unsubscribeHeader: boolean;
    listUnsubscribeHeader: boolean;
  };

  // Custom Headers & Metadata
  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isDelivered(): boolean {
    return this.status === EmailStatus.DELIVERED;
  }

  get isOpened(): boolean {
    return this.status === EmailStatus.OPENED;
  }

  get isClicked(): boolean {
    return this.status === EmailStatus.CLICKED;
  }

  get isReplied(): boolean {
    return this.status === EmailStatus.REPLIED;
  }

  get isBounced(): boolean {
    return this.status === EmailStatus.BOUNCED;
  }

  get isComplained(): boolean {
    return this.status === EmailStatus.COMPLAINED;
  }

  get isUnsubscribed(): boolean {
    return this.status === EmailStatus.UNSUBSCRIBED;
  }

  get isFailed(): boolean {
    return this.status === EmailStatus.FAILED;
  }

  get isCompleted(): boolean {
    return [
      EmailStatus.DELIVERED,
      EmailStatus.OPENED,
      EmailStatus.CLICKED,
      EmailStatus.REPLIED,
      EmailStatus.BOUNCED,
      EmailStatus.COMPLAINED,
      EmailStatus.UNSUBSCRIBED,
      EmailStatus.FAILED,
    ].includes(this.status);
  }

  get openRate(): number {
    if (!this.tracking) return 0;
    return this.tracking.openCount > 0 ? 100 : 0;
  }

  get clickRate(): number {
    if (!this.tracking) return 0;
    return this.tracking.clickCount > 0 ? 100 : 0;
  }

  get timeToOpen(): number | null {
    if (!this.sentAt || !this.openedAt) return null;
    return this.openedAt.getTime() - this.sentAt.getTime();
  }

  get timeToClick(): number | null {
    if (!this.sentAt || !this.clickedAt) return null;
    return this.clickedAt.getTime() - this.sentAt.getTime();
  }

  get timeToReply(): number | null {
    if (!this.sentAt || !this.repliedAt) return null;
    return this.repliedAt.getTime() - this.sentAt.getTime();
  }

  get deliveryTime(): number | null {
    if (!this.sentAt || !this.deliveredAt) return null;
    return this.deliveredAt.getTime() - this.sentAt.getTime();
  }

  get isEngaged(): boolean {
    return this.isOpened || this.isClicked || this.isReplied;
  }

  get engagementScore(): number {
    let score = 0;
    if (this.isOpened) score += 10;
    if (this.isClicked) score += 20;
    if (this.isReplied) score += 50;
    return score;
  }

  get canRetry(): boolean {
    return (
      this.status === EmailStatus.FAILED &&
      this.errorInfo?.retryable &&
      this.errorInfo.attempts < this.errorInfo.maxAttempts
    );
  }

  get isPermanentBounce(): boolean {
    return this.bounceInfo?.isPermanent || false;
  }

  get isSoftBounce(): boolean {
    return this.bounceInfo?.type === BounceType.SOFT;
  }

  get isHardBounce(): boolean {
    return this.bounceInfo?.type === BounceType.HARD;
  }
}
