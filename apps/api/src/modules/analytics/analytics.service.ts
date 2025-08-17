import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';

import { Campaign } from '../campaigns/entities/campaign.entity';
import { Email } from '../campaigns/entities/email.entity';
import { Contact } from '../campaigns/entities/contact.entity';
import { Organization } from '../organizations/entities/organization.entity';

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalUnsubscribed: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  engagementScore: number;
  conversionRate: number;
  revenueGenerated?: number;
  costPerEmail: number;
  roi: number;
}

export interface TimeSeriesData {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  unsubscribed: number;
  bounced: number;
}

export interface SegmentationMetrics {
  segmentName: string;
  contactCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  engagementScore: number;
  conversionRate: number;
}

export interface PredictiveInsights {
  predictedOpenRate: number;
  predictedClickRate: number;
  predictedReplyRate: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
  riskFactors: string[];
}

export interface PerformanceComparison {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

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

  async getCampaignMetrics(
    organizationId: string,
    campaignId?: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<CampaignMetrics[]> {
    try {
      let query = this.emailRepository
        .createQueryBuilder('email')
        .leftJoin('email.campaign', 'campaign')
        .leftJoin('campaign.organization', 'organization')
        .where('organization.id = :organizationId', { organizationId });

      if (campaignId) {
        query = query.andWhere('campaign.id = :campaignId', { campaignId });
      }

      if (dateRange) {
        query = query.andWhere('email.sentAt BETWEEN :start AND :end', dateRange);
      }

      const results = await query
        .select([
          'campaign.id as campaignId',
          'campaign.name as campaignName',
          'COUNT(CASE WHEN email.status = :sentStatus THEN 1 END) as totalSent',
          'COUNT(CASE WHEN email.openedAt IS NOT NULL THEN 1 END) as totalOpened',
          'COUNT(CASE WHEN email.clickedAt IS NOT NULL THEN 1 END) as totalClicked',
          'COUNT(CASE WHEN email.repliedAt IS NOT NULL THEN 1 END) as totalReplied',
          'COUNT(CASE WHEN email.unsubscribedAt IS NOT NULL THEN 1 END) as totalUnsubscribed',
          'COUNT(CASE WHEN email.bouncedAt IS NOT NULL THEN 1 END) as totalBounced',
        ])
        .setParameter('sentStatus', 'sent')
        .groupBy('campaign.id, campaign.name')
        .getRawMany();

      return results.map(result => this.calculateMetrics(result));
    } catch (error) {
      this.logger.error('Failed to get campaign metrics:', error);
      throw new BadRequestException('Failed to retrieve campaign metrics');
    }
  }

  async getTimeSeriesData(
    organizationId: string,
    campaignId?: string,
    days: number = 30,
  ): Promise<TimeSeriesData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = this.emailRepository
        .createQueryBuilder('email')
        .leftJoin('email.campaign', 'campaign')
        .leftJoin('campaign.organization', 'organization')
        .where('organization.id = :organizationId', { organizationId })
        .andWhere('email.sentAt BETWEEN :startDate AND :endDate', { startDate, endDate });

      if (campaignId) {
        query = query.andWhere('campaign.id = :campaignId', { campaignId });
      }

      const results = await query
        .select([
          'DATE(email.sentAt) as date',
          'COUNT(CASE WHEN email.status = :sentStatus THEN 1 END) as sent',
          'COUNT(CASE WHEN email.openedAt IS NOT NULL THEN 1 END) as opened',
          'COUNT(CASE WHEN email.clickedAt IS NOT NULL THEN 1 END) as clicked',
          'COUNT(CASE WHEN email.repliedAt IS NOT NULL THEN 1 END) as replied',
          'COUNT(CASE WHEN email.unsubscribedAt IS NOT NULL THEN 1 END) as unsubscribed',
          'COUNT(CASE WHEN email.bouncedAt IS NOT NULL THEN 1 END) as bounced',
        ])
        .setParameter('sentStatus', 'sent')
        .groupBy('DATE(email.sentAt)')
        .orderBy('date', 'ASC')
        .getRawMany();

      return results.map(result => ({
        date: result.date,
        sent: parseInt(result.sent),
        opened: parseInt(result.opened),
        clicked: parseInt(result.clicked),
        replied: parseInt(result.replied),
        unsubscribed: parseInt(result.unsubscribed),
        bounced: parseInt(result.bounced),
      }));
    } catch (error) {
      this.logger.error('Failed to get time series data:', error);
      throw new BadRequestException('Failed to retrieve time series data');
    }
  }

  async getSegmentationMetrics(
    organizationId: string,
    segmentCriteria: {
      industry?: string;
      companySize?: string;
      jobTitle?: string;
      location?: string;
      engagementLevel?: 'high' | 'medium' | 'low';
    },
    dateRange?: { start: Date; end: Date },
  ): Promise<SegmentationMetrics[]> {
    try {
      let query = this.emailRepository
        .createQueryBuilder('email')
        .leftJoin('email.campaign', 'campaign')
        .leftJoin('campaign.organization', 'organization')
        .leftJoin('email.contact', 'contact')
        .where('organization.id = :organizationId', { organizationId });

      // Apply segmentation criteria
      if (segmentCriteria.industry) {
        query = query.andWhere('contact.industry = :industry', { industry: segmentCriteria.industry });
      }
      if (segmentCriteria.companySize) {
        query = query.andWhere('contact.companySize = :companySize', { companySize: segmentCriteria.companySize });
      }
      if (segmentCriteria.jobTitle) {
        query = query.andWhere('contact.jobTitle LIKE :jobTitle', { jobTitle: `%${segmentCriteria.jobTitle}%` });
      }
      if (segmentCriteria.location) {
        query = query.andWhere('(contact.city = :location OR contact.state = :location OR contact.country = :location)', { location: segmentCriteria.location });
      }

      if (dateRange) {
        query = query.andWhere('email.sentAt BETWEEN :start AND :end', dateRange);
      }

      const results = await query
        .select([
          'contact.industry as segmentName',
          'COUNT(DISTINCT contact.id) as contactCount',
          'COUNT(CASE WHEN email.openedAt IS NOT NULL THEN 1 END) as totalOpened',
          'COUNT(CASE WHEN email.clickedAt IS NOT NULL THEN 1 END) as totalClicked',
          'COUNT(CASE WHEN email.repliedAt IS NOT NULL THEN 1 END) as totalReplied',
          'COUNT(CASE WHEN email.status = :sentStatus THEN 1 END) as totalSent',
        ])
        .setParameter('sentStatus', 'sent')
        .groupBy('contact.industry')
        .getRawMany();

      return results.map(result => this.calculateSegmentationMetrics(result));
    } catch (error) {
      this.logger.error('Failed to get segmentation metrics:', error);
      throw new BadRequestException('Failed to retrieve segmentation metrics');
    }
  }

  async getPredictiveInsights(
    organizationId: string,
    campaignId?: string,
    contactData?: any,
  ): Promise<PredictiveInsights> {
    try {
      // Get historical performance data
      const historicalMetrics = await this.getCampaignMetrics(organizationId, campaignId);
      
      if (historicalMetrics.length === 0) {
        return this.getDefaultPredictiveInsights();
      }

      // Calculate average performance
      const avgMetrics = this.calculateAverageMetrics(historicalMetrics);
      
      // Apply predictive factors based on contact data
      const predictions = this.applyPredictiveFactors(avgMetrics, contactData);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(predictions, historicalMetrics);
      
      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(predictions, historicalMetrics);

      return {
        predictedOpenRate: predictions.openRate,
        predictedClickRate: predictions.clickRate,
        predictedReplyRate: predictions.replyRate,
        confidence: this.calculateConfidence(historicalMetrics),
        factors: this.getPredictiveFactors(contactData),
        recommendations,
        riskFactors,
      };
    } catch (error) {
      this.logger.error('Failed to get predictive insights:', error);
      throw new BadRequestException('Failed to generate predictive insights');
    }
  }

  async getPerformanceComparison(
    organizationId: string,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
  ): Promise<PerformanceComparison[]> {
    try {
      const currentMetrics = await this.getCampaignMetrics(organizationId, undefined, currentPeriod);
      const previousMetrics = await this.getCampaignMetrics(organizationId, undefined, previousPeriod);

      const currentAvg = this.calculateAverageMetrics(currentMetrics);
      const previousAvg = this.calculateAverageMetrics(previousMetrics);

      return [
        this.compareMetric('Open Rate', currentAvg.openRate, previousAvg.openRate),
        this.compareMetric('Click Rate', currentAvg.clickRate, previousAvg.clickRate),
        this.compareMetric('Reply Rate', currentAvg.replyRate, previousAvg.replyRate),
        this.compareMetric('Engagement Score', currentAvg.engagementScore, previousAvg.engagementScore),
        this.compareMetric('Conversion Rate', currentAvg.conversionRate, previousAvg.conversionRate),
      ];
    } catch (error) {
      this.logger.error('Failed to get performance comparison:', error);
      throw new BadRequestException('Failed to generate performance comparison');
    }
  }

  async getTopPerformers(
    organizationId: string,
    metric: 'openRate' | 'clickRate' | 'replyRate' | 'engagementScore',
    limit: number = 10,
  ): Promise<CampaignMetrics[]> {
    try {
      const metrics = await this.getCampaignMetrics(organizationId);
      
      return metrics
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get top performers:', error);
      throw new BadRequestException('Failed to retrieve top performers');
    }
  }

  async getEngagementHeatmap(
    organizationId: string,
    campaignId?: string,
  ): Promise<{
    hour: number;
    dayOfWeek: number;
    engagementRate: number;
    emailCount: number;
  }[]> {
    try {
      let query = this.emailRepository
        .createQueryBuilder('email')
        .leftJoin('email.campaign', 'campaign')
        .leftJoin('campaign.organization', 'organization')
        .where('organization.id = :organizationId', { organizationId })
        .andWhere('email.sentAt IS NOT NULL');

      if (campaignId) {
        query = query.andWhere('campaign.id = :campaignId', { campaignId });
      }

      const results = await query
        .select([
          'EXTRACT(HOUR FROM email.sentAt) as hour',
          'EXTRACT(DOW FROM email.sentAt) as dayOfWeek',
          'COUNT(CASE WHEN email.openedAt IS NOT NULL THEN 1 END) as opened',
          'COUNT(*) as total',
        ])
        .groupBy('hour, dayOfWeek')
        .getRawMany();

      return results.map(result => ({
        hour: parseInt(result.hour),
        dayOfWeek: parseInt(result.dayOfWeek),
        engagementRate: (parseInt(result.opened) / parseInt(result.total)) * 100,
        emailCount: parseInt(result.total),
      }));
    } catch (error) {
      this.logger.error('Failed to get engagement heatmap:', error);
      throw new BadRequestException('Failed to retrieve engagement heatmap');
    }
  }

  private calculateMetrics(rawData: any): CampaignMetrics {
    const totalSent = parseInt(rawData.totalSent) || 0;
    const totalOpened = parseInt(rawData.totalOpened) || 0;
    const totalClicked = parseInt(rawData.totalClicked) || 0;
    const totalReplied = parseInt(rawData.totalReplied) || 0;
    const totalUnsubscribed = parseInt(rawData.totalUnsubscribed) || 0;
    const totalBounced = parseInt(rawData.totalBounced) || 0;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
    const unsubscribeRate = totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    const engagementScore = this.calculateEngagementScore({
      openRate,
      clickRate,
      replyRate,
      unsubscribeRate,
      bounceRate,
    });

    const conversionRate = this.calculateConversionRate(totalReplied, totalSent);
    const costPerEmail = 0.01; // Placeholder - should come from actual cost data
    const revenueGenerated = totalReplied * 100; // Placeholder - should come from actual revenue data
    const roi = revenueGenerated > 0 ? ((revenueGenerated - (totalSent * costPerEmail)) / (totalSent * costPerEmail)) * 100 : 0;

    return {
      campaignId: rawData.campaignId,
      campaignName: rawData.campaignName,
      totalSent,
      totalOpened,
      totalClicked,
      totalReplied,
      totalUnsubscribed,
      totalBounced,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      replyRate: Math.round(replyRate * 100) / 100,
      unsubscribeRate: Math.round(unsubscribeRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      engagementScore: Math.round(engagementScore * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      revenueGenerated,
      costPerEmail,
      roi: Math.round(roi * 100) / 100,
    };
  }

  private calculateSegmentationMetrics(rawData: any): SegmentationMetrics {
    const totalSent = parseInt(rawData.totalSent) || 0;
    const totalOpened = parseInt(rawData.totalOpened) || 0;
    const totalClicked = parseInt(rawData.totalClicked) || 0;
    const totalReplied = parseInt(rawData.totalReplied) || 0;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
    const engagementScore = this.calculateEngagementScore({ openRate, clickRate, replyRate, unsubscribeRate: 0, bounceRate: 0 });
    const conversionRate = this.calculateConversionRate(totalReplied, totalSent);

    return {
      segmentName: rawData.segmentName || 'Unknown',
      contactCount: parseInt(rawData.contactCount) || 0,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      replyRate: Math.round(replyRate * 100) / 100,
      engagementScore: Math.round(engagementScore * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  private calculateEngagementScore(metrics: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    unsubscribeRate: number;
    bounceRate: number;
  }): number {
    let score = 0;
    
    // Positive factors
    score += metrics.openRate * 0.3;
    score += metrics.clickRate * 0.4;
    score += metrics.replyRate * 0.5;
    
    // Negative factors
    score -= metrics.unsubscribeRate * 0.3;
    score -= metrics.bounceRate * 0.2;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateConversionRate(conversions: number, total: number): number {
    return total > 0 ? (conversions / total) * 100 : 0;
  }

  private calculateAverageMetrics(metrics: CampaignMetrics[]): CampaignMetrics {
    if (metrics.length === 0) {
      return {
        campaignId: '',
        campaignName: '',
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalReplied: 0,
        totalUnsubscribed: 0,
        totalBounced: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        unsubscribeRate: 0,
        bounceRate: 0,
        engagementScore: 0,
        conversionRate: 0,
        costPerEmail: 0,
        roi: 0,
      };
    }

    const totals = metrics.reduce((acc, metric) => ({
      openRate: acc.openRate + metric.openRate,
      clickRate: acc.clickRate + metric.clickRate,
      replyRate: acc.replyRate + metric.replyRate,
      engagementScore: acc.engagementScore + metric.engagementScore,
      conversionRate: acc.conversionRate + metric.conversionRate,
    }), { openRate: 0, clickRate: 0, replyRate: 0, engagementScore: 0, conversionRate: 0 });

    return {
      ...metrics[0],
      openRate: totals.openRate / metrics.length,
      clickRate: totals.clickRate / metrics.length,
      replyRate: totals.replyRate / metrics.length,
      engagementScore: totals.engagementScore / metrics.length,
      conversionRate: totals.conversionRate / metrics.length,
    };
  }

  private applyPredictiveFactors(avgMetrics: CampaignMetrics, contactData?: any): {
    openRate: number;
    clickRate: number;
    replyRate: number;
  } {
    let openRate = avgMetrics.openRate;
    let clickRate = avgMetrics.clickRate;
    let replyRate = avgMetrics.replyRate;

    if (contactData) {
      // Apply industry-based adjustments
      if (contactData.industry === 'Technology') {
        openRate *= 1.1; // 10% boost for tech industry
        clickRate *= 1.15;
      } else if (contactData.industry === 'Finance') {
        openRate *= 0.9; // 10% reduction for finance industry
        clickRate *= 0.85;
      }

      // Apply company size adjustments
      if (contactData.companySize === '1-10') {
        replyRate *= 1.2; // 20% boost for small companies
      } else if (contactData.companySize === '1000+') {
        replyRate *= 0.8; // 20% reduction for enterprise
      }

      // Apply job title adjustments
      if (contactData.jobTitle?.toLowerCase().includes('ceo') || contactData.jobTitle?.toLowerCase().includes('founder')) {
        openRate *= 1.05; // 5% boost for executives
        replyRate *= 1.1;
      }
    }

    return {
      openRate: Math.min(100, Math.max(0, openRate)),
      clickRate: Math.min(100, Math.max(0, clickRate)),
      replyRate: Math.min(100, Math.max(0, replyRate)),
    };
  }

  private generateRecommendations(predictions: any, historicalMetrics: CampaignMetrics[]): string[] {
    const recommendations: string[] = [];

    if (predictions.openRate < 20) {
      recommendations.push('Consider A/B testing subject lines to improve open rates');
      recommendations.push('Review sender reputation and ensure proper authentication');
    }

    if (predictions.clickRate < 3) {
      recommendations.push('Add clear call-to-action buttons in your emails');
      recommendations.push('Include relevant links and compelling content');
    }

    if (predictions.replyRate < 1) {
      recommendations.push('Personalize content based on contact information');
      recommendations.push('Ask specific questions to encourage responses');
    }

    // Add industry-specific recommendations
    if (historicalMetrics.some(m => m.campaignName.toLowerCase().includes('b2b'))) {
      recommendations.push('Consider sending emails during business hours (9 AM - 5 PM)');
      recommendations.push('Focus on business value propositions and ROI');
    }

    return recommendations;
  }

  private identifyRiskFactors(predictions: any, historicalMetrics: CampaignMetrics[]): string[] {
    const riskFactors: string[] = [];

    if (predictions.openRate < 15) {
      riskFactors.push('Low open rates may indicate poor sender reputation');
    }

    if (predictions.bounceRate > 5) {
      riskFactors.push('High bounce rate may lead to blacklisting');
    }

    if (predictions.unsubscribeRate > 2) {
      riskFactors.push('High unsubscribe rate may indicate poor content quality');
    }

    return riskFactors;
  }

  private calculateConfidence(historicalMetrics: CampaignMetrics[]): number {
    if (historicalMetrics.length === 0) return 0.3;
    if (historicalMetrics.length < 3) return 0.5;
    if (historicalMetrics.length < 10) return 0.7;
    return 0.9;
  }

  private getPredictiveFactors(contactData?: any): string[] {
    const factors: string[] = [];

    if (contactData?.industry) {
      factors.push(`Industry: ${contactData.industry}`);
    }
    if (contactData?.companySize) {
      factors.push(`Company Size: ${contactData.companySize}`);
    }
    if (contactData?.jobTitle) {
      factors.push(`Job Title: ${contactData.jobTitle}`);
    }

    return factors;
  }

  private getDefaultPredictiveInsights(): PredictiveInsights {
    return {
      predictedOpenRate: 25,
      predictedClickRate: 3,
      predictedReplyRate: 1,
      confidence: 0.3,
      factors: ['Limited historical data'],
      recommendations: ['Start with small test campaigns', 'Focus on list quality'],
      riskFactors: ['Insufficient data for accurate predictions'],
    };
  }

  private compareMetric(
    metric: string,
    currentValue: number,
    previousValue: number,
  ): PerformanceComparison {
    const change = currentValue - previousValue;
    const changePercentage = previousValue > 0 ? (change / previousValue) * 100 : 0;
    
    let trend: 'improving' | 'declining' | 'stable';
    if (changePercentage > 5) trend = 'improving';
    else if (changePercentage < -5) trend = 'declining';
    else trend = 'stable';

    return {
      metric,
      currentValue: Math.round(currentValue * 100) / 100,
      previousValue: Math.round(previousValue * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercentage: Math.round(changePercentage * 100) / 100,
      trend,
    };
  }
}
