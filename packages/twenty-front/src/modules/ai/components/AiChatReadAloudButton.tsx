import { useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { useLingui } from '@lingui/react/macro';
import { LightButton } from 'twenty-ui/components/input';

import {
  playVoiceReply,
  stopVoicePlayback,
} from '@/ai/voice/utils/playVoiceReply';

type AiChatReadAloudButtonProps = {
  text: string;
};

export const AiChatReadAloudButton = ({ text }: AiChatReadAloudButtonProps) => {
  const { t } = useLingui();
  const [isReading, setIsReading] = useState(false);

  if (!isNonEmptyString(text)) {
    return null;
  }

  const handleClick = () => {
    if (isReading) {
      stopVoicePlayback();
      setIsReading(false);
      return;
    }

    setIsReading(true);
    playVoiceReply({ text }).catch(() => {
      // playback failure must not break the chat
    }).finally(() => {
      setIsReading(false);
    });
  };

  return (
    <LightButton onClick={handleClick}>
      {isReading ? t`Stop reading` : t`Read it to me`}
    </LightButton>
  );
};
