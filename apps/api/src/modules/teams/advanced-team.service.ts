import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Team } from './entities/team.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joinedAt: Date;
}

export interface TeamProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamInvitation {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  permissions: string[];
  expiresAt: Date;
  invitedBy: string;
}

@Injectable()
export class AdvancedTeamService {
  private readonly logger = new Logger(AdvancedTeamService.name);

  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async createTeam(organizationId: string, teamData: {
    name: string;
    description: string;
    ownerId: string;
  }): Promise<Team> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const owner = await this.userRepository.findOne({
      where: { id: teamData.ownerId },
    });

    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    const team = this.teamRepository.create({
      ...teamData,
      organizationId,
      members: [{
        userId: teamData.ownerId,
        role: 'owner',
        permissions: ['*'],
        joinedAt: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.teamRepository.save(team);
  }

  async addTeamMember(teamId: string, memberData: {
    email: string;
    role: 'admin' | 'member' | 'viewer';
    permissions: string[];
    invitedBy: string;
  }): Promise<TeamInvitation> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Check if inviter has permission to add members
    const inviter = team.members.find(m => m.userId === memberData.invitedBy);
    if (!inviter || !['owner', 'admin'].includes(inviter.role)) {
      throw new BadRequestException('Insufficient permissions to add team members');
    }

    const invitation: TeamInvitation = {
      email: memberData.email,
      role: memberData.role,
      permissions: memberData.permissions,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      invitedBy: memberData.invitedBy,
    };

    // Store invitation (in production, this would be saved to database)
    this.logger.log(`Team invitation created: ${invitation.email} for team ${teamId}`);

    return invitation;
  }

  async acceptTeamInvitation(invitationId: string, userId: string): Promise<Team> {
    // In production, this would validate the invitation and add the user
    const team = await this.teamRepository.findOne({
      where: { id: invitationId },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Add user to team members
    team.members.push({
      userId,
      role: 'member', // Default role
      permissions: ['read'],
      joinedAt: new Date(),
    });

    team.updatedAt = new Date();
    return this.teamRepository.save(team);
  }

  async updateMemberRole(teamId: string, memberId: string, newRole: string, updatedBy: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Check if updater has permission
    const updater = team.members.find(m => m.userId === updatedBy);
    if (!updater || !['owner', 'admin'].includes(updater.role)) {
      throw new BadRequestException('Insufficient permissions to update member roles');
    }

    // Find and update member
    const member = team.members.find(m => m.userId === memberId);
    if (!member) {
      throw new BadRequestException('Member not found');
    }

    // Prevent role escalation
    if (updater.role !== 'owner' && newRole === 'owner') {
      throw new BadRequestException('Only owners can assign owner role');
    }

    member.role = newRole as any;
    team.updatedAt = new Date();

    return this.teamRepository.save(team);
  }

  async removeTeamMember(teamId: string, memberId: string, removedBy: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Check if remover has permission
    const remover = team.members.find(m => m.userId === removedBy);
    if (!remover || !['owner', 'admin'].includes(remover.role)) {
      throw new BadRequestException('Insufficient permissions to remove team members');
    }

    // Prevent self-removal for owners
    if (memberId === removedBy && remover.role === 'owner') {
      throw new BadRequestException('Owners cannot remove themselves');
    }

    // Remove member
    team.members = team.members.filter(m => m.userId !== memberId);
    team.updatedAt = new Date();

    return this.teamRepository.save(team);
  }

  async getTeamProjects(teamId: string): Promise<TeamProject[]> {
    // This would query projects associated with the team
    // For now, returning mock data
    return [
      {
        id: '1',
        name: 'Q1 Email Campaign',
        description: 'First quarter email outreach campaign',
        status: 'active',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async createTeamProject(teamId: string, projectData: {
    name: string;
    description: string;
    createdBy: string;
  }): Promise<TeamProject> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Check if creator has permission
    const creator = team.members.find(m => m.userId === projectData.createdBy);
    if (!creator || !['owner', 'admin', 'member'].includes(creator.role)) {
      throw new BadRequestException('Insufficient permissions to create projects');
    }

    const project: TeamProject = {
      id: Math.random().toString(36).substr(2, 9),
      ...projectData,
      status: 'active',
      members: [{
        userId: projectData.createdBy,
        role: 'admin',
        permissions: ['*'],
        joinedAt: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`Team project created: ${project.name} for team ${teamId}`);
    return project;
  }

  async getTeamAnalytics(teamId: string): Promise<{
    memberCount: number;
    activeProjects: number;
    totalProjects: number;
    recentActivity: any[];
  }> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    const projects = await this.getTeamProjects(teamId);
    const activeProjects = projects.filter(p => p.status === 'active').length;

    return {
      memberCount: team.members.length,
      activeProjects,
      totalProjects: projects.length,
      recentActivity: [
        {
          type: 'member_joined',
          description: 'New member joined the team',
          timestamp: new Date(),
        },
      ],
    };
  }
}
