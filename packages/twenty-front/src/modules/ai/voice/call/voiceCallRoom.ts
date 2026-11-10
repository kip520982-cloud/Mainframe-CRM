import { REST_API_BASE_URL } from '@/apollo/constants/RestApiBaseUrl';
import { SESSION_COOKIE_OPT_IN_HEADER_NAME } from 'twenty-shared/constants';
import {
  RemoteParticipant,
  Room,
  RoomEvent,
  type RemoteTrack,
} from 'livekit-client';

import { type VoiceCallStatus } from '@/ai/voice/call/voiceCallState';

// machine codes — the panel turns these into human text (it owns the translator)
const micErrorCode = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'mic_blocked';
    }
    if (error.name === 'NotFoundError') {
      return 'mic_not_found';
    }
    return `mic_error:${error.name}`;
  }
  return `mic_error:${String(error)}`;
};

export type VoiceCallListener = {
  onStatusChange: (status: VoiceCallStatus) => void;
  onAgentSpeakingChange: (speaking: boolean) => void;
  onErrorChange: (error: string | null) => void;
};

let room: Room | null = null;
let agentAudioElement: HTMLMediaElement | null = null;
let listener: VoiceCallListener | null = null;

export const registerVoiceCallListener = (
  nextListener: VoiceCallListener,
): (() => void) => {
  listener = nextListener;
  return () => {
    listener = null;
  };
};

const detachAgentAudio = () => {
  agentAudioElement?.remove();
  agentAudioElement = null;
};

export const startVoiceCall = async (): Promise<void> => {
  if (room !== null) {
    return;
  }

  listener?.onStatusChange('connecting');
  listener?.onErrorChange(null);

  // mic before connecting: a blocked mic fails here with a clear reason
  // instead of joining the call and dropping with no clue
  try {
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    micStream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    listener?.onErrorChange(micErrorCode(error));
    listener?.onStatusChange('idle');
    throw error;
  }

  const response = await fetch(`${REST_API_BASE_URL}/voice/livekit-token`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      [SESSION_COOKIE_OPT_IN_HEADER_NAME]: '1',
    },
  });

  if (!response.ok) {
    listener?.onErrorChange('call_failed');
    listener?.onStatusChange('idle');
    throw new Error(`LiveKit token request failed: ${response.status}`);
  }

  const { url, token } = await response.json();

  const nextRoom = new Room();

  nextRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
    if (track.kind !== 'audio') {
      return;
    }
    detachAgentAudio();
    agentAudioElement = track.attach();
  });

  nextRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    if (track.kind !== 'audio') {
      return;
    }
    track.detach();
    detachAgentAudio();
  });

  nextRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    listener?.onAgentSpeakingChange(
      speakers.some((speaker) => speaker instanceof RemoteParticipant),
    );
  });

  nextRoom.on(RoomEvent.Disconnected, () => {
    detachAgentAudio();
    room = null;
    listener?.onAgentSpeakingChange(false);
    listener?.onStatusChange('idle');
  });

  try {
    await nextRoom.connect(url, token);
    await nextRoom.localParticipant.setMicrophoneEnabled(true);
  } catch (error) {
    nextRoom.disconnect();
    detachAgentAudio();
    listener?.onErrorChange(
      error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'mic_blocked'
        : 'call_failed',
    );
    listener?.onStatusChange('idle');
    throw error;
  }

  room = nextRoom;
  listener?.onStatusChange('active');
};

export const stopVoiceCall = () => {
  room?.disconnect();
  detachAgentAudio();
  room = null;
  listener?.onAgentSpeakingChange(false);
  listener?.onStatusChange('idle');
};

export const setVoiceCallMuted = async (muted: boolean): Promise<void> => {
  await room?.localParticipant.setMicrophoneEnabled(!muted);
};
