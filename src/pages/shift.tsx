import { CONFIG } from 'src/config-global';

import { ShiftView } from 'src/sections/master/shift/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Shift List - ${CONFIG.appName}`}</title>
      <ShiftView />
    </>
  );
}
