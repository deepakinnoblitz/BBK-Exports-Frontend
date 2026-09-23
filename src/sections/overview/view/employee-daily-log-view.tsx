import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import { SelectChangeEvent } from '@mui/material/Select';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useSocket } from 'src/hooks/use-socket';
import { usePresenceLog } from 'src/hooks/use-presence-log';

import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { useAuth } from 'src/auth/auth-context';

import { TableNoData } from '../../lead/table-no-data';
import { LeadTableHead } from '../../lead/lead-table-head';
import { TableEmptyRows } from '../../lead/table-empty-rows';
import { EmployeeDailyLogTableRow } from '../employee-daily-log-table-row';
import { EmployeeDailyLogEditDialog } from '../employee-daily-log-edit-dialog';
import { EmployeeDailyLogTableToolbar } from './employee-daily-log-table-toolbar';
import { EmployeeDailyLogDetailsDialog } from '../employee-daily-log-details-dialog';
import { EmployeePresenceSettingsDialog } from '../employee-presence-settings-dialog';
import { EmployeeDailyLogTableFiltersDrawer } from './employee-daily-log-table-filters-drawer';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
];

const SORT_OPTIONS = [
    { value: 'login_date_desc', label: 'Newest First' },
    { value: 'login_date_asc', label: 'Oldest First' },
    { value: 'working_hours_desc', label: 'Working Hrs: High to Low' },
    { value: 'working_hours_asc', label: 'Working Hrs: Low to High' },
];

// ----------------------------------------------------------------------

