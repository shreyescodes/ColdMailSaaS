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
import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

export enum ContactListType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  SEGMENT = 'segment',
  IMPORT = 'import',
}

export enum ContactListStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('contact_lists')
@Index(['organizationId'])
@Index(['status'])
@Index(['type'])
export class ContactList {
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
    enum: ContactListType,
    default: ContactListType.STATIC,
  })
  type: ContactListType;

  @Column({
    type: 'enum',
    enum: ContactListStatus,
    default: ContactListStatus.ACTIVE,
  })
  status: ContactListStatus;

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

  // List Configuration
  @Column({ type: 'jsonb', nullable: true })
  config?: {
    allowDuplicates: boolean;
    requireOptIn: boolean;
    doubleOptIn: boolean;
    maxContacts?: number;
    autoCleanup: boolean;
  };

  // Segmentation Rules
  @Column({ type: 'jsonb', nullable: true })
  segmentationRules?: {
    filters: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
      value: any;
    }>;
    excludeFilters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };

  // List Statistics
  @Column({ type: 'jsonb', nullable: true })
  stats?: {
    totalContacts: number;
    activeContacts: number;
    unsubscribedContacts: number;
    bouncedContacts: number;
    complainedContacts: number;
  };

  // Tags & Segments
  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  segments?: string[];

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
  get isDynamic(): boolean {
    return this.type === ContactListType.DYNAMIC;
  }

  get totalContacts(): number {
    return this.stats?.totalContacts || 0;
  }

  get activeContacts(): number {
    return this.stats?.activeContacts || 0;
  }

  get canSendEmails(): boolean {
    return this.isActive && this.totalContacts > 0 && this.activeContacts > 0;
  }
}
