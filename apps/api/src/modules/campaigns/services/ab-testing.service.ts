import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Campaign } from '../entities/campaign.entity';
import { Email } from '../entities/email.entity';

export interface AbTestVariant {
  id: string;
  name: string;
  weight: number;
  config: {
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    fromName?: string;
    fromEmail?: string;
    sendTime?: string;
  };
  performance: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    unsubscribed: number;
    bounced: number;
  };
}

export interface AbTestResult {
  testId: string;
  variantId: string;
  variantName: string;
  metrics: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    unsubscribeRate: number;
    bounceRate: number;
    overallScore: number;
  };
  isWinner: boolean;
  confidence: number;
  sampleSize: number;
}

@Injectable()
export class AbTestingService {
  private readonly logger = new Logger(AbTestingService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
  ) {}

  async createAbTest(campaignId: string, testConfig: {
    testType: 'subject' | 'content' | 'send_time';
    variants: Array<{
      name: string;
      weight: number;
      config: any;
    }>;
    testSize: number;
    testDuration: number;
    winnerCriteria: 'open_rate' | 'click_rate' | 'reply_rate' | 'conversion_rate';
  }): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'draft') {
      throw new BadRequestException('A/B test can only be created for draft campaigns');
    }

    // Validate test configuration
    if (testConfig.variants.length < 2) {
      throw new BadRequestException('A/B test requires at least 2 variants');
    }

    if (testConfig.variants.length > 5) {
      throw new BadRequestException('A/B test cannot have more than 5 variants');
    }

    const totalWeight = testConfig.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException('Variant weights must sum to 100%');
    }

    // Update campaign with A/B testing configuration
    campaign.abTesting = {
      enabled: true,
      testType: testConfig.testType,
      variants: testConfig.variants.map((v, index) => ({
        id: `variant-${index + 1}`,
        name: v.name,
        weight: v.weight,
        config: v.config,
      })),
      testSize: testConfig.testSize,
      testDuration: testConfig.testDuration,
      winnerCriteria: testConfig.winnerCriteria,
      winnerSelected: null,
    };

    return this.campaignRepository.save(campaign);
  }

  async assignVariantToContact(campaignId: string, contactId: string): Promise<string> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.abTesting?.enabled) {
      throw new BadRequestException('A/B test not found or not enabled');
    }

    // Simple weighted random selection
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const variant of campaign.abTesting.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant.id;
      }
    }

    // Fallback to first variant
    return campaign.abTesting.variants[0].id;
  }

  async trackVariantPerformance(campaignId: string, variantId: string, emailId: string, event: 'sent' | 'opened' | 'clicked' | 'replied' | 'unsubscribed' | 'bounced'): Promise<void> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.abTesting?.enabled) {
      return; // Not an A/B test
    }

    const variant = campaign.abTesting.variants.find(v => v.id === variantId);
    if (!variant) {
      this.logger.warn(`Variant ${variantId} not found for campaign ${campaignId}`);
      return;
    }

    // Initialize performance tracking if not exists
    if (!variant.performance) {
      variant.performance = {
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        unsubscribed: 0,
        bounced: 0,
      };
    }

    // Update performance metrics
    if (event === 'sent') {
      variant.performance.sent++;
    } else if (event === 'opened') {
      variant.performance.opened++;
    } else if (event === 'clicked') {
      variant.performance.clicked++;
    } else if (event === 'replied') {
      variant.performance.replied++;
    } else if (event === 'unsubscribed') {
      variant.performance.unsubscribed++;
    } else if (event === 'bounced') {
      variant.performance.bounced++;
    }

    await this.campaignRepository.save(campaign);
  }

  async analyzeAbTestResults(campaignId: string): Promise<AbTestResult[]> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.abTesting?.enabled) {
      throw new BadRequestException('A/B test not found or not enabled');
    }

    const results: AbTestResult[] = [];

    for (const variant of campaign.abTesting.variants) {
      if (!variant.performance || variant.performance.sent === 0) {
        continue;
      }

      const metrics = this.calculateVariantMetrics(variant.performance);
      const overallScore = this.calculateOverallScore(metrics, campaign.abTesting.winnerCriteria);

      results.push({
        testId: campaign.abTesting.testType,
        variantId: variant.id,
        variantName: variant.name,
        metrics,
        isWinner: false, // Will be set after comparison
        confidence: this.calculateConfidence(variant.performance),
        sampleSize: variant.performance.sent,
      });
    }

    // Sort by overall score and mark winner
    results.sort((a, b) => b.metrics.overallScore - a.metrics.overallScore);
    
    if (results.length > 0) {
      results[0].isWinner = true;
    }

    return results;
  }

  async selectWinner(campaignId: string, variantId: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.abTesting?.enabled) {
      throw new BadRequestException('A/B test not found or not enabled');
    }

    const variant = campaign.abTesting.variants.find(v => v.id === variantId);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Update campaign with winner
    campaign.abTesting.winnerSelected = variantId;

    // Apply winning variant configuration to main campaign
    if (variant.config.subject) {
      campaign.config = { ...campaign.config, subject: variant.config.subject };
    }
    if (variant.config.htmlContent) {
      campaign.config = { ...campaign.config, htmlContent: variant.config.htmlContent };
    }
    if (variant.config.textContent) {
      campaign.config = { ...campaign.config, textContent: variant.config.textContent };
    }
    if (variant.config.fromName) {
      campaign.config = { ...campaign.config, fromName: variant.config.fromName };
    }
    if (variant.config.fromEmail) {
      campaign.config = { ...campaign.config, fromEmail: variant.config.fromEmail };
    }

    return this.campaignRepository.save(campaign);
  }

  async getAbTestStatus(campaignId: string): Promise<{
    enabled: boolean;
    testType: string;
    variants: any[];
    testSize: number;
    testDuration: number;
    winnerCriteria: string;
    winnerSelected: string | null;
    progress: {
      totalSent: number;
      totalOpened: number;
      totalClicked: number;
      totalReplied: number;
    };
    isComplete: boolean;
    canSelectWinner: boolean;
  }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.abTesting?.enabled) {
      return { enabled: false } as any;
    }

    const totalSent = campaign.abTesting.variants.reduce((sum, v) => sum + (v.performance?.sent || 0), 0);
    const totalOpened = campaign.abTesting.variants.reduce((sum, v) => sum + (v.performance?.opened || 0), 0);
    const totalClicked = campaign.abTesting.variants.reduce((sum, v) => sum + (v.performance?.clicked || 0), 0);
    const totalReplied = campaign.abTesting.variants.reduce((sum, v) => sum + (v.performance?.replied || 0), 0);

    const isComplete = totalSent >= campaign.abTesting.testSize;
    const canSelectWinner = isComplete && !campaign.abTesting.winnerSelected;

    return {
      enabled: true,
      testType: campaign.abTesting.testType,
      variants: campaign.abTesting.variants,
      testSize: campaign.abTesting.testSize,
      testDuration: campaign.abTesting.testDuration,
      winnerCriteria: campaign.abTesting.winnerCriteria,
      winnerSelected: campaign.abTesting.winnerSelected,
      progress: {
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
      },
      isComplete,
      canSelectWinner,
    };
  }

  private calculateVariantMetrics(performance: any): {
    openRate: number;
    clickRate: number;
    replyRate: number;
    unsubscribeRate: number;
    bounceRate: number;
    overallScore: number;
  } {
    const openRate = performance.sent > 0 ? (performance.opened / performance.sent) * 100 : 0;
    const clickRate = performance.sent > 0 ? (performance.clicked / performance.sent) * 100 : 0;
    const replyRate = performance.sent > 0 ? (performance.replied / performance.sent) * 100 : 0;
    const unsubscribeRate = performance.sent > 0 ? (performance.unsubscribed / performance.sent) * 100 : 0;
    const bounceRate = performance.sent > 0 ? (performance.bounced / performance.sent) * 100 : 0;

    return {
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      replyRate: Math.round(replyRate * 100) / 100,
      unsubscribeRate: Math.round(unsubscribeRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      overallScore: 0, // Will be calculated by caller
    };
  }

  private calculateOverallScore(metrics: any, winnerCriteria: string): number {
    let score = 0;

    switch (winnerCriteria) {
      case 'open_rate':
        score = metrics.openRate * 0.4 + metrics.clickRate * 0.3 + metrics.replyRate * 0.3;
        break;
      case 'click_rate':
        score = metrics.clickRate * 0.5 + metrics.openRate * 0.3 + metrics.replyRate * 0.2;
        break;
      case 'reply_rate':
        score = metrics.replyRate * 0.6 + metrics.clickRate * 0.3 + metrics.openRate * 0.1;
        break;
      case 'conversion_rate':
        score = metrics.replyRate * 0.5 + metrics.clickRate * 0.3 + metrics.openRate * 0.2;
        break;
      default:
        score = metrics.openRate * 0.3 + metrics.clickRate * 0.3 + metrics.replyRate * 0.4;
    }

    // Penalize high unsubscribe and bounce rates
    score -= metrics.unsubscribeRate * 0.5;
    score -= metrics.bounceRate * 0.3;

    return Math.max(0, Math.round(score * 100) / 100);
  }

  private calculateConfidence(performance: any): number {
    // Simple confidence calculation based on sample size
    const sampleSize = performance.sent;
    
    if (sampleSize < 10) return 0.3;
    if (sampleSize < 50) return 0.6;
    if (sampleSize < 100) return 0.8;
    if (sampleSize < 500) return 0.9;
    return 0.95;
  }
}
