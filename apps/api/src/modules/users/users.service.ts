import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { User } from './entities/user.entity';
import { UserInvitation } from './entities/user-invitation.entity';
import { UserRole } from './enums/user-role.enum';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { EmailService } from '../email/email.service';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserInvitation)
    private readonly invitationRepository: Repository<UserInvitation>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string, organizationId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, organizationId },
      relations: ['organization'],
    });
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId },
      relations: ['organization'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    
    // Prevent role escalation unless user is admin/owner
    if (updateData.role && !this.canUpdateRole(user.role, updateData.role)) {
      throw new BadRequestException('Cannot update user role');
    }

    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await this.findById(id);
    
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('Cannot deactivate organization owner');
    }

    await this.userRepository.update(id, { isActive: false });
  }

  async activateUser(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: true });
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('Cannot delete organization owner');
    }

    await this.userRepository.delete(id);
  }

  private canUpdateRole(currentRole: UserRole, newRole: UserRole): boolean {
    // Only owners and admins can update roles
    if (![UserRole.OWNER, UserRole.ADMIN].includes(currentRole)) {
      return false;
    }

    // Only owners can assign owner role
    if (newRole === UserRole.OWNER && currentRole !== UserRole.OWNER) {
      return false;
    }

    return true;
  }

  async getUsersByRole(organizationId: string, role: UserRole): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId, role },
      relations: ['organization'],
    });
  }

  async countUsersByOrganization(organizationId: string): Promise<number> {
    return this.userRepository.count({
      where: { organizationId, isActive: true },
    });
  }

  // Invitation methods
  async createInvitation(createInvitationDto: CreateInvitationDto, invitedByUserId: string): Promise<UserInvitation> {
    const { email, role, organizationId, message, customFields } = createInvitationDto;

    // Check if user already exists in this organization
    const existingUser = await this.findByEmail(email, organizationId);
    if (existingUser) {
      throw new ConflictException('User already exists in this organization');
    }

    // Check if invitation already exists
    const existingInvitation = await this.invitationRepository.findOne({
      where: { email, organizationId, isAccepted: false },
    });
    if (existingInvitation) {
      throw new ConflictException('Invitation already exists for this email');
    }

    // Generate invitation token
    const token = this.generateInvitationToken();
    
    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepository.create({
      email,
      role,
      organizationId,
      invitedByUserId,
      token,
      expiresAt,
      metadata: {
        message,
        customFields,
      },
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Send invitation email
    try {
      const inviter = await this.findById(invitedByUserId);
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (inviter && organization) {
        await this.emailService.sendUserInvitationEmail(
          email,
          token,
          `${inviter.firstName} ${inviter.lastName}`,
          organization.name,
          role,
        );
      }
    } catch (error) {
      // Log error but don't fail the invitation creation
      console.error('Failed to send invitation email:', error);
    }

    return savedInvitation;
  }

  async getInvitationByToken(token: string): Promise<UserInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['organization', 'invitedByUser'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.isAccepted) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    if (invitation.isExpired) {
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto): Promise<User> {
    const { token, firstName, lastName, password, userId } = acceptInvitationDto;

    const invitation = await this.getInvitationByToken(token);

    // If userId is provided, check if user exists and update them
    if (userId) {
      const existingUser = await this.findById(userId);
      if (existingUser.organizationId !== invitation.organizationId) {
        throw new BadRequestException('User cannot be added to different organization');
      }
      
      // Update user role and mark invitation as accepted
      await this.userRepository.update(userId, { role: invitation.role });
      await this.invitationRepository.update(invitation.id, {
        isAccepted: true,
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      });

      return this.findById(userId);
    }

    // Create new user
    const saltRounds = this.configService.get<number>('app.bcryptRounds');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({
      firstName,
      lastName,
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role,
      organizationId: invitation.organizationId,
      emailVerified: true, // Invited users are automatically verified
    });

    const savedUser = await this.userRepository.save(user);

    // Mark invitation as accepted
    await this.invitationRepository.update(invitation.id, {
      isAccepted: true,
      acceptedAt: new Date(),
      acceptedByUserId: savedUser.id,
    });

    return savedUser;
  }

  async getPendingInvitations(organizationId: string): Promise<UserInvitation[]> {
    return this.invitationRepository.find({
      where: { organizationId, isAccepted: false, isExpired: false },
      relations: ['invitedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['invitedByUser'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if user has permission to cancel invitation
    const user = await this.findById(userId);
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Insufficient permissions to cancel invitation');
    }

    await this.invitationRepository.delete(invitationId);
  }

  async resendInvitation(invitationId: string): Promise<UserInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.isAccepted) {
      throw new BadRequestException('Cannot resend accepted invitation');
    }

    // Generate new token and extend expiration
    const newToken = this.generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await this.invitationRepository.update(invitationId, {
      token: newToken,
      expiresAt: newExpiresAt,
    });

    return this.invitationRepository.findOne({ where: { id: invitationId } });
  }

  private generateInvitationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
