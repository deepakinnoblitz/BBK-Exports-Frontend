import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { SalarySlipDetailsView } from 'src/sections/salary-slips/view';

// ----------------------------------------------------------------------

export default function Page() {
    const { id } = useParams();

    return (
        <>
            <title>{`Salary Slip Details - ${CONFIG.appName}`}</title>
            <SalarySlipDetailsView id={id} />
        </>
    );
}
