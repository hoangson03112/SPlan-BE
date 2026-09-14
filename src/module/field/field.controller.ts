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
import { FieldService } from './field.service.js';
import { CreateFieldDto, UpdateFieldDto } from './dto/field.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('fields')
@UseGuards(AuthGuard('jwt'))
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @Post()
  async createField(
    @Body() dto: CreateFieldDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.fieldService.createField(dto, userId);
  }

  @Get()
  async getFieldsByList(
    @Query('listId') listId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.fieldService.getFieldsByList(listId, userId);
  }

  @Patch(':id')
  async updateField(
    @Param('id') fieldId: string,
    @Body() dto: UpdateFieldDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.fieldService.updateField(fieldId, dto, userId);
  }

  @Delete(':id')
  async deleteField(
    @Param('id') fieldId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.fieldService.deleteField(fieldId, userId);
  }
}
