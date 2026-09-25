import { CONFIG } from 'src/config-global';

import { SalarySlipPreviewView } from 'src/sections/salary-slips/view';

// ----------------------------------------------------------------------

export default function Page() {
    return (
        <>
            <title>{`Salary Slip Preview - ${CONFIG.appName}`}</title>
            <SalarySlipPreviewView />
        </>
    );
}
