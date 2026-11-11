import { styled } from '@linaria/react';

import { DailyFinancePanel } from '@/daily-finance/components/DailyFinancePanel';
import { DAILY_FINANCE_THEME } from '@/daily-finance/constants/dailyFinanceTheme';
import { useUsdCrosses } from '@/daily-finance/hooks/useUsdCrosses';

const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StyledRow = styled.div`
  align-items: baseline;
  display: grid;
  gap: 12px;
  grid-template-columns: 48px 1fr auto;
`;

const StyledCode = styled.span`
  color: ${DAILY_FINANCE_THEME.muted};
  font-size: 12px;
  letter-spacing: 0.12em;
`;

const StyledRate = styled.span`
  font-size: 22px;
  letter-spacing: 0.04em;
`;

const StyledChange = styled.span<{ $up: boolean }>`
  color: ${({ $up }) =>
    $up ? DAILY_FINANCE_THEME.green : DAILY_FINANCE_THEME.red};
  font-size: 12px;
  letter-spacing: 0.08em;
`;

const StyledMuted = styled.div`
  color: ${DAILY_FINANCE_THEME.muted};
  font-size: 12px;
`;

const formatRate = (code: string, rate: number) => {
  if (code === 'THB') {
    return rate.toFixed(3);
  }
  return rate.toFixed(4);
};

export const FxBoardWidget = () => {
  const { crosses, asOf, error, isLoading } = useUsdCrosses();

  return (
    <DailyFinancePanel
      title="FX Board · USD Crosses"
      footer={`ECB reference · ${asOf ?? '—'} · Frankfurter`}
    >
      {isLoading && <StyledMuted>Loading crosses…</StyledMuted>}
      {error && <StyledMuted>{error}</StyledMuted>}
      <StyledRows>
        {crosses.map((cross) => {
          const up = cross.changePercent >= 0;
          return (
            <StyledRow key={cross.code}>
              <StyledCode>{cross.code}</StyledCode>
              <StyledRate>
                1 USD = {formatRate(cross.code, cross.rate)}
              </StyledRate>
              <StyledChange $up={up}>
                {up ? '▲' : '▼'} {Math.abs(cross.changePercent).toFixed(2)}%
              </StyledChange>
            </StyledRow>
          );
        })}
      </StyledRows>
    </DailyFinancePanel>
  );
};
