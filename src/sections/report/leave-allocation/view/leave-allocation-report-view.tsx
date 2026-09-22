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
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
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
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { LeaveAllocationDetailsDialog } from 'src/sections/leaves/allocations/leave-allocation-details-dialog';

import { useAuth } from 'src/auth/auth-context';

const isRowInMonth = (row: any, month: dayjs.Dayjs) => {
    if (!row.from_date || !row.to_date) return false;
    const monthStart = month.startOf('month');
    const monthEnd = month.endOf('month');
    const rowStart = dayjs(row.from_date);
    const rowEnd = dayjs(row.to_date);

    return (rowStart.isBefore(monthEnd) || rowStart.isSame(monthEnd, 'day')) &&
           (rowEnd.isAfter(monthStart) || rowEnd.isSame(monthStart, 'day'));
};

export function LeaveAllocationReportView() {
    const theme = useTheme();
    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.leave_allocation_report;
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
    const [leaveType, setLeaveType] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
    const [currentView, setCurrentView] = useState<'list' | 'muster'>('list');
    const [selectedExportView, setSelectedExportView] = useState<'list' | 'muster'>('list');

    // --- Muster Roll drag-scroll ---
    const musterScrollRef = useRef<HTMLDivElement>(null);
    const isDraggingMuster = useRef(false);
    const musterDragStartX = useRef(0);
    const musterScrollStartLeft = useRef(0);
    const musterDragMoved = useRef(0);

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

    const [leaveTypeOptions, setLeaveTypeOptions] = useState<any[]>([]);
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    const [openDetails, setOpenDetails] = useState(false);
    const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);

    const handleViewDetails = (row: any) => {
        setSelectedAllocationId(row.name);
        setOpenDetails(true);
    };

    const handleMusterCellClick = (alloc: any) => {
        if (musterDragMoved.current > 5) return;
        handleViewDetails(alloc);
    };

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

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');
            if (employee.length > 0) filters.employee = employee;
            if (leaveType !== 'all') filters.leave_type = leaveType;

            // Fetch allocations from Leave Allocation Report Script Report
            const result = await runReport('Leave Allocation Report', filters);
            let finalData = result.result || [];

            // Sort Data
            finalData = [...finalData].sort((a, b) => {
                const dateA = a.from_date || '';
                const dateB = b.from_date || '';
                const nameA = (a.employee_name || '').toLowerCase();
                const nameB = (b.employee_name || '').toLowerCase();

                switch (sortBy) {
                    case 'date_asc':
                        if (dateA !== dateB) return dateA.localeCompare(dateB);
                        return nameA.localeCompare(nameB);
                    case 'date_desc':
                        if (dateB !== dateA) return dateB.localeCompare(dateA);
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

            // Fetch Pending Leave Applications count based on current filters
            const pendingFilters: any = { workflow_state: 'Pending' };
            if (employee.length > 0) pendingFilters.employee = ['in', employee];
            if (leaveType !== 'all') pendingFilters.leave_type = leaveType;

            const pendingApps = await getDoctypeList('Leave Application', ['name'], pendingFilters);
            setPendingCount(pendingApps.length);

        } catch (error) {
            console.error('Failed to fetch leave allocation report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, employee, leaveType, sortBy]);

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
        setLeaveType('all');
        setSortBy('date_desc');
    };

    useEffect(() => {
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions);
        getDoctypeList('Leave Type', ['name']).then(setLeaveTypeOptions);
    }, []);

    // Summary calculations
    const stats = useMemo(() => {
        const uniqueEmployees = new Set(reportData.map((row) => row.employee));
        const totalAllocated = reportData.reduce((acc, row) => acc + (row.total_leaves_allocated || 0), 0);
        const totalUsed = reportData.reduce((acc, row) => acc + (row.total_leaves_taken || 0), 0);
        const totalBalance = reportData.reduce((acc, row) => acc + (row.balance_leaves || 0), 0);

        const todayStr = dayjs().format('YYYY-MM-DD');
        const expiredLeaves = reportData.reduce((acc, row) => {
            const isExpired = row.to_date && row.to_date < todayStr;
            return isExpired ? acc + (row.balance_leaves || 0) : acc;
        }, 0);

        return {
            totalEmployees: uniqueEmployees.size,
            totalAllocated,
            totalUsed,
            totalBalance,
            expiredLeaves,
        };
    }, [reportData]);

    const months = useMemo(() => {
        const start = fromDate ? fromDate.startOf('month') : dayjs().startOf('year');
        const end = toDate ? toDate.endOf('month') : dayjs().endOf('year');

        const monthArray: dayjs.Dayjs[] = [];
        let cur = start;
        const maxMonths = 36;
        let count = 0;
        while ((cur.isBefore(end) || cur.isSame(end, 'month')) && count < maxMonths) {
            monthArray.push(cur);
            cur = cur.add(1, 'month');
            count++;
        }
        return monthArray;
    }, [fromDate, toDate]);

    const uniqueEmployeesList = useMemo(() => {
        const map = new Map<string, string>();
        reportData.forEach((row) => {
            if (row.employee && row.employee_name) {
                map.set(row.employee, row.employee_name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [reportData]);

    const paginatedEmployees = useMemo(() => {
        if (currentView === 'list') return reportData;
        return uniqueEmployeesList.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage
        );
    }, [uniqueEmployeesList, currentView, page, rowsPerPage, reportData]);

    const handleExportExcel = async () => {
        setExportingExcel(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Leave Allocation Report');

            sheet.columns = [
                { header: 'Employee ID', key: 'employee', width: 15 },
                { header: 'Employee', key: 'employee_name', width: 25 },
                { header: 'Leave Type', key: 'leave_type', width: 20 },
                { header: 'Allocated Days', key: 'total_leaves_allocated', width: 15 },
                { header: 'Used Days', key: 'total_leaves_taken', width: 15 },
                { header: 'Balance Days', key: 'balance_leaves', width: 15 },
                { header: 'Carry Forward', key: 'carry_forward', width: 15 },
                { header: 'Expiry Date', key: 'to_date', width: 15 },
            ];

            const columnCount = sheet.columns.length;

            for (let i = 1; i <= columnCount; i++) {
                const cell = sheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                   top: { style: 'thin', color: { argb: 'FF000000' } },
                   bottom: { style: 'thin', color: { argb: 'FF000000' } },
                   left: { style: 'thin', color: { argb: 'FF000000' } },
                   right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            }
            sheet.getRow(1).height = 25;

            reportData.forEach((row) => {
                sheet.addRow({
                    employee_name: row.employee_name,
                    employee: row.employee,
                    leave_type: row.leave_type,
                    total_leaves_allocated: row.total_leaves_allocated,
                    total_leaves_taken: row.total_leaves_taken,
                    balance_leaves: row.balance_leaves,
                    carry_forward: row.carry_forward ? 'Yes' : 'No',
                    to_date: row.to_date ? fDate(row.to_date, 'DD-MM-YYYY') : '---',
                });
            });

            sheet.eachRow((excelRow, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= columnCount; i++) {
                        const cell = excelRow.getCell(i);
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

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Leave_Allocation_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Excel export failed:', error);
            enqueueSnackbar('Excel export failed!', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportMusterExcel = async () => {
        setExportingExcel(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Leave Muster Roll');

            const columns = [
                { header: 'Employee ID', key: 'employee', width: 15 },
                { header: 'Employee Name', key: 'employee_name', width: 25 }
            ];

            months.forEach((m) => {
                columns.push({
                    header: m.format('MMM YYYY'),
                    key: m.format('YYYY-MM'),
                    width: 25
                });
            });

            sheet.columns = columns;

            const columnCount = sheet.columns.length;

            for (let i = 1; i <= columnCount; i++) {
                const cell = sheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            }
            sheet.getRow(1).height = 28;

            uniqueEmployeesList.forEach((emp) => {
                const rowData: any = {
                    employee: emp.id,
                    employee_name: emp.name
                };

                months.forEach((m) => {
                    const matching = reportData.filter((r) => r.employee === emp.id && isRowInMonth(r, m));
                    rowData[m.format('YYYY-MM')] = matching.map(
                        (r) => `${r.leave_type}: ${r.total_leaves_allocated} / ${r.total_leaves_taken} USED`
                    ).join('\n');
                });

                const excelRow = sheet.addRow(rowData);
                // Set height dynamically based on the number of leave types to ensure text wraps nicely with padding
                let maxLines = 1;
                months.forEach((m) => {
                    const count = reportData.filter((r) => r.employee === emp.id && isRowInMonth(r, m)).length;
                    if (count > maxLines) maxLines = count;
                });
                excelRow.height = Math.max(38, 22 * maxLines + 12);
            });

            sheet.eachRow((excelRow, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= columnCount; i++) {
                        const cell = excelRow.getCell(i);
                        if (i === 1 || i === 2) {
                            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
                        } else {
                            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                        }
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

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Leave_Muster_Roll_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            enqueueSnackbar('Muster Roll Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Muster Roll Excel export failed:', error);
            enqueueSnackbar('Excel export failed!', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const doc = new jsPDF('landscape');

            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Leave Allocation Report', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 282, 32);

            const tableData = reportData.map((row) => [
                row.employee_name,
                row.employee,
                row.leave_type,
                row.total_leaves_allocated,
                row.total_leaves_taken,
                row.balance_leaves,
                row.carry_forward ? 'Yes' : 'No',
                row.to_date ? fDate(row.to_date, 'DD-MM-YYYY') : '---'
            ]);

            autoTable(doc, {
                startY: 40,
                head: [['Employee', 'Employee ID', 'Leave Type', 'Allocated Days', 'Used Days', 'Balance Days', 'Carry Forward', 'Expiry Date']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', lineWidth: 0.15, lineColor: [209, 213, 219], valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 40 },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                    6: { halign: 'center' },
                    7: { halign: 'center' }
                }
            });

            doc.save(`Leave_Allocation_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
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

    const handleConfirmExport = async () => {
        setOpenExportDialog(false);
        if (exportType === 'excel') {
            if (selectedExportView === 'muster') {
                await handleExportMusterExcel();
            } else {
                await handleExportExcel();
            }
        } else {
            await handleExportPdf();
        }
    };

    const onChangePage = useCallback((event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const visibleReportData = reportData;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3} sx={{ pb: 5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.5}>
                        <Typography variant="h4">Leave Allocation Report</Typography>
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
                                label="From"
                                views={['month', 'year']}
                                format="MM/YYYY"
                                value={fromDate}
                                onChange={(newValue) => setFromDate(newValue ? newValue.startOf('month') : null)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 180 } } }}
                            />
                            <DatePicker
                                label="To"
                                views={['month', 'year']}
                                format="MM/YYYY"
                                value={toDate}
                                onChange={(newValue) => setToDate(newValue ? newValue.endOf('month') : null)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 180 } } }}
                            />
                        </LocalizationProvider>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 160 }}>
                            <Select
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="all">All Leave Types</MenuItem>
                                {leaveTypeOptions.map((type) => (
                                    <MenuItem key={type.name} value={type.name}>
                                        {type.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 180 }}>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="date_desc">Allocation: Newest First</MenuItem>
                                <MenuItem value="date_asc">Allocation: Oldest First</MenuItem>
                                <MenuItem value="name_asc">Employee Name: A to Z</MenuItem>
                                <MenuItem value="name_desc">Employee Name: Z to A</MenuItem>
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
                            md: 'repeat(4, 1fr)',
                        },
                    }}
                >
                    <SummaryCard item={{ label: 'Total Employees', value: stats.totalEmployees, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Total Allocated', value: stats.totalAllocated, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Total Used', value: stats.totalUsed, indicator: 'orange' }} />
                    <SummaryCard item={{ label: 'Total Balance', value: stats.totalBalance, indicator: 'green' }} />
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
                        {[
                            { value: 'list', label: 'List View', icon: 'solar:list-bold' },
                            { value: 'muster', label: 'Muster Roll View', icon: 'material-symbols:grid-on' }
                        ].map((tab) => {
                            const isActive = currentView === tab.value;
                            return (
                                <Button
                                    key={tab.value}
                                    onClick={() => setCurrentView(tab.value as 'list' | 'muster')}
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

                <Card>
                    {currentView === 'list' ? (
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
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Leave Type</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Allocated Days</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Used Days</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Balance Days</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Carry Forward</TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Duration</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', pr: 3 }}>Actions</TableCell>
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
                                                                <TableCell>
                                                                    <Box>
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                                            {row.employee_name}
                                                                        </Typography>
                                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                            {row.employee}
                                                                        </Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>{row.leave_type}</TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>
                                                                    <Label variant="soft" color="info">
                                                                        {row.total_leaves_allocated}
                                                                    </Label>
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>
                                                                    <Label variant="soft" color={row.total_leaves_taken > 0 ? 'warning' : 'default'}>
                                                                        {row.total_leaves_taken}
                                                                    </Label>
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>
                                                                    <Label variant="soft" color={row.balance_leaves > 0 ? 'success' : 'error'}>
                                                                        {row.balance_leaves}
                                                                    </Label>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Label variant="soft" color={row.carry_forward ? 'success' : 'default'}>
                                                                        {row.carry_forward ? 'Yes' : 'No'}
                                                                    </Label>
                                                                </TableCell>
                                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                                    <Typography variant="body2">
                                                                     {row.from_date ? fDate(row.from_date, 'DD-MM-YYYY') : '---'} to{' '}
                                                                     {row.to_date ? fDate(row.to_date, 'DD-MM-YYYY') : '---'}
                                                                </Typography>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ pr: 2 }}>
                                                                    <IconButton onClick={() => handleViewDetails(row)} sx={{ color: 'info.main' }}>
                                                                        <Iconify icon={"solar:eye-bold" as any} />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}

                                                {visibleReportData.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                                                            <Stack spacing={1} alignItems="center">
                                                                <Iconify icon={"solar:filter-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                                <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                    No data found
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </Scrollbar>
                        </TableContainer>
                    ) : (
                        <Box sx={{ p: 2.5 }}>
                            <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                                {[
                                    { label: 'Allocated', color: 'rgba(239, 183, 15, 0.28)' },
                                    { label: 'Used', color: 'rgba(72, 237, 133, 0.59)' },
                                    { label: 'Balance', color: 'rgba(7, 132, 190, 0.21)' },
                                ].map((item) => (
                                    <Stack key={item.label} direction="row" alignItems="center" spacing={1}>
                                        <Box
                                            sx={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '6px',
                                                bgcolor: item.color,
                                            }}
                                        />
                                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            {item.label}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>

                            <Box
                                ref={musterScrollRef}
                            onMouseDown={handleMusterMouseDown}
                            onMouseLeave={handleMusterMouseLeave}
                            onMouseUp={handleMusterMouseUp}
                            onMouseMove={handleMusterMouseMove}
                            sx={{
                                width: '100%',
                                overflow: 'unset',
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
                            <Table
                                size="medium"
                                stickyHeader
                                sx={{ borderCollapse: 'collapse', minWidth: 800 }}
                            >
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
                                            {months.map((m) => (
                                                <TableCell
                                                    key={m.format('YYYY-MM')}
                                                    align="center"
                                                    sx={{
                                                        minWidth: 160,
                                                        p: 1.5,
                                                        borderRight: (t) => `1px solid ${t.palette.divider}`
                                                    }}
                                                >
                                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                                        {m.format('YYYY')}
                                                    </Typography>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.2, fontSize: 16 }}>
                                                        {m.format('MMMM')}
                                                    </Typography>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={months.length + 1} align="center" sx={{ py: 10 }}>
                                                    <CircularProgress sx={{ color: '#059669' }} />
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {paginatedEmployees.map((emp) => (
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
                                                        {months.map((month) => {
                                                            const matching = reportData.filter((r) => r.employee === emp.id && isRowInMonth(r, month));
                                                            return (
                                                                <TableCell
                                                                    key={month.format('YYYY-MM')}
                                                                    sx={{
                                                                        borderRight: (t) => `1px solid ${t.palette.divider}`,
                                                                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                                                        verticalAlign: 'top',
                                                                        p: 1,
                                                                    }}
                                                                >
                                                                    {matching.length > 0 ? (
                                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 120 }}>
                                                                            {matching.map((alloc) => (
                                                                                <Box
                                                                                    key={alloc.name}
                                                                                    onClick={() => handleMusterCellClick(alloc)}
                                                                                    sx={{
                                                                                        p: 1,
                                                                                        borderRadius: 1,
                                                                                        bgcolor: 'background.neutral',
                                                                                        border: (t) => `1px solid ${t.palette.divider}`,
                                                                                        cursor: 'pointer',
                                                                                        '&:hover': {
                                                                                            bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                                                                                        },
                                                                                        transition: (t) => t.transitions.create(['background-color'], {
                                                                                            duration: t.transitions.duration.shortest,
                                                                                        }),
                                                                                    }}
                                                                                >
                                                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                                                                        {alloc.leave_type}
                                                                                    </Typography>
                                                                                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ width: '100%' }}>
                                                                                        <Label variant="soft" color="warning" sx={{ fontSize: '0.675rem', px: 0.5, width: 38, minWidth: 38, justifyContent: 'center', textAlign: 'center' }}>
                                                                                            {alloc.total_leaves_allocated}
                                                                                        </Label>
                                                                                        <Label variant="soft" color="success" sx={{ fontSize: '0.675rem', px: 0.5, width: 38, minWidth: 38, justifyContent: 'center', textAlign: 'center' }}>
                                                                                            {alloc.total_leaves_taken}
                                                                                        </Label>
                                                                                        <Label variant="soft" color="info" sx={{ fontSize: '0.675rem', px: 0.5, width: 38, minWidth: 38, justifyContent: 'center', textAlign: 'center' }}>
                                                                                            {alloc.balance_leaves}
                                                                                        </Label>
                                                                                    </Stack>
                                                                                </Box>
                                                                            ))}
                                                                        </Box>
                                                                    ) : (
                                                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', display: 'block', textAlign: 'center', py: 1 }}>
                                                                            No Allocations
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}

                                                {uniqueEmployeesList.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={months.length + 1} align="center" sx={{ py: 10 }}>
                                                            <Stack spacing={1} alignItems="center">
                                                                <Iconify icon={"solar:filter-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                                <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                    No data found
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    )}
                    <TablePagination
                        component="div"
                        count={currentView === 'list' ? visibleReportData.length : uniqueEmployeesList.length}
                        page={page}
                        onPageChange={onChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={onChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
            </Stack>

            <Dialog
                open={openExportDialog}
                onClose={() => setOpenExportDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2, width: '100%', maxWidth: 450, boxShadow: theme.customShadows.z24 }
                }}
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
                        Please choose which data view you would like to export to {exportType === 'excel' ? 'Excel' : 'PDF'}:
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
                                        Exports leave allocation detailed rows including allocated, used, and balance days.
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
                                            Exports a grid-based monthly view breaking down leave allocation and usage by leave type per month (Excel only).
                                        </Typography>
                                    </Box>
                                }
                                sx={{ alignItems: 'flex-start' }}
                            />
                        )}
                    </RadioGroup>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'flex-end', gap: 1.5 }}>

                    <Button
                        variant="contained"
                        onClick={handleConfirmExport}
                        sx={{
                            bgcolor: exportType === 'pdf' ? '#f43f5e' : '#0ea5e9',
                            color: 'common.white',
                            borderRadius: 1.5,
                            '&:hover': { bgcolor: exportType === 'pdf' ? '#e11d48' : '#0284c7' }
                        }}
                    >
                        Export {exportType.toUpperCase()}
                    </Button>
                </DialogActions>
            </Dialog>

            <LeaveAllocationDetailsDialog
                open={openDetails}
                onClose={() => {
                    setOpenDetails(false);
                    setTimeout(() => setSelectedAllocationId(null), 200);
                }}
                allocationId={selectedAllocationId}
                onRefresh={fetchReport}
            />
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------

interface SummaryCardProps {
    item: {
        label: string;
        value: number;
        indicator: 'blue' | 'green' | 'red' | 'orange';
    };
}

function SummaryCard({ item }: SummaryCardProps) {
    const { label, value, indicator } = item;

    const getColor = () => {
        switch (indicator) {
            case 'blue':
                return {
                    bg: 'rgba(14, 165, 233, 0.08)',
                    border: 'rgba(14, 165, 233, 0.16)',
                    color: '#0284c7',
                    icon: 'solar:file-text-bold-duotone',
                };
            case 'green':
                return {
                    bg: 'rgba(34, 197, 94, 0.08)',
                    border: 'rgba(34, 197, 94, 0.16)',
                    color: '#16a34a',
                    icon: 'solar:check-circle-bold-duotone',
                };
            case 'red':
                return {
                    bg: 'rgba(239, 68, 68, 0.08)',
                    border: 'rgba(239, 68, 68, 0.16)',
                    color: '#dc2626',
                    icon: 'solar:close-circle-bold-duotone',
                };
            case 'orange':
                return {
                    bg: 'rgba(249, 115, 22, 0.08)',
                    border: 'rgba(249, 115, 22, 0.16)',
                    color: '#ea580c',
                    icon: 'solar:clock-circle-bold-duotone',
                };
            default:
                return {
                    bg: 'rgba(148, 163, 184, 0.08)',
                    border: 'rgba(148, 163, 184, 0.16)',
                    color: '#475569',
                    icon: 'solar:info-circle-bold-duotone',
                };
        }
    };

    const config = getColor();

    return (
        <Card
            sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: config.bg,
                border: `1px solid ${config.border}`,
                boxShadow: 'none',
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(config.color, 0.1),
                    color: config.color,
                }}
            >
                <Iconify icon={config.icon as any} width={24} />
            </Box>

            <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {label}
                </Typography>
                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                    {value}
                </Typography>
            </Stack>
        </Card>
    );
}
