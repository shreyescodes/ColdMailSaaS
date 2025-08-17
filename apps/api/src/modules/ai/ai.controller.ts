import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { AiService, ContentSuggestionRequest, SubjectLineRequest, PersonalizationRequest } from './ai.service';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('content-suggestions')
  @RequirePermissions({ resource: 'campaigns', action: 'create' })
  @ApiOperation({ summary: 'Generate AI-powered email content suggestions' })
  @ApiResponse({ status: 201, description: 'Content suggestions generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateContentSuggestions(
    @Body() request: ContentSuggestionRequest,
    @Request() req,
  ) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI service not configured');
    }

    return this.aiService.generateContentSuggestions(request);
  }

  @Post('subject-lines')
  @RequirePermissions({ resource: 'campaigns', action: 'create' })
  @ApiOperation({ summary: 'Generate AI-powered subject line suggestions' })
  @ApiResponse({ status: 201, description: 'Subject lines generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateSubjectLines(
    @Body() request: SubjectLineRequest,
    @Request() req,
  ) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI service not configured');
    }

    return this.aiService.generateSubjectLines(request);
  }

  @Post('personalize')
  @RequirePermissions({ resource: 'campaigns', action: 'create' })
  @ApiOperation({ summary: 'Personalize email content for a specific contact' })
  @ApiResponse({ status: 201, description: 'Content personalized successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async personalizeContent(
    @Body() request: PersonalizationRequest,
    @Request() req,
  ) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI service not configured');
    }

    return this.aiService.personalizeContent(request);
  }

  @Post('analyze-performance')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Analyze email performance and get AI-powered insights' })
  @ApiResponse({ status: 201, description: 'Analysis completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async analyzeEmailPerformance(
    @Body() request: { emailContent: string; metrics: any },
    @Request() req,
  ) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI service not configured');
    }

    return this.aiService.analyzeEmailPerformance(request.emailContent, request.metrics);
  }

  @Post('health')
  @ApiOperation({ summary: 'Check AI service health and configuration' })
  @ApiResponse({ status: 200, description: 'AI service status' })
  async checkHealth() {
    return {
      configured: this.aiService.isConfigured(),
      status: this.aiService.isConfigured() ? 'ready' : 'not_configured',
      message: this.aiService.isConfigured() 
        ? 'AI service is ready' 
        : 'AI service is not configured. Please set OPENAI_API_KEY environment variable.',
    };
  }
}
