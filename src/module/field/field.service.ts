import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateFieldDto, UpdateFieldDto } from './dto/field.dto.js';

@Injectable()
export class FieldService {
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

  async createField(dto: CreateFieldDto, userId: string) {
    await this.checkListAccess(dto.listId, userId);

    const position =
      dto.position ??
      (await this.prisma.field.count({ where: { listId: dto.listId } }));

    return await this.prisma.field.create({
      data: {
        listId: dto.listId,
        name: dto.name,
        type: dto.type,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        position,
        isHidden: dto.isHidden ?? false,
      },
    });
  }

  async getFieldsByList(listId: string, userId: string) {
    await this.checkListAccess(listId, userId);

    return await this.prisma.field.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });
  }

  private async getFieldById(fieldId: string, userId: string) {
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new NotFoundException('Không tìm thấy Field.');
    }

    await this.checkListAccess(field.listId, userId);

    return field;
  }

  async updateField(fieldId: string, dto: UpdateFieldDto, userId: string) {
    const field = await this.getFieldById(fieldId, userId);

    const data: Prisma.FieldUncheckedUpdateInput = {
      name: dto.name,
      type: dto.type,
      position: dto.position,
      isHidden: dto.isHidden,
      config:
        dto.config !== undefined
          ? (dto.config as Prisma.InputJsonValue)
          : undefined,
    };

    return await this.prisma.field.update({
      where: { id: field.id },
      data,
    });
  }

  async deleteField(fieldId: string, userId: string) {
    const field = await this.getFieldById(fieldId, userId);

    return await this.prisma.field.delete({ where: { id: field.id } });
  }
}
