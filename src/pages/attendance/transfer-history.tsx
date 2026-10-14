import { CONFIG } from 'src/config-global';

import { AttendanceTransferHistoryView } from 'src/sections/attendance/view/attendance-transfer-history-view';

export default function Page() {
    return (
        <>
            <title>{`Attendance Transfer History - ${CONFIG.appName}`}</title>
            <AttendanceTransferHistoryView />
        </>
    );
}
