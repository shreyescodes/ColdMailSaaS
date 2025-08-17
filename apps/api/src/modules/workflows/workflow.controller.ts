import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkflowService, WorkflowDefinition } from './workflow.service';

export class CreateWorkflowDto {
  name: string;
  description: string;
  trigger: any;
  actions: any[];
  isActive: boolean;
}

export class ExecuteWorkflowDto {
  context: any;
}

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @RequirePermissions({ resource: 'workflows', action: 'create' })
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createWorkflow(
    @Body() workflowData: CreateWorkflowDto,
    @Request() req,
  ) {
    const workflowDefinition: WorkflowDefinition = {
      ...workflowData,
      organizationId: req.user.organizationId,
    };

    return this.workflowService.createWorkflow(workflowDefinition);
  }

  @Get()
  @RequirePermissions({ resource: 'workflows', action: 'read' })
  @ApiOperation({ summary: 'Get workflows for organization' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getWorkflows(@Request() req) {
    return this.workflowService.getWorkflowsByOrganization(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'workflows', action: 'read' })
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getWorkflow(@Param('id') id: string) {
    // This would be implemented in the service
    return { id, message: 'Workflow details' };
  }

  @Put(':id')
  @RequirePermissions({ resource: 'workflows', action: 'update' })
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() updates: Partial<WorkflowDefinition>,
  ) {
    return this.workflowService.updateWorkflow(id, updates);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'workflows', action: 'delete' })
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteWorkflow(@Param('id') id: string) {
    await this.workflowService.deleteWorkflow(id);
    return { message: 'Workflow deleted successfully' };
  }

  @Post(':id/execute')
  @RequirePermissions({ resource: 'workflows', action: 'execute' })
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 201, description: 'Workflow executed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async executeWorkflow(
    @Param('id') id: string,
    @Body() executeData: ExecuteWorkflowDto,
  ) {
    if (!executeData.context) {
      throw new BadRequestException('Context is required for workflow execution');
    }

    return this.workflowService.executeWorkflow(id, executeData.context);
  }

  @Get(':id/executions')
  @RequirePermissions({ resource: 'workflows', action: 'read' })
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiResponse({ status: 200, description: 'Workflow executions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getWorkflowExecutions(@Param('id') id: string) {
    return this.workflowService.getWorkflowExecutions(id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check workflow service health' })
  @ApiResponse({ status: 200, description: 'Workflow service status' })
  async checkHealth() {
    return {
      service: 'workflows',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: [
        'Workflow automation',
        'Trigger-based execution',
        'Conditional actions',
        'Execution tracking',
      ],
    };
  }
}
