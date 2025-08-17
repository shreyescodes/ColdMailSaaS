import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

import { Email } from '../../campaigns/entities/email.entity';
import { Mailbox } from '../../mailboxes/entities/mailbox.entity';

export interface SendEmailOptions {
  to: string;
  toName: string;
  from: string;
  fromName: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  replyTo?: string;
  campaignId?: string;
  contactId: string;
  mailboxId: string;
  organizationId: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  externalMessageId?: string;
  error?: string;
}

@Injectable()
export class EmailSendingService {
  private readonly logger = new Logger(EmailSendingService.name);
  private readonly transporters = new Map<string, nodemailer.Transporter>();

  constructor(
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
    @InjectRepository(Mailbox)
    private readonly mailboxRepository: Repository<Mailbox>,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      // Validate inputs
      this.validateSendOptions(options);

      // Get mailbox configuration
      const mailbox = await this.mailboxRepository.findOne({
        where: { id: options.mailboxId },
      });

      if (!mailbox) {
        throw new BadRequestException('Mailbox not found');
      }

      // Create email record
      const email = await this.createEmailRecord(options);

      // Get or create transporter
      const transporter = await this.getTransporter(mailbox);

      // Prepare email content
      const mailOptions = this.prepareMailOptions(options, email.messageId);

      // Send email
      const result = await transporter.sendMail(mailOptions);

      // Update email record with success
      await this.updateEmailRecord(email.id, {
        status: 'sent',
        externalMessageId: result.messageId,
        sentAt: new Date(),
      });

      this.logger.log(`Email sent successfully: ${email.messageId}`);

      return {
        success: true,
        messageId: email.messageId,
        externalMessageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async testMailboxConnection(mailboxId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const mailbox = await this.mailboxRepository.findOne({
        where: { id: mailboxId },
      });

      if (!mailbox) {
        throw new BadRequestException('Mailbox not found');
      }

      const transporter = await this.getTransporter(mailbox);
      await transporter.verify();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private validateSendOptions(options: SendEmailOptions): void {
    if (!options.to || !options.from || !options.subject) {
      throw new BadRequestException('Missing required email fields');
    }

    if (!options.htmlContent && !options.textContent) {
      throw new BadRequestException('Email must have HTML or text content');
    }
  }

  private async createEmailRecord(options: SendEmailOptions): Promise<Email> {
    const email = this.emailRepository.create({
      organizationId: options.organizationId,
      campaignId: options.campaignId,
      contactId: options.contactId,
      mailboxId: options.mailboxId,
      type: options.campaignId ? 'campaign' : 'transactional',
      status: 'pending',
      toEmail: options.to,
      toName: options.toName,
      fromEmail: options.from,
      fromName: options.fromName,
      replyTo: options.replyTo,
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent,
      messageId: this.generateMessageId(),
      tracking: {
        openCount: 0,
        clickCount: 0,
      },
    });

    return this.emailRepository.save(email);
  }

  private async updateEmailRecord(emailId: string, updates: Partial<Email>): Promise<void> {
    await this.emailRepository.update(emailId, updates);
  }

  private async getTransporter(mailbox: Mailbox): Promise<nodemailer.Transporter> {
    const key = `${mailbox.id}-${mailbox.updatedAt.getTime()}`;
    
    if (this.transporters.has(key)) {
      return this.transporters.get(key)!;
    }

    const transporter = nodemailer.createTransport({
      host: mailbox.smtpHost,
      port: mailbox.smtpPort,
      secure: mailbox.smtpSecure,
      auth: {
        user: mailbox.smtpUsername,
        pass: mailbox.smtpPassword,
      },
    });

    this.transporters.set(key, transporter);
    return transporter;
  }

  private prepareMailOptions(
    options: SendEmailOptions,
    messageId: string,
  ): nodemailer.SendMailOptions {
    return {
      from: `"${options.fromName}" <${options.from}>`,
      to: `"${options.toName}" <${options.to}>`,
      subject: options.subject,
      html: options.htmlContent,
      text: options.textContent,
      replyTo: options.replyTo,
      messageId: `<${messageId}@coldmail-saas.com>`,
      headers: {
        'X-Mailer': 'ColdMail SaaS',
        'X-Campaign-ID': options.campaignId || '',
        'X-Contact-ID': options.contactId,
      },
    };
  }

  private generateMessageId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
