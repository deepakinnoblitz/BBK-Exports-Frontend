import { CONFIG } from 'src/config-global';

import { LineReportView } from 'src/sections/report/line/view/line-report-view';

// ----------------------------------------------------------------------

export default function LineReportPage() {
  return (
    <>
      <title>{`Line Report - ${CONFIG.appName}`}</title>
      <LineReportView />
    </>
  );
}
