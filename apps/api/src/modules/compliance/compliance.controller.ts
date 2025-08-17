import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { ComplianceService, ComplianceCheck, SpamScoreResult } from './compliance.service';

export class SpamScoreRequest {
  emailContent: string;
  emailMetadata: any;
}

@ApiTags('compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('domains/:domainId/compliance')
  @RequirePermissions({ resource: 'domains', action: 'read' })
  @ApiOperation({ summary: 'Check domain compliance status' })
  @ApiResponse({ status: 200, description: 'Domain compliance check completed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async checkDomainCompliance(
    @Param('domainId') domainId: string,
    @Request() req,
  ): Promise<ComplianceCheck> {
    return this.complianceService.checkDomainCompliance(domainId);
  }

  @Post('spam-score')
  @RequirePermissions({ resource: 'campaigns', action: 'create' })
  @ApiOperation({ summary: 'Calculate spam score for email content' })
  @ApiResponse({ status: 201, description: 'Spam score calculated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async calculateSpamScore(
    @Body() request: SpamScoreRequest,
    @Request() req,
  ): Promise<SpamScoreResult> {
    if (!request.emailContent) {
      throw new BadRequestException('Email content is required');
    }

    return this.complianceService.calculateSpamScore(
      request.emailContent,
      request.emailMetadata || {},
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Check compliance service health' })
  @ApiResponse({ status: 200, description: 'Compliance service status' })
  async checkHealth() {
    return {
      service: 'compliance',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: [
        'Domain compliance checking',
        'SPF/DKIM/DMARC validation',
        'Spam scoring',
        'DNS record verification',
      ],
    };
  }
}
