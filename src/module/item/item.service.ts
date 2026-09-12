import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto.js';

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkListAccess(listId: string, userId: string) {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      include: { space: true },
    });

    if (!list) {
      throw new NotFoundException('Không tìm thấy List.');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: list.space.workspaceId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không thuộc Workspace này.');
    }

    return list;
  }

  async createItem(dto: CreateItemDto, userId: string) {
    await this.checkListAccess(dto.listId, userId);

    return await this.prisma.item.create({
      data: {
        listId: dto.listId,
        title: dto.title,
        data: (dto.data ?? {}) as Prisma.InputJsonValue,
        statusId: dto.statusId,
        kanbanOrder: dto.kanbanOrder,
        tableOrder: dto.tableOrder,
        createdBy: userId,
      },
    });
  }

  async getItemsByList(listId: string, userId: string) {
    await this.checkListAccess(listId, userId);

    return await this.prisma.item.findMany({
      where: { listId },
      orderBy: { tableOrder: 'asc' },
    });
  }

  async getItemById(itemId: string, userId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy Item.');
    }

    await this.checkListAccess(item.listId, userId);

    return item;
  }

  async updateItem(itemId: string, dto: UpdateItemDto, userId: string) {
    const item = await this.getItemById(itemId, userId);

    const data: Prisma.ItemUncheckedUpdateInput = {
      title: dto.title,
      statusId: dto.statusId,
      kanbanOrder: dto.kanbanOrder,
      tableOrder: dto.tableOrder,
      data:
        dto.data !== undefined
          ? (dto.data as Prisma.InputJsonValue)
          : undefined,
    };

    return await this.prisma.item.update({
      where: { id: item.id },
      data,
    });
  }

  async deleteItem(itemId: string, userId: string) {
    const item = await this.getItemById(itemId, userId);

    return await this.prisma.item.delete({
      where: { id: item.id },
    });
  }
}
