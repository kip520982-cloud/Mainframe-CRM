import { styled } from '@linaria/react';

import { DailyFinancePanel } from '@/daily-finance/components/DailyFinancePanel';
import { DAILY_FINANCE_THEME } from '@/daily-finance/constants/dailyFinanceTheme';
import { trackerConfigState } from '@/tracker-overlay/states/trackerConfigState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';

const DAY_MS = 86400000;

const StyledStartRow = styled.div`
  align-items: center;
  color: ${DAILY_FINANCE_THEME.muted};
  display: flex;
  font-size: 10px;
  gap: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StyledDateInput = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: ${DAILY_FINANCE_THEME.text};
  color-scheme: dark;
  font: inherit;
  font-size: 11px;
  margin-left: auto;
  outline: none;
  padding: 4px 6px;
`;

const StyledDay = styled.div`
  font-size: 28px;
  font-weight: 500;
  letter-spacing: 0.04em;

  small {
    color: ${DAILY_FINANCE_THEME.muted};
    font-size: 14px;
    margin-left: 6px;
  }
`;

const StyledBar = styled.div`
  background: rgba(255, 255, 255, 0.08);
  height: 4px;
  position: relative;
  width: 100%;
`;

const StyledFill = styled.div`
  background: ${DAILY_FINANCE_THEME.text};
  height: 100%;
`;

const StyledNext = styled.div`
  border: 1px solid ${DAILY_FINANCE_THEME.red};
  color: ${DAILY_FINANCE_THEME.text};
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 4px;
  letter-spacing: 0.04em;
  padding: 10px;
`;

const StyledNextKey = styled.span`
  color: ${DAILY_FINANCE_THEME.red};
  font-size: 10px;
  letter-spacing: 0.16em;
`;

const StyledDim = styled.span`
  color: ${DAILY_FINANCE_THEME.muted};
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StyledRow = styled.div<{ $status: 'past' | 'now' | 'future' }>`
  align-items: center;
  color: ${({ $status }) =>
    $status === 'past' ? DAILY_FINANCE_THEME.dim : DAILY_FINANCE_THEME.text};
  display: grid;
  font-size: 11px;
  gap: 8px;
  grid-template-columns: 10px 1fr auto;
  letter-spacing: 0.04em;
`;

const StyledLed = styled.span<{ $status: 'past' | 'now' | 'future' }>`
  background: ${({ $status }) =>
    $status === 'past'
      ? DAILY_FINANCE_THEME.green
      : $status === 'now'
        ? DAILY_FINANCE_THEME.red
        : DAILY_FINANCE_THEME.dim};
  height: 8px;
  width: 8px;
`;

const toDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (isoDate: string, days: number) => {
  const date = toDate(isoDate);
  date.setDate(date.getDate() + days);
  return date;
};

const formatDay = (date: Date) =>
  date
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toUpperCase();

export const VisaTrackerWidget = () => {
  const [config, setConfig] = useAtomState(trackerConfigState);
  const milestones = [...config.milestones].sort(
    (first, second) => first.offsetDays - second.offsetDays,
  );
  const dayNumber = Math.max(
    0,
    Math.floor((Date.now() - toDate(config.startDate).getTime()) / DAY_MS),
  );
  const clampedDay = Math.min(dayNumber, config.totalDays);
  const nextIndex = milestones.findIndex(
    (milestone) => milestone.offsetDays >= dayNumber,
  );
  const next = nextIndex >= 0 ? milestones[nextIndex] : null;
  const daysUntilNext = next
    ? Math.max(
        0,
        Math.ceil(
          (addDays(config.startDate, next.offsetDays).getTime() - Date.now()) /
            DAY_MS,
        ),
      )
    : 0;

  return (
    <DailyFinancePanel
      title="Thai ED Visa · Year Tracker"
      footer="Extension dates are approximate · confirm with immigration · 90-day reporting separate"
    >
      <StyledStartRow>
        <span>Visa start</span>
        <StyledDateInput
          type="date"
          value={config.startDate}
          onChange={(event) => {
            if (event.target.value) {
              setConfig({ ...config, startDate: event.target.value });
            }
          }}
        />
      </StyledStartRow>
      <StyledDay>
        DAY {clampedDay}
        <small>/ {config.totalDays} OF VISA YEAR</small>
      </StyledDay>
      <StyledBar>
        <StyledFill
          style={{ width: `${(clampedDay / config.totalDays) * 100}%` }}
        />
      </StyledBar>
      {next ? (
        <StyledNext>
          <StyledNextKey>NEXT MILESTONE</StyledNextKey>
          <div>
            {next.name}
            {next.note ? ` · ${next.note}` : ''}
          </div>
          <StyledDim>
            {daysUntilNext === 0
              ? 'DUE NOW'
              : `IN ${daysUntilNext} DAYS · ${formatDay(addDays(config.startDate, next.offsetDays))}`}
          </StyledDim>
        </StyledNext>
      ) : null}
      <StyledList>
        {milestones.map((milestone, index) => {
          const status =
            milestone.offsetDays < dayNumber
              ? 'past'
              : index === nextIndex
                ? 'now'
                : 'future';
          return (
            <StyledRow key={milestone.id} $status={status}>
              <StyledLed $status={status} aria-hidden />
              <span>
                {milestone.name}
                {milestone.note ? ` ${milestone.note}` : ''}
              </span>
              <StyledDim>
                {formatDay(addDays(config.startDate, milestone.offsetDays))}
              </StyledDim>
            </StyledRow>
          );
        })}
      </StyledList>
    </DailyFinancePanel>
  );
};
