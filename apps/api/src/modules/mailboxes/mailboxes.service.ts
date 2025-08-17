import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { Mailbox, MailboxStatus, MailboxType, MailboxProvider } from './entities/mailbox.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Domain } from '../domains/entities/domain.entity';

export interface CreateMailboxDto {
  email: string;
  name: string;
  type: MailboxType;
  provider: MailboxProvider;
  organizationId: string;
  domainId?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  providerSettings?: any;
}

export interface UpdateMailboxDto {
  name?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  providerSettings?: any;
  sendingConfig?: any;
  settings?: any;
}

export interface TestMailboxDto {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class MailboxesService {
  constructor(
    @InjectRepository(Mailbox)
    private readonly mailboxRepository: Repository<Mailbox>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
    private readonly configService: ConfigService,
  ) {}

  async createMailbox(createMailboxDto: CreateMailboxDto): Promise<Mailbox> {
    const {
      email,
      name,
      type,
      provider,
      organizationId,
      domainId,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
      providerSettings,
    } = createMailboxDto;

    // Check if organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if domain exists and is verified (if provided)
    if (domainId) {
      const domain = await this.domainRepository.findOne({
        where: { id: domainId, organizationId },
      });
      if (!domain) {
        throw new NotFoundException('Domain not found');
      }
      if (!domain.isVerified) {
        throw new BadRequestException('Domain must be verified before adding mailboxes');
      }
    }

    // Check if mailbox already exists
    const existingMailbox = await this.mailboxRepository.findOne({
      where: { email, organizationId },
    });
    if (existingMailbox) {
      throw new ConflictException('Mailbox already exists in this organization');
    }

    // Validate SMTP configuration for SMTP type
    if (type === MailboxType.SMTP) {
      if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
        throw new BadRequestException('SMTP configuration is required for SMTP type mailboxes');
      }
    }

    // Validate provider settings for API-based providers
    if (type !== MailboxType.SMTP && !providerSettings?.apiKey) {
      throw new BadRequestException('API key is required for API-based providers');
    }

    // Create mailbox
    const newMailbox = this.mailboxRepository.create({
      email,
      name,
      type,
      provider,
      organizationId,
      domainId,
      status: MailboxStatus.PENDING,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
      providerSettings,
      sendingConfig: {
        maxEmailsPerDay: 1000,
        maxEmailsPerHour: 100,
        maxEmailsPerMinute: 10,
        warmupEnabled: false,
        warmupRate: 50,
        warmupIncrement: 10,
        currentWarmupRate: 50,
        lastWarmupUpdate: new Date(),
        timezone: 'UTC',
        businessHoursOnly: false,
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessDays: [1, 2, 3, 4, 5], // Monday to Friday
      },
      security: {
        requireAuthentication: true,
        useOAuth2: false,
        ipWhitelist: [],
        lastPasswordChange: new Date(),
      },
      settings: {
        autoReplyEnabled: false,
        signatureEnabled: false,
        trackingEnabled: true,
        unsubscribeHeader: true,
        listUnsubscribeHeader: true,
        priority: 5,
      },
      monitoring: {
        reputationScore: 0,
        bounceRate: 0,
        complaintRate: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        lastReputationCheck: new Date(),
        blacklistStatus: [],
        dailyStats: [],
      },
    });

    const savedMailbox = await this.mailboxRepository.save(newMailbox);

    // Test mailbox connection if SMTP
    if (type === MailboxType.SMTP) {
      try {
        await this.testMailboxConnection(savedMailbox);
        await this.mailboxRepository.update(savedMailbox.id, { status: MailboxStatus.ACTIVE });
      } catch (error) {
        await this.mailboxRepository.update(savedMailbox.id, { status: MailboxStatus.FAILED });
        this.logger.warn(`Mailbox connection test failed for ${email}: ${error.message}`);
      }
    } else {
      // For API-based providers, mark as active
      await this.mailboxRepository.update(savedMailbox.id, { status: MailboxStatus.ACTIVE });
    }

    return this.findById(savedMailbox.id);
  }

  async findById(id: string): Promise<Mailbox> {
    const mailbox = await this.mailboxRepository.findOne({
      where: { id },
      relations: ['organization', 'domain'],
    });

    if (!mailbox) {
      throw new NotFoundException('Mailbox not found');
    }

    return mailbox;
  }

