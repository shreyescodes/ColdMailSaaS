import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
    type: [Organization],
  })
  async getOrganizations() {
    return this.organizationsService.getAgencies();
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get all client organizations' })
  @ApiResponse({
    status: 200,
    description: 'Client organizations retrieved successfully',
    type: [Organization],
  })
  async getClients() {
    return this.organizationsService.getClients();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
    type: Organization,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganization(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Get(':id/hierarchy')
  @ApiOperation({ summary: 'Get organization hierarchy' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization hierarchy retrieved successfully',
  })
  async getOrganizationHierarchy(@Param('id') id: string) {
    return this.organizationsService.getOrganizationHierarchy(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: Organization,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrganization(@Body() createData: Partial<Organization>) {
    return this.organizationsService.create(createData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: Organization,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateData: Partial<Organization>,
  ) {
    return this.organizationsService.update(id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 204, description: 'Organization deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async deleteOrganization(@Param('id') id: string) {
    await this.organizationsService.delete(id);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization verified successfully' })
  async verifyOrganization(@Param('id') id: string) {
    await this.organizationsService.verifyOrganization(id);
    return { message: 'Organization verified successfully' };
  }

  @Put(':id/limits')
  @ApiOperation({ summary: 'Update organization limits' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Limits updated successfully' })
  async updateLimits(
    @Param('id') id: string,
    @Body() limits: any,
  ) {
    await this.organizationsService.updateLimits(id, limits);
    return { message: 'Limits updated successfully' };
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @Param('id') id: string,
    @Body() settings: any,
  ) {
    await this.organizationsService.updateSettings(id, settings);
    return { message: 'Settings updated successfully' };
  }
}
