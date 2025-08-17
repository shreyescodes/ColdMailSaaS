import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { OrganizationType } from './enums/organization-type.enum';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async findById(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({
      where: { slug },
      relations: ['users'],
    });
  }

  async create(createData: Partial<Organization>): Promise<Organization> {
    // Check if slug is unique
    if (createData.slug) {
      const existing = await this.findBySlug(createData.slug);
      if (existing) {
        throw new BadRequestException('Organization slug already exists');
      }
    }

    const organization = this.organizationRepository.create(createData);
    return this.organizationRepository.save(organization);
  }

  async update(id: string, updateData: Partial<Organization>): Promise<Organization> {
    const organization = await this.findById(id);
    
    // Check if slug is unique (if being updated)
    if (updateData.slug && updateData.slug !== organization.slug) {
      const existing = await this.findBySlug(updateData.slug);
      if (existing) {
        throw new BadRequestException('Organization slug already exists');
      }
    }

    await this.organizationRepository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const organization = await this.findById(id);
    
    // Check if organization has users
    if (organization.users && organization.users.length > 0) {
      throw new BadRequestException('Cannot delete organization with active users');
    }

    await this.organizationRepository.delete(id);
  }

  async getAgencies(): Promise<Organization[]> {
    return this.organizationRepository.find({
      where: { type: OrganizationType.AGENCY, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async getClients(agencyId?: string): Promise<Organization[]> {
    const where: any = { type: OrganizationType.CLIENT, isActive: true };
    
    if (agencyId) {
      where.parentOrganizationId = agencyId;
    }

    return this.organizationRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async getOrganizationHierarchy(organizationId: string): Promise<{
    organization: Organization;
    parent?: Organization;
    children: Organization[];
  }> {
    const organization = await this.findById(organizationId);
    
    let parent: Organization | undefined;
    if (organization.parentOrganizationId) {
      parent = await this.organizationRepository.findOne({
        where: { id: organization.parentOrganizationId },
      });
    }

    const children = await this.organizationRepository.find({
      where: { parentOrganizationId: organizationId, isActive: true },
    });

    return {
      organization,
      parent,
      children,
    };
  }

  async verifyOrganization(id: string): Promise<void> {
    await this.organizationRepository.update(id, { isVerified: true });
  }

  async updateLimits(id: string, limits: any): Promise<void> {
    await this.organizationRepository.update(id, { limits });
  }

  async updateSettings(id: string, settings: any): Promise<void> {
    await this.organizationRepository.update(id, { settings });
  }
}
