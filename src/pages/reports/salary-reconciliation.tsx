import { CONFIG } from 'src/config-global';

import { SalaryReconciliationReportView } from 'src/sections/report/salary-reconciliation/view/salary-reconciliation-report-view';

// ----------------------------------------------------------------------

export default function SalaryReconciliationReportPage() {
    return (
        <>
            <title>{`Salary Reconciliation Statement - ${CONFIG.appName}`}</title>
            <SalaryReconciliationReportView />
        </>
    );
}

