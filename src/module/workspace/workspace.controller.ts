import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service.js';
import {
  InviteMembersDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
} from './dto/workspace.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('workspace')
@UseGuards(AuthGuard('jwt'))
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('create')
  async createWorkspace(
    @Body() dto: WorkspaceDto,
    @CurrentUser() user: { id: string },
  ) {
    const workspace = await this.workspaceService.createWorkspace(dto, user.id);
    return { message: 'Tạo workspace thành công', workspace };
  }

  @Get('my-workspaces')
  async getWorkspacesOfMe(@CurrentUser() user: { id: string }) {
    const workspaces = await this.workspaceService.getWorkspacesOfMe(user.id);
    return { workspaces };
  }

  @Post('invite-members')
  async inviteMembers(
    @Body() dto: InviteMembersDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.workspaceService.inviteMembers(dto, user.id);
  }

  @Get(':slug')
  async getWorkspaceBySlug(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspaceService.getWorkspaceBySlug(slug, userId);
  }

  @Patch(':id')
  async updateWorkspace(
    @Param('id') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspaceService.updateWorkspace(workspaceId, dto, userId);
  }

  @Delete(':id')
  async deleteWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspaceService.deleteWorkspace(workspaceId, userId);
  }

  @Post(':id/leave')
  async leaveWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspaceService.leaveWorkspace(workspaceId, userId);
  }

  @Get(':workspaceId/members')
  async getMembers(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspaceService.getMembers(workspaceId, userId);
  }

  @Patch(':workspaceId/members/:userId')
  async updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.workspaceService.updateMemberRole(
      workspaceId,
      targetUserId,
      dto,
      requesterId,
    );
  }

  @Delete(':workspaceId/members/:userId')
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.workspaceService.removeMember(
      workspaceId,
      targetUserId,
      requesterId,
    );
  }
}
