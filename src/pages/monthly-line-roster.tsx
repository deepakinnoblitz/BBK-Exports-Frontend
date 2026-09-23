import { CONFIG } from 'src/config-global';

import { MonthlyLineRosterView } from 'src/sections/line-roster/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Monthly Line Roster - ${CONFIG.appName}`}</title>
      <MonthlyLineRosterView />
    </>
  );
}
