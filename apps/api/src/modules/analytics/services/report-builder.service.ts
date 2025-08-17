import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Email } from '../../campaigns/entities/email.entity';
import { Contact } from '../../campaigns/entities/contact.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  createdBy: string;
  filters: ReportFilters;
  metrics: ReportMetric[];
  visualization: VisualizationConfig;
  schedule?: ReportSchedule;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  campaigns?: string[];
  contacts?: {
    industries?: string[];
    companySizes?: string[];
    jobTitles?: string[];
    locations?: string[];
    engagementLevels?: 'high' | 'medium' | 'low';
  };
  emailStatus?: string[];
  customFilters?: Record<string, any>;
}

export interface ReportMetric {
  name: string;
  type: 'count' | 'percentage' | 'average' | 'sum' | 'custom';
  field: string;
  calculation?: string;
  format?: 'number' | 'percentage' | 'currency' | 'date';
  displayName: string;
}

export interface VisualizationConfig {
  type: 'table' | 'chart' | 'dashboard';
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter';
  xAxis?: string;
  yAxis?: string;
  grouping?: string;
  colors?: string[];
  options?: Record<string, any>;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time?: string; // HH:MM format
  recipients: string[];
  format: 'pdf' | 'csv' | 'json';
  enabled: boolean;
}

