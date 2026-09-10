import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SpaceService } from './space.service.js';
import { CreateSpaceDto, UpdateSpaceDto } from './dto/space.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('spaces')
@UseGuards(AuthGuard('jwt'))
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @Post()
  async createSpace(
    @Body() dto: CreateSpaceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.spaceService.createSpace(dto, userId);
  }

  @Get()
  async getSpacesByWorkspace(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.spaceService.getSpacesByWorkspace(workspaceId, userId);
  }

  @Get(':id')
  async getSpaceById(
    @Param('id') spaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.spaceService.getSpaceById(spaceId, userId);
  }

  @Patch(':id')
  async updateSpace(
    @Param('id') spaceId: string,
    @Body() dto: UpdateSpaceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.spaceService.updateSpace(spaceId, dto, userId);
  }

  @Delete(':id')
  async deleteSpace(
    @Param('id') spaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.spaceService.deleteSpace(spaceId, userId);
  }
}
