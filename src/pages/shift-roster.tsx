import { CONFIG } from 'src/config-global';

import { ShiftRosterView } from 'src/sections/shift-roster/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Employee Shift Roster - ${CONFIG.appName}`}</title>
      <ShiftRosterView />
    </>
  );
}
