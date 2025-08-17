import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Domain } from '../domains/entities/domain.entity';
import { Mailbox } from '../mailboxes/entities/mailbox.entity';
import { Email } from '../campaigns/entities/email.entity';

export interface DeliverabilityMetrics {
  domainId: string;
  domainName: string;
  inboxRate: number;
  spamRate: number;
  bounceRate: number;
  complaintRate: number;
  reputationScore: number;
  senderScore: number;
  lastUpdated: Date;
}

export interface BlacklistStatus {
  domain: string;
  ipAddress: string;
  blacklists: {
    name: string;
    status: 'clean' | 'listed' | 'unknown';
    url: string;
    lastChecked: Date;
  }[];
  overallStatus: 'clean' | 'partially_listed' | 'listed';
  lastChecked: Date;
}

export interface ReputationReport {
  domainId: string;
  domainName: string;
  overallScore: number;
  factors: {
    positive: string[];
    negative: string[];
  };
  recommendations: string[];
  trends: {
    period: string;
    score: number;
    change: number;
  }[];
  lastUpdated: Date;
}

@Injectable()
export class DeliverabilityService {
  private readonly logger = new Logger(DeliverabilityService.name);

  constructor(
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    @InjectRepository(Mailbox)
    private readonly mailboxRepository: Repository<Mailbox>,
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
  ) {}

