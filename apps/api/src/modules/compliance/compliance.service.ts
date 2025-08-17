import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dns from 'dns';
import { promisify } from 'util';

import { Domain } from '../domains/entities/domain.entity';
import { Email } from '../campaigns/entities/email.entity';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

export interface ComplianceCheck {
  domainId: string;
  domainName: string;
  spf: { valid: boolean; record: string; score: number; issues: string[] };
  dkim: { valid: boolean; record: string; score: number; issues: string[] };
  dmarc: { valid: boolean; record: string; score: number; issues: string[] };
  mx: { valid: boolean; records: string[]; score: number; issues: string[] };
  overallScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  lastChecked: Date;
}

export interface SpamScoreResult {
  emailId: string;
  score: number;
  factors: { factor: string; score: number; description: string }[];
  risk: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
  ) {}

  async checkDomainCompliance(domainId: string): Promise<ComplianceCheck> {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId },
    });

    if (!domain) {
      throw new BadRequestException('Domain not found');
    }

    try {
      const [spf, dkim, dmarc, mx] = await Promise.all([
        this.checkSpfRecord(domain.domain),
        this.checkDkimRecord(domain.domain),
        this.checkDmarcRecord(domain.domain),
        this.checkMxRecords(domain.domain),
      ]);

      const overallScore = Math.round((spf.score + dkim.score + dmarc.score + mx.score) / 4);
      const status = this.getComplianceStatus(overallScore);
      const recommendations = this.generateComplianceRecommendations({ spf, dkim, dmarc, mx });

      const complianceCheck: ComplianceCheck = {
        domainId: domain.id,
        domainName: domain.domain,
        spf,
        dkim,
        dmarc,
        mx,
        overallScore,
        status,
        recommendations,
        lastChecked: new Date(),
      };

      // Update domain with compliance status
      // Update domain with compliance results
      await this.domainRepository.update(domain.id, {
        verification: {
          ...domain.verification,
          spfVerified: spf.isValid,
          dkimVerified: dkim.isValid,
          dmarcVerified: dmarc.isValid,
          mxVerified: mx.isValid,
          lastChecked: new Date(),
        },
      });
      await this.domainRepository.save(domain);

      return complianceCheck;
    } catch (error) {
      this.logger.error(`Failed to check compliance for domain ${domain.domain}:`, error);
      throw new BadRequestException('Failed to check domain compliance');
    }
  }

  async calculateSpamScore(emailContent: string, emailMetadata: any): Promise<SpamScoreResult> {
    let totalScore = 0;
    const factors: any[] = [];

    // Content-based scoring
    const contentScore = this.scoreEmailContent(emailContent);
    totalScore += contentScore.total;
    factors.push(...contentScore.factors);

    // Header-based scoring
    const headerScore = this.scoreEmailHeaders(emailMetadata);
    totalScore += headerScore.total;
    factors.push(...headerScore.factors);

    const risk = this.getSpamRiskLevel(totalScore);
    const recommendations = this.generateSpamRecommendations(factors);

    return {
      emailId: emailMetadata.id || 'unknown',
      score: Math.max(0, Math.min(100, totalScore)),
      factors,
      risk,
      recommendations,
    };
  }

  private async checkSpfRecord(domain: string) {
    try {
      const records = await resolveTxt(domain);
      const spfRecord = records.flat().find(record => record.startsWith('v=spf1'));

      if (!spfRecord) {
        return { valid: false, record: 'Not found', score: 0, issues: ['SPF record not found'] };
      }

      const issues: string[] = [];
      let score = 100;

      if (spfRecord.includes('+all')) {
        issues.push('SPF record uses +all (too permissive)');
        score -= 30;
      }

      if (spfRecord.includes('~all') || spfRecord.includes('-all')) {
        score += 10;
      }

      return { valid: score >= 70, record: spfRecord, score: Math.max(0, score), issues };
    } catch (error) {
      return { valid: false, record: 'DNS resolution failed', score: 0, issues: ['Failed to resolve DNS records'] };
    }
  }

  private async checkDkimRecord(domain: string) {
    try {
      const selector = 'default';
      const dkimDomain = `${selector}._domainkey.${domain}`;
      const records = await resolveTxt(dkimDomain);

      if (!records || records.length === 0) {
        return { valid: false, record: 'Not found', score: 0, issues: ['DKIM record not found'] };
      }

      const dkimRecord = records.flat().find(record => record.startsWith('v=DKIM1'));
      const issues: string[] = [];
      let score = 100;

      if (!dkimRecord) {
        issues.push('Invalid DKIM record format');
        score -= 50;
      }

      return { valid: score >= 70, record: dkimRecord || 'Invalid format', score: Math.max(0, score), issues };
    } catch (error) {
      return { valid: false, record: 'DNS resolution failed', score: 0, issues: ['Failed to resolve DNS records'] };
    }
  }

  private async checkDmarcRecord(domain: string) {
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const records = await resolveTxt(dmarcDomain);

      if (!records || records.length === 0) {
        return { valid: false, record: 'Not found', score: 0, issues: ['DMARC record not found'] };
      }

      const dmarcRecord = records.flat().find(record => record.startsWith('v=DMARC1'));
      const issues: string[] = [];
      let score = 100;

      if (!dmarcRecord) {
        issues.push('Invalid DMARC record format');
        score -= 50;
      } else {
        if (dmarcRecord.includes('p=reject')) score += 20;
        else if (dmarcRecord.includes('p=quarantine')) score += 10;
        else if (dmarcRecord.includes('p=none')) score -= 10;
      }

      return { valid: score >= 70, record: dmarcRecord || 'Invalid format', score: Math.max(0, score), issues };
    } catch (error) {
      return { valid: false, record: 'DNS resolution failed', score: 0, issues: ['Failed to resolve DNS records'] };
    }
  }

  private async checkMxRecords(domain: string) {
    try {
      const records = await resolveMx(domain);
      const issues: string[] = [];
      let score = 100;

      if (!records || records.length === 0) {
        return { valid: false, records: [], score: 0, issues: ['No MX records found'] };
      }

      const mxRecords = records.map(r => r.exchange);
      
      if (mxRecords.length === 1) {
        issues.push('Single MX record (no redundancy)');
        score -= 10;
      }

      return { valid: score >= 70, records: mxRecords, score: Math.max(0, score), issues };
    } catch (error) {
      return { valid: false, records: [], score: 0, issues: ['Failed to resolve MX records'] };
    }
  }

  private scoreEmailContent(content: string) {
    let total = 0;
    const factors: any[] = [];
    const contentLower = content.toLowerCase();

    if (contentLower.includes('unsubscribe')) {
      total -= 5;
      factors.push({ factor: 'Unsubscribe link', score: -5, description: 'Good practice' });
    }

    if (contentLower.includes('free') && contentLower.includes('money')) {
      total += 15;
      factors.push({ factor: 'Free money claims', score: 15, description: 'High spam indicator' });
    }

    if (contentLower.includes('click here') && contentLower.includes('now')) {
      total += 10;
      factors.push({ factor: 'Urgent call-to-action', score: 10, description: 'Spam-like urgency' });
    }

    return { total, factors };
  }

  private scoreEmailHeaders(metadata: any) {
    let total = 0;
    const factors: any[] = [];

    if (!metadata.fromName || !metadata.fromEmail) {
      total += 10;
      factors.push({ factor: 'Missing sender info', score: 10, description: 'Incomplete headers' });
    }

    if (!metadata.subject || metadata.subject.length < 3) {
      total += 8;
      factors.push({ factor: 'Missing/weak subject', score: 8, description: 'Poor subject line' });
    }

    return { total, factors };
  }

  private getSpamRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 20) return 'low';
    if (score < 40) return 'medium';
    if (score < 60) return 'high';
    return 'critical';
  }

  private generateSpamRecommendations(factors: any[]): string[] {
    const recommendations: string[] = [];

    if (factors.some(f => f.factor.includes('spam keywords'))) {
      recommendations.push('Review and replace spam-triggering words');
    }

    if (factors.some(f => f.factor.includes('punctuation'))) {
      recommendations.push('Reduce excessive punctuation in subject lines');
    }

    return recommendations;
  }

  private getComplianceStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 50) return 'poor';
    return 'critical';
  }

  private generateComplianceRecommendations(checks: any): string[] {
    const recommendations: string[] = [];

    if (checks.spf.score < 70) {
      recommendations.push('Fix SPF record issues to improve email authentication');
    }

    if (checks.dkim.score < 70) {
      recommendations.push('Configure DKIM properly for better email security');
    }

    if (checks.dmarc.score < 70) {
      recommendations.push('Implement DMARC policy to protect against spoofing');
    }

    return recommendations;
  }
}
