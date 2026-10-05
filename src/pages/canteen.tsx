import { CONFIG } from 'src/config-global';

import { CanteenView } from 'src/sections/canteen/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Canteen - ${CONFIG.appName}`}</title>
      <CanteenView />
    </>
  );
}
