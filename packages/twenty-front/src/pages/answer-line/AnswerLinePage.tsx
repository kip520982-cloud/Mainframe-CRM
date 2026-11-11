import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';
import { doNotTranslate } from 'twenty-shared/i18n';

const StyledContainer = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  height: 100%;
  max-width: 860px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[6]};
  width: 100%;
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledSectionTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledCodeBlock = styled.pre`
  background: ${themeCssVariables.background.secondary};
  border-radius: ${themeCssVariables.border.radius.sm};
  font-family: ${themeCssVariables.code.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  overflow-x: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledList = styled.ul`
  margin: 0;
  padding-left: ${themeCssVariables.spacing[5]};
`;

const StyledTable = styled.table`
  border-collapse: collapse;
`;

const StyledCell = styled.td`
  border: 1px solid ${themeCssVariables.border.color.light};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledLink = styled.a`
  color: ${themeCssVariables.color.blue};
`;

export const AnswerLinePage = () => {
  return (
    <StyledContainer>
      <StyledTitle>{doNotTranslate('ElevenLabs UI components')}</StyledTitle>
      <div>
        {doNotTranslate(
          'Shadcn-based components for rapid development of ElevenLabs voice agent frontends. Source:',
        )}{' '}
        <StyledLink
          href="https://ui.elevenlabs.io/docs"
          target="_blank"
          rel="noreferrer"
        >
          ui.elevenlabs.io/docs
        </StyledLink>
      </div>
      <div>
        <StyledSectionTitle>{doNotTranslate('Overview')}</StyledSectionTitle>
        <div>
          {doNotTranslate(
            'ElevenLabs UI is a component library in the style of shadcn/ui for building voice agent frontends on the ElevenLabs platform. Components are installed directly into the project source, so the code is fully owned and customizable.',
          )}
        </div>
      </div>
      <div>
        <StyledSectionTitle>{doNotTranslate('Installation')}</StyledSectionTitle>
        <div>{doNotTranslate('Agents CLI:')}</div>
        <StyledCodeBlock>
          npx @elevenlabs/cli@latest components add orb
        </StyledCodeBlock>
        <div>{doNotTranslate('shadcn:')}</div>
        <StyledCodeBlock>
          npx shadcn@latest add https://ui.elevenlabs.io/r/orb.json
        </StyledCodeBlock>
      </div>
      <div>
        <StyledSectionTitle>
          {doNotTranslate('Prerequisites')}
        </StyledSectionTitle>
        <StyledList>
          <li>{doNotTranslate('Node.js version 18 or later')}</li>
          <li>{doNotTranslate('A Next.js project')}</li>
          <li>
            {doNotTranslate(
              'shadcn/ui set up in the project — running any install command sets it up automatically if it is not already',
            )}
          </li>
        </StyledList>
      </div>
      <div>
        <StyledSectionTitle>
          {doNotTranslate('How installs work')}
        </StyledSectionTitle>
        <div>
          {doNotTranslate(
            'Both CLIs achieve the same result: the component code and any needed dependencies are downloaded into the project, usually under the components folder. A confirmation appears in the terminal once the files are added, and the component is ready to use.',
          )}
        </div>
      </div>
      <div>
        <StyledSectionTitle>
          {doNotTranslate('Known components')}
        </StyledSectionTitle>
        <StyledTable>
          <tbody>
            <tr>
              <StyledCell>orb</StyledCell>
              <StyledCell>
                {doNotTranslate('Animated voice-agent orb visualization')}
              </StyledCell>
            </tr>
          </tbody>
        </StyledTable>
      </div>
    </StyledContainer>
  );
};
