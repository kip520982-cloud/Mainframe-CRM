import { styled } from '@linaria/react';
import { useCallback, useEffect, useState } from 'react';

import { CallConsole } from '@/earpiece/components/CallConsole';
import { Logo } from '@/earpiece/components/Logo';
import { NewCallForm } from '@/earpiece/components/NewCallForm';
import { ProfileForm } from '@/earpiece/components/ProfileForm';
import { EP_API } from '@/earpiece/lib/api';
import type {
  CallRow,
  Card,
  Fact,
  Line,
  Profile,
} from '@/earpiece/lib/types';

import '@/earpiece/styles/earpiece.css';

const StyledRoot = styled.div`
  background: var(--color-ink);
  color: var(--color-text);
  height: 100%;
  min-height: calc(100vh - 32px);
  overflow-y: auto;
`;

type ConsoleData = {
  call: CallRow;
  lines: Line[];
  cards: Card[];
  facts: Fact[];
};

type View = { name: 'home' } | { name: 'console'; callId: string };

const MODE_LABEL: Record<CallRow['mode'], string> = {
  sales: 'Sales',
  interview: 'Interview',
  recruit_candidate: 'Candidate',
  recruit_client: 'Client',
};

export const EarpiecePage = () => {
  const [view, setView] = useState<View>({ name: 'home' });
  const [tab, setTab] = useState<'call' | 'profile'>('call');
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [consoleData, setConsoleData] = useState<ConsoleData | null>(null);
  const [loadingConsole, setLoadingConsole] = useState(false);

  const loadCalls = useCallback(async () => {
    const res = await fetch(`${EP_API}/calls`);
    if (!res.ok) {return;}
    const data = await res.json();
    setCalls(data.calls ?? []);
  }, []);

  useEffect(() => {
    if (view.name !== 'home') {return;}
    void loadCalls();
    if (tab === 'profile' && profile === null) {
      void fetch(`${EP_API}/profile`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.profile) {setProfile(data.profile);}
        })
        .catch(() => {});
    }
  }, [view, tab, profile, loadCalls]);

  const openCall = useCallback(
    async (callId: string) => {
      setLoadingConsole(true);
      setView({ name: 'console', callId });
      try {
        const res = await fetch(`${EP_API}/calls/${callId}`);
        if (!res.ok) {throw new Error('not found');}
        const data = await res.json();
        setConsoleData({
          call: data.call,
          lines: data.lines ?? [],
          cards: data.cards ?? [],
          facts: data.facts ?? [],
        });
      } catch {
        setView({ name: 'home' });
      } finally {
        setLoadingConsole(false);
      }
    },
    [],
  );

  const deleteCall = useCallback(
    async (callId: string) => {
      await fetch(`${EP_API}/calls/${callId}`, { method: 'DELETE' });
      void loadCalls();
    },
    [loadCalls],
  );

  if (view.name === 'console') {
    return (
      <StyledRoot className="ep-root">
        {consoleData !== null && view.callId === consoleData.call.id ? (
          <CallConsole
            initialCall={consoleData.call}
            initialLines={consoleData.lines}
            initialCards={consoleData.cards}
            initialFacts={consoleData.facts}
            onExit={() => {
              setConsoleData(null);
              setView({ name: 'home' });
              void loadCalls();
            }}
            onOpenCall={openCall}
          />
        ) : (
          <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted">
            {loadingConsole ? 'Loading call…' : 'Call not found.'}
          </div>
        )}
      </StyledRoot>
    );
  }

  return (
    <StyledRoot className="ep-root">
      <div className="mx-auto max-w-6xl px-6 pt-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft pb-5">
          <Logo />
          <div className="flex gap-2">
            <button
              onClick={() => setTab('call')}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                tab === 'call'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line bg-surface text-muted hover:border-faint'
              }`}
            >
              New call
            </button>
            <button
              onClick={() => setTab('profile')}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                tab === 'profile'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line bg-surface text-muted hover:border-faint'
              }`}
            >
              What you sell
            </button>
          </div>
        </header>

        {tab === 'call' && (
          <>
            <div className="mx-auto max-w-xl pt-6">
              <h1 className="text-2xl font-semibold tracking-tight">
                Who are you speaking to?
              </h1>
              <p className="mt-2 text-muted">
                A name and a company is enough. The more you give it, the
                sharper the brief.
              </p>
              <NewCallForm onCreated={(call) => void openCall(call.id)} />
            </div>

            {calls.length > 0 && (
              <div className="mx-auto mt-14 max-w-xl">
                <h2 className="text-sm font-semibold tracking-wide text-faint uppercase">
                  Recent calls
                </h2>
                <ul className="mt-3 space-y-2">
                  {calls.map((call) => (
                    <li
                      key={call.id}
                      className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {call.prospect_name || call.company || 'Untitled call'}
                        </p>
                        <p className="truncate text-xs text-faint">
                          {MODE_LABEL[call.mode]} ·{' '}
                          {new Date(call.created_at).toLocaleString()}
                          {call.status === 'done' ? ' · done' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => void openCall(call.id)}
                        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-brand hover:text-brand"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => void deleteCall(call.id)}
                        className="shrink-0 text-xs text-faint transition hover:text-warning"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {tab === 'profile' && (
          <div className="mx-auto max-w-xl pt-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              What you sell
            </h1>
            <p className="mt-2 text-muted">
              Fill this in once. Every brief and every bit of live advice is
              written against it, so this is the single biggest thing you can do
              to make Earpiece useful.
            </p>
            {profile !== null ? (
              <ProfileForm initial={profile} />
            ) : (
              <p className="mt-8 text-sm text-faint">Loading…</p>
            )}
          </div>
        )}
      </div>
    </StyledRoot>
  );
};
