import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { PermissionsModule } from 'src/engine/permissions/permissions.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

import { AiVoiceController } from './controllers/ai-voice.controller';
import { VoiceTtsService } from './services/voice-tts.service';

@Module({
  imports: [TokenModule, WorkspaceCacheStorageModule, PermissionsModule],
  controllers: [AiVoiceController],
  providers: [VoiceTtsService],
})
export class AiVoiceModule {}
