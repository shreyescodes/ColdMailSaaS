import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Campaign, CampaignStatus, CampaignType } from './entities/campaign.entity';
import { Contact } from './entities/contact.entity';
import { ContactList } from './entities/contact-list.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Mailbox } from '../mailboxes/entities/mailbox.entity';

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  priority?: string;
  primaryMailboxId?: string;
  config?: {
    subject: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    htmlContent?: string;
    textContent?: string;
    trackingEnabled?: boolean;
    unsubscribeHeader?: boolean;
  };
  sequence?: {
    steps: Array<{
      order: number;
      delay: number;
      subject: string;
      htmlContent: string;
      textContent: string;
    }>;
    maxSteps: number;
    stopOnReply?: boolean;
    stopOnUnsubscribe?: boolean;
    stopOnBounce?: boolean;
  };
  targeting?: {
    contactListIds: string[];
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    maxContacts?: number;
  };
  sendingConfig?: {
    maxEmailsPerDay: number;
    maxEmailsPerHour: number;
    maxEmailsPerMinute: number;
    timezone: string;
    businessHoursOnly?: boolean;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    businessDays?: number[];
    delayBetweenEmails?: number;
    mailboxRotation?: boolean;
  };
  scheduledAt?: Date;
  organizationId: string;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  config?: any;
  sequence?: any;
  targeting?: any;
  sendingConfig?: any;
  scheduledAt?: Date;
}

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactList)
    private readonly contactListRepository: Repository<ContactList>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Mailbox)
    private readonly mailboxRepository: Repository<Mailbox>,
    private readonly configService: ConfigService,
  ) {}

  async createCampaign(createCampaignDto: CreateCampaignDto, userId: string): Promise<Campaign> {
    // Validate organization
    const organization = await this.organizationRepository.findOne({
      where: { id: createCampaignDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Validate user belongs to organization
    const user = await this.userRepository.findOne({
      where: { id: userId, organizationId: createCampaignDto.organizationId },
    });

    if (!user) {
      throw new BadRequestException('User not found or does not belong to organization');
    }

    // Validate mailbox if provided
    if (createCampaignDto.primaryMailboxId) {
      const mailbox = await this.mailboxRepository.findOne({
        where: { id: createCampaignDto.primaryMailboxId, organizationId: createCampaignDto.organizationId },
      });

      if (!mailbox) {
        throw new NotFoundException('Mailbox not found');
      }

      if (!mailbox.isReady) {
        throw new BadRequestException('Mailbox is not ready for sending');
      }
    }

    // Validate contact lists
    if (createCampaignDto.targeting?.contactListIds) {
      for (const listId of createCampaignDto.targeting.contactListIds) {
        const contactList = await this.contactListRepository.findOne({
          where: { id: listId, organizationId: createCampaignDto.organizationId },
        });

        if (!contactList) {
          throw new NotFoundException(`Contact list ${listId} not found`);
        }

        if (!contactList.canSendEmails) {
          throw new BadRequestException(`Contact list ${listId} cannot be used for sending`);
        }
      }
    }

    // Set default sending configuration
    const sendingConfig = {
      maxEmailsPerDay: 1000,
      maxEmailsPerHour: 100,
      maxEmailsPerMinute: 10,
      timezone: 'UTC',
      businessHoursOnly: false,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: [1, 2, 3, 4, 5], // Monday to Friday
      delayBetweenEmails: 60, // seconds
      mailboxRotation: false,
      ...createCampaignDto.sendingConfig,
    };

    // Create campaign
    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      createdByUserId: userId,
      status: createCampaignDto.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      sendingConfig,
      progress: {
        totalContacts: 0,
        processedContacts: 0,
        sentEmails: 0,
        failedEmails: 0,
        bouncedEmails: 0,
        unsubscribedEmails: 0,
        repliedEmails: 0,
        openedEmails: 0,
        clickedEmails: 0,
      },
      metrics: {
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
        complaintRate: 0,
        unsubscribeRate: 0,
        conversionRate: 0,
        lastCalculated: new Date(),
      },
    });

    return this.campaignRepository.save(campaign);
  }

  async findById(id: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, organizationId },
      relations: ['createdByUser', 'assignedUser', 'primaryMailbox', 'organization'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async findByOrganization(organizationId: string): Promise<Campaign[]> {
    return this.campaignRepository.find({
      where: { organizationId },
      relations: ['createdByUser', 'primaryMailbox'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateCampaign(id: string, updateCampaignDto: UpdateCampaignDto, organizationId: string): Promise<Campaign> {
    const campaign = await this.findById(id, organizationId);

    // Check if campaign can be updated
    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot update active campaign');
    }

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Cannot update completed campaign');
    }

    // Update campaign
    Object.assign(campaign, updateCampaignDto);

    // Update status if scheduled
    if (updateCampaignDto.scheduledAt) {
      campaign.status = CampaignStatus.SCHEDULED;
    }

    return this.campaignRepository.save(campaign);
  }

  async deleteCampaign(id: string, organizationId: string): Promise<void> {
    const campaign = await this.findById(id, organizationId);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaign');
    }

    await this.campaignRepository.remove(campaign);
  }

  async startCampaign(id: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.findById(id, organizationId);

    if (!campaign.canStart) {
      throw new BadRequestException('Campaign cannot be started');
    }

    // Calculate total contacts
    const totalContacts = await this.calculateTotalContacts(campaign);

    if (totalContacts === 0) {
      throw new BadRequestException('No contacts found for campaign');
    }

    // Update campaign status and progress
    campaign.status = CampaignStatus.ACTIVE;
    campaign.startedAt = new Date();
    campaign.progress = {
      ...campaign.progress,
      totalContacts,
      processedContacts: 0,
    };

    return this.campaignRepository.save(campaign);
  }

  async pauseCampaign(id: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.findById(id, organizationId);

    if (!campaign.canPause) {
      throw new BadRequestException('Campaign cannot be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepository.save(campaign);
  }

  async resumeCampaign(id: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.findById(id, organizationId);

    if (!campaign.canResume) {
      throw new BadRequestException('Campaign cannot be resumed');
    }

    campaign.status = CampaignStatus.ACTIVE;
    return this.campaignRepository.save(campaign);
  }

  async cancelCampaign(id: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.findById(id, organizationId);

    if (!campaign.canCancel) {
      throw new BadRequestException('Campaign cannot be cancelled');
    }

    campaign.status = CampaignStatus.CANCELLED;
    return this.campaignRepository.save(campaign);
  }

  async getCampaignStats(organizationId: string): Promise<{
    total: number;
    draft: number;
    scheduled: number;
    active: number;
    paused: number;
    completed: number;
    cancelled: number;
    failed: number;
  }> {
    const campaigns = await this.campaignRepository.find({
      where: { organizationId },
      select: ['status'],
    });

    const stats = {
      total: campaigns.length,
      draft: 0,
      scheduled: 0,
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
    };

    campaigns.forEach(campaign => {
      stats[campaign.status]++;
    });

    return stats;
  }

  private async calculateTotalContacts(campaign: Campaign): Promise<number> {
    if (!campaign.targeting?.contactListIds) {
      return 0;
    }

    let totalContacts = 0;

    for (const listId of campaign.targeting.contactListIds) {
      const contactList = await this.contactListRepository.findOne({
        where: { id: listId },
      });

      if (contactList) {
        totalContacts += contactList.totalContacts;
      }
    }

    // Apply filters if any
    if (campaign.targeting.filters && campaign.targeting.filters.length > 0) {
      // This would require a more complex query builder implementation
      // For now, we'll use a simple approach
      totalContacts = Math.floor(totalContacts * 0.8); // Assume 80% pass filters
    }

    // Apply max contacts limit
    if (campaign.targeting.maxContacts && totalContacts > campaign.targeting.maxContacts) {
      totalContacts = campaign.targeting.maxContacts;
    }

    return totalContacts;
  }
}