  async getDeliverabilityMetrics(domainId: string): Promise<DeliverabilityMetrics> {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
    });

    if (!domain) {
      throw new BadRequestException('Domain not found');
    }

    // Get email statistics for the domain
    const emailStats = await this.emailRepository
      .createQueryBuilder('email')
      .leftJoin('email.campaign', 'campaign')
      .leftJoin('campaign.organization', 'organization')
      .where('organization.id = :organizationId', { organizationId: domain.organizationId })
              .andWhere('email.fromEmail LIKE :domain', { domain: `%@${domain.domain}` })
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN email.status = :sent THEN 1 END) as sent',
        'COUNT(CASE WHEN email.bouncedAt IS NOT NULL THEN 1 END) as bounced',
        'COUNT(CASE WHEN email.complainedAt IS NOT NULL THEN 1 END) as complained',
        'COUNT(CASE WHEN email.openedAt IS NOT NULL THEN 1 END) as opened',
      ])
      .setParameter('sent', 'sent')
      .getRawOne();

    const total = parseInt(emailStats.total) || 0;
    const sent = parseInt(emailStats.sent) || 0;
    const bounced = parseInt(emailStats.bounced) || 0;
    const complained = parseInt(emailStats.complained) || 0;
    const opened = parseInt(emailStats.opened) || 0;

    const inboxRate = sent > 0 ? ((sent - bounced) / sent) * 100 : 0;
    const spamRate = sent > 0 ? (complained / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const complaintRate = sent > 0 ? (complained / sent) * 100 : 0;

    const reputationScore = this.calculateReputationScore({
      inboxRate,
      spamRate,
      bounceRate,
      complaintRate,
    });

    const senderScore = this.calculateSenderScore({
      inboxRate,
      spamRate,
      bounceRate,
      complaintRate,
      opened,
      sent,
    });

    return {
      domainId: domain.id,
      domainName: domain.domain,
      inboxRate: Math.round(inboxRate * 100) / 100,
      spamRate: Math.round(spamRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      complaintRate: Math.round(complaintRate * 100) / 100,
      reputationScore: Math.round(reputationScore * 100) / 100,
      senderScore: Math.round(senderScore * 100) / 100,
      lastUpdated: new Date(),
    };
  }

  async checkBlacklistStatus(domain: string, ipAddress?: string): Promise<BlacklistStatus> {
    const blacklists = [
      { name: 'Spamhaus', url: 'https://www.spamhaus.org/lookup/' },
      { name: 'Barracuda', url: 'https://www.barracudacentral.org/lookups' },
      { name: 'Sorbs', url: 'https://www.sorbs.net/lookup.shtml' },
      { name: 'SpamCop', url: 'https://www.spamcop.net/bl.shtml' },
    ];

    // Mock implementation - in production, you would make actual API calls
    const results = blacklists.map(bl => ({
      name: bl.name,
      status: 'clean' as const, // Mock clean status
      url: bl.url,
      lastChecked: new Date(),
    }));

    return {
      domain,
      ipAddress: ipAddress || 'unknown',
      blacklists: results,
      overallStatus: 'clean',
      lastChecked: new Date(),
    };
  }

  async generateReputationReport(domainId: string): Promise<ReputationReport> {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
    });

    if (!domain) {
      throw new BadRequestException('Domain not found');
    }

    const metrics = await this.getDeliverabilityMetrics(domainId);
    
    const factors = this.analyzeReputationFactors(metrics);
    const recommendations = this.generateDeliverabilityRecommendations(metrics);
    const trends = this.generateTrendData(domainId);

    return {
      domainId: domain.id,
      domainName: domain.domain,
      overallScore: metrics.reputationScore,
      factors,
      recommendations,
      trends,
      lastUpdated: new Date(),
    };
  }

  async optimizeDeliverability(domainId: string): Promise<{
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  }> {
    const metrics = await this.getDeliverabilityMetrics(domainId);
    const recommendations: string[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';

    // Analyze and provide recommendations
    if (metrics.bounceRate > 5) {
      recommendations.push('High bounce rate detected. Clean your email list and verify email addresses.');
      priority = 'high';
    }

    if (metrics.complaintRate > 0.1) {
      recommendations.push('High complaint rate. Review email content and frequency.');
      priority = 'high';
    }

    if (metrics.inboxRate < 90) {
      recommendations.push('Low inbox rate. Check sender reputation and authentication.');
      priority = 'medium';
    }

    if (metrics.spamRate > 1) {
      recommendations.push('High spam rate. Review content and sender practices.');
      priority = 'medium';
    }

    if (recommendations.length === 0) {
      recommendations.push('Your deliverability metrics look good. Continue monitoring.');
    }

    const estimatedImpact = this.estimateImpact(priority, recommendations.length);

    return {
      recommendations,
      priority,
      estimatedImpact,
    };
  }

  private calculateReputationScore(metrics: any): number {
    let score = 100;

    // Penalize poor metrics
    if (metrics.inboxRate < 90) score -= (90 - metrics.inboxRate) * 2;
    if (metrics.spamRate > 1) score -= metrics.spamRate * 10;
    if (metrics.bounceRate > 5) score -= (metrics.bounceRate - 5) * 3;
    if (metrics.complaintRate > 0.1) score -= metrics.complaintRate * 100;

    return Math.max(0, Math.min(100, score));
  }

  private calculateSenderScore(metrics: any): number {
    let score = 100;

    // Base score on engagement
    if (metrics.opened > 0 && metrics.sent > 0) {
      const openRate = (metrics.opened / metrics.sent) * 100;
      if (openRate > 20) score += 20;
      else if (openRate > 10) score += 10;
      else if (openRate < 5) score -= 20;
    }

    // Penalize poor deliverability
    if (metrics.inboxRate < 95) score -= (95 - metrics.inboxRate) * 3;
    if (metrics.bounceRate > 3) score -= (metrics.bounceRate - 3) * 5;
    if (metrics.complaintRate > 0.05) score -= metrics.complaintRate * 200;

    return Math.max(0, Math.min(100, score));
  }

  private analyzeReputationFactors(metrics: DeliverabilityMetrics): {
    positive: string[];
    negative: string[];
  } {
    const positive: string[] = [];
    const negative: string[] = [];

    if (metrics.inboxRate >= 95) {
      positive.push('Excellent inbox delivery rate');
    } else if (metrics.inboxRate < 90) {
      negative.push('Low inbox delivery rate');
    }

    if (metrics.bounceRate <= 2) {
      positive.push('Low bounce rate');
    } else if (metrics.bounceRate > 5) {
      negative.push('High bounce rate');
    }

    if (metrics.complaintRate <= 0.05) {
      positive.push('Low complaint rate');
    } else if (metrics.complaintRate > 0.1) {
      negative.push('High complaint rate');
    }

    if (metrics.spamRate <= 0.5) {
      positive.push('Low spam folder rate');
    } else if (metrics.spamRate > 1) {
      negative.push('High spam folder rate');
    }

    return { positive, negative };
  }

  private generateDeliverabilityRecommendations(metrics: DeliverabilityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.bounceRate > 5) {
      recommendations.push('Implement email validation before sending');
      recommendations.push('Clean your email list regularly');
    }

    if (metrics.complaintRate > 0.1) {
      recommendations.push('Review email content for spam triggers');
      recommendations.push('Implement proper unsubscribe mechanisms');
      recommendations.push('Reduce email frequency');
    }

    if (metrics.inboxRate < 90) {
      recommendations.push('Check and fix SPF, DKIM, and DMARC records');
      recommendations.push('Monitor sender reputation');
      recommendations.push('Implement gradual warmup for new domains');
    }

    if (metrics.spamRate > 1) {
      recommendations.push('Avoid spam trigger words in subject lines');
      recommendations.push('Maintain proper text-to-HTML ratio');
      recommendations.push('Include physical address in emails');
    }

    return recommendations;
  }

  private generateTrendData(domainId: string): {
    period: string;
    score: number;
    change: number;
  }[] {
    // Mock trend data - in production, you would analyze historical data
    return [
      { period: 'Last 7 days', score: 85, change: 2 },
      { period: 'Last 30 days', score: 83, change: -1 },
      { period: 'Last 90 days', score: 84, change: 5 },
    ];
  }

  private estimateImpact(priority: string, recommendationCount: number): string {
    if (priority === 'high') {
      return `High impact - ${recommendationCount} critical issues to address`;
    } else if (priority === 'medium') {
      return `Medium impact - ${recommendationCount} issues to monitor`;
    } else {
      return `Low impact - ${recommendationCount} minor optimizations`;
    }
  }
}
