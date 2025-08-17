import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

import { Organization } from '../../organizations/entities/organization.entity';
import { WorkflowExecution } from './workflow-execution.entity';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  trigger: {
    type: 'email_opened' | 'email_clicked' | 'email_replied' | 'email_bounced' | 'contact_added' | 'campaign_started' | 'manual';
    conditions: {
      field: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
      value: any;
    }[];
  };

  @Column({ type: 'jsonb' })
  actions: {
    type: 'send_email' | 'add_to_campaign' | 'update_contact' | 'send_webhook' | 'wait' | 'condition';
    config: any;
    order: number;
  }[];

  @Column({ default: true })
  isActive: boolean;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => WorkflowExecution, execution => execution.workflow)
  executions: WorkflowExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
