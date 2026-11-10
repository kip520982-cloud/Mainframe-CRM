import { useEffect, useState } from 'react';

import { isTrackerOverlayOpenState } from '@/tracker-overlay/states/isTrackerOverlayOpenState';
import { trackerConfigState } from '@/tracker-overlay/states/trackerConfigState';
import {
  type TrackerConfig,
  type TrackerMilestone,
} from '@/tracker-overlay/types/TrackerConfig';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useStore } from 'jotai';
import { IconPencil, IconPlus, IconTrash, IconX } from 'twenty-ui/icon';

const DAY_MS = 86400000;

// fixed palette on purpose: the overlay keeps the dark terminal look of the
// source dashboard widget instead of following the CRM theme
const StyledBackdrop = styled.div`
  background: rgba(0, 0, 0, 0.55);
  inset: 0;
  position: fixed;
  z-index: 1000;
`;

const StyledPanel = styled.div`
  background:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px) 0 0 / 100% 22px,
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px) 0 0 / 22px 100%,
    #0d0d0d;
  border-left: 1px solid #1c1c1c;
  bottom: 0;
  color: #eeeeee;
  display: flex;
  flex-direction: column;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  max-width: 100vw;
  padding: 16px;
  position: fixed;
  right: 0;
  top: 0;
  width: 380px;
  z-index: 1001;
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;

const StyledTitle = styled.span`
  color: #8a8a8a;
  flex: 1 1 auto;
  font-size: 10px;
  letter-spacing: 0.24em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const StyledTitleInput = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #eeeeee;
  flex: 1 1 auto;
  font: inherit;
  font-size: 10px;
  letter-spacing: 0.24em;
  min-width: 0;
  outline: none;
  padding: 4px 6px;
  text-transform: uppercase;
`;

const StyledIconButton = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: #8a8a8a;
  cursor: pointer;
  display: flex;
  flex: none;
  padding: 4px;

  &:hover {
    color: #eeeeee;
  }
`;

const StyledStartRow = styled.div`
  align-items: center;
  color: #8a8a8a;
  display: flex;
  font-size: 9px;
  gap: 8px;
  letter-spacing: 0.18em;
  padding-top: 12px;
  text-transform: uppercase;
`;

const StyledDateInput = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #eeeeee;
  color-scheme: dark;
  font: inherit;
  font-size: 10px;
  margin-left: auto;
  outline: none;
  padding: 4px 6px;
`;

const StyledHero = styled.div`
  padding: 14px 0 10px;
`;

const StyledDay = styled.div`
  font-size: 26px;
  letter-spacing: 0.02em;

  small {
    color: #8a8a8a;
    font-size: 10px;
    letter-spacing: 0.18em;
    margin-left: 6px;
  }
`;

const StyledBar = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.14);
  height: 8px;
  margin-top: 8px;
  position: relative;
`;

const StyledFill = styled.div`
  background: #3fbf6f;
  height: 100%;
`;

const StyledMarker = styled.div`
  background: rgba(255, 255, 255, 0.35);
  height: 12px;
  position: absolute;
  top: -3px;
  width: 1px;
`;

const StyledNext = styled.div<{ tone: 'next' | 'done' }>`
  border: 1px solid
    ${({ tone }) =>
      tone === 'done' ? 'rgba(63, 191, 111, 0.55)' : 'rgba(224, 75, 52, 0.55)'};
  font-size: 10px;
  letter-spacing: 0.08em;
  line-height: 1.7;
  margin-top: 12px;
  padding: 8px 10px;
`;

const StyledNextKey = styled.div<{ tone: 'next' | 'done' }>`
  color: ${({ tone }) => (tone === 'done' ? '#3fbf6f' : '#e04b34')};
  font-size: 8px;
  letter-spacing: 0.2em;
`;

const StyledDim = styled.div`
  color: #8a8a8a;
`;

const StyledList = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex: 1 1 auto;
  margin-top: 12px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
`;

const StyledRow = styled.div<{ status: 'past' | 'now' | 'future' }>`
  align-items: baseline;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  font-size: 10px;
  gap: 8px;
  letter-spacing: 0.05em;
  padding: 8px 2px;