export function EmployeeDailyLogView() {
    const { user } = useAuth();

    const HR_ROLES = ['HR', 'System Manager', 'Administrator'];
    const isHR = user?.roles?.some((role: string) => HR_ROLES.includes(role)) ?? false;

    const { socket } = useSocket(user?.email);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [filterName, setFilterName] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterEmployee, setFilterEmployee] = useState('all');
    const [filterDay, setFilterDay] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterEndDate, setFilterEndDate] = useState<string>('');
    const [sortBy, setSortBy] = useState('login_date_desc');

    const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);

    // Pre-set employee filter for non-HR users (same as attendance report)
    useEffect(() => {
        if (user && user.roles) {
            const hasHRRole = user.roles.some((role: string) => HR_ROLES.includes(role));
            if (!hasHRRole && user.employee) {
                setFilterEmployee(user.employee);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Fetch employee list for HR users (same API as attendance report)
    useEffect(() => {
        if (isHR) {
            getDoctypeList('Employee', ['name', 'employee_name'])
                .then((list: any[]) => {
                    setEmployees(list.map((emp) => ({
                        value: emp.name,
                        label: `${emp.employee_name} (${emp.name})`
                    })));
                })
                .catch((error: any) => {
                    console.error('Failed to fetch employees:', error);
                });
        }
    }, [isHR]);

    const { data: sessions, totalCount, loading, refetch } = usePresenceLog(
        page * rowsPerPage,
        rowsPerPage,
        filterName,
        filterStatus,
        sortBy,
        filterEmployee,
        filterDay,
        '',
        filterStartDate,
        filterEndDate
    );

    useEffect(() => {
        if (!socket) {
            return undefined;
        }

        const handleUpdate = () => {
            refetch();
        };

        socket.on('session_update', handleUpdate);
        socket.on('presence_update', handleUpdate);

        return () => {
            socket.off('session_update', handleUpdate);
            socket.off('presence_update', handleUpdate);
        };
    }, [socket, refetch]);

    const [openDetails, setOpenDetails] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    const [openSettings, setOpenSettings] = useState(false);
    const [openFilters, setOpenFilters] = useState(false);

    const handleOpenDetails = (session: any) => {
        setSelectedSession(session);
        setOpenDetails(true);
    };

    const handleOpenEdit = (session: any) => {
        setSelectedSession(session);
        setOpenEdit(true);
    };

    const handleCloseDetails = () => {
        setOpenDetails(false);
        setSelectedSession(null);
    };

    const handleCloseEdit = () => {
        setOpenEdit(false);
        setSelectedSession(null);
    };

    const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterName(event.target.value);
        setPage(0);
    };

    const handleFilterStatus = (value: string) => {
        setFilterStatus(value);
        setPage(0);
    };

    const handleFilterEmployee = (value: string) => {
        setFilterEmployee(value);
        setPage(0);
    };

    const handleFilterDay = (value: string) => {
        setFilterDay(value);
        setPage(0);
    };

    const handleFilterStartDate = (value: string) => {
        setFilterStartDate(value);
        setPage(0);
    };

    const handleFilterEndDate = (value: string) => {
        setFilterEndDate(value);
        setPage(0);
    };

    const defaultEmployee = isHR ? 'all' : (user?.employee || 'all');

    const handleResetFilters = () => {
        setFilterStatus('all');
        setFilterEmployee(defaultEmployee);
        setFilterDay('all');
        setFilterStartDate('');
        setFilterEndDate('');
        setPage(0);
    };

    const canReset = filterStatus !== 'all' || filterEmployee !== defaultEmployee || filterDay !== 'all' || !!filterStartDate || !!filterEndDate || !!filterName;

    const handleSortChange = (value: string) => {
        setSortBy(value);
    };

    const notFound = !loading && sessions.length === 0 && (!!filterName || canReset);
    const emptyRows = (!loading && sessions.length > 0) ? (sessions.length < 5 ? 5 - sessions.length : 0) : 0;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ flexGrow: 1 }}>
                    Employee Daily Log
                </Typography>
            </Box>

            <Card>
                <EmployeeDailyLogTableToolbar
                    filterName={filterName}
                    onFilterName={handleFilterName}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    onOpenFilter={() => setOpenFilters(true)}
                    isHR={isHR}
                    onOpenSettings={() => setOpenSettings(true)}
                    canReset={canReset}
                    sortOptions={SORT_OPTIONS}
                    searchPlaceholder="Search by date or employee..."
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <LeadTableHead
                                order="desc"
                                orderBy="login_date"
                                rowCount={sessions.length}
                                numSelected={0}
                                hideCheckbox
                                showIndex
                                onSelectAllRows={() => { }}
                                headLabel={[
                                    ...(isHR ? [{ id: 'employee', label: 'Employee', minWidth: 200 }] : []),
                                    { id: 'login_date', label: 'Date', minWidth: 150 },
                                    // { id: 'status', label: 'Status', minWidth: 120 },
                                    { id: 'login_time', label: 'Login', minWidth: 120 },
                                    { id: 'logout_time', label: 'Logout', minWidth: 120 },
                                    { id: 'total_work_hours', label: 'Working Hours', minWidth: 150 },
                                    { id: 'break_hours', label: 'Break Hours', minWidth: 150 },
                                    { id: '', label: '', align: 'right' },
                                ]}
                            />

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={12} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sessions.map((row, index) => (
                                        <EmployeeDailyLogTableRow
                                            key={row.name}
                                            index={page * rowsPerPage + index}
                                            row={{ ...row, onEdit: () => handleOpenEdit(row) }}
                                            isHR={isHR}
                                            onView={() => handleOpenDetails(row)}
                                        />
                                    ))
                                )}

                                {emptyRows > 0 && <TableEmptyRows emptyRows={emptyRows} height={70} />}
                                {notFound && <TableNoData searchQuery={filterName} />}
                                {!loading && sessions.length === 0 && !filterName && !canReset && (
                                    <TableRow>
                                        <TableCell align="center" colSpan={12}>
                                            <EmptyContent
                                                title="No Data Available"
                                                description="There is no activity list created yet."
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(_e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Card>

            <EmployeeDailyLogDetailsDialog
                open={openDetails}
                onClose={handleCloseDetails}
                session={selectedSession}
            />

            <EmployeeDailyLogEditDialog
                open={openEdit}
                onClose={handleCloseEdit}
                session={selectedSession}
            />

            <EmployeePresenceSettingsDialog
                open={openSettings}
                onClose={() => setOpenSettings(false)}
            />

            <EmployeeDailyLogTableFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filterStatus={filterStatus}
                onFilterStatus={handleFilterStatus}
                filterEmployee={filterEmployee}
                onFilterEmployee={handleFilterEmployee}
                filterDay={filterDay}
                onFilterDay={handleFilterDay}
                filterStartDate={filterStartDate}
                onFilterStartDate={handleFilterStartDate}
                filterEndDate={filterEndDate}
                onFilterEndDate={handleFilterEndDate}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                isHR={isHR}
                options={{
                    status: STATUS_OPTIONS,
                    employees: employees,
                    days: [
                        { value: 'Monday', label: 'Monday' },
                        { value: 'Tuesday', label: 'Tuesday' },
                        { value: 'Wednesday', label: 'Wednesday' },
                        { value: 'Thursday', label: 'Thursday' },
                        { value: 'Friday', label: 'Friday' },
                        { value: 'Saturday', label: 'Saturday' },
                        { value: 'Sunday', label: 'Sunday' },
                    ]
                }}
            />
        </DashboardContent>
    );
}
