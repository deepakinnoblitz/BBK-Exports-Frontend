import { CONFIG } from 'src/config-global';

import { CanteenReportView } from 'src/sections/report/canteen/view/canteen-report-view';

// ----------------------------------------------------------------------

export default function CanteenReportPage() {
  return (
    <>
      <title>{`Canteen Report - ${CONFIG.appName}`}</title>
      <CanteenReportView />
    </>
  );
}
