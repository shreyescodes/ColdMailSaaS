import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DomainsService } from './domains.service';
import { DomainsController } from './domains.controller';
import { Domain } from './entities/domain.entity';
import { DnsVerificationService } from './services/dns-verification.service';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Domain, Organization]),
  ],
  controllers: [DomainsController],
  providers: [DomainsService, DnsVerificationService],
  exports: [DomainsService, DnsVerificationService],
})
export class DomainsModule {}
