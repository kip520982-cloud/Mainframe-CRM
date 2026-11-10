import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiPath } from 'twenty-shared/types';

import { AuthRestApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-rest-api-exception.filter';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AccessPolicyGuard } from 'src/engine/guards/access-policy.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { TelephonyService } from 'src/engine/metadata-modules/ai/telephony/services/telephony.service';
import { PermissionsRestApiExceptionFilter } from 'src/engine/permissions/utils/permissions-rest-api-exception.filter';

@Controller(`${ApiPath.Rest}/telephony`)
@UseGuards(
  JwtAuthGuard,
  AccessPolicyGuard({
    authPrincipals: {
      userSession: {
        standard: true,
        impersonated: true,
        playground: true,
        workspaceAgnostic: false,
      },
      apiKey: true,
      oauthClient: true,
      application: true,
    },
    requiredPermissionFlags: [],
  }),
)
@UseFilters(PermissionsRestApiExceptionFilter, AuthRestApiExceptionFilter)
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Post('dial')
  @HttpCode(200)
  async dial(
    @Body() body: { number: string },
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<{ url: string; token: string; roomName: string }> {
    return this.telephonyService.dial(body.number, userWorkspaceId);
  }

  @Post('hangup')
  @HttpCode(200)
  async hangup(
    @Body() body: { roomName: string },
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<{ ok: boolean }> {
    return this.telephonyService.hangup(body.roomName, userWorkspaceId);
  }
}
