import { styled } from '@linaria/react';

import { DailyFinancePanel } from '@/daily-finance/components/DailyFinancePanel';
import { DAILY_FINANCE_THEME } from '@/daily-finance/constants/dailyFinanceTheme';
import {
  formatUsdCompact,
  formatUsdPrice,
  isBtcUp,
  useBtcMarket,
} from '@/daily-finance/hooks/useBtcMarket';

const StyledPriceRow = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const StyledPrice = styled.div`
  font-size: 36px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
`;

const StyledChange = styled.span<{ $up: boolean }>`
  color: ${({ $up }) =>
    $up ? DAILY_FINANCE_THEME.green : DAILY_FINANCE_THEME.red};
  font-size: 12px;
  letter-spacing: 0.08em;
`;

const StyledChart = styled.svg`
  height: 120px;
  margin-top: 4px;
  overflow: visible;
  width: 100%;
`;

const StyledMetrics = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 4px;
`;

const StyledMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StyledMetricKey = styled.span`
  color: ${DAILY_FINANCE_THEME.dim};
  font-size: 9px;
  letter-spacing: 0.12em;
`;

const StyledMetricValue = styled.span<{ $tone?: 'up' | 'down' | 'plain' }>`
  color: ${({ $tone }) =>
    $tone === 'up'
      ? DAILY_FINANCE_THEME.green
      : $tone === 'down'
        ? DAILY_FINANCE_THEME.red
        : DAILY_FINANCE_THEME.text};
  font-size: 12px;
`;

const StyledMuted = styled.div`
  color: ${DAILY_FINANCE_THEME.muted};
  font-size: 12px;
`;

const buildPath = (
  series: Array<{ timestampMs: number; priceUsd: number }>,
) => {
  if (series.length === 0) {
    return '';
  }
  const prices = series.map((point) => point.priceUsd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const width = 100;
  const height = 100;

  return series
    .map((point, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - ((point.priceUsd - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

export const BtcTerminalWidget = () => {
  const { snapshot, error, isLoading } = useBtcMarket();
  const up = isBtcUp(snapshot);
  const updatedLabel = snapshot
    ? snapshot.updatedAt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '--:--';

  return (
    <DailyFinancePanel
      title="BTC Terminal · 30-Day"
      footer={`Live · Updated ${updatedLabel} · CoinGecko`}
    >
      {isLoading && <StyledMuted>Loading market…</StyledMuted>}
      {error && <StyledMuted>{error}</StyledMuted>}
      {snapshot && (
        <>
          <StyledPriceRow>
            <StyledPrice>{formatUsdPrice(snapshot.priceUsd)}</StyledPrice>
            <StyledChange $up={up}>
              {up ? '▲' : '▼'} {Math.abs(snapshot.change24hPercent).toFixed(2)}%
              24H
            </StyledChange>
          </StyledPriceRow>
          <StyledChart viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={buildPath(snapshot.series)}
              fill="none"
              stroke={up ? DAILY_FINANCE_THEME.green : DAILY_FINANCE_THEME.red}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </StyledChart>
          <StyledMetrics>
            <StyledMetric>
              <StyledMetricKey>30D HIGH</StyledMetricKey>
              <StyledMetricValue $tone="up">
                {formatUsdPrice(snapshot.high30d)}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricKey>30D LOW</StyledMetricKey>
              <StyledMetricValue $tone="down">
                {formatUsdPrice(snapshot.low30d)}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricKey>MKT CAP</StyledMetricKey>
              <StyledMetricValue>
                {formatUsdCompact(snapshot.marketCapUsd)}
              </StyledMetricValue>
            </StyledMetric>
            <StyledMetric>
              <StyledMetricKey>24H VOL</StyledMetricKey>
              <StyledMetricValue>
                {formatUsdCompact(snapshot.volume24hUsd)}
              </StyledMetricValue>
            </StyledMetric>
          </StyledMetrics>
        </>
      )}
    </DailyFinancePanel>
  );
};
