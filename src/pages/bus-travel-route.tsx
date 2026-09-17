import { CONFIG } from 'src/config-global';

import { BusTravelRouteView } from 'src/sections/master/bus-travel-route/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Bus - Travel Route List - ${CONFIG.appName}`}</title>
      <BusTravelRouteView />
    </>
  );
}