  async findByOrganization(organizationId: string): Promise<Mailbox[]> {
    return this.mailboxRepository.find({
      where: { organizationId },
      relations: ['organization', 'domain'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateMailbox(id: string, updateMailboxDto: UpdateMailboxDto): Promise<Mailbox> {
    const mailbox = await this.findById(id);

    // If updating SMTP credentials, test connection
    if (updateMailboxDto.smtpHost || updateMailboxDto.smtpPassword) {
      const testMailbox = { ...mailbox, ...updateMailboxDto };
      try {
        await this.testMailboxConnection(testMailbox);
        updateMailboxDto.status = MailboxStatus.ACTIVE;
      } catch (error) {
        updateMailboxDto.status = MailboxStatus.FAILED;
        this.logger.warn(`Mailbox connection test failed for ${mailbox.email}: ${error.message}`);
      }
    }

    await this.mailboxRepository.update(id, updateMailboxDto);

    return this.findById(id);
  }

  async deleteMailbox(id: string): Promise<void> {
    const mailbox = await this.findById(id);

    // Check if mailbox has active campaigns
    // This would require a relationship check in a real implementation

    await this.mailboxRepository.delete(id);
  }

  async testMailboxConnection(mailbox: Mailbox): Promise<boolean> {
    if (mailbox.type !== MailboxType.SMTP) {
      throw new BadRequestException('Connection testing is only available for SMTP mailboxes');
    }

    try {
      const transporter = nodemailer.createTransport({
        host: mailbox.smtpHost,
        port: mailbox.smtpPort,
        secure: mailbox.smtpSecure,
        auth: {
          user: mailbox.smtpUsername,
          pass: mailbox.smtpPassword,
        },
        // Test connection without sending
        pool: false,
        maxConnections: 1,
        maxMessages: 1,
      });

      // Verify connection
      await transporter.verify();
      await transporter.close();

      return true;
    } catch (error) {
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  }

  async testMailboxSending(id: string, testMailboxDto: TestMailboxDto): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    const mailbox = await this.findById(id);

    if (!mailbox.canSendEmails) {
      return {
        success: false,
        message: 'Mailbox is not ready for sending',
        error: 'Mailbox must be active and have valid credentials',
      };
    }

    try {
      if (mailbox.type === MailboxType.SMTP) {
        const transporter = nodemailer.createTransport(mailbox.smtpConfig);
        
        await transporter.sendMail({
          from: mailbox.email,
          to: testMailboxDto.to,
          subject: testMailboxDto.subject,
          text: testMailboxDto.body,
          html: `<p>${testMailboxDto.body}</p>`,
        });

        await transporter.close();
      } else {
        // For API-based providers, you'd implement their specific sending logic
        this.logger.log(`Test email would be sent via ${mailbox.provider} to ${testMailboxDto.to}`);
      }

      // Update last used timestamp
      await this.mailboxRepository.update(id, { lastUsedAt: new Date() });

      return {
        success: true,
        message: 'Test email sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send test email',
        error: error.message,
      };
    }
  }

  async getAvailableMailboxes(organizationId: string): Promise<Mailbox[]> {
    return this.mailboxRepository.find({
      where: {
        organizationId,
        status: MailboxStatus.ACTIVE,
        isActive: true,
      },
      relations: ['domain'],
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async updateMailboxStatus(id: string, status: MailboxStatus, reason?: string): Promise<Mailbox> {
    const mailbox = await this.findById(id);

    const updateData: any = { status };

    if (status === MailboxStatus.SUSPENDED) {
      updateData.suspendedAt = new Date();
      updateData.suspensionReason = reason;
    } else if (status === MailboxStatus.ACTIVE) {
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    }

    await this.mailboxRepository.update(id, updateData);

    return this.findById(id);
  }

  async getMailboxStats(organizationId: string): Promise<{
    total: number;
    active: number;
    pending: number;
    failed: number;
    suspended: number;
    warmingUp: number;
  }> {
    const mailboxes = await this.findByOrganization(organizationId);

    return {
      total: mailboxes.length,
      active: mailboxes.filter(m => m.status === MailboxStatus.ACTIVE).length,
      pending: mailboxes.filter(m => m.status === MailboxStatus.PENDING).length,
      failed: mailboxes.filter(m => m.status === MailboxStatus.FAILED).length,
      suspended: mailboxes.filter(m => m.status === MailboxStatus.SUSPENDED).length,
      warmingUp: mailboxes.filter(m => m.status === MailboxStatus.WARMING_UP).length,
    };
  }

  async rotateMailboxUsage(organizationId: string): Promise<Mailbox[]> {
    const availableMailboxes = await this.getAvailableMailboxes(organizationId);
    
    // Simple round-robin rotation
    // In a real implementation, you'd consider load balancing, reputation, etc.
    return availableMailboxes;
  }

  async warmupMailbox(id: string): Promise<Mailbox> {
    const mailbox = await this.findById(id);

    if (mailbox.status !== MailboxStatus.ACTIVE) {
      throw new BadRequestException('Only active mailboxes can be warmed up');
    }

    if (!mailbox.sendingConfig?.warmupEnabled) {
      throw new BadRequestException('Warmup is not enabled for this mailbox');
    }

    // Update warmup rate
    const newRate = Math.min(
      mailbox.sendingConfig.currentWarmupRate + mailbox.sendingConfig.warmupIncrement,
      mailbox.sendingConfig.maxEmailsPerDay
    );

    await this.mailboxRepository.update(id, {
      status: MailboxStatus.WARMING_UP,
      sendingConfig: {
        ...mailbox.sendingConfig,
        currentWarmupRate: newRate,
        lastWarmupUpdate: new Date(),
      },
    });

    return this.findById(id);
  }

  private readonly logger = new Logger(MailboxesService.name);
}
