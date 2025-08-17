import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions, PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CampaignsService } from './campaigns.service';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async getAllCampaigns(@Query() query: any) {
    return this.campaignsService.getAllCampaigns(query);
  }

  @Get(':id')
  @RequirePermissions({ resource: 'campaigns', action: 'read' })
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  async getCampaignById(@Param('id') id: string) {
    return this.campaignsService.getCampaignById(id);
  }

  @Post()
  @RequirePermissions({ resource: 'campaigns', action: 'create' })
  @ApiOperation({ summary: 'Create new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async createCampaign(@Body() createCampaignDto: any) {
    return this.campaignsService.createCampaign(createCampaignDto);
  }

  @Put(':id')
  @RequirePermissions({ resource: 'campaigns', action: 'update' })
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  async updateCampaign(@Param('id') id: string, @Body() updateCampaignDto: any) {
    return this.campaignsService.updateCampaign(id, updateCampaignDto);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'campaigns', action: 'delete' })
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  async deleteCampaign(@Param('id') id: string) {
    return this.campaignsService.deleteCampaign(id);
  }
}
