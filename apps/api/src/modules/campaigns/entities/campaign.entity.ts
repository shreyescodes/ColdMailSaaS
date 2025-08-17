import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator';

import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Mailbox } from '../../mailboxes/entities/mailbox.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum CampaignType {
  SINGLE_EMAIL = 'single_email',
  SEQUENCE = 'sequence',
  DRIP = 'drip',
  A_B_TEST = 'a_b_test',
}

export enum CampaignPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('campaigns')
@Index(['organizationId'])
@Index(['status'])
@Index(['scheduledAt'])
@Index(['createdByUserId'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  description?: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.SINGLE_EMAIL,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({
    type: 'enum',
    enum: CampaignPriority,
    default: CampaignPriority.NORMAL,
  })
  priority: CampaignPriority;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @Column({ type: 'uuid', nullable: true })
  assignedUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser?: User;

  @Column({ type: 'uuid', nullable: true })
  primaryMailboxId?: string;

  @ManyToOne(() => Mailbox, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primaryMailboxId' })
  primaryMailbox?: Mailbox;

  // Campaign Configuration
  @Column({ type: 'jsonb', nullable: true })
  config?: {
    subject: string;
    subjectVariants?: string[];
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    templateId?: string;
    htmlContent?: string;
    textContent?: string;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
    }>;
    customHeaders?: Record<string, string>;
    trackingEnabled: boolean;
    unsubscribeHeader: boolean;
    listUnsubscribeHeader: boolean;
  };

  // Sequence Configuration
  @Column({ type: 'jsonb', nullable: true })
  sequence?: {
    steps: Array<{
      id: string;
      order: number;
      delay: number; // hours
      subject: string;
      htmlContent: string;
      textContent: string;
      conditions?: Record<string, any>;
    }>;
    maxSteps: number;
    stopOnReply: boolean;
    stopOnUnsubscribe: boolean;
    stopOnBounce: boolean;
  };

  // Targeting & Segmentation
  @Column({ type: 'jsonb', nullable: true })
  targeting?: {
    contactListIds: string[];
    filters?: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
      value: any;
    }>;
    excludeFilters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    maxContacts?: number;
    sampleSize?: number;
  };

  // Scheduling
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  // Sending Configuration
  @Column({ type: 'jsonb', nullable: true })
  sendingConfig?: {
    maxEmailsPerDay: number;
    maxEmailsPerHour: number;
    maxEmailsPerMinute: number;
    timezone: string;
    businessHoursOnly: boolean;
    businessHoursStart: string; // HH:MM
    businessHoursEnd: string; // HH:MM
    businessDays: number[]; // 0-6 (Sunday-Saturday)
    delayBetweenEmails: number; // seconds
    mailboxRotation: boolean;
    fallbackMailboxes: string[];
    retryAttempts: number;
    retryDelay: number; // minutes
  };

  // Limits & Quotas
  @Column({ type: 'jsonb', nullable: true })
  limits?: {
    totalContacts: number;
    sentEmails: number;
    maxBounceRate: number;
    maxComplaintRate: number;
    maxUnsubscribeRate: number;
    dailyBudget?: number;
    totalBudget?: number;
  };

  // A/B Testing
  @Column({ type: 'jsonb', nullable: true })
  abTesting?: {
    enabled: boolean;
    testType: 'subject' | 'content' | 'send_time';
    variants: Array<{
      id: string;
      name: string;
      weight: number;
      config: any;
      performance?: {
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
        unsubscribed: number;
        bounced: number;
      };
    }>;
    testSize: number;
    testDuration: number; // hours
    winnerCriteria: 'open_rate' | 'click_rate' | 'reply_rate' | 'conversion_rate';
    winnerSelected?: string;
  };

  // Settings
  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    autoReplyEnabled: boolean;
    autoReplyMessage?: string;
    signatureEnabled: boolean;
    signatureText?: string;
    signatureHtml?: string;
    personalizationEnabled: boolean;
    dynamicVariables: string[];
    complianceChecks: boolean;
    spamCheckEnabled: boolean;
    blacklistCheckEnabled: boolean;
  };

  // Progress Tracking
  @Column({ type: 'jsonb', nullable: true })
  progress?: {
    totalContacts: number;
    processedContacts: number;
    sentEmails: number;
    failedEmails: number;
    bouncedEmails: number;
    unsubscribedEmails: number;
    repliedEmails: number;
    openedEmails: number;
    clickedEmails: number;
    currentStep?: number;
    estimatedCompletion?: Date;
  };

  // Analytics & Metrics
  @Column({ type: 'jsonb', nullable: true })
  metrics?: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
    complaintRate: number;
    unsubscribeRate: number;
    conversionRate: number;
    revenue?: number;
    cost?: number;
    roi?: number;
    lastCalculated: Date;
  };

  @Column({ default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isScheduled(): boolean {
    return this.status === CampaignStatus.SCHEDULED;
  }

  get isRunning(): boolean {
    return this.status === CampaignStatus.ACTIVE;
  }

  get isCompleted(): boolean {
    return this.status === CampaignStatus.COMPLETED;
  }

  get isCancelled(): boolean {
    return this.status === CampaignStatus.CANCELLED;
  }

  get canStart(): boolean {
    return this.status === CampaignStatus.DRAFT || this.status === CampaignStatus.SCHEDULED;
  }

  get canPause(): boolean {
    return this.status === CampaignStatus.ACTIVE;
  }

  get canResume(): boolean {
    return this.status === CampaignStatus.PAUSED;
  }

  get canCancel(): boolean {
    return [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED, CampaignStatus.ACTIVE, CampaignStatus.PAUSED].includes(this.status);
  }

  get progressPercentage(): number {
    if (!this.progress || this.progress.totalContacts === 0) return 0;
    return (this.progress.processedContacts / this.progress.totalContacts) * 100;
  }

  get estimatedTimeRemaining(): number | null {
    if (!this.progress || !this.sendingConfig) return null;
    
    const remainingContacts = this.progress.totalContacts - this.progress.processedContacts;
    const emailsPerHour = this.sendingConfig.maxEmailsPerHour;
    
    if (emailsPerHour === 0) return null;
    
    return Math.ceil(remainingContacts / emailsPerHour);
  }

  get isOverBudget(): boolean {
    if (!this.limits || !this.metrics) return false;
    
    if (this.limits.dailyBudget && this.metrics.cost) {
      return this.metrics.cost > this.limits.dailyBudget;
    }
    
    if (this.limits.totalBudget && this.metrics.cost) {
      return this.metrics.cost > this.limits.totalBudget;
    }
    
    return false;
  }

  get hasReachedLimits(): boolean {
    if (!this.limits || !this.metrics) return false;
    
    return (
      this.metrics.bounceRate > this.limits.maxBounceRate ||
      this.metrics.complaintRate > this.limits.maxComplaintRate ||
      this.metrics.unsubscribeRate > this.limits.maxUnsubscribeRate
    );
  }
}