export interface ReportResult {
  reportId: string;
  generatedAt: Date;
  summary: {
    totalRecords: number;
    dateRange: string;
    filters: string[];
  };
  data: any[];
  metrics: Record<string, number>;
  visualizations: any[];
}

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async createReport(
    organizationId: string,
    userId: string,
    reportData: Omit<ReportDefinition, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReportDefinition> {
    try {
      // Validate report configuration
      this.validateReportConfiguration(reportData);

      const report: ReportDefinition = {
        id: this.generateReportId(),
        ...reportData,
        organizationId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // For now, we'll store in memory - in production, this should be stored in database
      // await this.reportRepository.save(report);

      this.logger.log(`Report created: ${report.name} for organization ${organizationId}`);
      return report;
    } catch (error) {
      this.logger.error('Failed to create report:', error);
      throw new BadRequestException('Failed to create report');
    }
  }

  async generateReport(
    organizationId: string,
    reportId: string,
    customFilters?: Partial<ReportFilters>,
  ): Promise<ReportResult> {
    try {
      // In production, fetch from database
      // const report = await this.reportRepository.findOne({ where: { id: reportId, organizationId } });
      const report = this.getMockReport(reportId);

      if (!report) {
        throw new BadRequestException('Report not found');
      }

      // Merge custom filters with report filters
      const finalFilters = this.mergeFilters(report.filters, customFilters);

      // Generate report data
      const data = await this.executeReportQuery(organizationId, report, finalFilters);

      // Calculate metrics
      const metrics = this.calculateMetrics(data, report.metrics);

      // Generate visualizations
      const visualizations = this.generateVisualizations(data, report.visualization);

      const result: ReportResult = {
        reportId: report.id,
        generatedAt: new Date(),
        summary: {
          totalRecords: data.length,
          dateRange: this.formatDateRange(finalFilters.dateRange),
          filters: this.formatFilters(finalFilters),
        },
        data,
        metrics,
        visualizations,
      };

      this.logger.log(`Report generated: ${report.name} with ${data.length} records`);
      return result;
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      throw new BadRequestException('Failed to generate report');
    }
  }

  async getReportTemplates(organizationId: string): Promise<Partial<ReportDefinition>[]> {
    return [
      {
        name: 'Campaign Performance Overview',
        description: 'Comprehensive overview of all campaign performance metrics',
        filters: {
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date(),
          },
        },
        metrics: [
          { name: 'totalCampaigns', type: 'count', field: 'campaigns', displayName: 'Total Campaigns' },
          { name: 'totalEmails', type: 'sum', field: 'emailsSent', displayName: 'Total Emails Sent' },
          { name: 'avgOpenRate', type: 'average', field: 'openRate', displayName: 'Average Open Rate' },
          { name: 'avgClickRate', type: 'average', field: 'clickRate', displayName: 'Average Click Rate' },
          { name: 'avgReplyRate', type: 'average', field: 'replyRate', displayName: 'Average Reply Rate' },
        ],
        visualization: {
          type: 'dashboard',
          options: {
            layout: 'grid',
            widgets: ['metrics', 'chart', 'table'],
          },
        },
      },
      {
        name: 'Industry Performance Analysis',
        description: 'Performance breakdown by contact industry',
        filters: {
          dateRange: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            end: new Date(),
          },
        },
        metrics: [
          { name: 'industryCount', type: 'count', field: 'industries', displayName: 'Industries' },
          { name: 'topIndustry', type: 'custom', field: 'bestPerformingIndustry', displayName: 'Top Performing Industry' },
          { name: 'industryOpenRate', type: 'average', field: 'industryOpenRate', displayName: 'Industry Open Rate' },
        ],
        visualization: {
          type: 'chart',
          chartType: 'bar',
          xAxis: 'industry',
          yAxis: 'performance',
          grouping: 'metric',
        },
      },
      {
        name: 'Engagement Trend Analysis',
        description: 'Track engagement trends over time',
        filters: {
          dateRange: {
            start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 180 days
            end: new Date(),
          },
        },
        metrics: [
          { name: 'trendSlope', type: 'custom', field: 'engagementTrend', displayName: 'Engagement Trend' },
          { name: 'seasonality', type: 'custom', field: 'seasonalPattern', displayName: 'Seasonal Pattern' },
          { name: 'peakPeriods', type: 'custom', field: 'peakEngagement', displayName: 'Peak Engagement Periods' },
        ],
        visualization: {
          type: 'chart',
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'engagement',
          options: {
            showTrendline: true,
            showSeasonality: true,
          },
        },
      },
    ];
  }

  async scheduleReport(
    organizationId: string,
    reportId: string,
    schedule: ReportSchedule,
  ): Promise<void> {
    try {
      // Validate schedule configuration
      this.validateScheduleConfiguration(schedule);

      // In production, save to database and set up cron jobs
      this.logger.log(`Report ${reportId} scheduled with frequency: ${schedule.frequency}`);
    } catch (error) {
      this.logger.error('Failed to schedule report:', error);
      throw new BadRequestException('Failed to schedule report');
    }
  }

  private validateReportConfiguration(reportData: any): void {
    if (!reportData.name || reportData.name.trim().length === 0) {
      throw new BadRequestException('Report name is required');
    }

    if (!reportData.metrics || reportData.metrics.length === 0) {
      throw new BadRequestException('At least one metric is required');
    }

    if (!reportData.visualization) {
      throw new BadRequestException('Visualization configuration is required');
    }

    // Validate metrics
    for (const metric of reportData.metrics) {
      if (!metric.name || !metric.type || !metric.field || !metric.displayName) {
        throw new BadRequestException('Invalid metric configuration');
      }
    }
  }

  private validateScheduleConfiguration(schedule: ReportSchedule): void {
    if (!schedule.frequency) {
      throw new BadRequestException('Schedule frequency is required');
    }

    if (schedule.frequency === 'weekly' && (schedule.dayOfWeek === undefined || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6)) {
      throw new BadRequestException('Valid day of week (0-6) required for weekly schedule');
    }

    if (schedule.frequency === 'monthly' && (schedule.dayOfMonth === undefined || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
      throw new BadRequestException('Valid day of month (1-31) required for monthly schedule');
    }

    if (!schedule.recipients || schedule.recipients.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    if (!schedule.format) {
      throw new BadRequestException('Export format is required');
    }
  }

  private async executeReportQuery(
    organizationId: string,
    report: ReportDefinition,
    filters: ReportFilters,
  ): Promise<any[]> {
    let query = this.emailRepository
      .createQueryBuilder('email')
      .leftJoin('email.campaign', 'campaign')
      .leftJoin('campaign.organization', 'organization')
      .leftJoin('email.contact', 'contact')
      .where('organization.id = :organizationId', { organizationId });

    // Apply date filters
    if (filters.dateRange) {
      query = query.andWhere('email.sentAt BETWEEN :startDate AND :endDate', {
        startDate: filters.dateRange.start,
        endDate: filters.dateRange.end,
      });
    }

    // Apply campaign filters
    if (filters.campaigns && filters.campaigns.length > 0) {
      query = query.andWhere('campaign.id IN (:...campaignIds)', { campaignIds: filters.campaigns });
    }

    // Apply contact filters
    if (filters.contacts) {
      if (filters.contacts.industries && filters.contacts.industries.length > 0) {
        query = query.andWhere('contact.industry IN (:...industries)', { industries: filters.contacts.industries });
      }
      if (filters.contacts.companySizes && filters.contacts.companySizes.length > 0) {
        query = query.andWhere('contact.companySize IN (:...companySizes)', { companySizes: filters.contacts.companySizes });
      }
      if (filters.contacts.jobTitles && filters.contacts.jobTitles.length > 0) {
        query = query.andWhere('contact.jobTitle IN (:...jobTitles)', { jobTitles: filters.contacts.jobTitles });
      }
      if (filters.contacts.locations && filters.contacts.locations.length > 0) {
        query = query.andWhere('(contact.city IN (:...locations) OR contact.state IN (:...locations) OR contact.country IN (:...locations))', { locations: filters.contacts.locations });
      }
    }

    // Apply email status filters
    if (filters.emailStatus && filters.emailStatus.length > 0) {
      query = query.andWhere('email.status IN (:...statuses)', { statuses: filters.emailStatus });
    }

    const results = await query
      .select([
        'campaign.id as campaignId',
        'campaign.name as campaignName',
        'contact.industry as contactIndustry',
        'contact.companySize as contactCompanySize',
        'contact.jobTitle as contactJobTitle',
        'email.status as emailStatus',
        'email.sentAt as emailSentAt',
        'email.openedAt as emailOpenedAt',
        'email.clickedAt as emailClickedAt',
        'email.repliedAt as emailRepliedAt',
      ])
      .getRawMany();

    return results;
  }

  private calculateMetrics(data: any[], metrics: ReportMetric[]): Record<string, number> {
    const results: Record<string, number> = {};

    for (const metric of metrics) {
      switch (metric.type) {
        case 'count':
          results[metric.name] = this.calculateCount(data, metric.field);
          break;
        case 'percentage':
          results[metric.name] = this.calculatePercentage(data, metric.field);
          break;
        case 'average':
          results[metric.name] = this.calculateAverage(data, metric.field);
          break;
        case 'sum':
          results[metric.name] = this.calculateSum(data, metric.field);
          break;
        case 'custom':
          results[metric.name] = this.calculateCustomMetric(data, metric);
          break;
      }
    }

    return results;
  }

  private calculateCount(data: any[], field: string): number {
    return data.length;
  }

  private calculatePercentage(data: any[], field: string): number {
    if (data.length === 0) return 0;
    
    const validData = data.filter(item => item[field] !== null && item[field] !== undefined);
    return (validData.length / data.length) * 100;
  }

  private calculateAverage(data: any[], field: string): number {
    if (data.length === 0) return 0;
    
    const values = data
      .map(item => parseFloat(item[field]))
      .filter(value => !isNaN(value));
    
    if (values.length === 0) return 0;
    
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculateSum(data: any[], field: string): number {
    return data
      .map(item => parseFloat(item[field]))
      .filter(value => !isNaN(value))
      .reduce((sum, value) => sum + value, 0);
  }

  private calculateCustomMetric(data: any[], metric: ReportMetric): number {
    // Implement custom calculation logic based on metric.field
    switch (metric.field) {
      case 'bestPerformingIndustry':
        return this.findBestPerformingIndustry(data);
      case 'engagementTrend':
        return this.calculateEngagementTrend(data);
      case 'seasonalPattern':
        return this.calculateSeasonalPattern(data);
      case 'peakEngagement':
        return this.findPeakEngagementPeriods(data);
      default:
        return 0;
    }
  }

  private findBestPerformingIndustry(data: any[]): number {
    // Simplified implementation - in production, this would be more sophisticated
    const industryStats = new Map<string, { total: number; opened: number }>();
    
    for (const item of data) {
      const industry = item.contactIndustry || 'Unknown';
      const stats = industryStats.get(industry) || { total: 0, opened: 0 };
      stats.total++;
      if (item.emailOpenedAt) stats.opened++;
      industryStats.set(industry, stats);
    }

    let bestIndustry = 'Unknown';
    let bestRate = 0;

    for (const [industry, stats] of industryStats) {
      const rate = stats.total > 0 ? (stats.opened / stats.total) * 100 : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestIndustry = industry;
      }
    }

    return bestRate;
  }

  private calculateEngagementTrend(data: any[]): number {
    // Simplified trend calculation
    if (data.length < 2) return 0;
    
    const sortedData = data.sort((a, b) => new Date(a.emailSentAt).getTime() - new Date(b.emailSentAt).getTime());
    const midPoint = Math.floor(sortedData.length / 2);
    
    const firstHalf = sortedData.slice(0, midPoint);
    const secondHalf = sortedData.slice(midPoint);
    
    const firstHalfRate = this.calculateEngagementRate(firstHalf);
    const secondHalfRate = this.calculateEngagementRate(secondHalf);
    
    return secondHalfRate - firstHalfRate;
  }

  private calculateSeasonalPattern(data: any[]): number {
    // Simplified seasonal pattern detection
    if (data.length === 0) return 0;
    
    const monthlyStats = new Map<number, number>();
    
    for (const item of data) {
      if (item.emailSentAt) {
        const month = new Date(item.emailSentAt).getMonth();
        const current = monthlyStats.get(month) || 0;
        monthlyStats.set(month, current + 1);
      }
    }
    
    // Calculate variance in monthly distribution
    const values = Array.from(monthlyStats.values());
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private findPeakEngagementPeriods(data: any[]): number {
    // Simplified peak detection
    if (data.length === 0) return 0;
    
    const hourlyStats = new Map<number, number>();
    
    for (const item of data) {
      if (item.emailSentAt) {
        const hour = new Date(item.emailSentAt).getHours();
        const current = hourlyStats.get(hour) || 0;
        hourlyStats.set(hour, current + 1);
      }
    }
    
    const maxHour = Math.max(...Array.from(hourlyStats.values()));
    return maxHour;
  }

  private calculateEngagementRate(data: any[]): number {
    if (data.length === 0) return 0;
    
    const opened = data.filter(item => item.emailOpenedAt).length;
    return (opened / data.length) * 100;
  }

  private generateVisualizations(data: any[], config: VisualizationConfig): any[] {
    const visualizations: any[] = [];

    switch (config.type) {
      case 'table':
        visualizations.push(this.generateTableVisualization(data, config));
        break;
      case 'chart':
        visualizations.push(this.generateChartVisualization(data, config));
        break;
      case 'dashboard':
        visualizations.push(...this.generateDashboardVisualizations(data, config));
        break;
    }

    return visualizations;
  }

  private generateTableVisualization(data: any[], config: VisualizationConfig): any {
    return {
      type: 'table',
      data: data.slice(0, 100), // Limit to 100 rows for performance
      columns: this.extractColumns(data),
      pagination: {
        page: 1,
        pageSize: 25,
        total: data.length,
      },
    };
  }

  private generateChartVisualization(data: any[], config: VisualizationConfig): any {
    const chartData = this.prepareChartData(data, config);
    
    return {
      type: 'chart',
      chartType: config.chartType || 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...config.options,
      },
    };
  }

  private generateDashboardVisualizations(data: any[], config: VisualizationConfig): any[] {
    const visualizations: any[] = [];
    
    // Add summary metrics
    visualizations.push({
      type: 'metrics',
      data: this.generateSummaryMetrics(data),
    });
    
    // Add chart
    visualizations.push(this.generateChartVisualization(data, { ...config, type: 'chart', chartType: 'line' }));
    
    // Add table
    visualizations.push(this.generateTableVisualization(data, { ...config, type: 'table' }));
    
    return visualizations;
  }

  private extractColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).filter(key => key !== 'id');
  }

  private prepareChartData(data: any[], config: VisualizationConfig): any {
    // Simplified chart data preparation
    if (config.chartType === 'line' || config.chartType === 'bar') {
      return this.prepareTimeSeriesData(data, config);
    } else if (config.chartType === 'pie' || config.chartType === 'doughnut') {
      return this.prepareCategoricalData(data, config);
    }
    
    return { labels: [], datasets: [] };
  }

  private prepareTimeSeriesData(data: any[], config: VisualizationConfig): any {
    const timeGroups = new Map<string, number>();
    
    for (const item of data) {
      if (item.emailSentAt) {
        const date = new Date(item.emailSentAt).toDateString();
        timeGroups.set(date, (timeGroups.get(date) || 0) + 1);
      }
    }
    
    const labels = Array.from(timeGroups.keys());
    const values = Array.from(timeGroups.values());
    
    return {
      labels,
      datasets: [{
        label: 'Emails Sent',
        data: values,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      }],
    };
  }

  private prepareCategoricalData(data: any[], config: VisualizationConfig): any {
    const categoryGroups = new Map<string, number>();
    
    for (const item of data) {
      const category = item[config.xAxis || 'contactIndustry'] || 'Unknown';
      categoryGroups.set(category, (categoryGroups.get(category) || 0) + 1);
    }
    
    const labels = Array.from(categoryGroups.keys());
    const values = Array.from(categoryGroups.values());
    
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
        ],
      }],
    };
  }

  private generateSummaryMetrics(data: any[]): any {
    return {
      totalRecords: data.length,
      totalCampaigns: new Set(data.map(item => item.campaignId)).size,
      totalIndustries: new Set(data.map(item => item.contactIndustry).filter(Boolean)).size,
      avgEngagement: this.calculateEngagementRate(data),
    };
  }

  private mergeFilters(baseFilters: ReportFilters, customFilters?: Partial<ReportFilters>): ReportFilters {
    if (!customFilters) return baseFilters;
    
    return {
      ...baseFilters,
      ...customFilters,
      dateRange: customFilters.dateRange || baseFilters.dateRange,
      campaigns: customFilters.campaigns || baseFilters.campaigns,
      contacts: customFilters.contacts ? { ...baseFilters.contacts, ...customFilters.contacts } : baseFilters.contacts,
      emailStatus: customFilters.emailStatus || baseFilters.emailStatus,
      customFilters: customFilters.customFilters ? { ...baseFilters.customFilters, ...customFilters.customFilters } : baseFilters.customFilters,
    };
  }

  private formatDateRange(dateRange?: { start: Date; end: Date }): string {
    if (!dateRange) return 'All time';
    return `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
  }

  private formatFilters(filters: ReportFilters): string[] {
    const filterStrings: string[] = [];
    
    if (filters.campaigns && filters.campaigns.length > 0) {
      filterStrings.push(`Campaigns: ${filters.campaigns.length} selected`);
    }
    
    if (filters.contacts?.industries && filters.contacts.industries.length > 0) {
      filterStrings.push(`Industries: ${filters.contacts.industries.join(', ')}`);
    }
    
    if (filters.contacts?.companySizes && filters.contacts.companySizes.length > 0) {
      filterStrings.push(`Company Sizes: ${filters.contacts.companySizes.join(', ')}`);
    }
    
    if (filters.emailStatus && filters.emailStatus.length > 0) {
      filterStrings.push(`Email Status: ${filters.emailStatus.join(', ')}`);
    }
    
    return filterStrings;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMockReport(reportId: string): ReportDefinition | null {
    // Mock implementation - in production, this would fetch from database
    return {
      id: reportId,
      name: 'Sample Report',
      description: 'A sample report for testing',
      organizationId: 'org_123',
      createdBy: 'user_123',
      filters: {
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      },
      metrics: [
        { name: 'totalEmails', type: 'count', field: 'emails', displayName: 'Total Emails' },
        { name: 'openRate', type: 'percentage', field: 'opened', displayName: 'Open Rate' },
      ],
      visualization: {
        type: 'chart',
        chartType: 'bar',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
