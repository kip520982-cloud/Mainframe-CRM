import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme';

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
  const { t } = useLingui();

  return (
    <StyledContainer>
      <StyledTitle>{t`ElevenLabs UI components`}</StyledTitle>
      <div>
        {t`Shadcn-based components for rapid development of ElevenLabs voice agent frontends. Source:`}{' '}
        <StyledLink
          href="https://ui.elevenlabs.io/docs"
          target="_blank"
          rel="noreferrer"
        >
          ui.elevenlabs.io/docs
        </StyledLink>
      </div>
      <div>
        <StyledSectionTitle>{t`Overview`}</StyledSectionTitle>
        <div>
          {t`ElevenLabs UI is a component library in the style of shadcn/ui for building voice agent frontends on the ElevenLabs platform. Components are installed directly into the project source, so the code is fully owned and customizable.`}
        </div>
      </div>
      <div>
        <StyledSectionTitle>{t`Installation`}</StyledSectionTitle>
        <div>{t`Agents CLI:`}</div>
        <StyledCodeBlock>
          npx @elevenlabs/cli@latest components add orb
        </StyledCodeBlock>
        <div>{t`shadcn:`}</div>
        <StyledCodeBlock>
          npx shadcn@latest add https://ui.elevenlabs.io/r/orb.json
        </StyledCodeBlock>
      </div>
      <div>
        <StyledSectionTitle>{t`Prerequisites`}</StyledSectionTitle>
        <StyledList>
          <li>{t`Node.js version 18 or later`}</li>
          <li>{t`A Next.js project`}</li>
          <li>
            {t`shadcn/ui set up in the project — running any install command sets it up automatically if it is not already`}
          </li>
        </StyledList>
      </div>
      <div>
        <StyledSectionTitle>{t`How installs work`}</StyledSectionTitle>
        <div>
          {t`Both CLIs achieve the same result: the component code and any needed dependencies are downloaded into the project, usually under the components folder. A confirmation appears in the terminal once the files are added, and the component is ready to use.`}
        </div>
      </div>
      <div>
        <StyledSectionTitle>{t`Known components`}</StyledSectionTitle>
        <StyledTable>
          <tbody>
            <tr>
              <StyledCell>orb</StyledCell>
              <StyledCell>
                {t`Animated voice-agent orb visualization`}
              </StyledCell>
            </tr>
          </tbody>
        </StyledTable>
      </div>
    </StyledContainer>
  );
};
