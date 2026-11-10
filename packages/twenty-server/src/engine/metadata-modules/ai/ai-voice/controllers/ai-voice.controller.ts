import * as jwt from 'jsonwebtoken';

import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Logger,
  Post,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { type Response } from 'express';
import { PermissionFlagType } from 'twenty-shared/constants';
import { ApiPath } from 'twenty-shared/types';

import { AuthRestApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-rest-api-exception.filter';
import type { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AccessPolicyGuard } from 'src/engine/guards/access-policy.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { SpeakInput } from 'src/engine/metadata-modules/ai/ai-voice/dtos/speak.input';
import {
  VoiceTtsService,
  type VoiceOption,
} from 'src/engine/metadata-modules/ai/ai-voice/services/voice-tts.service';
import { PermissionsRestApiExceptionFilter } from 'src/engine/permissions/utils/permissions-rest-api-exception.filter';

@Controller(`${ApiPath.Rest}/voice`)
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
    requiredPermissionFlags: [PermissionFlagType.AI],
  }),
)
@UseFilters(PermissionsRestApiExceptionFilter, AuthRestApiExceptionFilter)
export class AiVoiceController {
  constructor(private readonly voiceTtsService: VoiceTtsService) {}

  private readonly logger = new Logger(AiVoiceController.name);
  private readonly execFileAsync = promisify(execFile);
  private readonly lkBinary = process.env.LIVEKIT_CLI_PATH ?? 'lk';

  // rooms are joined implicitly by the browser, so the agent is only pulled in
  // through an explicit dispatch — without this the call connects to an empty room
  private async dispatchVoiceAgent(roomName: string): Promise<void> {
    const existing = await this.execFileAsync(
      this.lkBinary,
      ['dispatch', 'list', roomName, '--url', process.env.LIVEKIT_URL ?? ''],
      { timeout: 10_000 },
    ).catch(() => ({ stdout: '' }));

    if (existing.stdout.includes('mainframe-voice')) {
      return;
    }

    await this.execFileAsync(
      this.lkBinary,
      [
        'dispatch',
        'create',
        '--url',
        process.env.LIVEKIT_URL ?? '',
        '--agent-name',
        'mainframe-voice',
        '--room',
        roomName,
      ],
      { timeout: 10_000 },
    );
    this.logger.log(`Voice agent dispatched to room=${roomName}`);
  }

  @Get('voices')
  @HttpCode(200)
  getVoices(): { voices: VoiceOption[] } {
    return { voices: this.voiceTtsService.getVoiceOptions() };
  }

  @Post('livekit-token')
  @HttpCode(200)
  async getLiveKitToken(
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<{ url: string; token: string; roomName: string }> {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      throw new Error('LiveKit is not configured');
    }

    const roomName = `mainframe-voice-${userWorkspaceId}`;

    await this.dispatchVoiceAgent(roomName);

    const token = jwt.sign(
      {
        sub: `user-${userWorkspaceId}`,
        grants: {
          roomJoin: true,
          room: roomName,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        },
      },
      apiSecret,
      { issuer: apiKey, expiresIn: '2h' },
    );

    return { url, token, roomName };
  }

  @Post('speak')
  @Header('Content-Type', 'audio/mpeg')
  @Header('Cache-Control', 'no-store')
  async speak(
    @Body() body: SpeakInput,
    @AuthWorkspace() _workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() _userWorkspaceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { audio, contentType, provider } = await this.voiceTtsService.synthesize({
      text: body.text,
      voiceId: body.voiceId,
    });

    response.setHeader('X-Voice-Provider', provider);
    response.setHeader('Content-Type', contentType);
    response.send(audio);
  }
}
