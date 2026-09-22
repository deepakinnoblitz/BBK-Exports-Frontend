import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import { useSnackbar } from 'notistack';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fDate } from 'src/utils/format-time';

import { getDoctypeList } from 'src/api/leads';
import { getHRSettings } from 'src/api/hr-management';
import { fetchLeaveApplications } from 'src/api/leaves';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchDetailedSessions } from 'src/api/presence-log';
import { getHolidayList, populateHolidays } from 'src/api/holiday-lists';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { DailyLogCalendar } from './daily-log-calendar';
import { LeavesDetailsDialog } from '../../leaves/leaves-details-dialog';
import { EmployeeDailyLogDetailsDialog } from '../../../overview/employee-daily-log-details-dialog';

// ----------------------------------------------------------------------

export function DailyLogReportView() {
    const theme = useTheme();
    const { user } = useAuth();
    const actionPerms =
      user?.permissions?.actions?.my_daily_log_report ||
      user?.permissions?.actions?.daily_log_report ||
      user?.permissions?.actions?.report_daily_log;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canExport = hasCustomPerms ? !!actionPerms?.export : true;

    // -----------------------------------------------------------------
    // Drag-to-scroll for Muster Roll table (ref-based, zero re-renders)
    // -----------------------------------------------------------------
    const musterScrollRef = useRef<HTMLDivElement | null>(null);
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const scrollStartLeft = useRef(0);

    const musterDragMoved = useRef(0);

    const handleMusterMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = musterScrollRef.current;
        if (!el) return;
        isDragging.current = true;
        dragStartX.current = e.clientX;
        scrollStartLeft.current = el.scrollLeft;
        musterDragMoved.current = 0;
        el.style.cursor = 'grabbing';
    };

    const handleMusterMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging.current) return;
        const el = musterScrollRef.current;
        if (!el) return;
        const dx = e.clientX - dragStartX.current;
        musterDragMoved.current = Math.abs(dx);
        el.scrollLeft = scrollStartLeft.current - dx;
    };

    const handleMusterMouseUp = () => {
        const el = musterScrollRef.current;
        if (!el) return;
        isDragging.current = false;
        el.style.cursor = 'grab';
    };

    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [isHR, setIsHR] = useState(false);

    const { enqueueSnackbar } = useSnackbar();

    // Filters
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const [employee, setEmployee] = useState<string[]>([]);
    const [status, setStatus] = useState('all');
    const [sortBy, setSortBy] = useState('login_date_desc');
    const [day, setDay] = useState('all');
    const isFilterApplied = !!fromDate && !!toDate;

    // Options
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Muster Roll Pagination
    const [musterPage, setMusterPage] = useState(0);
    const [musterRowsPerPage, setMusterRowsPerPage] = useState(50);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    const [openDetails, setOpenDetails] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [openLeaveDetails, setOpenLeaveDetails] = useState(false);
    const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);

    const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'muster'>('list');
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [exportType, setExportType] = useState<'excel' | 'pdf' | null>(null);
    const [selectedExportView, setSelectedExportView] = useState<'list' | 'muster'>('list');
    const [hrmsSettings, setHrmsSettings] = useState<any>(null);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [leaveApplications, setLeaveApplications] = useState<any[]>([]);

    useEffect(() => {
        async function loadSettings() {
            try {
                const settings = await getHRSettings();
                setHrmsSettings(settings);
            } catch (error) {
                console.error('Failed to load HRMS settings:', error);
            }
        }
        loadSettings();
    }, []);

    const fetchHolidaysForRange = useCallback(async (start: dayjs.Dayjs, end: dayjs.Dayjs) => {
        try {
            const monthsToFetch: { month: string; year: string }[] = [];
            let current = start.startOf('month');
            while (current.isBefore(end) || current.isSame(end, 'month')) {
                monthsToFetch.push({
                    month: current.format('M'),
                    year: current.format('YYYY')
                });
                current = current.add(1, 'month');
            }

            const allHolidays: any[] = [];
            await Promise.all(monthsToFetch.map(async ({ month, year }) => {
                try {
                    const lists = await getDoctypeList('Holiday List', ['name'], {
                        year: parseInt(year, 10),
                        month_year: month,
                    });

                    if (lists && lists.length > 0) {
                        const fullList = await getHolidayList(lists[0].name);
                        if (fullList && fullList.holidays) {
                            allHolidays.push(...fullList.holidays);
                            return;
                        }
                    }

                    const res = await populateHolidays(month, year);
                    if (res && res.holidays) {
                        allHolidays.push(...res.holidays);
                    }
                } catch (err) {
                    console.error(`Failed to fetch holidays for ${month}/${year}:`, err);
                }
            }));
            setHolidays(allHolidays);
        } catch (error) {
            console.error('Failed to fetch holidays for range:', error);
        }
    }, []);

    useEffect(() => {
        if (!isFilterApplied || !fromDate || !toDate) {
            setHolidays([]);
            return;
        }
        fetchHolidaysForRange(fromDate, toDate);
    }, [isFilterApplied, fromDate, toDate, fetchHolidaysForRange]);

    useEffect(() => {
        if (user && user.roles) {
            const hrRoles = ['HR Manager', 'HR', 'System Manager', 'Administrator'];
            const hasHRRole = user.roles.some((role: string) => hrRoles.includes(role));
            setIsHR(hasHRRole);
            if (!hasHRRole && user.employee) {
                setEmployee([user.employee]);
            }
        }
    }, [user]);

    useEffect(() => {
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions);
    }, []);

    useEffect(() => {
        if (employee.length !== 1 && currentView === 'calendar') {
            setCurrentView('list');
        }
    }, [employee, currentView]);

    const fetchReport = useCallback(async () => {
        if (!fromDate || !toDate) {
            setReportData([]);
            setLeaveApplications([]);
            return;
        }
        if (toDate.isBefore(fromDate, 'day')) {
            setReportData([]);
            setLeaveApplications([]);
            return;
        }
        // We fetch a larger limit for the report view, or implement proper backend pagination if needed.
        // For now, let's fetch up to 1000 records if dates are selected.
        setLoading(true);
        try {
            const result = await fetchDetailedSessions(
                0,
                1000,
                '',
                status,
                sortBy,
                employee.length > 0 ? JSON.stringify(employee) : 'all',
                day,
                '',
                fromDate.format('YYYY-MM-DD'),
                toDate.format('YYYY-MM-DD')
            );
            setReportData(result.data || []);

            const startD = fromDate.subtract(3, 'month').format('YYYY-MM-DD');
            const endD = toDate.format('YYYY-MM-DD');

            const leavesRes = await fetchLeaveApplications({
                page: 1,
                page_size: 2000,
                filters: {
                    start_date: startD,
                    end_date: endD,
                    workflow_state: 'Approved'
                }
            });
            setLeaveApplications(leavesRes.data || []);

            setPage(0);
            setMusterPage(0);
        } catch (error) {
            console.error('Failed to fetch daily log report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, employee, status, sortBy, day]);

    useEffect(() => {
        if (fromDate && toDate && toDate.isBefore(fromDate, 'day')) {
            enqueueSnackbar('To Date must be after From Date', { variant: 'error' });
            setToDate(null);
        }
    }, [fromDate, toDate, enqueueSnackbar]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const getSessionRecord = useCallback((employeeId: string, date: dayjs.Dayjs) => {
        const dateStr = date.format('YYYY-MM-DD');
        return reportData.find(
            (row) => row.employee === employeeId && row.login_date === dateStr
        );
    }, [reportData]);

    const handleMusterCellClick = (session: any, leave?: any) => {
        if (musterDragMoved.current > 5) return;
        if (session) {
            handleViewDetails(session);
        } else if (leave) {
            setSelectedLeaveId(leave.name);
            setOpenLeaveDetails(true);
        }
    };

    const getApprovedLeaveForDate = useCallback((employeeId: string, date: dayjs.Dayjs) => leaveApplications.find((leave) => {
        if (leave.employee !== employeeId) return false;
        const isApproved = (leave.workflow_state === 'Approved' || leave.status === 'Approved');
        if (!isApproved) return false;
        
        const from = dayjs(leave.from_date);
        const to = dayjs(leave.to_date);
        return (date.isSame(from, 'day') || date.isAfter(from, 'day')) && 
               (date.isSame(to, 'day') || date.isBefore(to, 'day'));
    }), [leaveApplications]);

    const isLeaveStatus = useCallback((val: string) => !['P', 'A', 'HD', 'H'].includes(val), []);

    const getAttendanceStatus = useCallback((employeeId: string, date: dayjs.Dayjs) => {
        const dateStr = date.format('YYYY-MM-DD');
        const logs = reportData.filter(
            (row) => row.employee === employeeId && row.login_date === dateStr
        );

        if (logs.length === 0) {
            const isHoliday = holidays.some(
                (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
            );
            if (isHoliday) return 'H';

            const leave = getApprovedLeaveForDate(employeeId, date);
            if (leave) {
                return leave.leave_type;
            }
            return 'A';
        }

        const isActive = logs.some((log) => log.status === 'Active');
        if (isActive) {
            return 'P';
        }

        const totalHours = logs.reduce((sum, log) => sum + (log.total_work_hours || 0), 0);
        const presentThreshold = hrmsSettings?.salary_slip_present_threshold != null && hrmsSettings?.salary_slip_present_threshold !== ''
            ? Number(hrmsSettings.salary_slip_present_threshold)
            : (Number(hrmsSettings?.present_threshold) || 5.0);
        const halfDayThreshold = hrmsSettings?.salary_slip_half_day_threshold != null && hrmsSettings?.salary_slip_half_day_threshold !== ''
            ? Number(hrmsSettings.salary_slip_half_day_threshold)
            : (Number(hrmsSettings?.half_day_threshold) || 3.0);

        if (totalHours >= presentThreshold) return 'P';
        if (totalHours >= halfDayThreshold) return 'HD';

        const leave = getApprovedLeaveForDate(employeeId, date);
        if (leave) {
            return leave.leave_type;
        }

        return 'A';
    }, [reportData, holidays, hrmsSettings, getApprovedLeaveForDate]);

    const getAttendanceTimes = useCallback((employeeId: string, date: dayjs.Dayjs) => {
        const dateStr = date.format('YYYY-MM-DD');
        const logs = reportData.filter(
            (row) => row.employee === employeeId && row.login_date === dateStr
        );

        if (logs.length === 0) return { inTime: '---', outTime: '---' };

        const validLogins = logs.map(l => l.login_time).filter(Boolean);
        let earliestLoginStr = '';
        if (validLogins.length > 0) {
            const sorted = [...validLogins].sort((a, b) => dayjs(a).diff(dayjs(b)));
            const earliest = dayjs(sorted[0]);
            if (earliest.isValid()) {
                earliestLoginStr = earliest.format('hh:mm A');
            }
        }

        const hasActive = logs.some(l => l.status === 'Active');
        let latestLogoutStr = '';
        if (hasActive) {
            latestLogoutStr = 'Active';
        } else {
            const validLogouts = logs.map(l => l.logout_time).filter(Boolean);
            if (validLogouts.length > 0) {
                const sorted = [...validLogouts].sort((a, b) => dayjs(b).diff(dayjs(a)));
                const latest = dayjs(sorted[0]);
                if (latest.isValid()) {
                    latestLogoutStr = latest.format('hh:mm A');
                }
            }
        }

        const inTime = earliestLoginStr || '---';
        const outTime = latestLogoutStr || '---';

        return { inTime, outTime };
    }, [reportData]);

    const isDateHoliday = useCallback((date: dayjs.Dayjs) => {
        const dateStr = date.format('YYYY-MM-DD');
        return holidays.some(
            (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
        );
    }, [holidays]);

    const getStatusStyles = (cellStatus: string) => {
        if (cellStatus === 'P') {
            return {
                bgcolor: 'rgba(34, 197, 94, 0.14)',
                color: '#166534',
                fontWeight: 'bold',
            };
        }
        if (cellStatus === 'A') {
            return {
                bgcolor: 'rgba(239, 68, 68, 0.14)',
                color: '#991b1b',
                fontWeight: 'bold',
            };
        }
        if (cellStatus === 'HD') {
            return {
                bgcolor: 'rgba(234, 179, 8, 0.16)',
                color: '#c06803ff',
                fontWeight: 'bold',
            };
        }
        if (cellStatus === 'H') {
            return {
                bgcolor: 'rgba(244, 63, 94, 0.14)',
                color: '#9f1239',
                fontWeight: 'bold',
            };
        }

        const statusLower = cellStatus.toLowerCase();
        if (statusLower.includes('unpaid') || statusLower.includes('paid') || statusLower.includes('permission') || statusLower.includes('leave')) {
            return {
                bgcolor: '#EEEDFE',
                color: '#26215C',
                fontWeight: 'bold',
            };
        }
        if (statusLower.includes('sick')) {
            return {
                bgcolor: 'rgba(219, 39, 119, 0.14)',
                color: '#9d174d',
                fontWeight: 'bold',
            };
        }
        if (statusLower.includes('casual')) {
            return {
                bgcolor: 'rgba(13, 148, 136, 0.14)',
                color: '#115e59',
                fontWeight: 'bold',
            };
        }

        return {
            bgcolor: 'rgba(75, 85, 99, 0.14)',
            color: '#374151',
            fontWeight: 'bold',
        };
    };

    const dates = useMemo(() => {
        if (!isFilterApplied || !fromDate || !toDate) return [];
        const start = fromDate;
        const end = toDate;

        const dateArray: dayjs.Dayjs[] = [];
        let cur = start;
        const maxDays = 366;
        let count = 0;
        while ((cur.isBefore(end) || cur.isSame(end, 'day')) && count < maxDays) {
            dateArray.push(cur);
            cur = cur.add(1, 'day');
            count++;
        }
        return dateArray;
    }, [isFilterApplied, fromDate, toDate]);

    const uniqueEmployees = Array.from(
        new Map(
            reportData.map((row) => [row.employee, { id: row.employee, name: row.employee_name }])
        ).values()
    );

    const paginatedEmployees = uniqueEmployees.slice(
        musterPage * musterRowsPerPage,
        musterPage * musterRowsPerPage + musterRowsPerPage
    );

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        if (isHR) {
            setEmployee([]);
        } else if (user?.employee) {
            setEmployee([user.employee]);
        }
        setStatus('all');
        setDay('all');
        setSortBy('login_date_desc');
    };

    const handleExport = async (targetView?: 'list' | 'muster') => {
        const viewToExport = targetView || (currentView === 'muster' ? 'muster' : 'list');
        setExportingExcel(true);
        try {
            if (viewToExport === 'muster') {
                const workbook = new ExcelJS.Workbook();
                const sheet = workbook.addWorksheet('Muster Roll Report');

                const columns = [
                    { header: 'Employee ID', key: 'employee_id', width: 15 },
                    { header: 'Employee', key: 'employee_name', width: 25 }
                ];

                dates.forEach((date) => {
                    columns.push({
                        header: date.format('DD MMM (ddd)'),
                        key: date.format('YYYY-MM-DD'),
                        width: 20
                    });
                });

                sheet.columns = columns;

                for (let i = 1; i <= columns.length; i++) {
                    const cell = sheet.getRow(1).getCell(i);
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
                sheet.getRow(1).height = 25;

                uniqueEmployees.forEach((emp) => {
                    const rowData: any = {
                        employee_id: emp.id,
                        employee_name: emp.name
                    };
                    dates.forEach((date) => {
                        rowData[date.format('YYYY-MM-DD')] = getAttendanceStatus(emp.id, date);
                    });

                    const excelRow = sheet.addRow(rowData);
                    excelRow.height = 60;

                    for (let i = 3; i <= columns.length; i++) {
                        const cell = excelRow.getCell(i);
                        const date = dates[i - 3];
                        const cellStatus = getAttendanceStatus(emp.id, date);
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };

                        if (cellStatus === 'P') {
                            const times = getAttendanceTimes(emp.id, date);
                            cell.value = `${times.inTime}\nto\n${times.outTime}`;
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D9' } };
                            cell.font = { color: { argb: 'FF385723' }, bold: true };
                            cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
                        } else if (cellStatus === 'A') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
                            cell.font = { color: { argb: 'FFC65911' }, bold: true };
                        } else if (cellStatus === 'HD') {
                            const times = getAttendanceTimes(emp.id, date);
                            cell.value = `${times.inTime}\nto\n${times.outTime}`;
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
                            cell.font = { color: { argb: 'FF7F6000' }, bold: true };
                            cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
                        } else if (cellStatus === 'H') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                            cell.font = { color: { argb: 'FF595959' }, bold: true };
                        }
                    }
                });

                // Merge Holiday columns
                if (uniqueEmployees.length > 0) {
                    dates.forEach((date, index) => {
                        if (isDateHoliday(date)) {
                            const colIndex = index + 3;
                            sheet.mergeCells(2, colIndex, uniqueEmployees.length + 1, colIndex);
                            const topCell = sheet.getRow(2).getCell(colIndex);
                            topCell.value = 'HOLIDAY';
                            topCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                            topCell.font = { color: { argb: 'FF595959' }, bold: true, size: 10 };
                            topCell.alignment = { textRotation: 90, vertical: 'middle', horizontal: 'center', wrapText: true };
                        }
                    });
                }

                sheet.eachRow((row, rowNumber) => {
                    for (let i = 1; i <= columns.length; i++) {
                        const cell = row.getCell(i);
                        if (rowNumber > 1 && i <= 2) {
                            cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    }
                });

                const buffer = await workbook.xlsx.writeBuffer();
                saveAs(new Blob([buffer]), `Muster_Roll_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
                enqueueSnackbar('Muster Roll Excel exported successfully!', { variant: 'success' });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const mainSheet = workbook.addWorksheet('Daily Log Report');
            const detailSheet = workbook.addWorksheet('Detailed Timing');

            // Selection Logic
            const exportData = selected.length > 0
                ? reportData.filter(d => selected.includes(d.name))
                : reportData;

            // --- MAIN SHEET SETUP ---
            mainSheet.columns = [
                { header: 'Employee', key: 'employee_name', width: 25 },
                { header: 'Employee ID', key: 'employee', width: 15 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Login Time', key: 'login', width: 15 },
                { header: 'Logout Time', key: 'logout', width: 15 },
                { header: 'Work Hours', key: 'work_hours', width: 15 },
                { header: 'Break Hours', key: 'break_hours', width: 15 },
                { header: 'Status', key: 'status', width: 15 },
            ];

            const mainColCount = mainSheet.columns.length;
            for (let i = 1; i <= mainColCount; i++) {
                const cell = mainSheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            mainSheet.getRow(1).height = 25;

            exportData.forEach((row) => {
                const excelRow = mainSheet.addRow({
                    employee_name: row.employee_name,
                    employee: row.employee,
                    date: fDate(row.login_date, 'DD-MM-YYYY'),
                    login: row.login_time ? dayjs(row.login_time).format('HH:mm:ss') : '---',
                    logout: row.logout_time ? dayjs(row.logout_time).format('HH:mm:ss') : '---',
                    work_hours: row.total_work_hours?.toFixed(2) || '0.00',
                    break_hours: row.total_break_hours?.toFixed(2) || '0.00',
                    status: row.status
                });

                const statusCell = excelRow.getCell('status');
                if (row.status === 'Active') {
                    statusCell.font = { color: { argb: 'FF22C55E' }, bold: true };
                } else {
                    statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                }
            });

            // Merging logic for Employee and Date
            let mergeStart = 2;
            const totalRows = mainSheet.rowCount;
            for (let i = 2; i <= totalRows; i++) {
                const current = mainSheet.getRow(i);
                const next = i < totalRows ? mainSheet.getRow(i + 1) : null;

                const isLast = i === totalRows;
                const sameAsNext = !isLast && next &&
                    current.getCell(1).value === next.getCell(1).value &&
                    current.getCell(2).value === next.getCell(2).value &&
                    current.getCell(3).value === next.getCell(3).value;

                if (!sameAsNext) {
                    if (i > mergeStart) {
                        mainSheet.mergeCells(`A${mergeStart}:A${i}`);
                        mainSheet.mergeCells(`B${mergeStart}:B${i}`);
                        mainSheet.mergeCells(`C${mergeStart}:C${i}`);

                        ['A', 'B', 'C'].forEach(col => {
                            mainSheet.getCell(`${col}${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'center' };
                        });
                    }
                    mergeStart = i + 1;
                }
            }

            mainSheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= mainColCount; i++) {
                        const cell = row.getCell(i);
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        if (rowNumber % 2 === 0) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
                        }
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    }
                }
            });

            // --- DETAIL SHEET SETUP ---
            detailSheet.columns = [
                { header: 'Employee', key: 'employee', width: 25 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Type', key: 'type', width: 15 },
                { header: 'Start Time', key: 'start', width: 15 },
                { header: 'End Time', key: 'end', width: 15 },
                { header: 'Duration', key: 'duration', width: 15 },
                { header: 'Details / Reason', key: 'details', width: 30 },
            ];

            const detailColCount = detailSheet.columns.length;
            for (let i = 1; i <= detailColCount; i++) {
                const cell = detailSheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            detailSheet.getRow(1).height = 25;

            exportData.forEach((session) => {
                // 1. Add Session Summary Header for this employee
                detailSheet.addRow({
                    employee: session.employee_name,
                    date: fDate(session.login_date, 'DD-MM-YYYY'),
                    type: 'SESSION',
                    start: session.login_time ? dayjs(session.login_time).format('HH:mm:ss') : '---',
                    end: session.logout_time ? dayjs(session.logout_time).format('HH:mm:ss') : 'Active',
                    duration: `${session.total_work_hours?.toFixed(2) || '0.00'} Hrs`,
                    details: `Total Break: ${session.total_break_hours?.toFixed(2) || '0.00'} Hrs`
                }).font = { bold: true };

                // 2. Add Intervals
                (session.intervals || []).forEach((int: any) => {
                    detailSheet.addRow({
                        employee: '',
                        date: '',
                        type: 'Activity',
                        start: int.from_time ? dayjs(int.from_time).format('HH:mm:ss') : '---',
                        end: int.to_time ? dayjs(int.to_time).format('HH:mm:ss') : 'Current',
                        duration: int.duration_seconds ? `${Math.floor(int.duration_seconds / 60)}m ${int.duration_seconds % 60}s` : '---',
                        details: int.status || 'Available'
                    });
                });

                // 3. Add Breaks
                (session.breaks || []).forEach((brk: any) => {
                    detailSheet.addRow({
                        employee: '',
                        date: '',
                        type: 'BREAK',
                        start: brk.break_start ? dayjs(brk.break_start).format('HH:mm:ss') : '---',
                        end: brk.break_end ? dayjs(brk.break_end).format('HH:mm:ss') : 'Current',
                        duration: `${brk.break_duration?.toFixed(1) || '0'} mins`,
                        details: brk.reason || brk.source || 'Manual Break'
                    }).font = { italic: true, color: { argb: 'FFD97706' } };
                });

                // Add an empty row for spacing between sessions
                detailSheet.addRow([]);
            });

            // Styling for detail sheet
            detailSheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1 && row.getCell(3).value) { // only for rows with data
                    for (let i = 1; i <= detailColCount; i++) {
                        const cell = row.getCell(i);
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    }
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Daily_Log_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Excel export failed:', error);
            enqueueSnackbar('Excel export failed!', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async (targetView?: 'list' | 'muster') => {
        const viewToExport = targetView || (currentView === 'muster' ? 'muster' : 'list');
        setExportingPdf(true);
        try {
            if (viewToExport === 'muster') {
                const doc = new jsPDF('landscape');
                const COLUMNS_PER_PAGE = 10;
                const totalDates = dates.length;
                const pageCount = Math.ceil(totalDates / COLUMNS_PER_PAGE);

                for (let p = 0; p < pageCount; p++) {
                    if (p > 0) {
                        doc.addPage();
                    }

                    // Render header titles for this page
                    doc.setFontSize(22);
                    doc.setTextColor(14, 165, 233);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Muster Roll Report', 14, 20);

                    doc.setFontSize(9);
                    doc.setTextColor(120);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')} | Page ${p + 1} of ${pageCount}`, 14, 27);

                    // Accent line
                    doc.setDrawColor(14, 165, 233);
                    doc.setLineWidth(0.5);
                    doc.line(14, 32, 280, 32);

                    const startIndex = p * COLUMNS_PER_PAGE;
                    const endIndex = Math.min(startIndex + COLUMNS_PER_PAGE, totalDates);
                    const pageDates = dates.slice(startIndex, endIndex);

                    // Header formatted cleanly as Day + Date (e.g. "Mon 23"), not stacked/wrapped digit-by-digit
                    const headers = ['Employee', 'ID', ...pageDates.map(d => `${d.format('ddd')} ${d.format('DD')}`)];
                    const body = uniqueEmployees.map(emp => [
                        emp.name,
                        emp.id,
                        ...pageDates.map(date => getAttendanceStatus(emp.id, date))
                    ]);

                    autoTable(doc, {
                        startY: 40,
                        head: [headers],
                        body,
                        theme: 'grid',
                        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
                        columnStyles: {
                            0: { cellWidth: 40 },
                            1: { cellWidth: 20, halign: 'center' },
                        },
                        didParseCell: (data) => {
                            if (data.column.index >= 2) {
                                data.cell.styles.halign = 'center';
                                const val = data.cell.text[0];
                                if (val === 'P') {
                                    data.cell.styles.fillColor = [226, 240, 217];
                                    data.cell.styles.textColor = [56, 87, 35];
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (val === 'A') {
                                    data.cell.styles.fillColor = [252, 228, 214];
                                    data.cell.styles.textColor = [198, 89, 17];
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (val === 'HD') {
                                    data.cell.styles.fillColor = [255, 242, 204];
                                    data.cell.styles.textColor = [127, 96, 0];
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (val === 'H') {
                                    data.cell.styles.fillColor = [242, 242, 242];
                                    data.cell.styles.textColor = [89, 89, 89];
                                    data.cell.styles.fontStyle = 'bold';
                                }
                            }
                        }
                    });
                }

                doc.save(`Muster_Roll_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
                enqueueSnackbar('Muster Roll PDF exported successfully!', { variant: 'success' });
                return;
            }

            const doc = new jsPDF('landscape');

            // Selection Logic
            const exportData = selected.length > 0
                ? reportData.filter(d => selected.includes(d.name))
                : reportData;

            if (exportData.length === 0) {
                enqueueSnackbar('No data to export', { variant: 'warning' });
                setExportingPdf(false);
                return;
            }

            // --- PAGE 1: DAILY LOG REPORT ---
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Daily Log Report', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            // Accent line
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const mainBody = exportData.map(row => [
                row.employee_name,
                row.employee,
                fDate(row.login_date, 'DD-MM-YYYY'),
                row.login_time ? dayjs(row.login_time).format('HH:mm:ss') : '---',
                row.logout_time ? dayjs(row.logout_time).format('HH:mm:ss') : '---',
                row.total_work_hours?.toFixed(2) || '0.00',
                row.total_break_hours?.toFixed(2) || '0.00',
                row.status
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['Employee', 'Employee ID', 'Date', 'Login', 'Logout', 'Work (h)', 'Break (h)', 'Status']],
                body: mainBody,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 25, halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    6: { halign: 'center' },
                    7: { halign: 'center' },
                }
            });

            // --- PAGE 2: DETAILED TIMING ---
            doc.addPage();
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Detailed Timing', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            // Accent line
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const detailBody: any[] = [];
            exportData.forEach((session) => {
                // Session Header Row
                detailBody.push([
                    { content: session.employee_name, styles: { fontStyle: 'bold' } },
                    { content: fDate(session.login_date, 'DD-MM-YYYY'), styles: { fontStyle: 'bold' } },
                    { content: 'SESSION', styles: { fontStyle: 'bold' } },
                    { content: session.login_time ? dayjs(session.login_time).format('HH:mm:ss') : '---', styles: { fontStyle: 'bold' } },
                    { content: session.logout_time ? dayjs(session.logout_time).format('HH:mm:ss') : 'Active', styles: { fontStyle: 'bold' } },
                    { content: `${session.total_work_hours?.toFixed(2) || '0.00'} Hrs`, styles: { fontStyle: 'bold' } },
                    { content: `Total Break: ${session.total_break_hours?.toFixed(2) || '0.00'} Hrs`, styles: { fontStyle: 'bold' } }
                ]);

                // Intervals
                (session.intervals || []).forEach((int: any) => {
                    detailBody.push([
                        '',
                        '',
                        'Activity',
                        int.from_time ? dayjs(int.from_time).format('HH:mm:ss') : '---',
                        int.to_time ? dayjs(int.to_time).format('HH:mm:ss') : 'Current',
                        int.duration_seconds ? `${Math.floor(int.duration_seconds / 60)}m ${int.duration_seconds % 60}s` : '---',
                        int.status || 'Available'
                    ]);
                });

                // Breaks
                (session.breaks || []).forEach((brk: any) => {
                    detailBody.push([
                        '',
                        '',
                        'BREAK',
                        brk.break_start ? dayjs(brk.break_start).format('HH:mm:ss') : '---',
                        brk.break_end ? dayjs(brk.break_end).format('HH:mm:ss') : 'Current',
                        { content: `${brk.break_duration?.toFixed(1) || '0'} mins`, styles: { textColor: [217, 119, 6] } },
                        { content: brk.reason || brk.source || 'Manual Break', styles: { textColor: [217, 119, 6] } }
                    ]);
                });

                // Empty row for spacing
                detailBody.push(['', '', '', '', '', '', '']);
            });

            autoTable(doc, {
                startY: 40,
                head: [['Employee', 'Date', 'Type', 'Start Time', 'End Time', 'Duration', 'Details / Reason']],
                body: detailBody,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    6: { cellWidth: 60 }
                },
                didParseCell: (data) => {
                    // Highlight BREAK rows type column
                    if (data.column.index === 2 && data.cell.text[0] === 'BREAK') {
                        data.cell.styles.textColor = [217, 119, 6];
                        data.cell.styles.fontStyle = 'italic';
                    }
                }
            });

            doc.save(`Daily_Log_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            enqueueSnackbar('PDF exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('PDF export failed:', error);
            enqueueSnackbar('PDF export failed!', { variant: 'error' });
        } finally {
            setExportingPdf(false);
        }
    };

    const handleOpenExportDialog = (type: 'excel' | 'pdf') => {
        setExportType(type);
        if (type === 'pdf') {
            setSelectedExportView('list');
        } else {
            setSelectedExportView(currentView === 'muster' ? 'muster' : 'list');
        }
        setOpenExportDialog(true);
    };

    const handleViewDetails = (session: any) => {
        setSelectedSession(session);
        setOpenDetails(true);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = reportData.map((n) => n.name);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }
        setSelected(newSelected);
    };

    const [totalDaysAnchorEl, setTotalDaysAnchorEl] = useState<HTMLElement | null>(null);
    const [daysTab, setDaysTab] = useState<'all' | 'working' | 'holiday'>('all');

    // Summary stats
    const daysBreakdown = useMemo(() => {
        if (!isFilterApplied || !fromDate || !toDate || toDate.isBefore(fromDate, 'day')) {
            return [];
        }

        const list: {
            date: dayjs.Dayjs;
            dateStr: string;
            isHoliday: boolean;
            status: 'Working Day' | 'Holiday';
            holidayName?: string;
        }[] = [];

        let cur = fromDate;
        const maxDays = 730;
        let count = 0;

        while ((cur.isBefore(toDate, 'day') || cur.isSame(toDate, 'day')) && count < maxDays) {
            const dateStr = cur.format('YYYY-MM-DD');
            const holidayMatch = holidays.find(
                (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
            );

            if (holidayMatch) {
                list.push({
                    date: cur,
                    dateStr,
                    isHoliday: true,
                    status: 'Holiday',
                    holidayName: holidayMatch.description || 'Holiday',
                });
            } else {
                list.push({
                    date: cur,
                    dateStr,
                    isHoliday: false,
                    status: 'Working Day',
                });
            }

            cur = cur.add(1, 'day');
            count++;
        }

        return list;
    }, [isFilterApplied, fromDate, toDate, holidays]);

    const workingDaysCount = useMemo(
        () => daysBreakdown.filter((d) => !d.isHoliday).length,
        [daysBreakdown]
    );

    const holidaysCount = useMemo(
        () => daysBreakdown.filter((d) => d.isHoliday).length,
        [daysBreakdown]
    );

    const totalDaysCount = useMemo(() => {
        if (!isFilterApplied || !fromDate || !toDate) {
            return 0;
        }
        return Math.max(0, toDate.diff(fromDate, 'day') + 1);
    }, [isFilterApplied, fromDate, toDate]);

    const filteredDaysBreakdown = useMemo(() => {
        if (daysTab === 'working') {
            return daysBreakdown.filter((d) => !d.isHoliday);
        }
        if (daysTab === 'holiday') {
            return daysBreakdown.filter((d) => d.isHoliday);
        }
        return daysBreakdown;
    }, [daysBreakdown, daysTab]);

    const [presentAnchorEl, setPresentAnchorEl] = useState<HTMLElement | null>(null);
    const [presentTab, setPresentTab] = useState<'all' | 'present' | 'holiday'>('all');

    const targetEmployeeIds = useMemo(() => {
        if (!isFilterApplied) return [];
        if (employee && employee.length > 0) {
            return employee;
        }
        return uniqueEmployees.map((e) => e.id);
    }, [isFilterApplied, employee, uniqueEmployees]);

    const presentBreakdownList = useMemo(() => {
        if (!isFilterApplied || targetEmployeeIds.length === 0 || dates.length === 0) {
            return [];
        }

        const items: {
            dateStr: string;
            type: 'present' | 'half_day' | 'paid_leave' | 'holiday';
            label: string;
            value: number;
        }[] = [];

        const empId = targetEmployeeIds[0];

        dates.forEach((date) => {
            const dateStr = date.format('YYYY-MM-DD');
            const formattedDate = date.format('DD-MM-YYYY — dddd');
            const holidayMatch = holidays.find(
                (h) => h.holiday_date && dayjs(h.holiday_date).format('YYYY-MM-DD') === dateStr && h.is_working_day === 0
            );

            if (holidayMatch) {
                items.push({
                    dateStr: formattedDate,
                    type: 'holiday',
                    label: holidayMatch.description || 'Holiday',
                    value: 1,
                });
                return;
            }

            const attStatus = getAttendanceStatus(empId, date);
            if (attStatus === 'P') {
                items.push({
                    dateStr: formattedDate,
                    type: 'present',
                    label: 'Present',
                    value: 1,
                });
            } else if (attStatus === 'HD') {
                items.push({
                    dateStr: formattedDate,
                    type: 'half_day',
                    label: 'Half Day',
                    value: 0.5,
                });
            } else if (isLeaveStatus(attStatus)) {
                const leave = getApprovedLeaveForDate(empId, date);
                const isUnpaid = leave && (
                    leave.is_paid === 0 ||
                    leave.is_paid === false ||
                    (leave.leave_type || '').toLowerCase().includes('unpaid') ||
                    (leave.leave_type || '').toLowerCase().includes('lop')
                );
                const isHalf = !!leave?.half_day;
                if (!isUnpaid) {
                    items.push({
                        dateStr: formattedDate,
                        type: 'paid_leave',
                        label: `${leave?.leave_type || 'Paid Leave'}${isHalf ? ' (Half Day)' : ''}`,
                        value: isHalf ? 0.5 : 1,
                    });
                }
            }
        });

        return items;
    }, [isFilterApplied, targetEmployeeIds, dates, holidays, getAttendanceStatus, isLeaveStatus, getApprovedLeaveForDate]);

    const filteredPresentBreakdown = useMemo(() => {
        if (presentTab === 'present') {
            return presentBreakdownList.filter((item) => item.type === 'present' || item.type === 'half_day' || item.type === 'paid_leave');
        }
        if (presentTab === 'holiday') {
            return presentBreakdownList.filter((item) => item.type === 'holiday');
        }
        return presentBreakdownList;
    }, [presentBreakdownList, presentTab]);



    const { presentCount, absentCount } = useMemo(() => {
        if (!isFilterApplied || targetEmployeeIds.length === 0 || dates.length === 0) {
            return { presentCount: 0, absentCount: 0 };
        }

        let present = 0;
        let absent = 0;

        targetEmployeeIds.forEach((empId) => {
            dates.forEach((date) => {
                const attStatus = getAttendanceStatus(empId, date);
                if (attStatus === 'P') {
                    present += 1;
                } else if (attStatus === 'HD') {
                    present += 0.5;
                    absent += 0.5;
                } else if (attStatus === 'A') {
                    absent += 1;
                } else if (isLeaveStatus(attStatus)) {
                    const leave = getApprovedLeaveForDate(empId, date);
                    const isUnpaid = leave && (
                        leave.is_paid === 0 ||
                        leave.is_paid === false ||
                        (leave.leave_type || '').toLowerCase().includes('unpaid') ||
                        (leave.leave_type || '').toLowerCase().includes('lop')
                    );
                    const isHalf = !!leave?.half_day;
                    if (isUnpaid) {
                        absent += isHalf ? 0.5 : 1;
                    } else {
                        present += isHalf ? 0.5 : 1;
                    }
                }
            });
        });

        const formattedPresent = Number.isInteger(present) ? present : Number(present.toFixed(1));
        const formattedAbsent = Number.isInteger(absent) ? absent : Number(absent.toFixed(1));

        return { presentCount: formattedPresent, absentCount: formattedAbsent };
    }, [isFilterApplied, targetEmployeeIds, dates, getAttendanceStatus, isLeaveStatus, getApprovedLeaveForDate]);

    const totalWorkHours = reportData.reduce((acc, curr) => acc + (curr.total_work_hours || 0), 0);
    const totalBreakHours = reportData.reduce((acc, curr) => acc + (curr.total_break_hours || 0), 0);

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Employee Daily Log Report</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            startIcon={<Iconify icon={"solar:refresh-bold" as any} />}
                            onClick={fetchReport}
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Iconify icon={"solar:restart-bold" as any} />}
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                    </Stack>
                </Stack>

                <Card
                    sx={{
                        p: 2.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        bgcolor: 'background.neutral',
                        border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                >
                    <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="From Date"
                                format="DD-MM-YYYY"
                                value={fromDate}
                                onChange={(newValue) => setFromDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 170 } } }}
                            />
                            <DatePicker
                                label="To Date"
                                format="DD-MM-YYYY"
                                value={toDate}
                                onChange={(newValue) => setToDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 170 } } }}
                            />
                        </LocalizationProvider>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 140 }}>
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 140 }}>
                            <Select
                                value={day}
                                onChange={(e) => setDay(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="all">All Days</MenuItem>
                                <MenuItem value="Monday">Monday</MenuItem>
                                <MenuItem value="Tuesday">Tuesday</MenuItem>
                                <MenuItem value="Wednesday">Wednesday</MenuItem>
                                <MenuItem value="Thursday">Thursday</MenuItem>
                                <MenuItem value="Friday">Friday</MenuItem>
                                <MenuItem value="Saturday">Saturday</MenuItem>
                                <MenuItem value="Sunday">Sunday</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 180 }}>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="login_date_desc">Date ↓ (Latest)</MenuItem>
                                <MenuItem value="login_date_asc">Date ↑ (Oldest)</MenuItem>
                                <MenuItem value="working_hours_desc">Working Hrs: High to Low</MenuItem>
                                <MenuItem value="working_hours_asc">Working Hrs: Low to High</MenuItem>
                            </Select>
                        </FormControl>

                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 200 }}
                            options={employeeOptions}
                            getOptionLabel={(option) => `${option.employee_name} (${option.name})`}
                            isOptionEqualToValue={(option, value) => option.name === value.name}
                            value={employeeOptions.filter((opt) => employee.includes(opt.name))}
                            onChange={(event, newValue) => {
                                setEmployee(newValue.map((opt) => opt.name));
                            }}
                            disabled={!isHR}
                            renderOption={(props, option, { selected: isSelected }) => (
                                <li {...props} key={option.name}>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                            {option.employee_name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                            ID: {option.name}
                                        </Typography>
                                    </Box>
                                    {isSelected && (
                                        <Iconify icon={"solar:check-circle-bold" as any} width={20} sx={{ color: 'primary.main', ml: 1 }} />
                                    )}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Employee"
                                    placeholder="Select Employee(s)"
                                />
                            )}
                        />

                        <Box sx={{ flexGrow: 1 }} />
                        {canExport && (
                            <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
                                <Button
                                    variant="contained"
                                    startIcon={exportingExcel ? undefined : <Iconify icon={"solar:export-bold" as any} />}
                                    onClick={() => handleOpenExportDialog('excel')}
                                    disabled={reportData.length === 0 || exportingExcel}
                                    sx={{
                                        bgcolor: '#0ea5e9',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: '#0284c7' },
                                        height: 40,
                                        px: 3,
                                    }}
                                >
                                    {exportingExcel ? 'Exporting Excel...' : 'Export Excel'}
                                </Button>

                                <Button
                                    variant="contained"
                                    startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                                    onClick={() => handleOpenExportDialog('pdf')}
                                    disabled={reportData.length === 0 || exportingPdf}
                                    sx={{
                                        bgcolor: '#f43f5e',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: '#e11d48' },
                                        height: 40,
                                        px: 3,
                                    }}
                                >
                                    {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </Card>

                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: {
                            xs: 'repeat(1, 1fr)',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(5, 1fr)',
                        },
                    }}
                >
                    <SummaryCard
                        item={{
                            label: 'Total Days',
                            value: totalDaysCount,
                            indicator: 'blue',
                            action: (
                                <IconButton
                                    size="small"
                                    disabled={!isFilterApplied}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTotalDaysAnchorEl(e.currentTarget);
                                    }}
                                    sx={{
                                        p: 0.25,
                                        color: 'info.main',
                                        '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.1) },
                                    }}
                                    title="View Working Days & Holidays"
                                >
                                    <Iconify icon={"eva:info-outline" as any} width={16} />
                                </IconButton>
                            ),
                        }}
                    />
                    <SummaryCard
                        item={{
                            label: 'Present',
                            value: presentCount,
                            indicator: 'green',
                            action: (
                                <IconButton
                                    size="small"
                                    disabled={!isFilterApplied}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPresentAnchorEl(e.currentTarget);
                                    }}
                                    sx={{
                                        p: 0.25,
                                        color: 'success.main',
                                        '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.1) },
                                    }}
                                    title="View Present Days & Holidays Breakdown"
                                >
                                    <Iconify icon={"eva:info-outline" as any} width={16} />
                                </IconButton>
                            ),
                        }}
                    />
                    <SummaryCard item={{ label: 'Absent', value: absentCount, indicator: 'red' }} />
                    <SummaryCard item={{ label: 'Work Hours', value: totalWorkHours.toFixed(1), suffix: 'Hrs', indicator: 'green' }} />
                    <SummaryCard item={{ label: 'Break Hours', value: totalBreakHours.toFixed(1), suffix: 'Hrs', indicator: 'orange' }} />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            bgcolor: alpha(theme.palette.grey[500], 0.06),
                            p: 0.5,
                            borderRadius: '24px',
                            border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                        }}
                    >
                        {(employee.length !== 1
                            ? [
                                { value: 'list', label: 'List View', icon: 'solar:list-bold' },
                                { value: 'muster', label: 'Muster Roll View', icon: 'material-symbols:grid-on' }
                            ]
                            : [
                                { value: 'list', label: 'List View', icon: 'solar:list-bold' },
                                { value: 'calendar', label: 'Calendar View', icon: 'solar:calendar-bold' },
                                { value: 'muster', label: 'Muster Roll View', icon: 'material-symbols:grid-on' }
                            ]
                        ).map((tab) => {
                            const isActive = currentView === tab.value;
                            return (
                                <Button
                                    key={tab.value}
                                    onClick={() => setCurrentView(tab.value as any)}
                                    startIcon={<Iconify icon={tab.icon as any} width={16} />}
                                    sx={{
                                        borderRadius: '20px',
                                        px: 3,
                                        py: 0.75,
                                        fontSize: '0.825rem',
                                        fontWeight: isActive ? 700 : 600,
                                        color: isActive ? '#fff' : theme.palette.text.secondary,
                                        bgcolor: isActive ? '#059669' : 'transparent',
                                        boxShadow: isActive ? `0 2px 8px ${alpha('#059669', 0.3)}` : 'none',
                                        textTransform: 'capitalize',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            bgcolor: isActive ? '#059669' : alpha(theme.palette.grey[500], 0.08),
                                        }
                                    }}
                                >
                                    {tab.label}
                                </Button>
                            );
                        })}
                    </Box>
                </Box>

                {currentView === 'list' && (
                    <Card>
                        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                            <Scrollbar>
                                <Table size="medium" stickyHeader sx={{ borderCollapse: 'collapse' }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    indeterminate={selected.length > 0 && selected.length < reportData.length}
                                                    checked={reportData.length > 0 && selected.length === reportData.length}
                                                    onChange={handleSelectAllClick}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Login</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Logout</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Work Hours</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Break Hours</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', position: 'sticky', right: 0, bgcolor: '#f4f6f8', zIndex: 11 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                                    <CircularProgress sx={{ color: '#059669' }} />
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {reportData
                                                    .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                                                    .map((row, index) => {
                                                        const isSelected = selected.indexOf(row.name) !== -1;
                                                        return (
                                                            <TableRow
                                                                key={row.name}
                                                                hover
                                                                selected={isSelected}
                                                                sx={{
                                                                    '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                                    '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                                }}
                                                            >
                                                                <TableCell padding="checkbox">
                                                                    <Checkbox checked={isSelected} onClick={(event) => handleClick(event, row.name)} />
                                                                </TableCell>
                                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.login_date, 'DD-MM-YYYY')}</TableCell>
                                                                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    <Typography variant="subtitle2">{row.employee_name}</Typography>
                                                                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>{row.employee}</Typography>
                                                                </TableCell>
                                                                <TableCell>{row.login_time ? dayjs(row.login_time).format('HH:mm:ss') : '---'}</TableCell>
                                                                <TableCell>{row.logout_time ? dayjs(row.logout_time).format('HH:mm:ss') : '---'}</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>{row.total_work_hours?.toFixed(2) || '0.00'} Hrs</TableCell>
                                                                <TableCell>{row.total_break_hours?.toFixed(2) || '0.00'} Hrs</TableCell>
                                                                <TableCell>
                                                                    <Label color={row.status === 'Active' ? 'success' : 'error'} variant="soft">
                                                                        {row.status}
                                                                    </Label>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                                                                    <IconButton onClick={() => handleViewDetails(row)} sx={{ color: 'info.main' }}>
                                                                        <Iconify icon={"solar:eye-bold" as any} />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}

                                                {reportData.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                                            {!isFilterApplied ? (
                                                                <Stack spacing={1} alignItems="center">
                                                                    <Iconify icon={"solar:calendar-date-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                                    <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                        Please select a date filter to view daily logs
                                                                    </Typography>
                                                                </Stack>
                                                            ) : (
                                                                <Stack spacing={1} alignItems="center">
                                                                    <Iconify icon={"solar:filter-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                                    <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                        No data found
                                                                    </Typography>
                                                                </Stack>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </Scrollbar>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={reportData.length}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[10, 25, 50]}
                        />
                    </Card>
                )}

                {currentView === 'calendar' && employee.length === 1 && (
                    <DailyLogCalendar
                        reportData={reportData}
                        employee={employee[0]}
                        fromDate={fromDate}
                        toDate={toDate}
                        leaveApplications={leaveApplications}
                        holidays={holidays}
                        onEventClick={handleViewDetails}
                        onLeaveClick={(leave) => {
                            if (leave?.name) {
                                setSelectedLeaveId(leave.name);
                                setOpenLeaveDetails(true);
                            }
                        }}
                    />
                )}

                {currentView === 'muster' && (
                    <Card sx={{ p: 2.5 }}>
                        <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                            {[
                                { label: 'Present', value: 'P', hideValue: true, color: 'rgba(34, 197, 94, 0.14)', textColor: '#166534' },
                                { label: 'Absent', value: 'A', color: 'rgba(239, 68, 68, 0.14)', textColor: '#991b1b' },
                                { label: 'Half Day', value: 'HD', color: 'rgba(234, 179, 8, 0.16)', textColor: '#854d0e' },
                                { label: 'Leave Applied', value: '', hideValue: true, color: '#CECBF6', textColor: '#26215C' },
                            ].map((item) => (
                                <Stack key={item.label} direction="row" alignItems="center" spacing={1}>
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 24,
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: item.color,
                                            color: item.textColor,
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {item.hideValue ? '' : item.value}
                                    </Box>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        {item.label}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>

                        <TableContainer
                            ref={musterScrollRef}
                            onMouseDown={handleMusterMouseDown}
                            onMouseMove={handleMusterMouseMove}
                            onMouseUp={handleMusterMouseUp}
                            onMouseLeave={handleMusterMouseUp}
                            sx={{
                                position: 'relative',
                                overflowX: 'auto',
                                borderRadius: '12px',
                                border: (t) => `1px solid ${t.palette.divider}`,
                                bgcolor: 'background.paper',
                                cursor: 'grab',
                                userSelect: 'none',
                            }}
                        >
                            <Table size="medium" sx={{ borderCollapse: 'collapse', minWidth: 800 }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                                        <TableCell
                                            sx={{
                                                position: 'sticky',
                                                left: 0,
                                                bgcolor: '#f4f6f8',
                                                zIndex: 12,
                                                minWidth: 220,
                                                fontWeight: 700,
                                                borderRight: (t) => `1px solid ${t.palette.divider}`
                                            }}
                                        >
                                            Employee
                                        </TableCell>
                                        {dates.map((date) => (
                                            <TableCell
                                                key={date.format('YYYY-MM-DD')}
                                                align="center"
                                                sx={{
                                                    minWidth: 120,
                                                    p: 1.5,
                                                    borderRight: (t) => `1px solid ${t.palette.divider}`
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                                    {date.format('MMM')}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 400, display: 'block', color: 'text.secondary', fontSize: '0.75rem', mt: 0.3 }}>
                                                    {date.format('ddd')}
                                                </Typography>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.2, fontSize: 16 }}>
                                                    {date.format('DD')}
                                                </Typography>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={dates.length + 1} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {paginatedEmployees.map((emp, empIndex) => (
                                                <TableRow key={emp.id} hover sx={{ '& td': { py: 1.5 } }}>
                                                    <TableCell
                                                        sx={{
                                                            position: 'sticky',
                                                            left: 0,
                                                            bgcolor: 'background.paper',
                                                            zIndex: 10,
                                                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                                                            borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                                            boxShadow: '4px 0 8px -4px rgba(0,0,0,0.12)'
                                                        }}
                                                    >
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{emp.name}</Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>{emp.id}</Typography>
                                                    </TableCell>
                                                    {dates.map((date) => {
                                                        const isHoliday = isDateHoliday(date);
                                                        if (isHoliday) {
                                                            if (empIndex === 0) {
                                                                return (
                                                                    <TableCell
                                                                        key={date.format('YYYY-MM-DD')}
                                                                        rowSpan={paginatedEmployees.length}
                                                                        align="center"
                                                                        sx={{
                                                                            minWidth: 120,
                                                                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                                                                            borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                                                            bgcolor: 'rgba(244, 63, 94, 0.08)',
                                                                            p: 0,
                                                                            verticalAlign: 'middle'
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                height: '100%',
                                                                                minHeight: 80,
                                                                                textTransform: 'uppercase',
                                                                                letterSpacing: 1.5,
                                                                                fontSize: '0.825rem',
                                                                                fontWeight: 800,
                                                                                color: '#9f1239',
                                                                            }}
                                                                        >
                                                                            Holiday
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            } else {
                                                                return null;
                                                            }
                                                        }

                                                        const cellStatus = getAttendanceStatus(emp.id, date);
                                                        const showTime = cellStatus === 'P' || cellStatus === 'HD';
                                                        const isLeave = isLeaveStatus(cellStatus);
                                                        const leaveRecord = isLeave ? getApprovedLeaveForDate(emp.id, date) : null;
                                                        const times = showTime ? getAttendanceTimes(emp.id, date) : null;
                                                        const record = getSessionRecord(emp.id, date);
                                                        const isClickable = !!record || !!leaveRecord;
                                                        return (
                                                            <TableCell
                                                                key={date.format('YYYY-MM-DD')}
                                                                align="center"
                                                                sx={{
                                                                    minWidth: 120,
                                                                    borderRight: (t) => `1px solid ${t.palette.divider}`,
                                                                    borderBottom: (t) => `1px solid ${t.palette.divider}`
                                                                }}
                                                            >
                                                                <Box
                                                                    onClick={isClickable ? () => handleMusterCellClick(record, leaveRecord) : undefined}
                                                                    sx={{
                                                                        px: (showTime || isLeave) ? 1 : 0,
                                                                        py: (showTime || isLeave) ? 0.75 : 0,
                                                                        width: showTime ? 90 : (isLeave ? 95 : 32),
                                                                        minHeight: 32,
                                                                        borderRadius: '8px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '0.725rem',
                                                                        cursor: isClickable ? 'pointer' : 'inherit',
                                                                        transition: 'opacity 0.15s',
                                                                        '&:hover': isClickable ? { opacity: 0.78, transform: 'scale(1.06)' } : {},
                                                                        ...getStatusStyles(cellStatus),
                                                                    }}
                                                                >
                                                                    {showTime && times ? (
                                                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }}>
                                                                            <Box component="span" sx={{ fontSize: '0.725rem', fontWeight: 700 }}>{times.inTime}</Box>
                                                                            <Box component="span" sx={{ fontSize: '0.625rem', fontWeight: 500, opacity: 0.6, my: 0.1, textTransform: 'lowercase' }}>to</Box>
                                                                            <Box component="span" sx={{ fontSize: '0.725rem', fontWeight: 700 }}>{times.outTime}</Box>
                                                                        </Box>
                                                                    ) : isLeave ? (
                                                                        <Tooltip
                                                                            title={
                                                                                leaveRecord?.permission_hours
                                                                                    ? `${leaveRecord.permission_hours} mins permission`
                                                                                    : leaveRecord?.leave_type || cellStatus
                                                                            }
                                                                            arrow
                                                                        >
                                                                            <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                                {leaveRecord?.leave_type || cellStatus}
                                                                                {cellStatus.toLowerCase().includes('permission') && !!leaveRecord?.permission_hours && leaveRecord.permission_hours > 0 ? ` (${leaveRecord.permission_hours}m)` : ''}
                                                                            </Box>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        cellStatus || '-'
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                            {paginatedEmployees.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={Math.max(1, dates.length + 1)} sx={{ py: 10, position: 'relative', border: 0 }}>
                                                        <Box
                                                            sx={{
                                                                position: 'sticky',
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                display: 'flex',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                width: 'max-content',
                                                                maxWidth: '100%',
                                                            }}
                                                        >
                                                            {!isFilterApplied ? (
                                                                <Stack spacing={1} alignItems="center">
                                                                    <Iconify icon={"solar:calendar-date-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                                    <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                        Please select a date filter to view daily logs
                                                                    </Typography>
                                                                </Stack>
                                                            ) : (
                                                                <Stack spacing={1} alignItems="center">
                                                                    <Iconify icon={"solar:filter-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                                    <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                        No data found
                                                                    </Typography>
                                                                </Stack>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={uniqueEmployees.length}
                            page={musterPage}
                            onPageChange={(e, newPage) => setMusterPage(newPage)}
                            rowsPerPage={musterRowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setMusterRowsPerPage(parseInt(e.target.value, 10));
                                setMusterPage(0);
                            }}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                        />
                    </Card>
                )}
            </Stack>

            <EmployeeDailyLogDetailsDialog
                open={openDetails}
                onClose={() => {
                    setOpenDetails(false);
                    setTimeout(() => setSelectedSession(null), 200);
                }}
                session={selectedSession}
            />

            <LeavesDetailsDialog
                open={openLeaveDetails}
                onClose={() => {
                    setOpenLeaveDetails(false);
                    setSelectedLeaveId(null);
                }}
                leaveId={selectedLeaveId}
            />

            <Dialog
                open={openExportDialog}
                onClose={() => setOpenExportDialog(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
                    Export Report
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpenExportDialog(false)}
                        sx={{
                            position: 'absolute',
                            right: 12,
                            top: 12,
                            color: (t) => t.palette.grey[500],
                        }}
                    >
                        <Iconify icon={"mingcute:close-line" as any} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        {selectedExportView === 'muster'
                            ? 'Please choose which data view you would like to export (Muster Roll is only available in Excel format):'
                            : `Please choose which data view you would like to export to ${exportType === 'excel' ? 'Excel' : 'PDF'}:`
                        }
                    </Typography>
                    <RadioGroup
                        value={selectedExportView}
                        onChange={(e) => setSelectedExportView(e.target.value as 'list' | 'muster')}
                    >
                        <FormControlLabel
                            value="list"
                            control={<Radio color="primary" />}
                            label={
                                <Box sx={{ ml: 0.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                        <Iconify icon={"solar:list-bold" as any} width={18} sx={{ color: 'text.secondary' }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>List View</Typography>
                                    </Stack>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                        Exports detailed daily log logs, including login/logout times, durations, breaks, and intervals.
                                    </Typography>
                                </Box>
                            }
                            sx={{
                                pt: 2,
                                mt: 1,
                                borderTop: (t) => `1px solid ${t.palette.divider}`,
                                mb: 2,
                                alignItems: 'flex-start'
                            }}
                        />
                        {exportType !== 'pdf' && (
                            <FormControlLabel
                                value="muster"
                                control={<Radio color="primary" />}
                                label={
                                    <Box sx={{ ml: 0.5 }}>
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                            <Iconify icon={"material-symbols:grid-on" as any} width={18} sx={{ color: 'text.secondary' }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Muster Roll View</Typography>
                                        </Stack>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                            Exports grid-based color-coded daily attendance summary (P, A, HD, H) for the selected dates (Excel format only).
                                        </Typography>
                                    </Box>
                                }
                                sx={{ alignItems: 'flex-start' }}
                            />
                        )}
                    </RadioGroup>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'flex-end', gap: 1.5 }}>
                    {selectedExportView === 'list' ? (
                        <>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    setOpenExportDialog(false);
                                    handleExport('list');
                                }}
                                sx={{
                                    bgcolor: '#0ea5e9',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#0284c7' }
                                }}
                            >
                                Export Excel
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    setOpenExportDialog(false);
                                    handleExportPdf('list');
                                }}
                                sx={{
                                    bgcolor: '#f43f5e',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#e11d48' }
                                }}
                            >
                                Export PDF
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={() => {
                                setOpenExportDialog(false);
                                handleExport('muster');
                            }}
                            sx={{
                                bgcolor: '#0ea5e9',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#0284c7' }
                            }}
                        >
                            Export Excel
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Total Days Breakdown Popover */}
            <Popover
                open={Boolean(totalDaysAnchorEl)}
                anchorEl={totalDaysAnchorEl}
                onClose={() => setTotalDaysAnchorEl(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        p: 2,
                        width: 380,
                        maxHeight: 460,
                        borderRadius: 2,
                        boxShadow: (themeVar) => themeVar.customShadows.z20,
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
                disableScrollLock
            >
                {/* Header */}
                <Box sx={{ mb: 1.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            Total Days Breakdown
                        </Typography>
                        <IconButton size="small" onClick={() => setTotalDaysAnchorEl(null)} sx={{ color: 'text.secondary' }}>
                            <Iconify icon={"mingcute:close-line" as any} width={18} />
                        </IconButton>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {fromDate && toDate
                            ? `${fromDate.format('DD MMM YYYY')} — ${toDate.format('DD MMM YYYY')}`
                            : `${daysBreakdown.length} days in selected period`}
                    </Typography>
                </Box>

                {/* Summary Chips */}
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Box
                        onClick={() => setDaysTab('all')}
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: daysTab === 'all' ? alpha(theme.palette.info.main, 0.12) : alpha(theme.palette.grey[500], 0.08),
                            border: `1px solid ${daysTab === 'all' ? theme.palette.info.main : 'transparent'}`,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                            Total Days
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'info.main' }}>
                            {totalDaysCount}
                        </Typography>
                    </Box>

                    <Box
                        onClick={() => setDaysTab('working')}
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: daysTab === 'working' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.grey[500], 0.08),
                            border: `1px solid ${daysTab === 'working' ? theme.palette.success.main : 'transparent'}`,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                            Working Days
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                            {workingDaysCount}
                        </Typography>
                    </Box>

                    <Box
                        onClick={() => setDaysTab('holiday')}
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: daysTab === 'holiday' ? alpha(theme.palette.error.main, 0.12) : alpha(theme.palette.grey[500], 0.08),
                            border: `1px solid ${daysTab === 'holiday' ? theme.palette.error.main : 'transparent'}`,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                            Holidays
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main' }}>
                            {holidaysCount}
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 1, borderStyle: 'dashed' }} />

                {/* Days List */}
                <Scrollbar sx={{ flexGrow: 1, maxHeight: 260, pr: 0.5 }}>
                    <Stack spacing={1}>
                        {filteredDaysBreakdown.length > 0 ? (
                            filteredDaysBreakdown.map((item, idx) => {
                                const isHol = item.isHoliday;
                                return (
                                    <Box
                                        key={item.dateStr}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 0.75,
                                            px: 1.25,
                                            borderRadius: 1,
                                            bgcolor: isHol ? alpha(theme.palette.error.main, 0.04) : alpha(theme.palette.success.main, 0.04),
                                            ...(idx !== filteredDaysBreakdown.length - 1 && {
                                                borderBottom: `1px dashed ${theme.palette.divider}`,
                                            }),
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                            {item.date.format('DD-MM-YYYY — dddd')}
                                        </Typography>

                                        <Box
                                            component="span"
                                            sx={{
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 0.75,
                                                fontSize: '0.725rem',
                                                fontWeight: 700,
                                                color: isHol ? 'info.darker' : 'success.darker',
                                                bgcolor: isHol ? alpha(theme.palette.info.main, 0.14) : alpha(theme.palette.success.main, 0.14),
                                                maxWidth: 130,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                            title={isHol ? item.holidayName || 'Holiday' : 'Working Day'}
                                        >
                                            {isHol ? (item.holidayName || 'Holiday') : 'Working Day'}
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                No days found
                            </Typography>
                        )}
                    </Stack>
                </Scrollbar>
            </Popover>

            {/* Present Days Breakdown Popover */}
            <Popover
                open={Boolean(presentAnchorEl)}
                anchorEl={presentAnchorEl}
                onClose={() => setPresentAnchorEl(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        p: 2,
                        width: 400,
                        maxHeight: 460,
                        borderRadius: 2,
                        boxShadow: (themeVar) => themeVar.customShadows.z20,
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
                disableScrollLock
            >
                {/* Header */}
                <Box sx={{ mb: 1.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            Present Days Breakdown
                        </Typography>
                        <IconButton size="small" onClick={() => setPresentAnchorEl(null)} sx={{ color: 'text.secondary' }}>
                            <Iconify icon={"mingcute:close-line" as any} width={18} />
                        </IconButton>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {fromDate && toDate
                            ? `${fromDate.format('DD MMM YYYY')} — ${toDate.format('DD MMM YYYY')}`
                            : `${presentBreakdownList.length} items in selected period`}
                    </Typography>
                </Box>

                {/* Summary Chips */}
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Box
                        onClick={() => setPresentTab('present')}
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: presentTab === 'present' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.grey[500], 0.08),
                            border: `1px solid ${presentTab === 'present' ? theme.palette.success.main : 'transparent'}`,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                            Present
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main' }}>
                            {presentCount}
                        </Typography>
                    </Box>

                    <Box
                        onClick={() => setPresentTab('holiday')}
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: presentTab === 'holiday' ? alpha(theme.palette.warning.main, 0.12) : alpha(theme.palette.grey[500], 0.08),
                            border: `1px solid ${presentTab === 'holiday' ? theme.palette.warning.main : 'transparent'}`,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                            Holidays
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.main' }}>
                            {holidaysCount}
                        </Typography>
                    </Box>

                    <Box
                        onClick={() => setPresentTab('all')}
                        sx={{
                            flex: 1,
                            p: 1,
                            borderRadius: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: presentTab === 'all' ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.grey[500], 0.08),
                            border: `1px solid ${presentTab === 'all' ? theme.palette.primary.main : 'transparent'}`,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                            Present + Holidays
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            {Number((presentCount + holidaysCount).toFixed(1))}
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 1, borderStyle: 'dashed' }} />

                {/* Days List */}
                <Scrollbar sx={{ flexGrow: 1, maxHeight: 260, pr: 0.5 }}>
                    <Stack spacing={1}>
                        {filteredPresentBreakdown.length > 0 ? (
                            filteredPresentBreakdown.map((item, idx) => {
                                const isHol = item.type === 'holiday';
                                const isHalf = item.type === 'half_day';
                                const isPaidL = item.type === 'paid_leave';

                                let badgeColor = 'success.darker';
                                let badgeBg = alpha(theme.palette.success.main, 0.14);
                                if (isHol) {
                                    badgeColor = 'warning.darker';
                                    badgeBg = alpha(theme.palette.warning.main, 0.14);
                                } else if (isHalf) {
                                    badgeColor = 'info.darker';
                                    badgeBg = alpha(theme.palette.info.main, 0.14);
                                } else if (isPaidL) {
                                    badgeColor = 'secondary.darker';
                                    badgeBg = alpha(theme.palette.secondary.main, 0.14);
                                }

                                return (
                                    <Box
                                        key={item.dateStr}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 0.75,
                                            px: 1.25,
                                            borderRadius: 1,
                                            bgcolor: isHol ? alpha(theme.palette.warning.main, 0.04) : alpha(theme.palette.success.main, 0.04),
                                            ...(idx !== filteredPresentBreakdown.length - 1 && {
                                                borderBottom: `1px dashed ${theme.palette.divider}`,
                                            }),
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                            {item.dateStr}
                                        </Typography>

                                        <Box
                                            component="span"
                                            sx={{
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 0.75,
                                                fontSize: '0.725rem',
                                                fontWeight: 700,
                                                color: badgeColor,
                                                bgcolor: badgeBg,
                                                maxWidth: 150,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                            title={item.label}
                                        >
                                            {item.label}
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                No items found
                            </Typography>
                        )}
                    </Stack>
                </Scrollbar>
            </Popover>
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------

function SummaryCard({ item }: { item: any }) {
    const theme = useTheme();

    const getIndicatorColor = (indicator: string) => {
        switch (indicator?.toLowerCase()) {
            case 'blue': return theme.palette.info.main;
            case 'green': return theme.palette.success.main;
            case 'orange': return theme.palette.warning.main;
            case 'red': return theme.palette.error.main;
            default: return theme.palette.primary.main;
        }
    };

    const getIcon = (label: string) => {
        const t = label.toLowerCase();
        if (t.includes('work')) return 'solar:clock-circle-bold-duotone';
        if (t.includes('break')) return 'solar:cup-hot-bold-duotone';
        if (t.includes('present') || t.includes('active')) return 'solar:check-circle-bold-duotone';
        if (t.includes('absent') || t.includes('inactive')) return 'solar:danger-circle-bold-duotone';
        if (t.includes('days')) return 'solar:calendar-date-bold-duotone';
        if (t.includes('sessions')) return 'solar:list-bold-duotone';
        return 'solar:chart-2-bold-duotone';
    };

    const color = getIndicatorColor(item.indicator);

    return (
        <Card
            sx={{
                p: 1.5,
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                bgcolor: alpha(color, 0.04),
                border: `1px solid ${alpha(color, 0.1)}`,
                transition: theme.transitions.create(['transform', 'box-shadow']),
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px -4px ${alpha(color, 0.12)}`,
                },
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                    sx={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        display: 'flex',
                        borderRadius: 1.5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        bgcolor: alpha(color, 0.1),
                    }}
                >
                    <Iconify icon={getIcon(item.label) as any} width={18} />
                </Box>

                <Box sx={{ flexGrow: 1, pl: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.2 }}>
                            {item.label}
                        </Typography>
                        {item.action}
                    </Stack>
                    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                        {item.value?.toLocaleString()}{item.suffix ? ` ${item.suffix}` : ''}
                    </Typography>
                </Box>
            </Stack>

            <Box
                sx={{
                    top: -16,
                    right: -16,
                    width: 80,
                    height: 80,
                    opacity: 0.08,
                    position: 'absolute',
                    borderRadius: '50%',
                    bgcolor: color,
                }}
            />
        </Card>
    );
}
