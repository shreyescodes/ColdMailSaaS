import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { Workflow } from './entities/workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Contact } from '../campaigns/entities/contact.entity';
import { Email } from '../campaigns/entities/email.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowExecution, Campaign, Contact, Email]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
