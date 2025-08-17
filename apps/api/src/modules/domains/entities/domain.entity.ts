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
import { IsNotEmpty, IsUrl, IsOptional } from 'class-validator';

import { Organization } from '../../organizations/entities/organization.entity';
import { Mailbox } from '../../mailboxes/entities/mailbox.entity';

export enum DomainStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  VERIFIED = 'verified',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}

export enum DomainType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  ALIAS = 'alias',
}

@Entity('domains')
@Index(['domain', 'organizationId'], { unique: true })
@Index(['status'])
@Index(['organizationId'])
export class Domain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  domain: string;

  @Column({
    type: 'enum',
    enum: DomainType,
    default: DomainType.PRIMARY,
  })
  type: DomainType;

  @Column({
    type: 'enum',
    enum: DomainStatus,
    default: DomainStatus.PENDING,
  })
  status: DomainStatus;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  @IsOptional()
  @IsUrl()
  website?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // DNS Records
  @Column({ type: 'jsonb', nullable: true })
  dnsRecords?: {
    spf?: string;
    dkim?: {
      selector: string;
      publicKey: string;
      algorithm: string;
    };
    dmarc?: string;
    mx?: string[];
    a?: string[];
    cname?: string[];
  };

  // Verification
  @Column({ type: 'jsonb', nullable: true })
  verification?: {
    spfVerified: boolean;
    dkimVerified: boolean;
    dmarcVerified: boolean;
    mxVerified: boolean;
    lastChecked: Date;
    verificationToken?: string;
  };

  // Settings
  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    allowSubdomains: boolean;
    maxSubdomains: number;
    requireDkim: boolean;
    requireDmarc: boolean;
    warmupEnabled: boolean;
    warmupRate: number; // emails per day
    reputationMonitoring: boolean;
  };

  // Limits
  @Column({ type: 'jsonb', nullable: true })
  limits?: {
    maxEmailsPerDay: number;
    maxEmailsPerHour: number;
    maxConcurrentCampaigns: number;
    maxContactLists: number;
  };

  // Monitoring
  @Column({ type: 'jsonb', nullable: true })
  monitoring?: {
    reputationScore: number;
    bounceRate: number;
    complaintRate: number;
    lastReputationCheck: Date;
    blacklistStatus: string[];
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  suspendedAt?: Date;

  @Column({ type: 'text', nullable: true })
  suspensionReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isVerified(): boolean {
    return this.status === DomainStatus.VERIFIED;
  }

  get isVerifiable(): boolean {
    return this.status === DomainStatus.PENDING || this.status === DomainStatus.FAILED;
  }

  get verificationProgress(): number {
    if (!this.verification) return 0;
    
    const checks = [
      this.verification.spfVerified,
      this.verification.dkimVerified,
      this.verification.dmarcVerified,
      this.verification.mxVerified,
    ];
    
    return (checks.filter(Boolean).length / checks.length) * 100;
  }

  get canSendEmails(): boolean {
    return this.isActive && this.isVerified && this.status !== DomainStatus.SUSPENDED;
  }

  get dkimSelector(): string {
    return this.dnsRecords?.dkim?.selector || 'default';
  }

  get dkimPublicKey(): string {
    return this.dnsRecords?.dkim?.publicKey || '';
  }
}
