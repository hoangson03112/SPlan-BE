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
import { ListService } from './list.service.js';
import { CreateListDto, UpdateListDto } from './dto/list.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('lists')
@UseGuards(AuthGuard('jwt'))
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Post()
  async createList(
    @Body() dto: CreateListDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.listService.createList(dto, userId);
  }

  @Get()
  async getListsBySpace(
    @Query('spaceId') spaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listService.getListsBySpace(spaceId, userId);
  }

  @Get(':id')
  async getListById(
    @Param('id') listId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listService.getListById(listId, userId);
  }

  @Patch(':id')
  async updateList(
    @Param('id') listId: string,
    @Body() dto: UpdateListDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.listService.updateList(listId, dto, userId);
  }

  @Delete(':id')
  async deleteList(
    @Param('id') listId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listService.deleteList(listId, userId);
  }
}
