import { CONFIG } from 'src/config-global';

import { LineRosterView } from 'src/sections/line-roster/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Employee Line Assignment - ${CONFIG.appName}`}</title>
      <LineRosterView />
    </>
  );
}
