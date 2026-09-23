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
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fDate } from 'src/utils/format-time';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { fetchLeaveApplications } from 'src/api/leaves';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { AttendanceCalendar } from './attendance-calendar';
import { AttendanceDetailsDialog } from '../attendance-details-dialog';
import { LeavesDetailsDialog } from '../../leaves/leaves-details-dialog';


export function AttendanceReportView() {
    const theme = useTheme();
    const { user } = useAuth();
    const actionPerms =
      user?.permissions?.actions?.my_attendance_report ||
      user?.permissions?.actions?.attendance_report ||
      user?.permissions?.actions?.report_attendance;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canExport = hasCustomPerms ? !!actionPerms?.export : true;

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
    const [sortBy, setSortBy] = useState('date_asc');
    const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'muster'>('list');
    const [musterPage, setMusterPage] = useState(0);
    const [musterRowsPerPage, setMusterRowsPerPage] = useState(50);
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
    const [selectedExportView, setSelectedExportView] = useState<'list' | 'muster'>('list');
    const [preparing, setPreparing] = useState(false);

    // --- Muster Roll drag-scroll (ref-based — zero React re-renders) ---
    const musterScrollRef = useRef<HTMLDivElement>(null);
    const isDraggingMuster = useRef(false);
    const musterDragStartX = useRef(0);
    const musterScrollStartLeft = useRef(0);
    const musterDragMoved = useRef(0); // tracks how far mouse moved during drag

    const handleMusterMouseDown = (e: React.MouseEvent) => {
        const el = musterScrollRef.current;
        if (!el) return;
        isDraggingMuster.current = true;
        musterDragStartX.current = e.clientX;
        musterScrollStartLeft.current = el.scrollLeft;
        musterDragMoved.current = 0;
        el.style.cursor = 'grabbing';
    };

    const handleMusterMouseLeave = () => {
        const el = musterScrollRef.current;
        if (!el) return;
        isDraggingMuster.current = false;
        el.style.cursor = 'grab';
    };

    const handleMusterMouseUp = () => {
        const el = musterScrollRef.current;
        if (!el) return;
        isDraggingMuster.current = false;
        el.style.cursor = 'grab';
    };

    const handleMusterMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingMuster.current) return;
        const el = musterScrollRef.current;
        if (!el) return;
        const dx = e.clientX - musterDragStartX.current;
        musterDragMoved.current = Math.abs(dx);
        el.scrollLeft = musterScrollStartLeft.current - dx;
    };
    // --- end drag-scroll ---

    // Open details dialog only when user clicked (not dragged)
    const handleMusterCellClick = (attendanceName?: string, leave?: any) => {
        if (musterDragMoved.current > 15) return; // was a drag, not a click
        if (attendanceName) {
            handleViewDetails(attendanceName);
        } else if (leave) {
            setSelectedLeaveId(leave.name);
            setOpenLeaveDetails(true);
        }
    };

    const handleViewChange = useCallback((newView: 'list' | 'calendar' | 'muster') => {
        if (newView === currentView) return;
        setPreparing(true);
        setTimeout(() => {
            setCurrentView(newView);
            setPreparing(false);
        }, 100);
    }, [currentView]);


    useEffect(() => {
        if (employee.length === 0 && currentView === 'calendar') {
            setCurrentView('list');
        }
    }, [employee, currentView]);

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


    // Options
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    const visibleReportData = reportData.filter((row) => row.status !== 'Missing');

    const isFilterApplied = !!fromDate && !!toDate;

    // Details Dialog
    const [openDetails, setOpenDetails] = useState(false);
    const [selectedAttendanceName, setSelectedAttendanceName] = useState<string | null>(null);

    // Leave Details Dialog
    const [openLeaveDetails, setOpenLeaveDetails] = useState(false);
    const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);

    // Leave Applications (fetched alongside report data)
    const [leaveApplications, setLeaveApplications] = useState<any[]>([]);

    const handleViewDetails = (name: string) => {
        setSelectedAttendanceName(name);
        setOpenDetails(true);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = visibleReportData.map((n) => n.name);
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

    const dates = useMemo(() => {
        const startStr = fromDate ? fromDate.format('YYYY-MM-DD') : (reportData.length > 0
            ? reportData.reduce((min, p) => p.attendance_date < min ? p.attendance_date : min, reportData[0].attendance_date)
            : dayjs().startOf('month').format('YYYY-MM-DD'));
        const endStr = toDate ? toDate.format('YYYY-MM-DD') : (reportData.length > 0
            ? reportData.reduce((max, p) => p.attendance_date > max ? p.attendance_date : max, reportData[0].attendance_date)
            : dayjs().endOf('month').format('YYYY-MM-DD'));

        const start = dayjs(startStr);
        const end = dayjs(endStr);

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
    }, [fromDate, toDate, reportData]);

    const uniqueEmployees = useMemo(() => {
        const activeEmployees = new Set(
            reportData
                .filter((row) => row.status !== 'Missing')
                .map((row) => row.employee)
        );

        return Array.from(
            new Map(
                reportData
                    .filter((row) => activeEmployees.has(row.employee))
                    .map((row) => [row.employee, { id: row.employee, name: row.employee_name }])
            ).values()
        );
    }, [reportData]);

    const paginatedEmployees = useMemo(() => uniqueEmployees.slice(
        musterPage * musterRowsPerPage,
        musterPage * musterRowsPerPage + musterRowsPerPage
    ), [uniqueEmployees, musterPage, musterRowsPerPage]);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, any>();
        reportData.forEach((row) => {
            if (row.employee && row.attendance_date) {
                const dateStr = dayjs(row.attendance_date).format('YYYY-MM-DD');
                map.set(`${row.employee}_${dateStr}`, row);
            }
        });
        return map;
    }, [reportData]);

    const holidayDatesSet = useMemo(() => {
        const set = new Set<string>();
        reportData.forEach((row) => {
            if (row.status === 'Holiday' && row.attendance_date) {
                set.add(dayjs(row.attendance_date).format('YYYY-MM-DD'));
            }
        });
        return set;
    }, [reportData]);

    const getAttendanceRecord = useCallback((employeeId: string, date: dayjs.Dayjs) => {
        const dateStr = date.format('YYYY-MM-DD');
        return attendanceMap.get(`${employeeId}_${dateStr}`);
    }, [attendanceMap]);

    const getApprovedLeaveForDate = useCallback((employeeId: string, date: dayjs.Dayjs) => {
        if (!leaveApplications.length) return null;
        return leaveApplications.find((leave) => {
            if (leave.employee !== employeeId) return false;
            const isApproved = leave.workflow_state === 'Approved' || leave.status === 'Approved';
            if (!isApproved) return false;
            const from = dayjs(leave.from_date);
            const to = dayjs(leave.to_date);
            return (date.isSame(from, 'day') || date.isAfter(from, 'day')) &&
                   (date.isSame(to, 'day') || date.isBefore(to, 'day'));
        }) || null;
    }, [leaveApplications]);

    const isLeaveStatus = useCallback((val: string) => !['P', 'A', 'HD', 'H', ''].includes(val), []);

    const getAttendanceStatus = useCallback((employeeId: string, date: dayjs.Dayjs) => {
        const record = getAttendanceRecord(employeeId, date);
        if (!record) return '';
        if (record.status === 'Missing') return '';
        if (record.status === 'Present') return 'P';
        if (record.status === 'Half Day') return 'HD';
        if (record.status === 'Holiday') return 'H';
        if (record.status === 'Absent') {
            const leave = getApprovedLeaveForDate(employeeId, date);
            if (leave) return leave.leave_type as string;
            return 'A';
        }
        return record.status;
    }, [getAttendanceRecord, getApprovedLeaveForDate]);

    const getAttendanceTimes = useCallback((employeeId: string, date: dayjs.Dayjs) => {
        const record = getAttendanceRecord(employeeId, date);
        if (!record) return { inTime: '---', outTime: '---' };

        const formatTime = (timeStr: any) => {
            if (!timeStr || timeStr === '---') return '---';
            const str = String(timeStr);
            if (str.includes('AM') || str.includes('PM') || str.includes('am') || str.includes('pm')) {
                return str;
            }
            const parsed = dayjs(`2026-07-01 ${str}`);
            if (parsed.isValid()) {
                return parsed.format('hh:mm A');
            }
            return str;
        };

        return {
            inTime: formatTime(record.in_time),
            outTime: formatTime(record.out_time)
        };
    }, [getAttendanceRecord]);

    const isDateHoliday = useCallback((date: dayjs.Dayjs) => {
        const dateStr = date.format('YYYY-MM-DD');
        return holidayDatesSet.has(dateStr);
    }, [holidayDatesSet]);

    const getStatusStyles = (cellStatus: string) => {
        if (cellStatus === 'P') return { bgcolor: 'rgba(34, 197, 94, 0.14)', color: '#166534', fontWeight: 'bold' };
        if (cellStatus === 'A') return { bgcolor: 'rgba(239, 68, 68, 0.14)', color: '#991b1b', fontWeight: 'bold' };
        if (cellStatus === 'HD') return { bgcolor: 'rgba(254, 240, 138, 0.5)', color: '#854d0e', fontWeight: 'bold' };
        if (cellStatus === 'H') return { bgcolor: 'rgba(244, 63, 94, 0.14)', color: '#9f1239', fontWeight: 'bold' };
        const s = cellStatus.toLowerCase();
        if (s.includes('unpaid') || s.includes('paid') || s.includes('permission') || s.includes('leave')) {
            return { bgcolor: '#EEEDFE', color: '#26215C', fontWeight: 'bold' };
        }
        if (s.includes('sick')) return { bgcolor: 'rgba(219, 39, 119, 0.14)', color: '#9d174d', fontWeight: 'bold' };
        if (s.includes('casual')) return { bgcolor: 'rgba(13, 148, 136, 0.14)', color: '#115e59', fontWeight: 'bold' };
        return { bgcolor: 'rgba(75, 85, 99, 0.14)', color: '#374151', fontWeight: 'bold' };
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

    const fetchReport = useCallback(async () => {
        if (!fromDate || !toDate) {
            setReportData([]);
            return;
        }
        if (toDate.isBefore(fromDate, 'day')) {
            setReportData([]);
            return;
        }
        setLoading(true);
        try {
            const filters: any = {};
            if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');
            if (employee.length > 0) filters.employee = employee;
            if (status !== 'all') filters.status = status;

            const result = await runReport('Attendance Report', filters);
            let finalData = result.result || [];

            // Sort Data
            finalData = [...finalData].sort((a, b) => {
                const dateA = a.attendance_date;
                const dateB = b.attendance_date;
                const nameA = (a.employee_name || '').toLowerCase();
                const nameB = (b.employee_name || '').toLowerCase();

                switch (sortBy) {
                    case 'date_asc':
                        if (dateB !== dateA) return dateB.localeCompare(dateA);
                        return nameA.localeCompare(nameB);
                    case 'date_desc':
                        if (dateA !== dateB) return dateA.localeCompare(dateB);
                        return nameA.localeCompare(nameB);
                    case 'name_asc':
                        if (nameA !== nameB) return nameA.localeCompare(nameB);
                        return dateB.localeCompare(dateA);
                    case 'name_desc':
                        if (nameA !== nameB) return nameB.localeCompare(nameA);
                        return dateB.localeCompare(dateA);
                    default:
                        return 0;
                }
            });

            setReportData(finalData);
            setPage(0);

            // Fetch approved leave applications for the same date range
            try {
                const leavesRes = await fetchLeaveApplications({
                    page: 1,
                    page_size: 2000,
                    filters: {
                        start_date: fromDate.format('YYYY-MM-DD'),
                        end_date: toDate.format('YYYY-MM-DD'),
                        workflow_state: 'Approved'
                    }
                });
                setLeaveApplications(leavesRes.data || []);
            } catch {
                setLeaveApplications([]);
            }
        } catch (error) {
            console.error('Failed to fetch attendance report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, employee, status, sortBy]);

    useEffect(() => {
        if (fromDate && toDate && toDate.isBefore(fromDate, 'day')) {
            enqueueSnackbar('To Date must be after From Date', { variant: 'error' });
            setToDate(null);
        }
    }, [fromDate, toDate, enqueueSnackbar]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        if (isHR) {
            setEmployee([]);
        } else if (user?.employee) {
            setEmployee([user.employee]);
        }
        setStatus('all');
        setSortBy('date_asc');
    };


    useEffect(() => {
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions);
    }, []);

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
            const sheet = workbook.addWorksheet('Attendance Report');

            // Use all filtered data for export
            const exportData = reportData;

            sheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Employee ID', key: 'employee', width: 15 },
                { header: 'Employee', key: 'employee_name', width: 25 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'In Time', key: 'in_time', width: 15 },
                { header: 'Out Time', key: 'out_time', width: 15 },
                { header: 'Working Hours', key: 'working_hours', width: 15 },
            ];

            const columnCount = sheet.columns.length;

            // Header Styling (Limited to data columns only)
            for (let i = 1; i <= columnCount; i++) {
                const cell = sheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            sheet.getRow(1).height = 25;

            exportData.forEach((row) => {
                const excelRow = sheet.addRow({
                    date: fDate(row.attendance_date, 'DD-MM-YYYY'),
                    employee_name: row.employee_name,
                    employee: row.employee,
                    status: row.status,
                    in_time: row.in_time || '---',
                    out_time: row.out_time || '---',
                    working_hours: row.working_hours_display || '---'
                });

                // Status coloring
                const statusCell = excelRow.getCell('status');
                const statusColors: any = {
                    'Present': 'FF22C55E',
                    'Absent': 'FFEF4444',
                    'Half Day': 'FFF59E0B',
                    'On Leave': 'FF0EA5E9',
                    'Holiday': 'FF1877F2'
                };
                if (statusColors[row.status]) {
                    statusCell.font = { color: { argb: statusColors[row.status] }, bold: true };
                }
            });

            // Merging logic for Date, Employee, and Employee ID
            let mergeStart = 2;
            const totalRows = sheet.rowCount;
            for (let i = 2; i <= totalRows; i++) {
                const current = sheet.getRow(i);
                const next = i < totalRows ? sheet.getRow(i + 1) : null;

                const isLast = i === totalRows;
                const sameAsNext = !isLast && next &&
                    current.getCell(1).value === next.getCell(1).value &&
                    current.getCell(2).value === next.getCell(2).value &&
                    current.getCell(3).value === next.getCell(3).value;

                if (!sameAsNext) {
                    if (i > mergeStart) {
                        sheet.mergeCells(`A${mergeStart}:A${i}`);
                        sheet.mergeCells(`B${mergeStart}:B${i}`);
                        sheet.mergeCells(`C${mergeStart}:C${i}`);

                        ['A', 'B', 'C'].forEach(col => {
                            sheet.getCell(`${col}${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'center' };
                        });
                    }
                    mergeStart = i + 1;
                }
            }

            // Alternating row colors and black borders (Limited to data columns only)
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= columnCount; i++) {
                        const cell = row.getCell(i);
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };

                        // Alternate shading
                        if (rowNumber % 2 === 0) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
                        }

                        // Borders
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
            saveAs(new Blob([buffer]), `Attendance_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Excel export failed:', error);
            enqueueSnackbar('Excel export failed!', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async (targetView?: 'list' | 'muster') => {
        setExportingPdf(true);
        try {
            const doc = new jsPDF('landscape');

            // Use all filtered data for export
            const exportData = reportData;

            // Header
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Attendance Report', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            // Accent line
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const tableData: any[] = [];
            for (let i = 0; i < exportData.length; i++) {
                const row = exportData[i];
                const currentDate = fDate(row.attendance_date, 'DD-MM-YYYY');
                const currentEmployee = row.employee_name;
                const currentEmployeeId = row.employee;

                // Grouping check (mirroring Excel merge)
                let isStart = true;
                if (i > 0) {
                    const prevRow = exportData[i - 1];
                    if (fDate(prevRow.attendance_date, 'DD-MM-YYYY') === currentDate &&
                        prevRow.employee_name === currentEmployee &&
                        prevRow.employee === currentEmployeeId) {
                        isStart = false;
                    }
                }

                if (isStart) {
                    // Calculate span
                    let span = 1;
                    while (i + span < exportData.length) {
                        const nextRow = exportData[i + span];
                        if (fDate(nextRow.attendance_date, 'DD-MM-YYYY') === currentDate &&
                            nextRow.employee_name === currentEmployee &&
                            nextRow.employee === currentEmployeeId) {
                            span++;
                        } else {
                            break;
                        }
                    }

                    tableData.push([
                        { content: currentDate, rowSpan: span, styles: { valign: 'middle', halign: 'center' } },
                        { content: currentEmployee, rowSpan: span, styles: { valign: 'middle', halign: 'center' } },
                        { content: currentEmployeeId, rowSpan: span, styles: { valign: 'middle', halign: 'center' } },
                        row.status,
                        row.in_time || '---',
                        row.out_time || '---',
                        row.working_hours_display || '---'
                    ]);
                } else {
                    tableData.push([
                        // Spanned columns omitted
                        row.status,
                        row.in_time || '---',
                        row.out_time || '---',
                        row.working_hours_display || '---'
                    ]);
                }
            }

            autoTable(doc, {
                startY: 40,
                head: [['Date', 'Employee', 'Employee ID', 'Status', 'In Time', 'Out Time', 'Working Hours']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 30 },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    6: { halign: 'center' },
                },
                didParseCell: (data) => {
                    const statusVal = data.cell.text[0];
                    const statusColors: any = {
                        'Present': [34, 197, 94],
                        'Absent': [239, 68, 68],
                        'Half Day': [245, 158, 11],
                        'On Leave': [14, 165, 233],
                        'Holiday': [24, 119, 242]
                    };
                    if (data.column.index === 3 && statusColors[statusVal]) {
                        data.cell.styles.textColor = statusColors[statusVal];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            doc.save(`Attendance_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            enqueueSnackbar('PDF exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('PDF export failed:', error);
            enqueueSnackbar('PDF export failed!', { variant: 'error' });
        } finally {
            setExportingPdf(false);
        }
    };

    const onChangePage = useCallback((event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);



    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.5}>
                        <Typography variant="h4">Attendance Report</Typography>
                    </Stack>
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
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 180 } } }}
                            />
                            <DatePicker
                                label="To Date"
                                format="DD-MM-YYYY"
                                value={toDate}
                                onChange={(newValue) => setToDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 180 } } }}
                            />
                        </LocalizationProvider>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 140 }}>
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="Present">Present</MenuItem>
                                <MenuItem value="Absent">Absent</MenuItem>
                                <MenuItem value="On Leave">On Leave</MenuItem>
                                <MenuItem value="Half Day">Half Day</MenuItem>
                                <MenuItem value="Holiday">Holiday</MenuItem>
                                <MenuItem value="Missing">Missing</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 180 }}>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="date_asc">Date ↓ (Latest)</MenuItem>
                                <MenuItem value="date_desc">Date ↑ (Oldest)</MenuItem>
                                <MenuItem value="name_asc">Name: A to Z</MenuItem>
                                <MenuItem value="name_desc">Name: Z to A</MenuItem>
                            </Select>
                        </FormControl>

                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 350 }}
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
                            md: 'repeat(6, 1fr)', // 6 columns for 6 cards
                        },
                    }}
                >
                    <SummaryCard item={{ label: 'Total Entries', value: reportData.length, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Present', value: reportData.filter(d => d.status === 'Present').length, indicator: 'green' }} />
                    <SummaryCard item={{ label: 'Absent', value: reportData.filter(d => d.status === 'Absent').length, indicator: 'red' }} />
                    <SummaryCard item={{ label: 'Half Day', value: reportData.filter(d => d.status === 'Half Day').length, indicator: 'orange' }} />
                    <SummaryCard item={{ label: 'Missing', value: reportData.filter(d => d.status === 'Missing').length, indicator: 'orange' }} />
                    <SummaryCard item={{ label: 'Holiday', value: reportData.filter(d => d.status === 'Holiday').length, indicator: 'blue' }} />
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
                                    onClick={() => handleViewChange(tab.value as any)}
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

                {preparing ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <CircularProgress sx={{ color: '#059669' }} />
                    </Box>
                ) : (
                    <>
                        {currentView === 'list' && (
                            <Card>
                                <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                                    <Scrollbar>
                                        <Table
                                            size="medium"
                                            stickyHeader
                                            sx={{ borderCollapse: 'collapse' }}
                                        >
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            indeterminate={
                                                                selected.length > 0 &&
                                                                selected.length < visibleReportData.length
                                                            }
                                                            checked={
                                                                visibleReportData.length > 0 &&
                                                                selected.length === visibleReportData.length
                                                            }
                                                            onChange={handleSelectAllClick}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee ID</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>In Time</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Out Time</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Working Hours</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }} />
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
                                                        {visibleReportData
                                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                                            .map((row) => {
                                                                const isSelected = selected.indexOf(row.name) !== -1;
                                                                return (
                                                                    <TableRow
                                                                        key={row.name}
                                                                        hover
                                                                        selected={isSelected}
                                                                        sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                                                    >
                                                                        <TableCell padding="checkbox">
                                                                            <Checkbox
                                                                                checked={isSelected}
                                                                                onClick={(event) => handleClick(event, row.name)}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>{fDate(row.attendance_date, 'DD-MM-YYYY')}</TableCell>
                                                                        <TableCell sx={{ fontWeight: 600 }}>{row.employee_name}</TableCell>
                                                                        <TableCell>{row.employee}</TableCell>
                                                                        <TableCell>
                                                                            {(() => {
                                                                                const rowDate = dayjs(row.attendance_date);
                                                                                const approvedLeave = row.status === 'Absent'
                                                                                    ? getApprovedLeaveForDate(row.employee, rowDate)
                                                                                    : null;
                                                                                const displayStatus = approvedLeave ? approvedLeave.leave_type : row.status;
                                                                                const isLeave = !!approvedLeave;
                                                                                if (isLeave) {
                                                                                    const styles = getStatusStyles(displayStatus);
                                                                                    const isPermission = displayStatus.toLowerCase().includes('permission');
                                                                                    return (
                                                                                        <Box
                                                                                            sx={{
                                                                                                display: 'inline-flex',
                                                                                                flexDirection: 'column',
                                                                                                alignItems: 'center',
                                                                                                px: 1.25,
                                                                                                py: 0.4,
                                                                                                borderRadius: '6px',
                                                                                                fontSize: '0.75rem',
                                                                                                ...styles
                                                                                            }}
                                                                                        >
                                                                                            <span>{displayStatus.replace(/\s*leave\s*/gi, '')}</span>
                                                                                            {isPermission && approvedLeave?.permission_hours > 0 && (
                                                                                                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                                                                                    {approvedLeave.permission_hours}m
                                                                                                </span>
                                                                                            )}
                                                                                        </Box>
                                                                                    );
                                                                                }
                                                                                return (
                                                                                    <Label
                                                                                        variant="soft"
                                                                                        color={
                                                                                            (row.status === 'Present' && 'success') ||
                                                                                            (row.status === 'Absent' && 'error') ||
                                                                                            (row.status === 'Half Day' && 'warning') ||
                                                                                            (row.status === 'On Leave' && 'info') ||
                                                                                            (row.status === 'Holiday' && 'secondary') ||
                                                                                            'default'
                                                                                        }
                                                                                    >
                                                                                        {row.status}
                                                                                    </Label>
                                                                                );
                                                                            })()}
                                                                        </TableCell>
                                                                        <TableCell>{row.in_time || '---'}</TableCell>
                                                                        <TableCell>{row.out_time || '---'}</TableCell>
                                                                        <TableCell>{row.working_hours_display || '---'}</TableCell>
                                                                        <TableCell align="right">
                                                                            <IconButton onClick={() => handleViewDetails(row.name)}>
                                                                                <Iconify icon={"solar:eye-bold" as any} width={20} sx={{ color: '#059669' }} />
                                                                            </IconButton>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        {visibleReportData.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                                                    {!isFilterApplied ? (
                                                                        <Stack spacing={1} alignItems="center">
                                                                            <Iconify icon={"solar:calendar-date-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                                Please select a date filter to view attendance
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
                                    count={visibleReportData.length}
                                    page={page}
                                    onPageChange={onChangePage}
                                    rowsPerPage={rowsPerPage}
                                    onRowsPerPageChange={onChangeRowsPerPage}
                                    rowsPerPageOptions={[10, 25, 50]}
                                />
                            </Card>
                        )}

                        {currentView === 'calendar' && employee.length === 1 && (
                            <AttendanceCalendar
                                 reportData={reportData}
                                 employee={employee[0]}
                                 fromDate={fromDate}
                                 toDate={toDate}
                                 onEventClick={handleViewDetails}
                             />
                        )}

                        {currentView === 'muster' && (
                            <Card sx={{ p: 2.5 }}>
                                <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                                    {[
                                        { label: 'Present', value: 'P', hideValue: true, color: 'rgba(34, 197, 94, 0.14)', textColor: '#166534' },
                                        { label: 'Absent', value: 'A', color: 'rgba(239, 68, 68, 0.14)', textColor: '#991b1b' },
                                        { label: 'Half Day', value: 'HD', color: 'rgba(254, 240, 138, 0.5)', textColor: '#854d0e' },
                                        { label: 'Leave Applied', value: '', hideValue: true, color: '#bbb7f7ff', textColor: '#26215C' },
                                    ].map((item) => (
                                        <Stack key={item.label} direction="row" alignItems="center" spacing={1}>
                                            <Box
                                                sx={{
                                                    width: 30,
                                                    height: 22,
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
                                    onMouseLeave={handleMusterMouseLeave}
                                    onMouseUp={handleMusterMouseUp}
                                    onMouseMove={handleMusterMouseMove}
                                    sx={{
                                        position: 'relative',
                                        overflowX: 'auto',
                                        borderRadius: '12px',
                                        border: (t) => `1px solid ${t.palette.divider}`,
                                        bgcolor: 'background.paper',
                                        cursor: 'grab',
                                        userSelect: 'none',
                                        '&::-webkit-scrollbar': { height: 8 },
                                        '&::-webkit-scrollbar-thumb': {
                                            backgroundColor: 'rgba(145,158,171,0.30)',
                                            borderRadius: 999,
                                        },
                                        '&::-webkit-scrollbar-thumb:hover': {
                                            backgroundColor: 'rgba(145,158,171,0.50)',
                                        },
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
                                                    <TableCell colSpan={dates.length + 1} sx={{ py: 10, position: 'relative', border: 0 }}>
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
                                                            <CircularProgress sx={{ color: '#059669' }} />
                                                        </Box>
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
                                                                const record = getAttendanceRecord(emp.id, date);
                                                                const isClickable = !!record?.name || !!leaveRecord;
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
                                                                            onClick={isClickable ? () => handleMusterCellClick(isLeave ? undefined : record?.name, isLeave ? leaveRecord : undefined) : undefined}
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
                                                                                    <Box component="span" sx={{ fontSize: '0.725rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
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
                                                            <TableCell colSpan={dates.length + 1} sx={{ py: 10, position: 'relative', border: 0 }}>
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
                                                                                Please select a date filter to view attendance
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
                    </>
                )}

                <Dialog
                    open={openExportDialog}
                    onClose={() => setOpenExportDialog(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ m: 0, p: 3, fontWeight: 700, fontSize: '1.25rem' }}>
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
                                            Exports detailed attendance logs, including employee names, statuses, in-times, out-times, and working hours.
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
                                                Exports grid-based color-coded attendance grid with detailed in/out times, absent markers, and merged holidays for the selected dates (Excel format only).
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
            </Stack>

            <AttendanceDetailsDialog
                open={openDetails}
                attendanceId={selectedAttendanceName}
                onClose={() => {
                    setOpenDetails(false);
                    setSelectedAttendanceName(null);
                }}
            />

            <LeavesDetailsDialog
                open={openLeaveDetails}
                onClose={() => {
                    setOpenLeaveDetails(false);
                    setSelectedLeaveId(null);
                }}
                leaveId={selectedLeaveId}
            />
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
        if (t.includes('present')) return 'solar:check-circle-bold-duotone';
        if (t.includes('absent')) return 'solar:calendar-date-bold-duotone';
        if (t.includes('half day')) return 'solar:clock-circle-bold-duotone';
        if (t.includes('missing')) return 'solar:danger-circle-bold-duotone';
        if (t.includes('holiday')) return 'solar:cup-star-bold-duotone';
        if (t.includes('entries')) return 'solar:list-bold-duotone';
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

                <Box sx={{ flexGrow: 1, pl: 1, }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.2 }}>
                        {item.label}
                    </Typography>
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
