import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RateLimitingService } from './rate-limiting.service';
import { ApiUsage } from './entities/api-usage.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiUsage, Organization, User]),
  ],
  providers: [RateLimitingService],
  exports: [RateLimitingService],
})
export class RateLimitingModule {}
