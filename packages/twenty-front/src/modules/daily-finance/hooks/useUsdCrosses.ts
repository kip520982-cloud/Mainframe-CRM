import { useEffect, useState } from 'react';

export type UsdCross = {
  code: string;
  rate: number;
  changePercent: number;
};

type UsdCrossesState = {
  crosses: UsdCross[];
  asOf: string | null;
  error: string | null;
  isLoading: boolean;
};

const CODES = ['THB', 'GBP', 'AUD', 'NZD'] as const;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const useUsdCrosses = () => {
  const [state, setState] = useState<UsdCrossesState>({
    crosses: [],
    asOf: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const prior = new Date();
        prior.setUTCDate(prior.getUTCDate() - 1);
        const priorDate = toIsoDate(prior);

        const [latestResponse, priorResponse] = await Promise.all([
          fetch(
            `https://api.frankfurter.app/latest?from=USD&to=${CODES.join(',')}`,
          ),
          fetch(
            `https://api.frankfurter.app/${priorDate}?from=USD&to=${CODES.join(',')}`,
          ),
        ]);

        if (!latestResponse.ok) {
          throw new Error(`Frankfurter ${latestResponse.status}`);
        }

        const latest = (await latestResponse.json()) as {
          date: string;
          rates: Record<string, number>;
        };
        const priorRates = priorResponse.ok
          ? (
              (await priorResponse.json()) as {
                rates: Record<string, number>;
              }
            ).rates
          : {};

        const crosses = CODES.map((code) => {
          const rate = latest.rates[code] ?? 0;
          const priorRate = priorRates[code] ?? rate;
          const changePercent =
            priorRate === 0 ? 0 : ((rate - priorRate) / priorRate) * 100;
          return { code, rate, changePercent };
        });

        if (isCancelled) {
          return;
        }

        setState({
          crosses,
          asOf: latest.date,
          error: null,
          isLoading: false,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setState({
          crosses: [],
          asOf: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'FX fetch failed',
        });
      }
    };

    void load();
    const intervalId = window.setInterval(() => void load(), 60 * 60_000);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
};
