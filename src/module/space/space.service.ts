import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

  async createSpace(dto: CreateSpaceDto, userId: string) {
    await this.checkWorkspaceMembership(dto.workspaceId, userId);

    return await this.prisma.space.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
      },
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

  // 5. Xóa Space (Chỉ OWNER hoặc ADMIN mới có quyền xóa)
  async deleteSpace(spaceId: string, userId: string) {
    const space = await this.getSpaceById(spaceId, userId);
    const member = await this.checkWorkspaceMembership(
      space.workspaceId,
      userId,
    );

    if (member.role === 'MEMBER') {
      throw new ForbiddenException(
        'Chỉ OWNER hoặc ADMIN mới có quyền xóa Space.',
      );
    }

    return await this.prisma.space.delete({
      where: { id: spaceId },
    });
  }
}
