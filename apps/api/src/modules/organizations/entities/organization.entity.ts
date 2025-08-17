import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { User } from '../../users/entities/user.entity';
import { OrganizationType } from '../enums/organization-type.enum';

@Entity('organizations')
@Index(['slug'], { unique: true })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @IsNotEmpty()
  name: string;

  @Column({ length: 100, unique: true })
  @IsNotEmpty()
  slug: string;

  @Column({
    type: 'enum',
    enum: OrganizationType,
    default: OrganizationType.AGENCY,
  })
  type: OrganizationType;

  @Column({ nullable: true })
  @IsOptional()
  description?: string;

  @Column({ nullable: true })
  @IsOptional()
  website?: string;

  @Column({ nullable: true })
  @IsOptional()
  logoUrl?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    emailSettings?: {
      defaultFromName?: string;
      defaultReplyTo?: string;
      unsubscribeText?: string;
    };
    compliance?: {
      gdprEnabled?: boolean;
      canSpamEnabled?: boolean;
      caslEnabled?: boolean;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  limits?: {
    maxUsers?: number;
    maxCampaigns?: number;
    maxContacts?: number;
    maxEmailsPerDay?: number;
    maxDomains?: number;
    maxMailboxes?: number;
  };

  @Column({ type: 'uuid', nullable: true })
  parentOrganizationId?: string;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isAgency(): boolean {
    return this.type === OrganizationType.AGENCY;
  }

  get isClient(): boolean {
    return this.type === OrganizationType.CLIENT;
  }

  get hasParent(): boolean {
    return !!this.parentOrganizationId;
  }
}
