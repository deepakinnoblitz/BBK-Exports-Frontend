import { CONFIG } from 'src/config-global';

import { AttendanceTransferView } from 'src/sections/attendance/view/attendance-transfer-view';

export default function Page() {
    return (
        <>
            <title>{`Attendance Transfer - ${CONFIG.appName}`}</title>
            <AttendanceTransferView />
        </>
    );
}
