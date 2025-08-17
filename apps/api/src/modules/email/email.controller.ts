import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailService } from './email.service';

@ApiTags('email')
@Controller('email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  async sendEmail(@Body() emailOptions: any) {
    return this.emailService.sendEmail(emailOptions);
  }

  @Post('verification')
  @ApiOperation({ summary: 'Send verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent successfully' })
  async sendVerificationEmail(@Body() data: { email: string; token: string; firstName: string }) {
    return this.emailService.sendVerificationEmail(data.email, data.token, data.firstName);
  }

  @Post('password-reset')
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent successfully' })
  async sendPasswordResetEmail(@Body() data: { email: string; token: string; firstName: string }) {
    return this.emailService.sendPasswordResetEmail(data.email, data.token, data.firstName);
  }

  @Post('invitation')
  @ApiOperation({ summary: 'Send user invitation email' })
  @ApiResponse({ status: 200, description: 'Invitation email sent successfully' })
  async sendUserInvitationEmail(@Body() data: {
    email: string;
    invitationToken: string;
    inviterName: string;
    organizationName: string;
    role: string;
  }) {
    return this.emailService.sendUserInvitationEmail(
      data.email,
      data.invitationToken,
      data.inviterName,
      data.organizationName,
      data.role,
    );
  }
}
