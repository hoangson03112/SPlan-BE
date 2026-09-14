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
import { ItemService } from './item.service.js';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('items')
@UseGuards(AuthGuard('jwt'))
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  async createItem(
    @Body() dto: CreateItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itemService.createItem(dto, userId);
  }

  @Get()
  async getItemsByList(
    @Query('listId') listId: string,
    @CurrentUser('id') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const pagination =
      take !== undefined || skip !== undefined
        ? {
            take: take !== undefined ? Number(take) : undefined,
            skip: skip !== undefined ? Number(skip) : undefined,
          }
        : undefined;
    return this.itemService.getItemsByList(listId, userId, pagination);
  }

  @Get(':id')
  async getItemById(
    @Param('id') itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.itemService.getItemById(itemId, userId);
  }

  @Patch(':id')
  async updateItem(
    @Param('id') itemId: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itemService.updateItem(itemId, dto, userId);
  }

  @Delete(':id')
  async deleteItem(
    @Param('id') itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.itemService.deleteItem(itemId, userId);
  }
}
