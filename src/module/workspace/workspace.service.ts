import {
  InviteMembersDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
} from './dto/workspace.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import slugify from 'slugify';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniqueSlug(name: string) {
    const base =
      slugify(name, { lower: true, strict: true, locale: 'vi' }) || 'workspace';

    let slug = base;
    let suffix = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }

    return slug;
  }

  private async requireMembership(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không thuộc Workspace này.');
    }

    return member;
  }

  async createWorkspace(dto: WorkspaceDto, userId: string) {
    if (!userId) {
      throw new Error('userId is undefined. Check your Auth Guard/Decorator!');
    }

    const slug = await this.generateUniqueSlug(dto.name);

    return await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          type: dto.type ?? 'PERSONAL',
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
    await this.requireMembership(workspaceId, userId);

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

    await this.requireMembership(workspace.id, userId);

    return workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    dto: UpdateWorkspaceDto,
    userId: string,
  ) {
    const member = await this.requireMembership(workspaceId, userId);

    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Chỉ OWNER hoặc ADMIN mới có quyền chỉnh sửa Workspace.',
      );
    }

    return await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: dto,
    });
  }

  async deleteWorkspace(workspaceId: string, userId: string) {
    const member = await this.requireMembership(workspaceId, userId);

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ OWNER mới có quyền xóa Workspace.');
    }

    return await this.prisma.workspace.delete({ where: { id: workspaceId } });
  }

  async inviteMembers(dto: InviteMembersDto, userId: string) {
    const requester = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: dto.workspaceId },
    });
    if (
      !requester ||
      (requester.role !== 'OWNER' && requester.role !== 'ADMIN')
    ) {
      throw new ForbiddenException(
        'Chỉ OWNER hoặc ADMIN mới có quyền mời thành viên.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng với email này.');
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: dto.workspaceId },
      },
    });
    if (existingMember) {
      throw new ConflictException(
        'Người dùng này đã là thành viên của Workspace.',
      );
    }

    await this.prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: dto.workspaceId,
        role: 'MEMBER',
      },
    });

    return { message: 'Mời thành viên thành công.' };
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    requesterId: string,
  ) {
    const requester = await this.requireMembership(workspaceId, requesterId);
    if (requester.role !== 'OWNER') {
      throw new ForbiddenException(
        'Chỉ OWNER mới có quyền đổi vai trò thành viên.',
      );
    }

    if (targetUserId === requesterId) {
      throw new BadRequestException('Không thể tự đổi vai trò của chính mình.');
    }

    const target = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });
    if (!target) {
      throw new NotFoundException('Thành viên này không thuộc Workspace.');
    }

    return await this.prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      data: { role: dto.role },
    });
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    requesterId: string,
  ) {
    const requester = await this.requireMembership(workspaceId, requesterId);
    if (requester.role !== 'OWNER' && requester.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Chỉ OWNER hoặc ADMIN mới có quyền xóa thành viên.',
      );
    }

    if (targetUserId === requesterId) {
      throw new BadRequestException(
        'Dùng chức năng "Rời Workspace" để tự rời khỏi Workspace.',
      );
    }

    const target = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });
    if (!target) {
      throw new NotFoundException('Thành viên này không thuộc Workspace.');
    }
    if (target.role === 'OWNER') {
      throw new ForbiddenException('Không thể xóa OWNER khỏi Workspace.');
    }

    return await this.prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });
  }

  async leaveWorkspace(workspaceId: string, userId: string) {
    const member = await this.requireMembership(workspaceId, userId);

    if (member.role === 'OWNER') {
      const otherOwner = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId, role: 'OWNER', userId: { not: userId } },
      });
      if (!otherOwner) {
        throw new BadRequestException(
          'Bạn là OWNER duy nhất — hãy chuyển quyền sở hữu hoặc xóa Workspace thay vì rời đi.',
        );
      }
    }

    return await this.prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
  }
}
