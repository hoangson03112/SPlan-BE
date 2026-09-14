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

  // A short, uppercase project key like Jira's "MKT" — derived from the
  // initials of the space's name (falling back to its first letters when
  // there's only one word), then de-duplicated within the workspace.
  private async generateUniqueKey(
    workspaceId: string,
    name: string,
    explicit?: string,
  ) {
    const words = (explicit ?? name)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .match(/[A-Z0-9]+/g);

    let base: string;
    if (!words || words.length === 0) {
      base = 'SP';
    } else if (words.length === 1) {
      base = words[0].slice(0, 4);
    } else {
      base = words
        .map((w) => w[0])
        .join('')
        .slice(0, 4);
    }
    if (base.length < 2) base = base.padEnd(2, 'X');

    let key = base;
    let suffix = 1;
    while (
      await this.prisma.space.findUnique({
        where: { workspaceId_key: { workspaceId, key } },
      })
    ) {
      suffix += 1;
      key = `${base}${suffix}`;
    }

    return key;
  }

  async createSpace(dto: CreateSpaceDto, userId: string) {
    await this.checkWorkspaceMembership(dto.workspaceId, userId);
    const slug = await this.generateUniqueSlug(dto.workspaceId, dto.name);
    const key = await this.generateUniqueKey(
      dto.workspaceId,
      dto.name,
      dto.key,
    );

    return await this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: {
          workspaceId: dto.workspaceId,
          name: dto.name,
          slug,
          key,
          icon: dto.icon,
          color: dto.color,
          description: dto.description,
          category: dto.category,
        },
      });

      const list = await tx.list.create({
        data: {
          spaceId: space.id,
          name: space.name,
        },
      });

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

      return await tx.space.findUniqueOrThrow({
        where: { id: space.id },
        include: { lists: true },
      });
    });
  }

  async getSpacesByWorkspace(workspaceId: string, userId: string) {
    await this.checkWorkspaceMembership(workspaceId, userId);

    const spaces = await this.prisma.space.findMany({
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

    return await Promise.all(
      spaces.map(async (space) => {
        const [itemsCount, completedItemsCount] = await Promise.all([
          this.prisma.item.count({
            where: { list: { spaceId: space.id } },
          }),
          this.prisma.item.count({
            where: {
              list: { spaceId: space.id },
              status: { group: 'DONE' },
            },
          }),
        ]);

        return { ...space, itemsCount, completedItemsCount };
      }),
    );
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
