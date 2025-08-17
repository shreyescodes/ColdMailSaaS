import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { EmailModule } from './modules/email/email.module';
import { MailboxesModule } from './modules/mailboxes/mailboxes.module';
import { DomainsModule } from './modules/domains/domains.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DeliverabilityModule } from './modules/deliverability/deliverability.module';
import { WorkflowModule } from './modules/workflows/workflow.module';
import { RateLimitingModule } from './modules/rate-limiting/rate-limiting.module';
import { AdvancedTeamModule } from './modules/teams/advanced-team.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';

// Configuration
import { DatabaseConfigService } from './config/database.config';
import { RedisConfigService } from './config/redis.config';
import { AppConfigService } from './config/app.config';

// Health checks
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({ app: require('./config/app.config').default() }),
        () => ({ database: require('./config/database.config').default() }),
        () => ({ redis: require('./config/redis.config').default() }),
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useFactory: (databaseConfig: DatabaseConfigService) => databaseConfig.createTypeOrmOptions(),
      inject: [DatabaseConfigService],
    }),

    // Redis & Queue
    BullModule.forRootAsync({
      useFactory: (redisConfig: RedisConfigService) => redisConfig.createBullOptions(),
      inject: [RedisConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
        {
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
      ]),

    // Scheduling & Events
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    // Health checks
    TerminusModule,

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    EmailModule,
    MailboxesModule,
    DomainsModule,
    CampaignsModule,
    AnalyticsModule,
    AiModule,
    ComplianceModule,
    DeliverabilityModule,
    WorkflowModule,
    RateLimitingModule,
    AdvancedTeamModule,
    EnterpriseModule,
  ],
  controllers: [HealthController],
  providers: [DatabaseConfigService, RedisConfigService, AppConfigService],
})
export class AppModule {}
