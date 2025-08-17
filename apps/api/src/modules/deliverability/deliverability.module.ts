import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeliverabilityController } from './deliverability.controller';
import { DeliverabilityService } from './deliverability.service';
import { Domain } from '../domains/entities/domain.entity';
import { Mailbox } from '../mailboxes/entities/mailbox.entity';
import { Email } from '../campaigns/entities/email.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Domain, Mailbox, Email]),
  ],
  controllers: [DeliverabilityController],
  providers: [DeliverabilityService],
  exports: [DeliverabilityService],
})
export class DeliverabilityModule {}
