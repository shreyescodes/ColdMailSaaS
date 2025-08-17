import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users in organization' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [User],
  })
  async getUsers(@Query('organizationId') organizationId: string) {
    return this.usersService.findByOrganization(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: Partial<User>,
  ) {
    return this.usersService.updateUser(id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async deactivateUser(@Param('id') id: string) {
    await this.usersService.deactivateUser(id);
    return { message: 'User deactivated successfully' };
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') id: string) {
    await this.usersService.activateUser(id);
    return { message: 'User activated successfully' };
  }

  @Get('organization/:organizationId/count')
  @ApiOperation({ summary: 'Get user count in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'User count retrieved successfully',
    schema: { type: 'number' },
  })
  async getUserCount(@Param('organizationId') organizationId: string) {
    const count = await this.usersService.countUsersByOrganization(organizationId);
    return { count };
  }

  // Invitation endpoints
  @Post('invitations')
  @ApiOperation({ summary: 'Create user invitation' })
  @ApiBody({ type: CreateInvitationDto })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists or invitation already sent' })
  async createInvitation(
    @Body() createInvitationDto: CreateInvitationDto,
    @Query('user') currentUser: any,
  ) {
    return this.usersService.createInvitation(createInvitationDto, currentUser.id);
  }

  @Get('invitations/pending')
  @ApiOperation({ summary: 'Get pending invitations for organization' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({
    status: 200,
    description: 'Pending invitations retrieved successfully',
  })
  async getPendingInvitations(@Query('organizationId') organizationId: string) {
    return this.usersService.getPendingInvitations(organizationId);
  }

  @Post('invitations/:id/cancel')
  @ApiOperation({ summary: 'Cancel user invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async cancelInvitation(
    @Param('id') invitationId: string,
    @Query('user') currentUser: any,
  ) {
    await this.usersService.cancelInvitation(invitationId, currentUser.id);
    return { message: 'Invitation cancelled successfully' };
  }

  @Post('invitations/:id/resend')
  @ApiOperation({ summary: 'Resend user invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async resendInvitation(@Param('id') invitationId: string) {
    return this.usersService.resendInvitation(invitationId);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept user invitation' })
  @ApiBody({ type: AcceptInvitationDto })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.usersService.acceptInvitation(acceptInvitationDto);
  }

  @Get('invitations/validate/:token')
  @ApiOperation({ summary: 'Validate invitation token' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation token is valid',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async validateInvitation(@Param('token') token: string) {
    const invitation = await this.usersService.getInvitationByToken(token);
    return {
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
      invitedBy: invitation.invitedByUser,
      expiresAt: invitation.expiresAt,
      daysUntilExpiry: invitation.daysUntilExpiry,
    };
  }
}
