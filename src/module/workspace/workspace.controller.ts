import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WorkspaceService } from './workspace.service.js';
import { InviteMembersDto, WorkspaceDto } from './dto/workspace.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}
  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  async createWorkspace(
    @Body() dto: WorkspaceDto,
    @CurrentUser() user: { id: string },
  ) {
    const workspace = await this.workspaceService.createWorkspace(dto, user.id);
    return { message: 'Tạo workspace thành công', workspace };
  }
  @Get('my-workspaces')
  @UseGuards(AuthGuard('jwt'))
  async getWorkspacesOfMe(@CurrentUser() user: { id: string }) {
    const workspaces = await this.workspaceService.getWorkspacesOfMe(user.id);
    return { workspaces };
  }
  @Post('invite-members')
  @UseGuards(AuthGuard('jwt'))
  async inviteMembers(
    @Body() dto: InviteMembersDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.workspaceService.inviteMembers(dto, user.id);
  }
}
