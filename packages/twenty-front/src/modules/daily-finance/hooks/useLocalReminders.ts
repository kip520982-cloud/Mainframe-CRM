import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mainframe.daily-finance.reminders';

export type LocalReminder = {
  id: string;
  text: string;
  isDone: boolean;
};

const DEFAULT_REMINDERS: LocalReminder[] = [
  {
    id: 'passport-tm30',
    text: 'Passport + TM30 ready before next visa extension',
    isDone: false,
  },
  {
    id: '90-day',
    text: '90-day address report at immigration',
    isDone: false,
  },
  {
    id: 'tuition',
    text: 'Tuition / enrollment letter for visa file',
    isDone: false,
  },
];

const readReminders = (): LocalReminder[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_REMINDERS;
    }
    const parsed = JSON.parse(raw) as LocalReminder[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
};

export const useLocalReminders = () => {
  const [reminders, setReminders] = useState<LocalReminder[]>(readReminders);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders]);

  const addReminder = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setReminders((current) => [
      ...current,
      { id: crypto.randomUUID(), text: trimmed, isDone: false },
    ]);
  };

  const toggleReminder = (id: string) =>
    setReminders((current) =>
      current.map((reminder) =>
        reminder.id === id
          ? { ...reminder, isDone: !reminder.isDone }
          : reminder,
      ),
    );

  const removeReminder = (id: string) =>
    setReminders((current) =>
      current.filter((reminder) => reminder.id !== id),
    );

  return {
    reminders,
    openCount: reminders.filter((reminder) => !reminder.isDone).length,
    addReminder,
    toggleReminder,
    removeReminder,
  };
};
