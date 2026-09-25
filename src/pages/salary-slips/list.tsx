import { CONFIG } from 'src/config-global';

import { SalarySlipsView } from 'src/sections/salary-slips/view';

// ----------------------------------------------------------------------

export default function Page() {
    return (
        <>
            <title>{`Salary Slips - ${CONFIG.appName}`}</title>
            <SalarySlipsView />
        </>
    );
}
