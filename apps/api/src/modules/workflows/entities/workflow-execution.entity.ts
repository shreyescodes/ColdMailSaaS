import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

import { Workflow } from './workflow.entity';

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column({ type: 'enum', enum: ['running', 'completed', 'failed', 'cancelled'] })
  status: 'running' | 'completed' | 'failed' | 'cancelled';

  @Column({ type: 'jsonb', nullable: true })
  context: any;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  executionTime: number; // in milliseconds
}
