import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { Domain, DomainStatus, DomainType } from './entities/domain.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { DnsVerificationService } from './services/dns-verification.service';

export interface CreateDomainDto {
  domain: string;
  type: DomainType;
  website?: string;
  description?: string;
  organizationId: string;
}

export interface UpdateDomainDto {
  website?: string;
  description?: string;
  settings?: any;
  limits?: any;
}

@Injectable()
export class DomainsService {
  constructor(
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly dnsVerificationService: DnsVerificationService,
    private readonly configService: ConfigService,
  ) {}

  async createDomain(createDomainDto: CreateDomainDto): Promise<Domain> {
    const { domain, type, website, description, organizationId } = createDomainDto;

    // Check if organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if domain already exists in this organization
    const existingDomain = await this.domainRepository.findOne({
      where: { domain, organizationId },
    });
    if (existingDomain) {
      throw new ConflictException('Domain already exists in this organization');
    }

    // Validate domain format
    if (!this.isValidDomain(domain)) {
      throw new BadRequestException('Invalid domain format');
    }

    // Generate DKIM key pair
    const { privateKey, publicKey } = this.generateDkimKeyPair();

    // Create domain
    const newDomain = this.domainRepository.create({
      domain,
      type,
      website,
      description,
      organizationId,
      status: DomainStatus.PENDING,
      dnsRecords: {
        dkim: {
          selector: 'default',
          publicKey,
          algorithm: 'rsa',
        },
      },
      settings: {
        allowSubdomains: true,
        maxSubdomains: 10,
        requireDkim: true,
        requireDmarc: true,
        warmupEnabled: false,
        warmupRate: 50,
        reputationMonitoring: true,
      },
      limits: {
        maxEmailsPerDay: 10000,
        maxEmailsPerHour: 1000,
        maxConcurrentCampaigns: 5,
        maxContactLists: 100,
      },
      monitoring: {
        reputationScore: 0,
        bounceRate: 0,
        complaintRate: 0,
        lastReputationCheck: new Date(),
        blacklistStatus: [],
      },
    });

    const savedDomain = await this.domainRepository.save(newDomain);

    // Generate DNS records for the user to add
    const dnsRecords = await this.dnsVerificationService.generateDnsRecords(domain, privateKey);

    // Update domain with generated DNS records
    await this.domainRepository.update(savedDomain.id, {
      dnsRecords: {
        ...savedDomain.dnsRecords,
        spf: dnsRecords.spf,
        dmarc: dnsRecords.dmarc,
      },
    });

    return this.findById(savedDomain.id);
  }

  async findById(id: string): Promise<Domain> {
    const domain = await this.domainRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain;
  }

  async findByOrganization(organizationId: string): Promise<Domain[]> {
    return this.domainRepository.find({
      where: { organizationId },
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateDomain(id: string, updateDomainDto: UpdateDomainDto): Promise<Domain> {
    const domain = await this.findById(id);

    await this.domainRepository.update(id, updateDomainDto);

    return this.findById(id);
  }

  async deleteDomain(id: string): Promise<void> {
    const domain = await this.findById(id);

    // Check if domain has active mailboxes
    // This would require a relationship check in a real implementation

    await this.domainRepository.delete(id);
  }

  async verifyDomain(id: string): Promise<{
    domain: Domain;
    verification: any;
    dnsRecords: any;
    errors: string[];
  }> {
    const domain = await this.findById(id);

    if (!domain.isVerifiable) {
      throw new BadRequestException('Domain is not in a verifiable state');
    }

    // Update status to verifying
    await this.domainRepository.update(id, { status: DomainStatus.VERIFYING });

    try {
      // Perform DNS verification
      const verificationResult = await this.dnsVerificationService.verifyDomain(domain);

      // Update domain with verification results
      const updateData: any = {
        verification: {
          spfVerified: verificationResult.spfVerified,
          dkimVerified: verificationResult.dkimVerified,
          dmarcVerified: verificationResult.dmarcVerified,
          mxVerified: verificationResult.mxVerified,
          lastChecked: new Date(),
        },
        dnsRecords: {
          ...domain.dnsRecords,
          ...verificationResult.dnsRecords,
        },
      };

      // Determine new status
      if (verificationResult.errors.length === 0) {
        updateData.status = DomainStatus.VERIFIED;
        updateData.verifiedAt = new Date();
      } else {
        updateData.status = DomainStatus.FAILED;
      }

      await this.domainRepository.update(id, updateData);

      return {
        domain: await this.findById(id),
        verification: updateData.verification,
        dnsRecords: updateData.dnsRecords,
        errors: verificationResult.errors,
      };
    } catch (error) {
      // Reset status on error
      await this.domainRepository.update(id, { status: DomainStatus.FAILED });
      throw error;
    }
  }

  async checkDomainHealth(id: string): Promise<{
    domain: Domain;
    health: any;
  }> {
    const domain = await this.findById(id);

    const health = await this.dnsVerificationService.checkDomainHealth(domain.domain);

    return {
      domain,
      health,
    };
  }

  async resendVerification(id: string): Promise<Domain> {
    const domain = await this.findById(id);

    if (domain.status === DomainStatus.VERIFIED) {
      throw new BadRequestException('Domain is already verified');
    }

    // Reset verification status
    await this.domainRepository.update(id, {
      status: DomainStatus.PENDING,
      verification: {
        spfVerified: false,
        dkimVerified: false,
        dmarcVerified: false,
        mxVerified: false,
        lastChecked: null,
      },
    });

    return this.findById(id);
  }

  async suspendDomain(id: string, reason: string): Promise<Domain> {
    const domain = await this.findById(id);

    await this.domainRepository.update(id, {
      status: DomainStatus.SUSPENDED,
      suspendedAt: new Date(),
      suspensionReason: reason,
    });

    return this.findById(id);
  }

  async activateDomain(id: string): Promise<Domain> {
    const domain = await this.findById(id);

    if (domain.status !== DomainStatus.SUSPENDED) {
      throw new BadRequestException('Domain is not suspended');
    }

    await this.domainRepository.update(id, {
      status: DomainStatus.PENDING,
      suspendedAt: null,
      suspensionReason: null,
    });

    return this.findById(id);
  }

  async getDomainStats(organizationId: string): Promise<{
    total: number;
    verified: number;
    pending: number;
    failed: number;
    suspended: number;
  }> {
    const domains = await this.findByOrganization(organizationId);

    return {
      total: domains.length,
      verified: domains.filter(d => d.status === DomainStatus.VERIFIED).length,
      pending: domains.filter(d => d.status === DomainStatus.PENDING).length,
      failed: domains.filter(d => d.status === DomainStatus.FAILED).length,
      suspended: domains.filter(d => d.status === DomainStatus.SUSPENDED).length,
    };
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  private generateDkimKeyPair(): { privateKey: string; publicKey: string } {
    // In a real implementation, you'd use proper key generation
    // For now, we'll generate a mock key pair
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.randomBytes(64).toString('hex');
    
    return { privateKey, publicKey };
  }
}
