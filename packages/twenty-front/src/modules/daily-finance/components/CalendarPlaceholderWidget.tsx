import { styled } from '@linaria/react';

import { DailyFinancePanel } from '@/daily-finance/components/DailyFinancePanel';

const StyledPlaceholder = styled.div`
  background: #f4f6f8;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #6b7280;
  flex: 1 1 auto;
  font-size: 11px;
  letter-spacing: 0.12em;
  min-height: 180px;
  padding: 12px;
  text-transform: uppercase;
`;

export const CalendarPlaceholderWidget = () => (
  <DailyFinancePanel
    title="Calendar · Google Preview"
    footer="Thailand holidays · point this at your own Google Calendar"
  >
    <StyledPlaceholder>Calendar · Google Preview</StyledPlaceholder>
  </DailyFinancePanel>
);
