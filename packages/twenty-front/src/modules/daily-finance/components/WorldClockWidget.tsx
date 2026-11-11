import { styled } from '@linaria/react';

import { DailyFinancePanel } from '@/daily-finance/components/DailyFinancePanel';
import { DAILY_FINANCE_THEME } from '@/daily-finance/constants/dailyFinanceTheme';
import { useWorldClocks } from '@/daily-finance/hooks/useWorldClocks';

const StyledHeroTime = styled.div`
  color: ${DAILY_FINANCE_THEME.text};
  font-size: 64px;
  font-weight: 500;
  letter-spacing: 0.04em;
  line-height: 1;
`;

const StyledHeroMeta = styled.div`
  color: ${DAILY_FINANCE_THEME.muted};
  font-size: 11px;
  letter-spacing: 0.16em;
`;

const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`;

const StyledRow = styled.div`
  align-items: center;
  color: ${DAILY_FINANCE_THEME.text};
  display: grid;
  font-size: 11px;
  gap: 10px;
  grid-template-columns: 10px 42px 1fr auto;
  letter-spacing: 0.08em;
`;

const StyledLed = styled.span<{ $isDay: boolean }>`
  background: ${({ $isDay }) =>
    $isDay ? DAILY_FINANCE_THEME.green : DAILY_FINANCE_THEME.dim};
  height: 8px;
  width: 8px;
`;

const StyledCode = styled.span`
  color: ${DAILY_FINANCE_THEME.muted};
`;

const StyledStatus = styled.span`
  color: ${DAILY_FINANCE_THEME.muted};
  text-align: right;
`;

export const WorldClockWidget = () => {
  const { bangkok, dateLine, others } = useWorldClocks();

  return (
    <DailyFinancePanel title="World Clock · Thailand">
      <StyledHeroTime>{bangkok.time}</StyledHeroTime>
      <StyledHeroMeta>
        {dateLine} · {bangkok.label}
      </StyledHeroMeta>
      <StyledRows>
        {others.map((city) => (
          <StyledRow key={city.code}>
            <StyledLed $isDay={city.isDay} aria-hidden />
            <StyledCode>{city.code}</StyledCode>
            <span>{city.label}</span>
            <StyledStatus>
              {city.isDay ? 'DAY' : 'NIGHT'} · {city.weekday} {city.time}
            </StyledStatus>
          </StyledRow>
        ))}
      </StyledRows>
    </DailyFinancePanel>
  );
};
