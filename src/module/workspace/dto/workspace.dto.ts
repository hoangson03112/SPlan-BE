import { IsString } from 'class-validator';

export class WorkspaceDto {
  @IsString()
  name!: string;
}
export class InviteMembersDto {
  @IsString()
  email!: string;
  @IsString()
  workspaceId!: string;
}
