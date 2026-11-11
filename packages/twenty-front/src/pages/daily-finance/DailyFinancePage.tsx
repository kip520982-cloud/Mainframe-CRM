import { styled } from '@linaria/react';

import { BtcTerminalWidget } from '@/daily-finance/components/BtcTerminalWidget';
import { CalendarPlaceholderWidget } from '@/daily-finance/components/CalendarPlaceholderWidget';
import { FxBoardWidget } from '@/daily-finance/components/FxBoardWidget';
import { PersonalRemindersWidget } from '@/daily-finance/components/PersonalRemindersWidget';
import { VisaTrackerWidget } from '@/daily-finance/components/VisaTrackerWidget';
import { WorldClockWidget } from '@/daily-finance/components/WorldClockWidget';
import { DAILY_FINANCE_THEME } from '@/daily-finance/constants/dailyFinanceTheme';
import { doNotTranslate } from 'twenty-shared/i18n';

const StyledPage = styled.div`
  background:
    linear-gradient(${DAILY_FINANCE_THEME.grid} 1px, transparent 1px) 0 0 /
      100% 28px,
    linear-gradient(90deg, ${DAILY_FINANCE_THEME.grid} 1px, transparent 1px) 0
      0 / 28px 100%,
    ${DAILY_FINANCE_THEME.background};
  color: ${DAILY_FINANCE_THEME.text};
  height: 100%;
  overflow: auto;
  padding: 20px;
  width: 100%;
`;

const StyledHeader = styled.div`
  color: ${DAILY_FINANCE_THEME.muted};
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.22em;
  margin-bottom: 16px;
  text-transform: uppercase;
`;

const StyledGrid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const DailyFinancePage = () => (
  <StyledPage>
    <StyledHeader>{doNotTranslate('Daily Finance & Personal')}</StyledHeader>
    <StyledGrid>
      <WorldClockWidget />
      <BtcTerminalWidget />
      <FxBoardWidget />
      <VisaTrackerWidget />
      <CalendarPlaceholderWidget />
      <PersonalRemindersWidget />
    </StyledGrid>
  </StyledPage>
);
