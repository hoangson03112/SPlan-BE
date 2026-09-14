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
import { ViewService } from './view.service.js';
import { CreateViewDto, UpdateViewDto } from './dto/view.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('views')
@UseGuards(AuthGuard('jwt'))
export class ViewController {
  constructor(private readonly viewService: ViewService) {}

  @Post()
  async createView(
    @Body() dto: CreateViewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.viewService.createView(dto, userId);
  }

  @Get()
  async getViewsByList(
    @Query('listId') listId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.viewService.getViewsByList(listId, userId);
  }

  @Patch(':id')
  async updateView(
    @Param('id') viewId: string,
    @Body() dto: UpdateViewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.viewService.updateView(viewId, dto, userId);
  }

  @Delete(':id')
  async deleteView(
    @Param('id') viewId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.viewService.deleteView(viewId, userId);
  }
}
