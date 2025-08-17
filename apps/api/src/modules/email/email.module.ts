import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailSendingService } from './services/email-sending.service';
import { UserInvitation } from '../users/entities/user-invitation.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { Email } from '../campaigns/entities/email.entity';
import { Mailbox } from '../mailboxes/entities/mailbox.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserInvitation, Organization, User, Email, Mailbox]),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailSendingService],
  exports: [EmailService, EmailSendingService],
})
export class EmailModule {}
