import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { isTrackerOverlayOpenState } from '@/tracker-overlay/states/isTrackerOverlayOpenState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { IconBolt, IconCalendarTime, IconHeadphones, IconPhone } from 'twenty-ui/icon';
import { useNavigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { doNotTranslate } from 'twenty-shared/i18n';

export const MainframeAppsNavSection = () => {
  const navigate = useNavigate();
  const [, setIsTrackerOverlayOpen] = useAtomState(isTrackerOverlayOpenState);

  return (
    <NavigationDrawerSection>
      <NavigationDrawerItem
        label={doNotTranslate('Tracker')}
        Icon={IconCalendarTime}
        onClick={() => setIsTrackerOverlayOpen(true)}
      />
      <NavigationDrawerItem
        label={doNotTranslate('Automations')}
        Icon={IconBolt}
        onClick={() => navigate(AppPath.WorkflowIndexPage)}
      />
      <NavigationDrawerItem
        label={doNotTranslate('Earpiece')}
        Icon={IconHeadphones}
        onClick={() => navigate(AppPath.EarpiecePage)}
      />
      <NavigationDrawerItem
        label={doNotTranslate('Answer Line')}
        Icon={IconPhone}
        onClick={() => navigate(AppPath.AnswerLinePage)}
      />
    </NavigationDrawerSection>
  );
};