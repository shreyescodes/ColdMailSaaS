import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdvancedTeamService } from './advanced-team.service';
import { Team } from './entities/team.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, User, Organization]),
  ],
  providers: [AdvancedTeamService],
  exports: [AdvancedTeamService],
})
export class AdvancedTeamModule {}
