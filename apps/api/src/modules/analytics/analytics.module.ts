import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportBuilderService } from './services/report-builder.service';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Email } from '../campaigns/entities/email.entity';
import { Contact } from '../campaigns/entities/contact.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Email, Contact, Organization]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportBuilderService],
  exports: [AnalyticsService, ReportBuilderService],
})
export class AnalyticsModule {}
