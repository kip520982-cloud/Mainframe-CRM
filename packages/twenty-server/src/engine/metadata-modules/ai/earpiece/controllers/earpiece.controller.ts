import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiPath } from 'twenty-shared/types';

import { AuthRestApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-rest-api-exception.filter';
import { AccessPolicyGuard } from 'src/engine/guards/access-policy.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { EarpieceService } from 'src/engine/metadata-modules/ai/earpiece/services/earpiece.service';
import { PermissionsRestApiExceptionFilter } from 'src/engine/permissions/utils/permissions-rest-api-exception.filter';

type UploadedAudioFile = { buffer: Buffer; mimetype: string; size: number };

@Controller(`${ApiPath.Rest}/earpiece`)
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
export class EarpieceController {
  constructor(private readonly earpieceService: EarpieceService) {}

  @Get('calls')
  async listCalls() {
    return this.earpieceService.listCalls();
  }

  @Post('calls')
  async createCall(@Body() body: Record<string, unknown>) {
    return this.earpieceService.createCall(body);
  }

  @Get('calls/:id')
  async getCall(@Param('id') id: string) {
    return this.earpieceService.getCall(id);
  }

  @Patch('calls/:id')
  async patchCall(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.earpieceService.patchCall(id, body);
  }

  @Delete('calls/:id')
  async deleteCall(@Param('id') id: string) {
    return this.earpieceService.deleteCall(id);
  }

  @Post('calls/:id/rerun')
  async rerunCall(@Param('id') id: string) {
    return this.earpieceService.rerunCall(id);
  }

  @Post('research')
  @HttpCode(200)
  async research(@Body() body: { id?: string }) {
    if (!body.id) {return { error: 'missing id' };}
    return this.earpieceService.research(body.id);
  }

  @Post('listen')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 25_000_000 } }))
  async listen(
    @UploadedFile() audio: UploadedAudioFile,
    @Body() body: Record<string, string>,
  ) {
    if (!audio || !body.callId) {return { error: 'missing audio or callId' };}
    return this.earpieceService.listen({
      audio: audio.buffer,
      mime: audio.mimetype,
      callId: body.callId,
      speaker: body.speaker === 'them' ? 'them' : 'you',
      at: Number(body.at ?? 0),
      mixed: body.mixed === '1',
    });
  }

  @Post('wrapup')
  @HttpCode(200)
  async wrapup(@Body() body: { callId?: string }) {
    if (!body.callId) {return { error: 'missing callId' };}
    return this.earpieceService.wrapup(body.callId);
  }

  @Get('profile')
  async getProfile() {
    return { profile: await this.earpieceService.getProfile() };
  }

  @Post('profile')
  async saveProfile(@Body() body: Record<string, unknown>) {
    return this.earpieceService.saveProfile(body);
  }
}
