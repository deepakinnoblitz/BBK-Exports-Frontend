import { CONFIG } from 'src/config-global';

import { ShiftReportView } from 'src/sections/report/shift/view/shift-report-view';

// ----------------------------------------------------------------------

export default function ShiftReportPage() {
  return (
    <>
      <title>{`Shift Report - ${CONFIG.appName}`}</title>
      <ShiftReportView />
    </>
  );
}
