import { styled } from '@linaria/react';
import { plural } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { getToolName, type DynamicToolUIPart, type ToolUIPart } from 'ai';
import { isNonEmptyArray } from 'twenty-shared/utils';
import {
  IconCircleX,
  IconProgressCheck,
  ThinkingOrbitLoaderIcon,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';

import { ShimmeringText } from '@/ai/components/ShimmeringText';
import { ThinkingStepRowLayout } from '@/ai/components/ThinkingStepRowLayout';
import { ToolRecordsWidget } from '@/ai/components/ToolRecordsWidget';
import { useToolDisplayContext } from '@/ai/hooks/useToolDisplayContext';
import { getThinkingStepLabel } from '@/ai/utils/getThinkingStepLabel';
import { getToolIcon } from '@/ai/utils/getToolIcon';
import { getToolRecordOutput } from '@/ai/utils/getToolRecordOutput';
import { isThinkingStepPartActive } from '@/ai/utils/isThinkingStepPartActive';
import { useLingui } from '@lingui/react/macro';

const StyledFeedContainer = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  font-family: ${themeCssVariables.font.family};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[2]};
  min-height: 24px;
`;

const StyledFailureIndicator = styled.span`
  align-items: center;
  color: ${themeCssVariables.color.red};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin-left: calc(
    ${themeCssVariables.icon.size.sm} * 1px + ${themeCssVariables.spacing[2]}
  );
`;

const StyledErrorText = styled.p`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.md};
  line-height: ${themeCssVariables.text.lineHeight.lg};
  margin: 0;
  white-space: pre-wrap;
`;

type AiActionsFeedProps = {
  parts: (ToolUIPart | DynamicToolUIPart)[];
  isLastMessageStreaming: boolean;
};

export const AiActionsFeed = ({
  parts,
  isLastMessageStreaming,
}: AiActionsFeedProps) => {
  const { t } = useLingui();
  const displayContext = useToolDisplayContext();

  const isWorking = parts.some((part) =>
    isThinkingStepPartActive(part, isLastMessageStreaming),
  );
  const failedCount = parts.filter(
    (part) => part.state === 'output-error',
  ).length;

  return (
    <StyledFeedContainer>
      <StyledHeader>
        {isWorking ? (
          <>
            <ThinkingOrbitLoaderIcon />
            <ShimmeringText>{t`Working on it…`}</ShimmeringText>
          </>
        ) : (
          <>
            <IconProgressCheck size={14} />
            {plural(parts.length, {
              one: '# action completed',
              other: '# actions completed',
            })}
          </>
        )}
        {!isWorking && failedCount > 0 && (
          <StyledFailureIndicator>
            <IconCircleX size={14} />
            {t`${failedCount} failed`}
          </StyledFailureIndicator>
        )}
      </StyledHeader>
      {parts.map((part, index) => {
        const isActive = isThinkingStepPartActive(part, isLastMessageStreaming);
        const ToolIcon = getToolIcon(getToolName(part));
        const { message, recordReferences } = getToolRecordOutput(part);
        const errorText =
          part.state === 'output-error' ? part.errorText : undefined;

        return (
          <ThinkingStepRowLayout
            key={part.toolCallId ?? index}
            icon={<ToolIcon size={14} />}
            label={getThinkingStepLabel({
              part,
              isActive,
              displayContext,
            })}
            isActive={isActive}
            details={
              isNonEmptyArray(recordReferences) ||
              isNonEmptyString(errorText) ? (
                <StyledDetails>
                  {isNonEmptyArray(recordReferences) && (
                    <ToolRecordsWidget
                      message={message ?? ''}
                      recordReferences={recordReferences}
                    />
                  )}
                  {isNonEmptyString(errorText) && (
                    <StyledErrorText>{errorText}</StyledErrorText>
                  )}
                </StyledDetails>
              ) : undefined
            }
          />
        );
      })}
    </StyledFeedContainer>
  );
};
