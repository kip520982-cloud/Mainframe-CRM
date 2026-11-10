import { useEffect, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import {
  type ExtendedUIMessage,
  type ExtendedUIMessagePart,
} from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';

import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { agentChatIsStreamingFamilyState } from '@/ai/states/agentChatIsStreamingFamilyState';
import { agentChatMessagesFamilyState } from '@/ai/states/agentChatMessagesFamilyState';
import {
  voiceModeEnabledState,
  voiceSelectionState,
} from '@/ai/voice/states/voiceModeState';
import { playVoiceReply } from '@/ai/voice/utils/playVoiceReply';
import {
  readVoiceModeEnabledFromStorage,
  readVoiceSelectionFromStorage,
  writeVoiceModeEnabledToStorage,
  writeVoiceSelectionToStorage,
} from '@/ai/voice/utils/voiceStorage';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// module-level: which message each thread has already spoken, so remounts
// neither replay history nor lose track of the last played reply
const spokenMessageIdByThreadId = new Map<string, string>();

const extractMessageText = (message: ExtendedUIMessage): string =>
  message.parts
    .filter(
      (part): part is Extract<ExtendedUIMessagePart, { type: 'text' }> =>
        part.type === 'text',
    )
    .map((part) => part.text)
    .join(' ')
    .trim();

export const AiVoicePlaybackEffect = () => {
  const [voiceModeEnabled, setVoiceModeEnabled] = useAtomState(
    voiceModeEnabledState,
  );
  const [voiceSelection, setVoiceSelection] = useAtomState(voiceSelectionState);
  const [hasHydratedPreferences, setHasHydratedPreferences] = useState(false);
  const agentChatDisplayedThread = useAtomStateValue(
    agentChatDisplayedThreadState,
  );
  const agentChatMessages = useAtomFamilyStateValue(
    agentChatMessagesFamilyState,
    { threadId: agentChatDisplayedThread },
  );
  const agentChatIsStreaming = useAtomFamilyStateValue(
    agentChatIsStreamingFamilyState,
    { threadId: agentChatDisplayedThread },
  );

  useEffect(() => {
    if (hasHydratedPreferences) {
      return;
    }

    setVoiceModeEnabled(readVoiceModeEnabledFromStorage());
    setVoiceSelection(readVoiceSelectionFromStorage());
    setHasHydratedPreferences(true);
  }, [hasHydratedPreferences, setVoiceModeEnabled, setVoiceSelection]);

  useEffect(() => {
    if (hasHydratedPreferences) {
      writeVoiceModeEnabledToStorage(voiceModeEnabled);
    }
  }, [hasHydratedPreferences, voiceModeEnabled]);

  useEffect(() => {
    if (hasHydratedPreferences) {
      writeVoiceSelectionToStorage(voiceSelection);
    }
  }, [hasHydratedPreferences, voiceSelection]);

  useEffect(() => {
    if (
      !voiceModeEnabled ||
      !isDefined(agentChatDisplayedThread) ||
      agentChatIsStreaming
    ) {
      return;
    }

    const lastAssistantMessage = [...agentChatMessages]
      .reverse()
      .find((message) => message.role === 'assistant');

    if (!isDefined(lastAssistantMessage)) {
      return;
    }

    const spokenMessageId = spokenMessageIdByThreadId.get(
      agentChatDisplayedThread,
    );

    // first sight of a thread: anchor on its latest message, don't replay history
    if (!isDefined(spokenMessageId)) {
      spokenMessageIdByThreadId.set(
        agentChatDisplayedThread,
        lastAssistantMessage.id,
      );
      return;
    }

    if (spokenMessageId === lastAssistantMessage.id) {
      return;
    }

    spokenMessageIdByThreadId.set(
      agentChatDisplayedThread,
      lastAssistantMessage.id,
    );

    const text = extractMessageText(lastAssistantMessage);

    if (isNonEmptyString(text)) {
      playVoiceReply({
        text,
        voiceId: voiceSelection ?? undefined,
      }).catch(() => {
        // a failed playback must not break the chat
      });
    }
  }, [
    voiceModeEnabled,
    voiceSelection,
    agentChatDisplayedThread,
    agentChatMessages,
    agentChatIsStreaming,
  ]);

  return null;
};
