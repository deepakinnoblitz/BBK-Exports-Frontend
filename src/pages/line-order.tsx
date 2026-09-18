import { CONFIG } from 'src/config-global';

import { LineOrderView } from 'src/sections/master/line-order/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Line Order List - ${CONFIG.appName}`}</title>
      <LineOrderView />
    </>
  );
}
