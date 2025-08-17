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
import { DomainsService, CreateDomainDto, UpdateDomainDto } from './domains.service';
import { Domain } from './entities/domain.entity';

@ApiTags('domains')
@Controller('domains')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post()
  @RequirePermissions({ resource: 'domains', action: 'create' })
  @ApiOperation({ summary: 'Create a new domain' })
  @ApiResponse({ status: 201, description: 'Domain created successfully', type: Domain })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createDomain(
    @Body() createDomainDto: CreateDomainDto,
    @Request() req,
  ): Promise<Domain> {
    // Ensure the domain is created for the user's organization
    createDomainDto.organizationId = req.user.organizationId;
    return this.domainsService.createDomain(createDomainDto);
  }

  @Get()
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Get all domains for the organization' })
  @ApiResponse({ status: 200, description: 'Domains retrieved successfully', type: [Domain] })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDomains(@Request() req): Promise<Domain[]> {
    return this.domainsService.findByOrganization(req.user.organizationId);
  }

  @Get('stats')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Get domain statistics for the organization' })
  @ApiResponse({ status: 200, description: 'Domain stats retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDomainStats(@Request() req) {
    return this.domainsService.getDomainStats(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Get a domain by ID' })
  @ApiResponse({ status: 200, description: 'Domain retrieved successfully', type: Domain })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDomain(@Param('id') id: string): Promise<Domain> {
    return this.domainsService.findById(id);
  }

  @Put(':id')
  @RequirePermissions({ resource: 'domains', action: 'update' })
  @ApiOperation({ summary: 'Update a domain' })
  @ApiResponse({ status: 200, description: 'Domain updated successfully', type: Domain })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateDomain(
    @Param('id') id: string,
    @Body() updateDomainDto: UpdateDomainDto,
  ): Promise<Domain> {
    return this.domainsService.updateDomain(id, updateDomainDto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'domains', action: 'delete' })
  @ApiOperation({ summary: 'Delete a domain' })
  @ApiResponse({ status: 200, description: 'Domain deleted successfully' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteDomain(@Param('id') id: string): Promise<void> {
    return this.domainsService.deleteDomain(id);
  }

  @Post(':id/verify')
  @RequirePermissions({ resource: 'domains', action: 'update' })
  @ApiOperation({ summary: 'Verify domain DNS records' })
  @ApiResponse({ status: 200, description: 'Domain verification completed' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 400, description: 'Domain not verifiable' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async verifyDomain(@Param('id') id: string) {
    return this.domainsService.verifyDomain(id);
  }

  @Post(':id/verify/resend')
  @RequirePermissions({ resource: 'domains', action: 'update' })
  @ApiOperation({ summary: 'Resend domain verification' })
  @ApiResponse({ status: 200, description: 'Domain verification reset', type: Domain })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 400, description: 'Domain already verified' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async resendVerification(@Param('id') id: string): Promise<Domain> {
    return this.domainsService.resendVerification(id);
  }

  @Get(':id/health')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Check domain health and reputation' })
  @ApiResponse({ status: 200, description: 'Domain health check completed' })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async checkDomainHealth(@Param('id') id: string) {
    return this.domainsService.checkDomainHealth(id);
  }

  @Post(':id/suspend')
  @RequirePermissions({ resource: 'domains', action: 'update' })
  @ApiOperation({ summary: 'Suspend a domain' })
  @ApiResponse({ status: 200, description: 'Domain suspended successfully', type: Domain })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async suspendDomain(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<Domain> {
    return this.domainsService.suspendDomain(id, body.reason);
  }

  @Post(':id/activate')
  @RequirePermissions({ resource: 'domains', action: 'update' })
  @ApiOperation({ summary: 'Activate a suspended domain' })
  @ApiResponse({ status: 200, description: 'Domain activated successfully', type: Domain })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 400, description: 'Domain not suspended' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async activateDomain(@Param('id') id: string): Promise<Domain> {
    return this.domainsService.activateDomain(id);
  }
}
