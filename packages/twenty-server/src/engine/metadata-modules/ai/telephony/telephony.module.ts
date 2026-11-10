import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { PermissionsModule } from 'src/engine/permissions/permissions.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

import { TelephonyController } from 'src/engine/metadata-modules/ai/telephony/controllers/telephony.controller';
import { TelephonyService } from 'src/engine/metadata-modules/ai/telephony/services/telephony.service';

@Module({
  imports: [TokenModule, WorkspaceCacheStorageModule, PermissionsModule],
  controllers: [TelephonyController],
  providers: [TelephonyService],
})
export class TelephonyModule {}
