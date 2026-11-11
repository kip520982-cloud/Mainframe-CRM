import { useState } from 'react';

import { styled } from '@linaria/react';

import { DailyFinancePanel } from '@/daily-finance/components/DailyFinancePanel';
import { DAILY_FINANCE_THEME } from '@/daily-finance/constants/dailyFinanceTheme';
import { useLocalReminders } from '@/daily-finance/hooks/useLocalReminders';

const StyledCount = styled.span`
  color: ${DAILY_FINANCE_THEME.muted};
  font-size: 10px;
  letter-spacing: 0.14em;
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StyledRow = styled.label`
  align-items: flex-start;
  color: ${DAILY_FINANCE_THEME.text};
  cursor: pointer;
  display: grid;
  font-size: 12px;
  gap: 10px;
  grid-template-columns: 16px 1fr 16px;
  letter-spacing: 0.02em;
  line-height: 1.35;
`;

const StyledCheckbox = styled.input`
  accent-color: ${DAILY_FINANCE_THEME.green};
  margin-top: 2px;
`;

const StyledRemove = styled.button`
  background: none;
  border: none;
  color: ${DAILY_FINANCE_THEME.dim};
  cursor: pointer;
  font: inherit;
  padding: 0;

  &:hover {
    color: ${DAILY_FINANCE_THEME.text};
  }
`;

const StyledInput = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: ${DAILY_FINANCE_THEME.text};
  font: inherit;
  font-size: 12px;
  margin-top: 4px;
  outline: none;
  padding: 8px 10px;
  width: 100%;

  &::placeholder {
    color: ${DAILY_FINANCE_THEME.dim};
  }
`;

export const PersonalRemindersWidget = () => {
  const { reminders, openCount, addReminder, toggleReminder, removeReminder } =
    useLocalReminders();
  const [draft, setDraft] = useState('');

  return (
    <DailyFinancePanel
      title="Personal Reminders"
      footer="Saved locally in this widget"
    >
      <StyledCount>{openCount} OPEN</StyledCount>
      <StyledList>
        {reminders.map((reminder) => (
          <StyledRow key={reminder.id}>
            <StyledCheckbox
              type="checkbox"
              checked={reminder.isDone}
              onChange={() => toggleReminder(reminder.id)}
            />
            <span
              style={{
                textDecoration: reminder.isDone ? 'line-through' : 'none',
                color: reminder.isDone
                  ? DAILY_FINANCE_THEME.dim
                  : DAILY_FINANCE_THEME.text,
              }}
            >
              {reminder.text}
            </span>
            <StyledRemove
              type="button"
              aria-label="Remove reminder"
              onClick={() => removeReminder(reminder.id)}
            >
              ×
            </StyledRemove>
          </StyledRow>
        ))}
      </StyledList>
      <StyledInput
        value={draft}
        placeholder="Type a reminder + Enter"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            addReminder(draft);
            setDraft('');
          }
        }}
      />
    </DailyFinancePanel>
  );
};
