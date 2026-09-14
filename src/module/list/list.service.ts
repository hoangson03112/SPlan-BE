import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateListDto, UpdateListDto } from './dto/list.dto.js';

@Injectable()
export class ListService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkSpaceAccess(spaceId: string, userId: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      throw new NotFoundException('Không tìm thấy Space.');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: space.workspaceId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không thuộc Workspace này.');
    }

    return space;
  }

  async createList(dto: CreateListDto, userId: string) {
    await this.checkSpaceAccess(dto.spaceId, userId);

    const position =
      dto.position ??
      (await this.prisma.list.count({ where: { spaceId: dto.spaceId } }));

    return await this.prisma.$transaction(async (tx) => {
      const list = await tx.list.create({
        data: {
          spaceId: dto.spaceId,
          name: dto.name,
          position,
        },
      });

      // Mirror the default statuses every Space's first List gets, so a
      // freshly added List is immediately usable as a Kanban board too.
      await tx.status.createMany({
        data: [
          {
            listId: list.id,
            name: 'Cần làm',
            color: '#64748b',
            group: 'TODO',
            position: 0,
          },
          {
            listId: list.id,
            name: 'Đang thực hiện',
            color: '#3b82f6',
            group: 'IN_PROGRESS',
            position: 1,
          },
          {
            listId: list.id,
            name: 'Hoàn tất',
            color: '#10b981',
            group: 'DONE',
            position: 2,
          },
        ],
      });

      return list;
    });
  }

  async getListsBySpace(spaceId: string, userId: string) {
    await this.checkSpaceAccess(spaceId, userId);

    return await this.prisma.list.findMany({
      where: { spaceId },
      orderBy: { position: 'asc' },
    });
  }

  async getListById(listId: string, userId: string) {
    const list = await this.prisma.list.findUnique({ where: { id: listId } });

    if (!list) {
      throw new NotFoundException('Không tìm thấy List.');
    }

    await this.checkSpaceAccess(list.spaceId, userId);

    return list;
  }

  async updateList(listId: string, dto: UpdateListDto, userId: string) {
    const list = await this.getListById(listId, userId);

    return await this.prisma.list.update({
      where: { id: list.id },
      data: dto,
    });
  }

  async deleteList(listId: string, userId: string) {
    const list = await this.getListById(listId, userId);

    return await this.prisma.list.delete({ where: { id: list.id } });
  }
}
