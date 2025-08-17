import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../common/guards/permissions.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('campaign-metrics')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get campaign performance metrics' })
  @ApiResponse({ status: 200, description: 'Campaign metrics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Specific campaign ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  async getCampaignMetrics(
    @Request() req,
    @Query('campaignId') campaignId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.organizationId;
    
    let dateRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    return this.analyticsService.getCampaignMetrics(organizationId, campaignId, dateRange);
  }

  @Get('time-series')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get time series data for campaigns' })
  @ApiResponse({ status: 200, description: 'Time series data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Specific campaign ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze', type: Number })
  async getTimeSeriesData(
    @Request() req,
    @Query('campaignId') campaignId?: string,
    @Query('days', ParseIntPipe) days: number = 30,
  ) {
    const organizationId = req.user.organizationId;
    return this.analyticsService.getTimeSeriesData(organizationId, campaignId, days);
  }

  @Get('segmentation')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get segmentation metrics' })
  @ApiResponse({ status: 200, description: 'Segmentation metrics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'industry', required: false, description: 'Filter by industry' })
  @ApiQuery({ name: 'companySize', required: false, description: 'Filter by company size' })
  @ApiQuery({ name: 'jobTitle', required: false, description: 'Filter by job title' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  async getSegmentationMetrics(
    @Request() req,
    @Query('industry') industry?: string,
    @Query('companySize') companySize?: string,
    @Query('jobTitle') jobTitle?: string,
    @Query('location') location?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.organizationId;
    
    const segmentCriteria = {
      industry,
      companySize,
      jobTitle,
      location,
    };

    let dateRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    return this.analyticsService.getSegmentationMetrics(organizationId, segmentCriteria, dateRange);
  }

  @Get('predictive-insights')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get predictive insights for campaigns' })
  @ApiResponse({ status: 200, description: 'Predictive insights generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Specific campaign ID' })
  @ApiQuery({ name: 'industry', required: false, description: 'Contact industry' })
  @ApiQuery({ name: 'companySize', required: false, description: 'Contact company size' })
  @ApiQuery({ name: 'jobTitle', required: false, description: 'Contact job title' })
  async getPredictiveInsights(
    @Request() req,
    @Query('campaignId') campaignId?: string,
    @Query('industry') industry?: string,
    @Query('companySize') companySize?: string,
    @Query('jobTitle') jobTitle?: string,
  ) {
    const organizationId = req.user.organizationId;
    
    const contactData = {
      industry,
      companySize,
      jobTitle,
    };

    return this.analyticsService.getPredictiveInsights(organizationId, campaignId, contactData);
  }

  @Get('performance-comparison')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Compare performance between two time periods' })
  @ApiResponse({ status: 200, description: 'Performance comparison generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'currentStart', required: true, description: 'Current period start date (ISO string)' })
  @ApiQuery({ name: 'currentEnd', required: true, description: 'Current period end date (ISO string)' })
  @ApiQuery({ name: 'previousStart', required: true, description: 'Previous period start date (ISO string)' })
  @ApiQuery({ name: 'previousEnd', required: true, description: 'Previous period end date (ISO string)' })
  async getPerformanceComparison(
    @Request() req,
    @Query('currentStart') currentStart: string,
    @Query('currentEnd') currentEnd: string,
    @Query('previousStart') previousStart: string,
    @Query('previousEnd') previousEnd: string,
  ) {
    if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
      throw new BadRequestException('All date parameters are required');
    }

    const organizationId = req.user.organizationId;
    
    const currentPeriod = {
      start: new Date(currentStart),
      end: new Date(currentEnd),
    };

    const previousPeriod = {
      start: new Date(previousStart),
      end: new Date(previousEnd),
    };

    return this.analyticsService.getPerformanceComparison(organizationId, currentPeriod, previousPeriod);
  }

  @Get('top-performers')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get top performing campaigns by metric' })
  @ApiResponse({ status: 200, description: 'Top performers retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'metric', required: true, enum: ['openRate', 'clickRate', 'replyRate', 'engagementScore'] })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of top performers to return', type: Number })
  async getTopPerformers(
    @Request() req,
    @Query('metric') metric: 'openRate' | 'clickRate' | 'replyRate' | 'engagementScore',
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    const organizationId = req.user.organizationId;
    return this.analyticsService.getTopPerformers(organizationId, metric, limit);
  }

  @Get('engagement-heatmap')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get engagement heatmap data' })
  @ApiResponse({ status: 200, description: 'Engagement heatmap data retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Specific campaign ID' })
  async getEngagementHeatmap(
    @Request() req,
    @Query('campaignId') campaignId?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.analyticsService.getEngagementHeatmap(organizationId, campaignId);
  }

  @Get('dashboard-summary')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get comprehensive dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze', type: Number })
  async getDashboardSummary(
    @Request() req,
    @Query('days', ParseIntPipe) days: number = 30,
  ) {
    const organizationId = req.user.organizationId;
    
    // Get all required data for dashboard
    const [
      campaignMetrics,
      timeSeriesData,
      topPerformers,
      engagementHeatmap,
      predictiveInsights,
    ] = await Promise.all([
      this.analyticsService.getCampaignMetrics(organizationId),
      this.analyticsService.getTimeSeriesData(organizationId, undefined, days),
      this.analyticsService.getTopPerformers(organizationId, 'engagementScore', 5),
      this.analyticsService.getEngagementHeatmap(organizationId),
      this.analyticsService.getPredictiveInsights(organizationId),
    ]);

    // Calculate summary statistics
    const totalCampaigns = campaignMetrics.length;
    const totalEmails = campaignMetrics.reduce((sum, metric) => sum + metric.totalSent, 0);
    const avgOpenRate = campaignMetrics.length > 0 
      ? campaignMetrics.reduce((sum, metric) => sum + metric.openRate, 0) / campaignMetrics.length 
      : 0;
    const avgClickRate = campaignMetrics.length > 0 
      ? campaignMetrics.reduce((sum, metric) => sum + metric.clickRate, 0) / campaignMetrics.length 
      : 0;
    const avgReplyRate = campaignMetrics.length > 0 
      ? campaignMetrics.reduce((sum, metric) => sum + metric.replyRate, 0) / campaignMetrics.length 
      : 0;

    return {
      summary: {
        totalCampaigns,
        totalEmails,
        avgOpenRate: Math.round(avgOpenRate * 100) / 100,
        avgClickRate: Math.round(avgClickRate * 100) / 100,
        avgReplyRate: Math.round(avgReplyRate * 100) / 100,
      },
      campaignMetrics,
      timeSeriesData,
      topPerformers,
      engagementHeatmap,
      predictiveInsights,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('export')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics data exported successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'format', required: true, enum: ['csv', 'json'], description: 'Export format' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Specific campaign ID' })
  async exportAnalytics(
    @Request() req,
    @Query('format') format: 'csv' | 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    const organizationId = req.user.organizationId;
    
    let dateRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    const data = await this.analyticsService.getCampaignMetrics(organizationId, campaignId, dateRange);

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'Campaign ID',
        'Campaign Name',
        'Total Sent',
        'Total Opened',
        'Total Clicked',
        'Total Replied',
        'Open Rate (%)',
        'Click Rate (%)',
        'Reply Rate (%)',
        'Engagement Score',
        'Conversion Rate (%)',
        'ROI (%)',
      ];

      const csvRows = data.map(metric => [
        metric.campaignId,
        metric.campaignName,
        metric.totalSent,
        metric.totalOpened,
        metric.totalClicked,
        metric.totalReplied,
        metric.openRate,
        metric.clickRate,
        metric.replyRate,
        metric.engagementScore,
        metric.conversionRate,
        metric.roi,
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return {
        format: 'csv',
        data: csvContent,
        filename: `analytics-export-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      };
    } else {
      // Return JSON format
      return {
        format: 'json',
        data,
        filename: `analytics-export-${new Date().toISOString().split('T')[0]}.json`,
        contentType: 'application/json',
      };
    }
  }
}
