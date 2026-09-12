import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InviteMembersDto, WorkspaceDto } from './dto/workspace.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import slugify from 'slugify';
@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}
  async createWorkspace(dto: WorkspaceDto, userId: string) {
    if (!userId) {
      throw new Error('userId is undefined. Check your Auth Guard/Decorator!');
    }

    try {
      const slug = slugify(dto.name, {
        lower: true,
        strict: true,
        locale: 'vi',
      });

      // Sử dụng transaction để rollback nếu 1 trong 2 thao tác thất bại
      return await this.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name: dto.name,
            slug: slug,
          },
        });

        await tx.workspaceMember.create({
          data: {
            userId,
            workspaceId: workspace.id,
            role: 'OWNER',
          },
        });

        return workspace;
      });
    } catch (error) {
      console.error('❌ WORKSPACE CREATE ERROR DETAILED:', error);
      throw error;
    }
  }
  async getWorkspacesOfMe(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    return await Promise.all(
      memberships.map(async ({ workspace, role }) => {
        const [boardsCount, tasksCount, completedTasksCount] =
          await Promise.all([
            this.prisma.space.count({
              where: { workspaceId: workspace.id },
            }),
            this.prisma.item.count({
              where: { list: { space: { workspaceId: workspace.id } } },
            }),
            this.prisma.item.count({
              where: {
                list: { space: { workspaceId: workspace.id } },
                status: { group: 'DONE' },
              },
            }),
          ]);

        return {
          ...workspace,
          role,
          boardsCount,
          tasksCount,
          completedTasksCount,
        };
      }),
    );
  }

  async getMembers(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không thuộc Workspace này.');
    }

    return await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }
  async getWorkspaceBySlug(slug: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
    });

    if (!workspace) {
      throw new NotFoundException('Không tìm thấy Workspace.');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không thuộc Workspace này.');
    }

    return workspace;
  }
  async inviteMembers(dto: InviteMembersDto, userId: string) {
    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: userId,
        workspaceId: dto.workspaceId,
        role: 'OWNER',
      },
    });
    if (!workspaceMember) {
      throw new Error('You are not the owner of this workspace.');
    }
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) {
      throw new Error('User not found.');
    }
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: dto.workspaceId,
      },
    });
    if (existingMember) {
      throw new Error('User is already a member of this workspace.');
    }
    await this.prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: dto.workspaceId,
        role: 'MEMBER',
      },
    });
    return { message: 'User invited successfully.' };
  }
}
