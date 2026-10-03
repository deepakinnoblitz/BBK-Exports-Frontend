import { CONFIG } from 'src/config-global';

import { SalarySlipSettingsView } from 'src/sections/salary-slips/view';

// ----------------------------------------------------------------------

export default function SalarySlipSettingsPage() {
    return (
        <>
            <title>{`Salary Slip Settings - ${CONFIG.appName}`}</title>
            <SalarySlipSettingsView />
        </>
    );
}
