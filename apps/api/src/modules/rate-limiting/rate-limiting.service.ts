import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiUsage } from './entities/api-usage.entity';

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);

  constructor(
    @InjectRepository(ApiUsage)
    private readonly apiUsageRepository: Repository<ApiUsage>,
  ) {}

  async checkRateLimit(userId: string, endpoint: string, limit: number, windowMs: number): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const usage = await this.apiUsageRepository.findOne({
      where: {
        userId,
        endpoint,
        timestamp: windowStart,
      },
    });

    if (!usage) {
      // Create new usage record
      await this.apiUsageRepository.save({
        userId,
        endpoint,
        timestamp: now,
        count: 1,
      });
      return true;
    }

    if (usage.count >= limit) {
      return false;
    }

    // Increment usage count
    usage.count += 1;
    await this.apiUsageRepository.save(usage);
    return true;
  }

  async getUsageStats(userId: string, endpoint: string, windowMs: number): Promise<number> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const usage = await this.apiUsageRepository.findOne({
      where: {
        userId,
        endpoint,
        timestamp: windowStart,
      },
    });

    return usage ? usage.count : 0;
  }
}
