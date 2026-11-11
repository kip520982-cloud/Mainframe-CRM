import { type ReactNode } from 'react';

import { styled } from '@linaria/react';

import { DAILY_FINANCE_THEME } from '@/daily-finance/constants/dailyFinanceTheme';

const StyledPanel = styled.section`
  background:
    linear-gradient(${DAILY_FINANCE_THEME.grid} 1px, transparent 1px) 0 0 /
      100% 22px,
    linear-gradient(90deg, ${DAILY_FINANCE_THEME.grid} 1px, transparent 1px) 0
      0 / 22px 100%,
    ${DAILY_FINANCE_THEME.panel};
  border: 1px solid ${DAILY_FINANCE_THEME.border};
  color: ${DAILY_FINANCE_THEME.text};
  display: flex;
  flex-direction: column;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  gap: 10px;
  min-height: 0;
  padding: 14px;
  position: relative;
`;

const StyledHeader = styled.div`
  align-items: center;
  color: ${DAILY_FINANCE_THEME.muted};
  display: flex;
  font-size: 10px;
  gap: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const StyledTitle = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledStatusDot = styled.span`
  background: ${DAILY_FINANCE_THEME.green};
  border-radius: 50%;
  flex: none;
  height: 6px;
  width: 6px;
`;

const StyledBody = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
`;

const StyledFooter = styled.div`
  color: ${DAILY_FINANCE_THEME.dim};
  font-size: 9px;
  letter-spacing: 0.12em;
  margin-top: auto;
  text-transform: uppercase;
`;

type DailyFinancePanelProps = {
  title: string;
  footer?: string;
  children: ReactNode;
};

export const DailyFinancePanel = ({
  title,
  footer,
  children,
}: DailyFinancePanelProps) => (
  <StyledPanel>
    <StyledHeader>
      <StyledTitle>{title}</StyledTitle>
      <StyledStatusDot aria-hidden />
    </StyledHeader>
    <StyledBody>{children}</StyledBody>
    {footer ? <StyledFooter>{footer}</StyledFooter> : null}
  </StyledPanel>
);
