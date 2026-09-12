import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto.js';

@Injectable()
export class StatusService {
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

  async createStatus(dto: CreateStatusDto, userId: string) {
    await this.checkListAccess(dto.listId, userId);

    const position =
      dto.position ??
      (await this.prisma.status.count({ where: { listId: dto.listId } }));

    return await this.prisma.status.create({
      data: {
        listId: dto.listId,
        name: dto.name,
        color: dto.color ?? '#8C6B4F',
        group: dto.group ?? 'TODO',
        position,
      },
    });
  }

  async getStatusesByList(listId: string, userId: string) {
    await this.checkListAccess(listId, userId);

    return await this.prisma.status.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });
  }

  private async getStatusById(statusId: string, userId: string) {
    const status = await this.prisma.status.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new NotFoundException('Không tìm thấy Status.');
    }

    await this.checkListAccess(status.listId, userId);

    return status;
  }

  async updateStatus(statusId: string, dto: UpdateStatusDto, userId: string) {
    const status = await this.getStatusById(statusId, userId);

    return await this.prisma.status.update({
      where: { id: status.id },
      data: dto,
    });
  }

  async deleteStatus(statusId: string, userId: string) {
    const status = await this.getStatusById(statusId, userId);

    // Items pointing at this status must not be left with a dangling FK.
    return await this.prisma.$transaction(async (tx) => {
      await tx.item.updateMany({
        where: { statusId: status.id },
        data: { statusId: null },
      });

      return await tx.status.delete({ where: { id: status.id } });
    });
  }
}
