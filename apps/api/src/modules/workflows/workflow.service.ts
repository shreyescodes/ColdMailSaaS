import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Workflow } from './entities/workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Contact } from '../campaigns/entities/contact.entity';
import { Email } from '../campaigns/entities/email.entity';

export interface WorkflowTrigger {
  type: 'email_opened' | 'email_clicked' | 'email_replied' | 'email_bounced' | 'contact_added' | 'campaign_started' | 'manual';
  conditions: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
  }[];
}

export interface WorkflowAction {
  type: 'send_email' | 'add_to_campaign' | 'update_contact' | 'send_webhook' | 'wait' | 'condition';
  config: any;
  order: number;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  organizationId: string;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
  ) {}

  async createWorkflow(workflowData: WorkflowDefinition): Promise<Workflow> {
    const workflow = this.workflowRepository.create({
      ...workflowData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.workflowRepository.save(workflow);
  }

  async executeWorkflow(workflowId: string, context: any): Promise<WorkflowExecution> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new BadRequestException('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new BadRequestException('Workflow is not active');
    }

    // Check if trigger conditions are met
    if (!this.evaluateTrigger(workflow.trigger, context)) {
      throw new BadRequestException('Workflow trigger conditions not met');
    }

    // Create execution record
    const execution = this.workflowExecutionRepository.create({
      workflowId,
      status: 'running',
      context,
      startedAt: new Date(),
    });

    await this.workflowExecutionRepository.save(execution);

    try {
      // Execute actions in order
      for (const action of workflow.actions.sort((a, b) => a.order - b.order)) {
        await this.executeAction(action, context, execution.id);
      }

      // Update execution status
      execution.status = 'completed';
      execution.completedAt = new Date();
      await this.workflowExecutionRepository.save(execution);

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      await this.workflowExecutionRepository.save(execution);

      this.logger.error(`Workflow execution failed: ${error.message}`, error);
      throw error;
    }
  }

  async getWorkflowsByOrganization(organizationId: string): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new BadRequestException('Workflow not found');
    }

    Object.assign(workflow, updates, { updatedAt: new Date() });
    return this.workflowRepository.save(workflow);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new BadRequestException('Workflow not found');
    }

    await this.workflowRepository.remove(workflow);
  }

  async getWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    return this.workflowExecutionRepository.find({
      where: { workflowId },
      order: { startedAt: 'DESC' },
    });
  }

  private evaluateTrigger(trigger: WorkflowTrigger, context: any): boolean {
    if (trigger.type === 'manual') {
      return true; // Manual triggers are always valid
    }

    // Check if the trigger type matches the context
    if (!this.matchesTriggerType(trigger.type, context)) {
      return false;
    }

    // Evaluate all conditions
    return trigger.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    );
  }

  private matchesTriggerType(triggerType: string, context: any): boolean {
    switch (triggerType) {
      case 'email_opened':
        return context.event === 'email_opened';
      case 'email_clicked':
        return context.event === 'email_clicked';
      case 'email_replied':
        return context.event === 'email_replied';
      case 'email_bounced':
        return context.event === 'email_bounced';
      case 'contact_added':
        return context.event === 'contact_added';
      case 'campaign_started':
        return context.event === 'campaign_started';
      default:
        return false;
    }
  }

  private evaluateCondition(condition: any, context: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: any): any {
    const fieldParts = field.split('.');
    let value = context;
    
    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private async executeAction(action: WorkflowAction, context: any, executionId: string): Promise<void> {
    this.logger.log(`Executing action: ${action.type} for execution: ${executionId}`);

    switch (action.type) {
      case 'send_email':
        await this.executeSendEmailAction(action.config, context);
        break;
      case 'add_to_campaign':
        await this.executeAddToCampaignAction(action.config, context);
        break;
      case 'update_contact':
        await this.executeUpdateContactAction(action.config, context);
        break;
      case 'send_webhook':
        await this.executeWebhookAction(action.config, context);
        break;
      case 'wait':
        await this.executeWaitAction(action.config);
        break;
      case 'condition':
        await this.executeConditionAction(action.config, context);
        break;
      default:
        throw new BadRequestException(`Unknown action type: ${action.type}`);
    }
  }

  private async executeSendEmailAction(config: any, context: any): Promise<void> {
    // Implementation for sending email
    this.logger.log('Executing send email action');
  }

  private async executeAddToCampaignAction(config: any, context: any): Promise<void> {
    // Implementation for adding contact to campaign
    this.logger.log('Executing add to campaign action');
  }

  private async executeUpdateContactAction(config: any, context: any): Promise<void> {
    // Implementation for updating contact
    this.logger.log('Executing update contact action');
  }

  private async executeWebhookAction(config: any, context: any): Promise<void> {
    // Implementation for sending webhook
    this.logger.log('Executing webhook action');
  }

  private async executeWaitAction(config: any): Promise<void> {
    const delay = config.delay || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async executeConditionAction(config: any, context: any): Promise<void> {
    // Implementation for conditional logic
    this.logger.log('Executing condition action');
  }
}
