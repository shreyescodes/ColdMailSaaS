import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns';
import { promisify } from 'util';

import { Domain, DomainStatus } from '../entities/domain.entity';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);
const resolveA = promisify(dns.resolve);
const resolveCname = promisify(dns.resolveCname);

@Injectable()
export class DnsVerificationService {
  private readonly logger = new Logger(DnsVerificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async verifyDomain(domain: Domain): Promise<{
    spfVerified: boolean;
    dkimVerified: boolean;
    dmarcVerified: boolean;
    mxVerified: boolean;
    dnsRecords: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    const dnsRecords: any = {};

    try {
      // Verify SPF record
      const spfResult = await this.verifySpfRecord(domain.domain);
      dnsRecords.spf = spfResult.record;
      const spfVerified = spfResult.verified;
      if (!spfVerified) {
        errors.push(`SPF verification failed: ${spfResult.error}`);
      }

      // Verify DKIM record
      const dkimResult = await this.verifyDkimRecord(domain.domain, domain.dkimSelector);
      dnsRecords.dkim = dkimResult.record;
      const dkimVerified = dkimResult.verified;
      if (!dkimVerified) {
        errors.push(`DKIM verification failed: ${dkimResult.error}`);
      }

      // Verify DMARC record
      const dmarcResult = await this.verifyDmarcRecord(domain.domain);
      dnsRecords.dmarc = dmarcResult.record;
      const dmarcVerified = dmarcResult.verified;
      if (!dmarcVerified) {
        errors.push(`DMARC verification failed: ${dmarcResult.error}`);
      }

      // Verify MX records
      const mxResult = await this.verifyMxRecords(domain.domain);
      dnsRecords.mx = mxResult.records;
      const mxVerified = mxResult.verified;
      if (!mxVerified) {
        errors.push(`MX verification failed: ${mxResult.error}`);
      }

      // Verify A records
      try {
        const aRecords = await resolveA(domain.domain);
        dnsRecords.a = aRecords;
      } catch (error) {
        this.logger.warn(`Failed to resolve A records for ${domain.domain}: ${error.message}`);
      }

      this.logger.log(`Domain verification completed for ${domain.domain}: SPF=${spfVerified}, DKIM=${dkimVerified}, DMARC=${dmarcVerified}, MX=${mxVerified}`);

      return {
        spfVerified,
        dkimVerified,
        dmarcVerified,
        mxVerified,
        dnsRecords,
        errors,
      };
    } catch (error) {
      this.logger.error(`Domain verification failed for ${domain.domain}: ${error.message}`);
      errors.push(`Verification process failed: ${error.message}`);
      
      return {
        spfVerified: false,
        dkimVerified: false,
        dmarcVerified: false,
        mxVerified: false,
        dnsRecords: {},
        errors,
      };
    }
  }

  private async verifySpfRecord(domain: string): Promise<{ verified: boolean; record?: string; error?: string }> {
    try {
      const txtRecords = await resolveTxt(domain);
      const spfRecord = txtRecords.flat().find(record => record.startsWith('v=spf1'));

      if (!spfRecord) {
        return {
          verified: false,
          error: 'No SPF record found',
        };
      }

      // Basic SPF validation
      if (!spfRecord.includes('include:') && !spfRecord.includes('ip4:') && !spfRecord.includes('ip6:')) {
        return {
          verified: false,
          record: spfRecord,
          error: 'SPF record must include at least one mechanism (include, ip4, ip6, etc.)',
        };
      }

      return {
        verified: true,
        record: spfRecord,
      };
    } catch (error) {
      return {
        verified: false,
        error: `Failed to resolve SPF record: ${error.message}`,
      };
    }
  }

  private async verifyDkimRecord(domain: string, selector: string = 'default'): Promise<{ verified: boolean; record?: any; error?: string }> {
    try {
      const dkimDomain = `${selector}._domainkey.${domain}`;
      const txtRecords = await resolveTxt(dkimDomain);
      const dkimRecord = txtRecords.flat().find(record => record.startsWith('v=DKIM1'));

      if (!dkimRecord) {
        return {
          verified: false,
          error: `No DKIM record found for selector '${selector}'`,
        };
      }

      // Parse DKIM record
      const dkimParts = dkimRecord.split(';').reduce((acc, part) => {
        const [key, value] = part.trim().split('=');
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {} as Record<string, string>);

      // Validate required DKIM fields
      if (!dkimParts.v || dkimParts.v !== 'DKIM1') {
        return {
          verified: false,
          record: dkimRecord,
          error: 'Invalid DKIM version',
        };
      }

      if (!dkimParts.k || !['rsa', 'ed25519'].includes(dkimParts.k)) {
        return {
          verified: false,
          record: dkimRecord,
          error: 'Invalid or missing algorithm',
        };
      }

      if (!dkimParts.p) {
        return {
          verified: false,
          record: dkimRecord,
          error: 'Missing public key',
        };
      }

      return {
        verified: true,
        record: {
          selector,
          publicKey: dkimParts.p,
          algorithm: dkimParts.k,
          fullRecord: dkimRecord,
        },
      };
    } catch (error) {
      return {
        verified: false,
        error: `Failed to resolve DKIM record: ${error.message}`,
      };
    }
  }

  private async verifyDmarcRecord(domain: string): Promise<{ verified: boolean; record?: string; error?: string }> {
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const txtRecords = await resolveTxt(dmarcDomain);
      const dmarcRecord = txtRecords.flat().find(record => record.startsWith('v=DMARC1'));

      if (!dmarcRecord) {
        return {
          verified: false,
          error: 'No DMARC record found',
        };
      }

      // Basic DMARC validation
      if (!dmarcRecord.includes('p=')) {
        return {
          verified: false,
          record: dmarcRecord,
          error: 'DMARC record must include policy (p=)',
        };
      }

      return {
        verified: true,
        record: dmarcRecord,
      };
    } catch (error) {
      return {
        verified: false,
        error: `Failed to resolve DMARC record: ${error.message}`,
      };
    }
  }

  private async verifyMxRecords(domain: string): Promise<{ verified: boolean; records?: string[]; error?: string }> {
    try {
      const mxRecords = await resolveMx(domain);
      
      if (mxRecords.length === 0) {
        return {
          verified: false,
          error: 'No MX records found',
        };
      }

      // Sort by priority
      const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
      const mxStrings = sortedMx.map(mx => `${mx.priority} ${mx.exchange}`);

      return {
        verified: true,
        records: mxStrings,
      };
    } catch (error) {
      return {
        verified: false,
        error: `Failed to resolve MX records: ${error.message}`,
      };
    }
  }

  async generateDnsRecords(domain: string, dkimPrivateKey: string): Promise<{
    spf: string;
    dkim: string;
    dmarc: string;
    instructions: string[];
  }> {
    const instructions: string[] = [];
    
    // Generate SPF record
    const spfRecord = 'v=spf1 include:_spf.google.com ~all';
    instructions.push(`Add TXT record for ${domain}: ${spfRecord}`);

    // Generate DKIM record (this would normally use the private key to generate public key)
    const dkimSelector = 'default';
    const dkimRecord = `v=DKIM1; k=rsa; p=${dkimPrivateKey}`;
    instructions.push(`Add TXT record for ${dkimSelector}._domainkey.${domain}: ${dkimRecord}`);

    // Generate DMARC record
    const dmarcRecord = 'v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain;
    instructions.push(`Add TXT record for _dmarc.${domain}: ${dmarcRecord}`);

    return {
      spf: spfRecord,
      dkim: dkimRecord,
      dmarc: dmarcRecord,
      instructions,
    };
  }

  async checkDomainHealth(domain: string): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check SPF
      const spfResult = await this.verifySpfRecord(domain);
      if (!spfResult.verified) {
        score -= 25;
        issues.push('SPF record missing or invalid');
        recommendations.push('Add a valid SPF record to improve email deliverability');
      }

      // Check DKIM
      const dkimResult = await this.verifyDkimRecord(domain);
      if (!dkimResult.verified) {
        score -= 25;
        issues.push('DKIM record missing or invalid');
        recommendations.push('Configure DKIM authentication for better email security');
      }

      // Check DMARC
      const dmarcResult = await this.verifyDmarcRecord(domain);
      if (!dmarcResult.verified) {
        score -= 20;
        issues.push('DMARC record missing');
        recommendations.push('Add DMARC record to monitor and protect your domain');
      }

      // Check MX records
      const mxResult = await this.verifyMxRecords(domain);
      if (!mxResult.verified) {
        score -= 30;
        issues.push('MX records missing');
        recommendations.push('Configure MX records to receive emails');
      }

      // Additional recommendations based on score
      if (score < 50) {
        recommendations.push('Consider working with an email deliverability expert');
      } else if (score < 80) {
        recommendations.push('Domain has basic email setup, consider adding advanced features');
      } else {
        recommendations.push('Domain is well-configured for email sending');
      }

      return { score: Math.max(0, score), issues, recommendations };
    } catch (error) {
      return {
        score: 0,
        issues: ['Failed to check domain health'],
        recommendations: ['Contact support for assistance'],
      };
    }
  }
}
