import { CONFIG } from 'src/config-global';

import { MonthlyRosterView } from 'src/sections/shift-roster/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Monthly Roster - ${CONFIG.appName}`}</title>
      <MonthlyRosterView />
    </>
  );
}
