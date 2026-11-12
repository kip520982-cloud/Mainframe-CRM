import { useState } from 'react';

import { answerLineAgentConfigState } from '@/answer-line/states/answerLineAgentConfigState';
import {
  startVoiceCall,
  stopVoiceCall,
} from '@/ai/voice/call/voiceCallRoom';
import {
  voiceCallErrorState,
  voiceCallStatusState,
} from '@/ai/voice/call/voiceCallState';
import { AiVoiceCallPanel } from '@/ai/voice/components/AiVoiceCallPanel';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { doNotTranslate } from 'twenty-shared/i18n';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledPage = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[5]};
  height: 100%;
  max-width: 920px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[6]};
  width: 100%;
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledLead = styled.p`
  margin: 0;
`;

const StyledCard = styled.section`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledCardTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledTextarea = styled.textarea`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-height: 140px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  resize: vertical;
`;

const StyledRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledButton = styled.button<{ $primary?: boolean }>`
  background: ${({ $primary }) =>
    $primary
      ? themeCssVariables.color.blue
      : themeCssVariables.background.transparent.medium};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ $primary }) =>
    $primary ? themeCssVariables.font.color.inverted : themeCssVariables.font.color.primary};
  cursor: pointer;
  font: inherit;
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const StyledLink = styled.a`
  color: ${themeCssVariables.color.blue};
`;

const StyledStatus = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledHint = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

export const AnswerLinePage = () => {
  const [config, setConfig] = useAtomState(answerLineAgentConfigState);
  const voiceCallStatus = useAtomStateValue(voiceCallStatusState);
  const voiceCallError = useAtomStateValue(voiceCallErrorState);
  const [saveNotice, setSaveNotice] = useState('');

  const isLive = voiceCallStatus === 'active' || voiceCallStatus === 'connecting';

  const updateField = <TKey extends keyof typeof config>(
    key: TKey,
    value: (typeof config)[TKey],
  ) => {
    setConfig({ ...config, [key]: value });
    setSaveNotice(doNotTranslate('Saved in this browser'));
  };

  const handleTestCall = () => {
    void startVoiceCall({
      channel: 'answer-line',
      agentId: config.agentId.trim() || undefined,
      voice: config.voice.trim() || undefined,
      instructions: config.instructions,
    }).catch(() => {
      stopVoiceCall();
    });
  };

  return (
    <StyledPage>
      <AiVoiceCallPanel />
      <div>
        <StyledTitle>{doNotTranslate('Answer Line')}</StyledTitle>
        <StyledLead>
          {doNotTranslate(
            'In-CRM builder for your phone answer agent. Keeps your trained xAI Voice Agent and runs it on Grok speech-to-speech inside Mainframe.',
          )}
        </StyledLead>
      </div>

      <StyledCard>
        <StyledCardTitle>{doNotTranslate('Agent')}</StyledCardTitle>
        <StyledLabel>
          {doNotTranslate('Display name')}
          <StyledInput
            value={config.name}
            onChange={(event) => updateField('name', event.target.value)}
          />
        </StyledLabel>
        <StyledLabel>
          {doNotTranslate('xAI agent ID')}
          <StyledInput
            value={config.agentId}
            onChange={(event) => updateField('agentId', event.target.value)}
            placeholder="agent_…"
          />
        </StyledLabel>
        <StyledHint>
          {doNotTranslate(
            'Use your Voice Agent Builder agent to keep the trained persona, knowledge, and tools. Leave blank to run raw grok-voice-latest with the instructions + voice below. If an agent ID is set, pick Kieran as that agent’s voice in the xAI console too — console agents own voice server-side.',
          )}
        </StyledHint>
        <StyledLabel>
          {doNotTranslate('Voice (Kieran S = nejdfbmfnm3s)')}
          <StyledInput
            value={config.voice}
            onChange={(event) => updateField('voice', event.target.value)}
            placeholder="nejdfbmfnm3s"
          />
        </StyledLabel>
        <StyledLabel>
          {doNotTranslate('Instructions (used only when no agent ID)')}
          <StyledTextarea
            value={config.instructions}
            onChange={(event) => updateField('instructions', event.target.value)}
          />
        </StyledLabel>
        <StyledRow>
          <StyledButton
            type="button"
            $primary
            disabled={isLive}
            onClick={handleTestCall}
          >
            {doNotTranslate('Test speech-to-speech call')}
          </StyledButton>
          <StyledButton
            type="button"
            disabled={!isLive}
            onClick={() => stopVoiceCall()}
          >
            {doNotTranslate('Hang up')}
          </StyledButton>
          <StyledButton
            type="button"
            onClick={() =>
              window.open(config.consoleUrl || 'https://console.x.ai/', '_blank')
            }
          >
            {doNotTranslate('Open xAI Agent Builder')}
          </StyledButton>
        </StyledRow>
        <StyledStatus>
          {doNotTranslate('Call status:')} {voiceCallStatus}
          {saveNotice ? ` · ${saveNotice}` : ''}
        </StyledStatus>
        {voiceCallError ? <StyledError>{voiceCallError}</StyledError> : null}
      </StyledCard>

      <StyledCard>
        <StyledCardTitle>{doNotTranslate('How this fits')}</StyledCardTitle>
        <StyledHint>
          {doNotTranslate(
            'Chat assistant phone button and Answer Line both use Grok speech-to-speech. Deep training (docs, tools, guardrails) stays in xAI Voice Agent Builder; Mainframe stores the agent link and lets you test calls here.',
          )}
        </StyledHint>
        <StyledHint>
          {doNotTranslate('Builder console:')}{' '}
          <StyledLink
            href={config.consoleUrl || 'https://console.x.ai/'}
            target="_blank"
            rel="noreferrer"
          >
            console.x.ai
          </StyledLink>
        </StyledHint>
      </StyledCard>
    </StyledPage>
  );
};