`;

const StyledLed = styled.span<{ status: 'past' | 'now' | 'future' }>`
  align-self: center;
  background: ${({ status }) =>
    status === 'past'
      ? '#3fbf6f'
      : status === 'now'
        ? '#e04b34'
        : 'rgba(255, 255, 255, 0.12)'};
  box-shadow: ${({ status }) =>
    status === 'now' ? '0 0 6px rgba(224, 75, 52, 0.5)' : 'none'};
  flex: none;
  height: 7px;
  width: 7px;
`;

const StyledName = styled.span<{ status: 'past' | 'now' | 'future' }>`
  color: ${({ status }) =>
    status === 'past' ? '#5a5a5a' : status === 'now' ? '#e04b34' : '#eeeeee'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledNote = styled.span<{ dimmed: boolean }>`
  color: ${({ dimmed }) => (dimmed ? '#5a5a5a' : '#8a8a8a')};
`;

const StyledWhen = styled.span`
  color: #5a5a5a;
  font-size: 9px;
  letter-spacing: 0.08em;
  margin-left: auto;
  white-space: nowrap;
`;

const StyledEditRow = styled.div`
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  gap: 6px;
  padding: 6px 2px;
`;

const StyledEditInput = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #eeeeee;
  font: inherit;
  font-size: 10px;
  min-width: 0;
  outline: none;
  padding: 5px 6px;

  &:focus {
    border-color: rgba(63, 191, 111, 0.6);
  }
`;

const StyledEditName = styled(StyledEditInput)`
  flex: 1 1 auto;
`;

const StyledEditDay = styled(StyledEditInput)`
  flex: none;
  width: 52px;
`;

const StyledEditNote = styled(StyledEditInput)`
  flex: none;
  width: 84px;
`;

const StyledAddButton = styled.button`
  align-items: center;
  background: none;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: #8a8a8a;
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 9px;
  gap: 6px;
  justify-content: center;
  letter-spacing: 0.18em;
  margin-top: 10px;
  padding: 7px;
  text-transform: uppercase;
  width: 100%;

  &:hover {
    color: #eeeeee;
  }
`;

const StyledFoot = styled.div`
  color: #5a5a5a;
  flex: none;
  font-size: 8px;
  letter-spacing: 0.16em;
  padding-top: 10px;
  text-transform: uppercase;
`;

const toDate = (iso: string) => new Date(`${iso}T12:00:00`);

const addDays = (iso: string, days: number) => {
  const date = toDate(iso);
  date.setDate(date.getDate() + days);
  return date;
};

const formatDay = (date: Date) =>
  date
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toUpperCase();

export const TrackerOverlay = () => {
  const { t } = useLingui();
  const store = useStore();
  const isOpen = useAtomStateValue(isTrackerOverlayOpenState);
  const [config, setConfig] = useAtomState(trackerConfigState);
  const [isEditing, setIsEditing] = useState(false);

  const close = () => {
    setIsEditing(false);
    store.set(isTrackerOverlayOpenState.atom, false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        store.set(isTrackerOverlayOpenState.atom, false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, store]);

  if (!isOpen) return null;

  const updateConfig = (patch: Partial<TrackerConfig>) =>
    setConfig({ ...config, ...patch });

  const updateMilestone = (id: string, patch: Partial<TrackerMilestone>) =>
    updateConfig({
      milestones: config.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, ...patch } : milestone,
      ),
    });

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

  return (
    <>
      <StyledBackdrop onClick={close} />
      <StyledPanel>
        <StyledHeader>
          {isEditing ? (
            <StyledTitleInput
              value={config.label}
              onChange={(event) => updateConfig({ label: event.target.value })}
            />
          ) : (
            <StyledTitle>{config.label}</StyledTitle>
          )}
          <StyledIconButton
            aria-label={t`Edit tracker`}
            onClick={() => setIsEditing(!isEditing)}
          >
            <IconPencil size={14} />
          </StyledIconButton>
          <StyledIconButton aria-label={t`Close`} onClick={close}>
            <IconX size={14} />
          </StyledIconButton>
        </StyledHeader>

        <StyledStartRow>
          <span>{t`Start date`}</span>
          {isEditing && (
            <StyledEditDay
              type="number"
              min={1}
              value={config.totalDays}
              onChange={(event) =>
                updateConfig({
                  totalDays: Math.max(1, Number(event.target.value) || 1),
                })
              }
              title={t`Total days`}
            />
          )}
          <StyledDateInput
            type="date"
            value={config.startDate}
            onChange={(event) => {
              if (event.target.value) {
                updateConfig({ startDate: event.target.value });
              }
            }}
          />
        </StyledStartRow>

        <StyledHero>
          <StyledDay>
            {t`DAY ${clampedDay}`}
            <small>/ {config.totalDays}</small>
          </StyledDay>
          <StyledBar>
            <StyledFill
              style={{ width: `${(clampedDay / config.totalDays) * 100}%` }}
            />
            {milestones
              .filter(
                (milestone) =>
                  milestone.offsetDays > 0 &&
                  milestone.offsetDays < config.totalDays,
              )
              .map((milestone) => (
                <StyledMarker
                  key={milestone.id}
                  style={{
                    left: `${(milestone.offsetDays / config.totalDays) * 100}%`,
                  }}
                />
              ))}
          </StyledBar>
        </StyledHero>

        {nextIndex >= 0 ? (
          <StyledNext tone="next">
            <StyledNextKey tone="next">{t`NEXT MILESTONE`}</StyledNextKey>
            <div>
              {milestones[nextIndex].name}
              {milestones[nextIndex].note
                ? ` · ${milestones[nextIndex].note}`
                : ''}
            </div>
            <StyledDim>
              {Math.max(
                0,
                Math.ceil(
                  (addDays(
                    config.startDate,
                    milestones[nextIndex].offsetDays,
                  ).getTime() -
                    Date.now()) /
                    DAY_MS,
                ),
              ) === 0
                ? t`DUE NOW`
                : t`IN ${Math.ceil((addDays(config.startDate, milestones[nextIndex].offsetDays).getTime() - Date.now()) / DAY_MS)} DAYS · ${formatDay(addDays(config.startDate, milestones[nextIndex].offsetDays))}`}
            </StyledDim>
          </StyledNext>
        ) : (
          <StyledNext tone="done">
            <StyledNextKey tone="done">{t`COMPLETE`}</StyledNextKey>
            <StyledDim>{t`All milestones passed`}</StyledDim>
          </StyledNext>
        )}

        <StyledList>
          {milestones.map((milestone, index) => {
            const status =
              milestone.offsetDays < dayNumber
                ? 'past'
                : index === nextIndex
                  ? 'now'
                  : 'future';

            if (isEditing) {
              return (
                <StyledEditRow key={milestone.id}>
                  <StyledEditName
                    value={milestone.name}
                    onChange={(event) =>
                      updateMilestone(milestone.id, {
                        name: event.target.value,
                      })
                    }
                  />
                  <StyledEditDay
                    type="number"
                    min={0}
                    value={milestone.offsetDays}
                    onChange={(event) =>
                      updateMilestone(milestone.id, {
                        offsetDays: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    title={t`Day offset`}
                  />
                  <StyledEditNote
                    value={milestone.note}
                    onChange={(event) =>
                      updateMilestone(milestone.id, {
                        note: event.target.value,
                      })
                    }
                    placeholder={t`Note`}
                  />
                  <StyledIconButton
                    aria-label={t`Remove milestone`}
                    onClick={() =>
                      updateConfig({
                        milestones: config.milestones.filter(
                          (candidate) => candidate.id !== milestone.id,
                        ),
                      })
                    }
                  >
                    <IconTrash size={13} />
                  </StyledIconButton>
                </StyledEditRow>
              );
            }

            return (
              <StyledRow key={milestone.id} status={status}>
                <StyledLed status={status} />
                <StyledName status={status}>{milestone.name}</StyledName>
                {milestone.note && (
                  <StyledNote dimmed={status === 'past'}>
                    {milestone.note}
                  </StyledNote>
                )}
                <StyledWhen>
                  {formatDay(addDays(config.startDate, milestone.offsetDays))}
                </StyledWhen>
              </StyledRow>
            );
          })}
          {isEditing && (
            <StyledAddButton
              onClick={() =>
                updateConfig({
                  milestones: [
                    ...config.milestones,
                    {
                      id: crypto.randomUUID(),
                      name: t`New milestone`,
                      offsetDays: clampedDay,
                      note: '',
                    },
                  ],
                })
              }
            >
              <IconPlus size={12} />
              {t`Add milestone`}
            </StyledAddButton>
          )}
        </StyledList>

        <StyledFoot>{t`Dates approximate · saved in this browser`}</StyledFoot>
      </StyledPanel>
    </>
  );
};
