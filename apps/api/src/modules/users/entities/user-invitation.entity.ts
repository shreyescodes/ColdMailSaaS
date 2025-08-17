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
import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

import { Organization } from '../../organizations/entities/organization.entity';
import { User } from './user.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('user_invitations')
@Index(['email', 'organizationId'], { unique: true })
@Index(['token'], { unique: true })
export class UserInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Column({ type: 'uuid' })
  @IsUUID()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid' })
  @IsUUID()
  invitedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedByUserId' })
  invitedByUser: User;

  @Column({ unique: true })
  token: string;

  @Column({ default: false })
  isAccepted: boolean;

  @Column({ nullable: true })
  acceptedAt?: Date;

  @Column({ nullable: true })
  acceptedByUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acceptedByUserId' })
  acceptedByUser: User;

  @Column({ default: false })
  isExpiredFlag: boolean;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    message?: string;
    customFields?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  get canBeAccepted(): boolean {
    return !this.isAccepted && !this.isExpired;
  }

  get daysUntilExpiry(): number {
    if (!this.expiresAt) return 0;
    const now = new Date();
    const diffTime = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
