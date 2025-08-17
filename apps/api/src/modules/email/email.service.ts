import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    if (smtpConfig.host && smtpConfig.auth.user) {
      this.transporter = nodemailer.createTransport(smtpConfig);
      this.logger.log('SMTP transporter initialized');
    } else {
      this.logger.warn('SMTP not configured, emails will be logged only');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('app.emailFrom'),
        replyTo: this.configService.get<string>('app.emailReplyTo'),
        ...options,
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
        return true;
      } else {
        // Log email content for development
        this.logger.log('Email would be sent:', {
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, firstName: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${token}`;
    
    const template = this.getVerificationEmailTemplate(firstName, verificationUrl);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
    
    const template = this.getPasswordResetEmailTemplate(firstName, resetUrl);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendUserInvitationEmail(
    email: string,
    invitationToken: string,
    inviterName: string,
    organizationName: string,
    role: string,
  ): Promise<boolean> {
    const invitationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/accept-invitation?token=${invitationToken}`;
    
    const template = this.getUserInvitationEmailTemplate(
      inviterName,
      organizationName,
      role,
      invitationUrl,
    );
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private getVerificationEmailTemplate(firstName: string, verificationUrl: string): EmailTemplate {
    return {
      subject: 'Verify Your Email Address - ColdMail SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ColdMail SaaS!</h2>
          <p>Hi ${firstName},</p>
          <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>The ColdMail SaaS Team</p>
        </div>
      `,
      text: `
        Welcome to ColdMail SaaS!
        
        Hi ${firstName},
        
        Thank you for signing up! Please verify your email address by visiting this link:
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        Best regards,
        The ColdMail SaaS Team
      `,
    };
  }

  private getPasswordResetEmailTemplate(firstName: string, resetUrl: string): EmailTemplate {
    return {
      subject: 'Reset Your Password - ColdMail SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The ColdMail SaaS Team</p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hi ${firstName},
        
        We received a request to reset your password. Visit this link to create a new password:
        ${resetUrl}
        
        This link will expire in 24 hours.
        
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        The ColdMail SaaS Team
      `,
    };
  }

  private getUserInvitationEmailTemplate(
    inviterName: string,
    organizationName: string,
    role: string,
    invitationUrl: string,
  ): EmailTemplate {
    return {
      subject: `You're Invited to Join ${organizationName} - ColdMail SaaS`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You're Invited!</h2>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on ColdMail SaaS as a <strong>${role}</strong>.</p>
          <p>Click the button below to accept the invitation and set up your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${invitationUrl}</p>
          <p>This invitation will expire in 7 days.</p>
          <p>Best regards,<br>The ColdMail SaaS Team</p>
        </div>
      `,
      text: `
        You're Invited!
        
        Hi there,
        
        ${inviterName} has invited you to join ${organizationName} on ColdMail SaaS as a ${role}.
        
        Click this link to accept the invitation and set up your account:
        ${invitationUrl}
        
        This invitation will expire in 7 days.
        
        Best regards,
        The ColdMail SaaS Team
      `,
    };
  }
}
