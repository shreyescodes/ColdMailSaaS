import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailboxesService } from './mailboxes.service';
import { MailboxesController } from './mailboxes.controller';
import { Mailbox } from './entities/mailbox.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Domain } from '../domains/entities/domain.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mailbox, Organization, Domain]),
  ],
  controllers: [MailboxesController],
  providers: [MailboxesService],
  exports: [MailboxesService],
})
export class MailboxesModule {}
