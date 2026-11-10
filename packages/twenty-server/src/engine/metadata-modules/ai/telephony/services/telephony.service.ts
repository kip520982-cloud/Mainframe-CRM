import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as jwt from 'jsonwebtoken';

const execFileAsync = promisify(execFile);
const SIP_PARTICIPANT_IDENTITY = 'sip-callee';
const LK_BINARY = process.env.LIVEKIT_CLI_PATH ?? '/opt/homebrew/bin/lk';

@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);

  private get livekitConfig() {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const trunkId = process.env.LIVEKIT_SIP_TRUNK_ID;

    if (!url || !apiKey || !apiSecret || !trunkId) {
      throw new Error('LiveKit telephony is not configured');
    }

    return { url, apiKey, apiSecret, trunkId };
  }

  async dial(
    number: string,
    userWorkspaceId: string,
  ): Promise<{ url: string; token: string; roomName: string }> {
    const { url, apiKey, apiSecret, trunkId } = this.livekitConfig;
    const normalizedNumber = number.startsWith('+')
      ? number
      : `+64${number.replace(/^0/, '')}`;
    const roomName = `telephony-${userWorkspaceId}-${Date.now()}`;

    await execFileAsync(
      LK_BINARY,
      [
        'sip',
        'participant',
        'create',
        '--url',
        url,
        '--room',
        roomName,
        '--trunk',
        trunkId,
        '--call',
        normalizedNumber,
        '--identity',
        SIP_PARTICIPANT_IDENTITY,
        '--name',
        normalizedNumber,
      ],
      { timeout: 30000 },
    );
    this.logger.log(`SIP dial: ${normalizedNumber} room=${roomName}`);

    const token = jwt.sign(
      {
        sub: `caller-${userWorkspaceId}`,
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

  async hangup(
    roomName: string,
    userWorkspaceId: string,
  ): Promise<{ ok: boolean }> {
    if (!roomName.startsWith(`telephony-${userWorkspaceId}-`)) {
      throw new Error('Invalid room');
    }

    await execFileAsync(
      LK_BINARY,
      [
        'room',
        'participants',
        'remove',
        '--url',
        this.livekitConfig.url,
        '--room',
        roomName,
        '--identity',
        SIP_PARTICIPANT_IDENTITY,
      ],
      { timeout: 30000 },
    );

    return { ok: true };
  }
}
