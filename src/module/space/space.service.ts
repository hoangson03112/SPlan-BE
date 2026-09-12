import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSpaceDto, UpdateSpaceDto } from './dto/space.dto.js';

@Injectable()
export class SpaceService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkWorkspaceMembership(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không thuộc Workspace này.');
    }

    return member;
  }

  private async generateUniqueSlug(workspaceId: string, name: string) {
    const base =
      slugify(name, { lower: true, strict: true, locale: 'vi' }) || 'space';

    let slug = base;
    let suffix = 1;
    while (
      await this.prisma.space.findUnique({
        where: { workspaceId_slug: { workspaceId, slug } },
      })
    ) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }

    return slug;
  }

  async createSpace(dto: CreateSpaceDto, userId: string) {
    await this.checkWorkspaceMembership(dto.workspaceId, userId);
    const slug = await this.generateUniqueSlug(dto.workspaceId, dto.name);

    return await this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: {
          workspaceId: dto.workspaceId,
          name: dto.name,
          slug,
          icon: dto.icon,
          color: dto.color,
          description: dto.description,
          category: dto.category,
        },
      });

      // Every Space gets one hidden default List, whose Statuses are the
      // Kanban board's columns and whose Items are the board's tasks.
      const list = await tx.list.create({
        data: {
          spaceId: space.id,
          name: space.name,
        },
      });

      await tx.status.createMany({
        data: [
          { listId: list.id, name: 'Cần làm', color: '#64748b', group: 'TODO', position: 0 },
          { listId: list.id, name: 'Đang thực hiện', color: '#3b82f6', group: 'IN_PROGRESS', position: 1 },
          { listId: list.id, name: 'Hoàn tất', color: '#10b981', group: 'DONE', position: 2 },
        ],
      });

      return await tx.space.findUniqueOrThrow({
        where: { id: space.id },
        include: { lists: true },
      });
    });
  }

  async getSpacesByWorkspace(workspaceId: string, userId: string) {
    await this.checkWorkspaceMembership(workspaceId, userId);

    return await this.prisma.space.findMany({
      where: { workspaceId },
      include: {
        lists: {
          select: {
            id: true,
            name: true,
            position: true,
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSpaceBySlug(workspaceId: string, slug: string, userId: string) {
    await this.checkWorkspaceMembership(workspaceId, userId);

    const space = await this.prisma.space.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
      include: { lists: true },
    });

    if (!space) {
      throw new NotFoundException('Không tìm thấy Space.');
    }

    return space;
  }

  async getSpaceById(spaceId: string, userId: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        lists: true,
      },
    });

    if (!space) {
      throw new NotFoundException('Không tìm thấy Space.');
    }

    // Kiểm tra quyền truy cập vào Workspace chứa Space này
    await this.checkWorkspaceMembership(space.workspaceId, userId);

    return space;
  }

  // 4. Cập nhật Space
  async updateSpace(spaceId: string, dto: UpdateSpaceDto, userId: string) {
    const space = await this.getSpaceById(spaceId, userId);

    return await this.prisma.space.update({
      where: { id: space.id },
      data: dto,
    });
  }

  // 5. Xóa Space (Chỉ OWNER mới có quyền xóa)
  async deleteSpace(spaceId: string, userId: string) {
    const space = await this.getSpaceById(spaceId, userId);
    const member = await this.checkWorkspaceMembership(
      space.workspaceId,
      userId,
    );

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ OWNER mới có quyền xóa Space.');
    }

    return await this.prisma.space.delete({
      where: { id: spaceId },
    });
  }
}
