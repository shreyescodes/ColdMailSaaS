import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserRole } from '../users/enums/user-role.enum';

export interface TeamMember {
  userId: string;
  role: UserRole;
  joinedAt: Date;
  permissions: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  members: TeamMember[];
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async createTeam(
    organizationId: string,
    name: string,
    description: string,
    createdByUserId: string,
  ): Promise<Team> {
    // Check if organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user has permission to create teams
    const creator = await this.userRepository.findOne({
      where: { id: createdByUserId, organizationId },
    });
    if (!creator || ![UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER].includes(creator.role)) {
      throw new BadRequestException('Insufficient permissions to create teams');
    }

    // Check if team name already exists in organization
    // Note: In a real implementation, you'd have a teams table
    // For now, we'll simulate team creation

    const team: Team = {
      id: `team_${Date.now()}`,
      name,
      description,
      organizationId,
      members: [
        {
          userId: createdByUserId,
          role: UserRole.MANAGER,
          joinedAt: new Date(),
          permissions: ['manage_team', 'add_members', 'remove_members'],
        },
      ],
      settings: {
        allowMemberInvites: true,
        requireApproval: false,
        maxMembers: 50,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return team;
  }

  async addMemberToTeam(
    teamId: string,
    userId: string,
    role: UserRole,
    addedByUserId: string,
  ): Promise<void> {
    // Check if user has permission to add members
    const adder = await this.userRepository.findOne({
      where: { id: addedByUserId },
    });
    if (!adder || ![UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER].includes(adder.role)) {
      throw new BadRequestException('Insufficient permissions to add team members');
    }

    // Check if user exists and belongs to the same organization
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // In a real implementation, you'd update the teams table
    // For now, we'll just return success
    console.log(`User ${userId} added to team ${teamId} with role ${role}`);
  }

  async removeMemberFromTeam(
    teamId: string,
    userId: string,
    removedByUserId: string,
  ): Promise<void> {
    // Check if user has permission to remove members
    const remover = await this.userRepository.findOne({
      where: { id: removedByUserId },
    });
    if (!remover || ![UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER].includes(remover.role)) {
      throw new BadRequestException('Insufficient permissions to remove team members');
    }

    // Check if trying to remove team owner/creator
    // In a real implementation, you'd check team ownership
    if (userId === removedByUserId) {
      throw new BadRequestException('Cannot remove yourself from team');
    }

    // In a real implementation, you'd update the teams table
    // For now, we'll just return success
    console.log(`User ${userId} removed from team ${teamId}`);
  }

  async updateTeamMemberRole(
    teamId: string,
    userId: string,
    newRole: UserRole,
    updatedByUserId: string,
  ): Promise<void> {
    // Check if user has permission to update roles
    const updater = await this.userRepository.findOne({
      where: { id: updatedByUserId },
    });
    if (!updater || ![UserRole.OWNER, UserRole.ADMIN].includes(updater.role)) {
      throw new BadRequestException('Insufficient permissions to update team member roles');
    }

    // In a real implementation, you'd update the teams table
    // For now, we'll just return success
    console.log(`User ${userId} role updated to ${newRole} in team ${teamId}`);
  }

  async getTeamMembers(teamId: string, organizationId: string): Promise<TeamMember[]> {
    // In a real implementation, you'd query the teams table
    // For now, we'll return a mock response
    return [
      {
        userId: 'mock-user-1',
        role: UserRole.MANAGER,
        joinedAt: new Date(),
        permissions: ['manage_team', 'add_members', 'remove_members'],
      },
      {
        userId: 'mock-user-2',
        role: UserRole.MEMBER,
        joinedAt: new Date(),
        permissions: ['view_team'],
      },
    ];
  }

  async getTeamsByOrganization(organizationId: string): Promise<Team[]> {
    // In a real implementation, you'd query the teams table
    // For now, we'll return a mock response
    return [
      {
        id: 'team-1',
        name: 'Sales Team',
        description: 'Primary sales and lead generation team',
        organizationId,
        members: [],
        settings: {
          allowMemberInvites: true,
          requireApproval: false,
          maxMembers: 50,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'team-2',
        name: 'Marketing Team',
        description: 'Content creation and campaign management',
        organizationId,
        members: [],
        settings: {
          allowMemberInvites: true,
          requireApproval: true,
          maxMembers: 30,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}
