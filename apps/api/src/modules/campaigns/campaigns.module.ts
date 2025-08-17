import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign } from './entities/campaign.entity';
import { Contact } from './entities/contact.entity';
import { ContactList } from './entities/contact-list.entity';
import { Email } from './entities/email.entity';
import { DynamicVariablesService } from './services/dynamic-variables.service';
import { AbTestingService } from './services/ab-testing.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Contact, ContactList, Email]),
    AiModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, DynamicVariablesService, AbTestingService],
  exports: [CampaignsService, DynamicVariablesService, AbTestingService],
})
export class CampaignsModule {}
