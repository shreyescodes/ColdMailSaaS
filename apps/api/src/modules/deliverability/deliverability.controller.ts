import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { DeliverabilityService, DeliverabilityMetrics, BlacklistStatus, ReputationReport } from './deliverability.service';

@ApiTags('deliverability')
@Controller('deliverability')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DeliverabilityController {
  constructor(private readonly deliverabilityService: DeliverabilityService) {}

  @Get('domains/:domainId/metrics')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Get domain deliverability metrics' })
  @ApiResponse({ status: 200, description: 'Deliverability metrics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDeliverabilityMetrics(
    @Param('domainId') domainId: string,
    @Request() req,
  ): Promise<DeliverabilityMetrics> {
    return this.deliverabilityService.getDeliverabilityMetrics(domainId);
  }

  @Get('domains/:domainId/blacklist-status')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Check domain blacklist status' })
  @ApiResponse({ status: 200, description: 'Blacklist status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async checkBlacklistStatus(
    @Param('domainId') domainId: string,
    @Request() req,
  ): Promise<BlacklistStatus> {
    // Extract domain name from domainId for blacklist checking
    // In production, you would get the actual domain name
    const domain = 'example.com'; // Placeholder
    return this.deliverabilityService.checkBlacklistStatus(domain);
  }

  @Get('domains/:domainId/reputation-report')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Generate domain reputation report' })
  @ApiResponse({ status: 200, description: 'Reputation report generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateReputationReport(
    @Param('domainId') domainId: string,
    @Request() req,
  ): Promise<ReputationReport> {
    return this.deliverabilityService.generateReputationReport(domainId);
  }

  @Get('domains/:domainId/optimize')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Get deliverability optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimization recommendations retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async optimizeDeliverability(
    @Param('domainId') domainId: string,
    @Request() req,
  ) {
    return this.deliverabilityService.optimizeDeliverability(domainId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check deliverability service health' })
  @ApiResponse({ status: 200, description: 'Deliverability service status' })
  async checkHealth() {
    return {
      service: 'deliverability',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: [
        'Deliverability metrics',
        'Blacklist monitoring',
        'Reputation reporting',
        'Optimization recommendations',
      ],
    };
  }
}
