import { IsIn, IsOptional, IsString } from 'class-validator';

const WORKSPACE_TYPES = ['PERSONAL', 'TEAM', 'ENTERPRISE'] as const;
const MEMBER_ROLES = ['MEMBER', 'ADMIN', 'OWNER'] as const;

export class WorkspaceDto {
  @IsString()
  name!: string;

  @IsIn(WORKSPACE_TYPES)
  @IsOptional()
  type?: (typeof WORKSPACE_TYPES)[number];
}

export class UpdateWorkspaceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(WORKSPACE_TYPES)
  @IsOptional()
  type?: (typeof WORKSPACE_TYPES)[number];
}

export class InviteMembersDto {
  @IsString()
  email!: string;
  @IsString()
  workspaceId!: string;
}

export class UpdateMemberRoleDto {
  @IsIn(MEMBER_ROLES)
  role!: (typeof MEMBER_ROLES)[number];
}
