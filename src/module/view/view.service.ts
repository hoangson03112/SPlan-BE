import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateViewDto, UpdateViewDto } from './dto/view.dto.js';

@Injectable()
export class ViewService {
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

  async createView(dto: CreateViewDto, userId: string) {
    await this.checkListAccess(dto.listId, userId);

    const position =
      dto.position ??
      (await this.prisma.view.count({ where: { listId: dto.listId } }));

    return await this.prisma.view.create({
      data: {
        listId: dto.listId,
        name: dto.name,
        type: dto.type,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        position,
      },
    });
  }

  async getViewsByList(listId: string, userId: string) {
    await this.checkListAccess(listId, userId);

    return await this.prisma.view.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });
  }

  private async getViewById(viewId: string, userId: string) {
    const view = await this.prisma.view.findUnique({ where: { id: viewId } });

    if (!view) {
      throw new NotFoundException('Không tìm thấy View.');
    }

    await this.checkListAccess(view.listId, userId);

    return view;
  }

  async updateView(viewId: string, dto: UpdateViewDto, userId: string) {
    const view = await this.getViewById(viewId, userId);

    const data: Prisma.ViewUncheckedUpdateInput = {
      name: dto.name,
      type: dto.type,
      position: dto.position,
      config:
        dto.config !== undefined
          ? (dto.config as Prisma.InputJsonValue)
          : undefined,
    };

    return await this.prisma.view.update({
      where: { id: view.id },
      data,
    });
  }

  async deleteView(viewId: string, userId: string) {
    const view = await this.getViewById(viewId, userId);

    return await this.prisma.view.delete({ where: { id: view.id } });
  }
}
