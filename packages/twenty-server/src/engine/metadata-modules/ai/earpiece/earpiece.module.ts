import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { PermissionsModule } from 'src/engine/permissions/permissions.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

import { EarpieceController } from 'src/engine/metadata-modules/ai/earpiece/controllers/earpiece.controller';
import { EarpieceAiService } from 'src/engine/metadata-modules/ai/earpiece/services/earpiece-ai.service';
import { EarpieceService } from 'src/engine/metadata-modules/ai/earpiece/services/earpiece.service';
import { EarpieceStorageService } from 'src/engine/metadata-modules/ai/earpiece/services/earpiece-storage.service';

@Module({
  imports: [TokenModule, WorkspaceCacheStorageModule, PermissionsModule],
  controllers: [EarpieceController],
  providers: [EarpieceService, EarpieceStorageService, EarpieceAiService],
})
export class EarpieceModule {}
