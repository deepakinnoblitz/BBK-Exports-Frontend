import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { SalarySlipEditView } from 'src/sections/salary-slips/view';

// ----------------------------------------------------------------------

export default function Page() {
    const { id } = useParams();

    return (
        <>
            <title>{`Edit Salary Slip - ${CONFIG.appName}`}</title>
            <SalarySlipEditView id={id} />
        </>
    );
}
