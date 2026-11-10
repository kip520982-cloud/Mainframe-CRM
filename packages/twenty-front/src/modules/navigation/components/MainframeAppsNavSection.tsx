import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { isTrackerOverlayOpenState } from '@/tracker-overlay/states/isTrackerOverlayOpenState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { IconBolt, IconCalendarTime, IconHeadphones, IconPhone } from 'twenty-ui/icon';
import { useNavigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

export const MainframeAppsNavSection = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [, setIsTrackerOverlayOpen] = useAtomState(isTrackerOverlayOpenState);

  return (
    <NavigationDrawerSection>
      <NavigationDrawerItem
        label={t`Tracker`}
        Icon={IconCalendarTime}
        onClick={() => setIsTrackerOverlayOpen(true)}
      />
      <NavigationDrawerItem
        label={t`Automations`}
        Icon={IconBolt}
        onClick={() => navigate(AppPath.WorkflowIndexPage)}
      />
      <NavigationDrawerItem
        label={t`Earpiece`}
        Icon={IconHeadphones}
        onClick={() => navigate(AppPath.EarpiecePage)}
      />
      <NavigationDrawerItem
        label={t`Answer Line`}
        Icon={IconPhone}
        onClick={() => navigate(AppPath.AnswerLinePage)}
      />
    </NavigationDrawerSection>
  );
};
