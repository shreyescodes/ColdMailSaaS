import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IpPool {
  id: string;
  ipAddress: string;
  organizationId: string;
  status: 'active' | 'warming' | 'suspended' | 'blacklisted';
  reputation: number;
  dailyLimit: number;
  currentUsage: number;
  warmupRate: number;
  lastUsed: Date;
  assignedAt: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
}

@Injectable()
export class IpPoolService {
  private readonly logger = new Logger(IpPoolService.name);
  private readonly ipPools: Map<string, IpPool> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async assignIpToOrganization(organizationId: string): Promise<IpPool> {
    // In a real implementation, this would query a database
    // For now, we'll simulate IP assignment
    
    const availableIp = await this.findAvailableIp();
    if (!availableIp) {
      throw new Error('No available IP addresses in the pool');
    }

    const ipPool: IpPool = {
      id: `ip_${Date.now()}`,
      ipAddress: availableIp,
      organizationId,
      status: 'warming',
      reputation: 0,
      dailyLimit: 1000,
      currentUsage: 0,
      warmupRate: 50,
      lastUsed: new Date(),
      assignedAt: new Date(),
    };

    this.ipPools.set(ipPool.id, ipPool);
    this.logger.log(`Assigned IP ${availableIp} to organization ${organizationId}`);

    return ipPool;
  }

  async releaseIpFromOrganization(organizationId: string): Promise<void> {
    const ipPool = Array.from(this.ipPools.values()).find(
      pool => pool.organizationId === organizationId
    );

    if (ipPool) {
      this.ipPools.delete(ipPool.id);
      this.logger.log(`Released IP ${ipPool.ipAddress} from organization ${organizationId}`);
    }
  }

  async getOrganizationIpPool(organizationId: string): Promise<IpPool | null> {
    return Array.from(this.ipPools.values()).find(
      pool => pool.organizationId === organizationId
    ) || null;
  }

  async updateIpUsage(ipAddress: string, usage: number): Promise<void> {
    const ipPool = Array.from(this.ipPools.values()).find(
      pool => pool.ipAddress === ipAddress
    );

    if (ipPool) {
      ipPool.currentUsage += usage;
      ipPool.lastUsed = new Date();
      
      // Update warmup rate if in warming mode
      if (ipPool.status === 'warming' && ipPool.currentUsage >= ipPool.warmupRate) {
        ipPool.warmupRate = Math.min(ipPool.warmupRate * 1.2, ipPool.dailyLimit);
        if (ipPool.warmupRate >= ipPool.dailyLimit * 0.8) {
          ipPool.status = 'active';
          this.logger.log(`IP ${ipAddress} graduated from warming to active`);
        }
      }
    }
  }

  async rotateIps(organizationId: string): Promise<IpPool[]> {
    const currentPool = await this.getOrganizationIpPool(organizationId);
    if (!currentPool) {
      return [];
    }

    // In a real implementation, you'd implement load balancing logic
    // For now, we'll just return the current pool
    return [currentPool];
  }

  async getIpHealth(ipAddress: string): Promise<{
    reputation: number;
    status: string;
    dailyUsage: number;
    warmupProgress: number;
  }> {
    const ipPool = Array.from(this.ipPools.values()).find(
      pool => pool.ipAddress === ipAddress
    );

    if (!ipPool) {
      throw new Error('IP address not found in pool');
    }

    const warmupProgress = ipPool.status === 'warming' 
      ? (ipPool.currentUsage / ipPool.dailyLimit) * 100 
      : 100;

    return {
      reputation: ipPool.reputation,
      status: ipPool.status,
      dailyUsage: ipPool.currentUsage,
      warmupProgress: Math.min(warmupProgress, 100),
    };
  }

  async suspendIp(ipAddress: string, reason: string): Promise<void> {
    const ipPool = Array.from(this.ipPools.values()).find(
      pool => pool.ipAddress === ipAddress
    );

    if (ipPool) {
      ipPool.status = 'suspended';
      ipPool.suspendedAt = new Date();
      ipPool.suspensionReason = reason;
      this.logger.warn(`Suspended IP ${ipAddress}: ${reason}`);
    }
  }

  async activateIp(ipAddress: string): Promise<void> {
    const ipPool = Array.from(this.ipPools.values()).find(
      pool => pool.ipAddress === ipAddress
    );

    if (ipPool && ipPool.status === 'suspended') {
      ipPool.status = 'active';
      ipPool.suspendedAt = undefined;
      ipPool.suspensionReason = undefined;
      this.logger.log(`Activated IP ${ipAddress}`);
    }
  }

  private async findAvailableIp(): Promise<string> {
    // In a real implementation, this would query available IPs from your infrastructure
    // For now, we'll generate mock IPs
    const usedIps = Array.from(this.ipPools.values()).map(pool => pool.ipAddress);
    
    // Generate a mock IP that's not in use
    let ip: string;
    do {
      ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    } while (usedIps.includes(ip));
    
    return ip;
  }

  async getPoolStats(): Promise<{
    total: number;
    active: number;
    warming: number;
    suspended: number;
    blacklisted: number;
  }> {
    const pools = Array.from(this.ipPools.values());
    
    return {
      total: pools.length,
      active: pools.filter(p => p.status === 'active').length,
      warming: pools.filter(p => p.status === 'warming').length,
      suspended: pools.filter(p => p.status === 'suspended').length,
      blacklisted: pools.filter(p => p.status === 'blacklisted').length,
    };
  }
}
