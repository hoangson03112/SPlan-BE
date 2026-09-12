import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatusService } from './status.service.js';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('statuses')
@UseGuards(AuthGuard('jwt'))
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  async createStatus(
    @Body() dto: CreateStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.statusService.createStatus(dto, userId);
  }

  @Get()
  async getStatusesByList(
    @Query('listId') listId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.statusService.getStatusesByList(listId, userId);
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') statusId: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.statusService.updateStatus(statusId, dto, userId);
  }

  @Delete(':id')
  async deleteStatus(
    @Param('id') statusId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.statusService.deleteStatus(statusId, userId);
  }
}
