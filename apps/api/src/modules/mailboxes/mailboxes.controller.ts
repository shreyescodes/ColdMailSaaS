import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { MailboxesService, CreateMailboxDto, UpdateMailboxDto, TestMailboxDto } from './mailboxes.service';
import { Mailbox } from './entities/mailbox.entity';

@ApiTags('mailboxes')
@Controller('mailboxes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MailboxesController {
  constructor(private readonly mailboxesService: MailboxesService) {}

  @Post()
  @RequirePermissions({ resource: 'mailboxes', action: 'create' })
  @ApiOperation({ summary: 'Create a new mailbox' })
  @ApiResponse({ status: 201, description: 'Mailbox created successfully', type: Mailbox })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createMailbox(
    @Body() createMailboxDto: CreateMailboxDto,
    @Request() req,
  ): Promise<Mailbox> {
    // Ensure the mailbox is created for the user's organization
    createMailboxDto.organizationId = req.user.organizationId;
    return this.mailboxesService.createMailbox(createMailboxDto);
  }

  @Get()
  @RequirePermissions({ resource: 'mailboxes', action: 'read' })
  @ApiOperation({ summary: 'Get all mailboxes for the organization' })
  @ApiResponse({ status: 200, description: 'Mailboxes retrieved successfully', type: [Mailbox] })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMailboxes(@Request() req): Promise<Mailbox[]> {
    return this.mailboxesService.findByOrganization(req.user.organizationId);
  }

  @Get('available')
  @RequirePermissions({ resource: 'mailboxes', action: 'read' })
  @ApiOperation({ summary: 'Get available mailboxes for sending' })
  @ApiResponse({ status: 200, description: 'Available mailboxes retrieved successfully', type: [Mailbox] })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAvailableMailboxes(@Request() req): Promise<Mailbox[]> {
    return this.mailboxesService.getAvailableMailboxes(req.user.organizationId);
  }

  @Get('stats')
  @RequirePermissions({ resource: 'mailboxes', action: 'read' })
  @ApiOperation({ summary: 'Get mailbox statistics for the organization' })
  @ApiResponse({ status: 200, description: 'Mailbox stats retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMailboxStats(@Request() req) {
    return this.mailboxesService.getMailboxStats(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'mailboxes', action: 'read' })
  @ApiOperation({ summary: 'Get a mailbox by ID' })
  @ApiResponse({ status: 200, description: 'Mailbox retrieved successfully', type: Mailbox })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMailbox(@Param('id') id: string): Promise<Mailbox> {
    return this.mailboxesService.findById(id);
  }

  @Put(':id')
  @RequirePermissions({ resource: 'mailboxes', action: 'update' })
  @ApiOperation({ summary: 'Update a mailbox' })
  @ApiResponse({ status: 200, description: 'Mailbox updated successfully', type: Mailbox })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateMailbox(
    @Param('id') id: string,
    @Body() updateMailboxDto: UpdateMailboxDto,
  ): Promise<Mailbox> {
    return this.mailboxesService.updateMailbox(id, updateMailboxDto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'mailboxes', action: 'delete' })
  @ApiOperation({ summary: 'Delete a mailbox' })
  @ApiResponse({ status: 200, description: 'Mailbox deleted successfully' })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteMailbox(@Param('id') id: string): Promise<void> {
    return this.mailboxesService.deleteMailbox(id);
  }

  @Post(':id/test-connection')
  @RequirePermissions({ resource: 'mailboxes', action: 'update' })
  @ApiOperation({ summary: 'Test mailbox connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 400, description: 'Invalid mailbox type' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async testConnection(@Param('id') id: string) {
    const mailbox = await this.mailboxesService.findById(id);
    return this.mailboxesService.testMailboxConnection(mailbox);
  }

  @Post(':id/test-sending')
  @RequirePermissions({ resource: 'mailboxes', action: 'update' })
  @ApiOperation({ summary: 'Test mailbox by sending a test email' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 400, description: 'Mailbox not ready' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async testSending(
    @Param('id') id: string,
    @Body() testMailboxDto: TestMailboxDto,
  ) {
    return this.mailboxesService.testMailboxSending(id, testMailboxDto);
  }

  @Post(':id/rotate')
  @RequirePermissions({ resource: 'mailboxes', action: 'update' })
  @ApiOperation({ summary: 'Rotate mailbox usage for load balancing' })
  @ApiResponse({ status: 200, description: 'Mailbox rotation completed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async rotateMailboxes(@Request() req) {
    return this.mailboxesService.rotateMailboxUsage(req.user.organizationId);
  }

  @Post(':id/warmup')
  @RequirePermissions({ resource: 'mailboxes', action: 'update' })
  @ApiOperation({ summary: 'Start or continue mailbox warmup process' })
  @ApiResponse({ status: 200, description: 'Mailbox warmup started', type: Mailbox })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 400, description: 'Warmup not enabled or mailbox not active' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async warmupMailbox(@Param('id') id: string): Promise<Mailbox> {
    return this.mailboxesService.warmupMailbox(id);
  }

  @Post(':id/suspend')
  @RequirePermissions({ resource: 'mailboxes', action: 'update' })
  @ApiOperation({ summary: 'Suspend a mailbox' })
  @ApiResponse({ status: 200, description: 'Mailbox suspended successfully', type: Mailbox })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async suspendMailbox(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<Mailbox> {
    return this.mailboxesService.updateMailboxStatus(id, 'suspended', body.reason);
  }

  @Post(':id/activate')
  @RequirePermissions({ resource: 'mailboxes', action: 'update' })
  @ApiOperation({ summary: 'Activate a suspended mailbox' })
  @ApiResponse({ status: 200, description: 'Mailbox activated successfully', type: Mailbox })
  @ApiResponse({ status: 404, description: 'Mailbox not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async activateMailbox(@Param('id') id: string): Promise<Mailbox> {
    return this.mailboxesService.updateMailboxStatus(id, 'active');
  }
}
