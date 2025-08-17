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
import { IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsDateString } from 'class-validator';

import { Organization } from '../../organizations/entities/organization.entity';
import { Campaign } from './campaign.entity';

export enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  SPAM = 'spam',
}

export enum ContactSource {
  MANUAL = 'manual',
  IMPORT = 'import',
  SIGNUP = 'signup',
  API = 'api',
  INTEGRATION = 'integration',
}

@Entity('contacts')
@Index(['email', 'organizationId'], { unique: true })
@Index(['organizationId'])
@Index(['status'])
@Index(['source'])
@Index(['createdAt'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Column()
  @IsNotEmpty()
  firstName: string;

  @Column()
  @IsNotEmpty()
  lastName: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Contact Information
  @Column({ nullable: true })
  @IsOptional()
  company?: string;

  @Column({ nullable: true })
  @IsOptional()
  jobTitle?: string;

  @Column({ nullable: true })
  @IsOptional()
  phone?: string;

  @Column({ nullable: true })
  @IsOptional()
  website?: string;

  @Column({ nullable: true })
  @IsOptional()
  address?: string;

  @Column({ nullable: true })
  @IsOptional()
  city?: string;

  @Column({ nullable: true })
  @IsOptional()
  state?: string;

  @Column({ nullable: true })
  @IsOptional()
  country?: string;

  @Column({ nullable: true })
  @IsOptional()
  postalCode?: string;

  @Column({ nullable: true })
  @IsOptional()
  timezone?: string;

  @Column({ nullable: true })
  @IsOptional()
  language?: string;

  // Contact Status & Source
  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.ACTIVE,
  })
  status: ContactStatus;

  @Column({
    type: 'enum',
    enum: ContactSource,
    default: ContactSource.MANUAL,
  })
  source: ContactSource;

  // Engagement Data
  @Column({ type: 'jsonb', nullable: true })
  engagement?: {
    totalEmailsSent: number;
    totalEmailsOpened: number;
    totalEmailsClicked: number;
    totalEmailsReplied: number;
    totalEmailsBounced: number;
    totalEmailsUnsubscribed: number;
    totalEmailsComplained: number;
    lastEmailSentAt?: Date;
    lastEmailOpenedAt?: Date;
    lastEmailClickedAt?: Date;
    lastEmailRepliedAt?: Date;
    lastEmailBouncedAt?: Date;
    lastEmailUnsubscribedAt?: Date;
    lastEmailComplainedAt?: Date;
    engagementScore: number; // 0-100
    isEngaged: boolean;
    engagementLevel: 'high' | 'medium' | 'low';
  };

  // Campaign History
  @Column({ type: 'jsonb', nullable: true })
  campaignHistory?: Array<{
    campaignId: string;
    campaignName: string;
    sentAt: Date;
    openedAt?: Date;
    clickedAt?: Date;
    repliedAt?: Date;
    bouncedAt?: Date;
    unsubscribedAt?: Date;
    complainedAt?: Date;
    stepNumber?: number;
    sequenceId?: string;
  }>;

  // Segmentation & Tags
  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  segments?: string[];

  @Column({ type: 'jsonb', nullable: true })
  customFields?: Record<string, any>;

  // Compliance & Preferences
  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
    emailTypes: string[];
    timezone: string;
    language: string;
    marketingConsent: boolean;
    consentDate?: Date;
    consentIp?: string;
    consentSource?: string;
  };

  // Bounce & Complaint Tracking
  @Column({ type: 'jsonb', nullable: true })
  bounceInfo?: {
    type: 'hard' | 'soft' | 'blocked';
    reason: string;
    code?: string;
    lastBounceAt: Date;
    bounceCount: number;
    isPermanent: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  complaintInfo?: {
    reason: string;
    lastComplaintAt: Date;
    complaintCount: number;
    isBlocked: boolean;
  };

  // Unsubscribe Information
  @Column({ type: 'jsonb', nullable: true })
  unsubscribeInfo?: {
    reason?: string;
    unsubscribedAt: Date;
    unsubscribedFrom?: string;
    unsubscribedIp?: string;
    canResubscribe: boolean;
    resubscribedAt?: Date;
  };

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    importSource?: string;
    importDate?: Date;
    lastUpdated?: Date;
    externalId?: string;
    notes?: string;
    assignedTo?: string;
    priority?: 'low' | 'normal' | 'high';
  };

  // Verification
  @Column({ default: false })
  @IsBoolean()
  emailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  emailVerifiedAt?: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  emailVerificationToken?: string;

  // Activity Tracking
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  lastActivityAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  lastEngagementAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  lastCampaignAt?: Date;

  @Column({ default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get isEngaged(): boolean {
    return this.engagement?.isEngaged || false;
  }

  get engagementScore(): number {
    return this.engagement?.engagementScore || 0;
  }

  get engagementLevel(): 'high' | 'medium' | 'low' {
    return this.engagement?.engagementLevel || 'low';
  }

  get canReceiveEmails(): boolean {
    return (
      this.status === ContactStatus.ACTIVE &&
      !this.isUnsubscribed &&
      !this.isBounced &&
      !this.isComplained
    );
  }

  get isUnsubscribed(): boolean {
    return this.status === ContactStatus.UNSUBSCRIBED;
  }

  get isBounced(): boolean {
    return this.status === ContactStatus.BOUNCED;
  }

  get isComplained(): boolean {
    return this.status === ContactStatus.COMPLAINED;
  }

  get isSpam(): boolean {
    return this.status === ContactStatus.SPAM;
  }

  get openRate(): number {
    if (!this.engagement || this.engagement.totalEmailsSent === 0) return 0;
    return (this.engagement.totalEmailsOpened / this.engagement.totalEmailsSent) * 100;
  }

  get clickRate(): number {
    if (!this.engagement || this.engagement.totalEmailsSent === 0) return 0;
    return (this.engagement.totalEmailsClicked / this.engagement.totalEmailsSent) * 100;
  }

  get replyRate(): number {
    if (!this.engagement || this.engagement.totalEmailsSent === 0) return 0;
    return (this.engagement.totalEmailsReplied / this.engagement.totalEmailsSent) * 100;
  }

  get bounceRate(): number {
    if (!this.engagement || this.engagement.totalEmailsSent === 0) return 0;
    return (this.engagement.totalEmailsBounced / this.engagement.totalEmailsSent) * 100;
  }

  get unsubscribeRate(): number {
    if (!this.engagement || this.engagement.totalEmailsSent === 0) return 0;
    return (this.engagement.totalEmailsUnsubscribed / this.engagement.totalEmailsSent) * 100;
  }

  get complaintRate(): number {
    if (!this.engagement || this.engagement.totalEmailsSent === 0) return 0;
    return (this.engagement.totalEmailsComplained / this.engagement.totalEmailsSent) * 100;
  }

  get daysSinceLastEngagement(): number {
    if (!this.lastEngagementAt) return Infinity;
    const now = new Date();
    const lastEngagement = new Date(this.lastEngagementAt);
    const diffTime = Math.abs(now.getTime() - lastEngagement.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get isRecentlyEngaged(): boolean {
    return this.daysSinceLastEngagement <= 30;
  }

  get isColdContact(): boolean {
    return this.daysSinceLastEngagement > 90;
  }
}
