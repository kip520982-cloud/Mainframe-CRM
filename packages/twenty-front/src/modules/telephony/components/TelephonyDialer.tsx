import { REST_API_BASE_URL } from '@/apollo/constants/RestApiBaseUrl';
import {
  telephonyCallStatusState,
  telephonyDialerOpenState,
  telephonyDialedNumberState,
} from '@/telephony/states/telephonyState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { Room, RoomEvent, type RemoteTrack } from 'livekit-client';
import { useEffect, useState } from 'react';
import { SESSION_COOKIE_OPT_IN_HEADER_NAME } from 'twenty-shared/constants';
import { IconButton } from 'twenty-ui/components/input';
import { useToast } from 'twenty-ui/components/feedback';
import { TextInput } from '@/ui/input/components/TextInput';
import { IconPhone, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';

const SESSION_COOKIE_HEADERS = {
  [SESSION_COOKIE_OPT_IN_HEADER_NAME]: '1',
};

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const StyledLauncher = styled.div`
  bottom: ${themeCssVariables.spacing[6]};
  left: ${themeCssVariables.spacing[6]};
  position: fixed;
  z-index: 1000;
`;

const StyledPanel = styled.div`
  background-color: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.lg};
  bottom: ${themeCssVariables.spacing[6]};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  left: ${themeCssVariables.spacing[6]};
  padding: ${themeCssVariables.spacing[4]};
  position: fixed;
  width: 240px;
  z-index: 1000;
`;

const StyledKeypad = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(3, 1fr);
`;

const StyledKey = styled.button`
  background-color: ${themeCssVariables.background.secondary};
  border: none;
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.lg};
  padding: ${themeCssVariables.spacing[3]};
`;

let room: Room | null = null;
let remoteAudio: HTMLMediaElement | null = null;

export const TelephonyDialer = () => {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useAtomState(telephonyDialerOpenState);
  const [callStatus, setCallStatus] = useAtomState(telephonyCallStatusState);
  const [dialedNumber, setDialedNumber] = useAtomState(
    telephonyDialedNumberState,
  );
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    return () => {
      room?.disconnect();
      remoteAudio?.remove();
    };
  }, []);

  const detachAudio = () => {
    remoteAudio?.remove();
    remoteAudio = null;
  };

  const { enqueueToast } = useToast();

  const handleCall = async () => {
    if (dialedNumber.trim().length === 0) {
      return;
    }
    setCallStatus('dialing');
    try {
      const response = await fetch(`${REST_API_BASE_URL}/telephony/dial`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...SESSION_COOKIE_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: dialedNumber.trim() }),
      });
      if (!response.ok) {
        throw new Error('Dial failed');
      }
      const { url, token, roomName: nextRoomName } = await response.json();
      const nextRoom = new Room();
      nextRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== 'audio') {
          return;
        }
        detachAudio();
        remoteAudio = track.attach();
      });
      nextRoom.on(RoomEvent.Disconnected, () => {
        detachAudio();
        room = null;
        setCallStatus('idle');
      });
      await nextRoom.connect(url, token);
      await nextRoom.localParticipant.setMicrophoneEnabled(true);
      room = nextRoom;
      setRoomName(nextRoomName);
      setCallStatus('active');
    } catch (error) {
      setCallStatus('idle');
      enqueueToast({
        status: 'error',
        children: t`Call failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  };

  const handleHangup = async () => {
    if (roomName !== '') {
      await fetch(`${REST_API_BASE_URL}/telephony/hangup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...SESSION_COOKIE_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName }),
      }).catch(() => undefined);
    }
    room?.disconnect();
    detachAudio();
    room = null;
    setCallStatus('idle');
  };

  if (!isOpen) {
    return (
      <StyledLauncher>
        <IconButton
          variant="solid"
          size="md"
          onClick={() => setIsOpen(true)}
          aria-label={t`Open dial pad`}
        >
          <IconPhone />
        </IconButton>
      </StyledLauncher>
    );
  }

  return (
    <StyledPanel>
      <TextInput
        value={dialedNumber}
        onChange={setDialedNumber}
        placeholder={t`Phone number`}
        fullWidth
      />
      <StyledKeypad>
        {KEYPAD_KEYS.map((key) => (
          <StyledKey key={key} onClick={() => setDialedNumber(dialedNumber + key)}>
            {key}
          </StyledKey>
        ))}
      </StyledKeypad>
      <IconButton
        variant="solid"
        size="md"
        onClick={() => {
          void handleCall();
        }}
        disabled={callStatus !== 'idle'}
        aria-label={t`Call`}
      >
        <IconPhone color={callStatus === 'idle' ? 'currentColor' : 'danger'} />
      </IconButton>
      {callStatus !== 'idle' && (
        <IconButton
          variant="outline"
          size="md"
          onClick={() => {
            void handleHangup();
          }}
          aria-label={t`Hang up`}
        >
          <IconX />
        </IconButton>
      )}
      <IconButton
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(false)}
        aria-label={t`Close dial pad`}
      >
        <IconX />
      </IconButton>
    </StyledPanel>
  );
};
