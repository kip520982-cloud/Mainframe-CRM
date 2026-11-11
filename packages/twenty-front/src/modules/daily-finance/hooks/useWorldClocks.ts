import { useEffect, useState } from 'react';

export type WorldClockCity = {
  code: string;
  label: string;
  timeZone: string;
};

export type WorldClockReading = WorldClockCity & {
  time: string;
  weekday: string;
  isDay: boolean;
};

const CITIES: WorldClockCity[] = [
  { code: 'BKK', label: 'BANGKOK', timeZone: 'Asia/Bangkok' },
  { code: 'LON', label: 'LONDON', timeZone: 'Europe/London' },
  { code: 'SYD', label: 'SYDNEY', timeZone: 'Australia/Sydney' },
  { code: 'AKL', label: 'AUCKLAND', timeZone: 'Pacific/Auckland' },
];

const readCity = (city: WorldClockCity, now: Date): WorldClockReading => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: city.timeZone,
    }).format(now),
  );
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: city.timeZone,
  }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: city.timeZone,
  })
    .format(now)
    .toUpperCase();

  return {
    ...city,
    time,
    weekday,
    isDay: hour >= 6 && hour < 18,
  };
};

export const useWorldClocks = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const readings = CITIES.map((city) => readCity(city, now));
  const bangkok = readings[0];
  const dateLine = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: bangkok.timeZone,
  })
    .format(now)
    .toUpperCase();

  return {
    bangkok,
    dateLine,
    others: readings.slice(1),
  };
};
