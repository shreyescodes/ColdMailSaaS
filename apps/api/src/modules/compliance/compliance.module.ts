import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { Domain } from '../domains/entities/domain.entity';
import { Email } from '../campaigns/entities/email.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Domain, Email]),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
