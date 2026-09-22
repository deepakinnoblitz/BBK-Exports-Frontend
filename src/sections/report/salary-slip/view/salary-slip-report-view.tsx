import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fDate } from 'src/utils/format-time';
import { frappeRequest } from 'src/utils/csrf';
import { fNumber } from 'src/utils/format-number';

import { getDoctypeList } from 'src/api/leads';
import { getHRSettings } from 'src/api/hr-management';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchSalarySlips, getSalarySlipWithDetails, fetchSalarySlipsWithDetails } from 'src/api/salary-slips';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { SalarySlipDetailsDialog } from '../../salary-slips/salary-slip-details-dialog';

// ----------------------------------------------------------------------

export function SalarySlipReportView() {
    const theme = useTheme();
    const { user } = useAuth();
    const actionPerms = user?.permissions?.actions?.salary_slip_report;
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
    const [employee, setEmployee] = useState('all');
    const [sortBy, setSortBy] = useState('pay_period_start_desc');

    // Options
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [hrSettings, setHRSettings] = useState<any>({
        default_currency: 'INR',
        currency_symbol: '₹',
        default_locale: 'en-IN',
    });

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    // Details Dialog
    const [openDetails, setOpenDetails] = useState(false);
    const [selectedSlip, setSelectedSlip] = useState<any>(null);

    useEffect(() => {
        if (user && user.roles) {
            const hrRoles = ['HR Manager', 'HR', 'System Manager', 'Administrator'];
            const hasHRRole = user.roles.some((role: string) => hrRoles.includes(role));
            setIsHR(hasHRRole);
            if (!hasHRRole && user.employee) {
                setEmployee(user.employee);
            }
        }
    }, [user]);

    useEffect(() => {
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions);
        getHRSettings().then(setHRSettings).catch(console.error);
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const filterValues: Record<string, any> = {};
            if (fromDate) {
                filterValues.pay_period_start = fromDate.format('YYYY-MM-DD');
            }
            if (toDate) {
                filterValues.pay_period_end = toDate.format('YYYY-MM-DD');
            }
            if (employee !== 'all') {
                filterValues.employee = employee;
            }

            let orderBy = 'pay_period_start';
            let order: 'asc' | 'desc' = 'desc';

            if (sortBy === 'pay_period_start_asc') {
                orderBy = 'pay_period_start';
                order = 'asc';
            } else if (sortBy === 'pay_period_start_desc') {
                orderBy = 'pay_period_start';
                order = 'desc';
            } else if (sortBy === 'net_pay_desc') {
                orderBy = 'grand_net_pay';
                order = 'desc';
            } else if (sortBy === 'net_pay_asc') {
                orderBy = 'grand_net_pay';
                order = 'asc';
            } else if (sortBy === 'gross_pay_desc') {
                orderBy = 'grand_gross_pay';
                order = 'desc';
            } else if (sortBy === 'gross_pay_asc') {
                orderBy = 'grand_gross_pay';
                order = 'asc';
            }

            const result = await fetchSalarySlips({
                page: 1,
                page_size: 1000,
                filterValues,
                orderBy,
                order
            });

            setReportData(result.data || []);
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch salary slips report:', error);
            enqueueSnackbar('Failed to load report data', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, employee, sortBy, enqueueSnackbar]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        if (isHR) {
            setEmployee('all');
        } else if (user?.employee) {
            setEmployee(user.employee);
        }
        setSortBy('pay_period_start_desc');
    };

    const handleExport = async () => {
        setExportingExcel(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const mainSheet = workbook.addWorksheet('Salary Slips Report');

            // Fetch detailed slips with child table data (earnings and deductions)
            const detailedSlips = await fetchSalarySlipsWithDetails({
                start_date: fromDate ? fromDate.format('YYYY-MM-DD') : undefined,
                end_date: toDate ? toDate.format('YYYY-MM-DD') : undefined,
                employee: employee !== 'all' ? employee : undefined,
            });

            const exportData = selected.length > 0
                ? detailedSlips.filter((d: any) => selected.includes(d.name))
                : detailedSlips;

            mainSheet.columns = [
                { header: 'Slip ID', key: 'name', width: 15 },
                { header: 'Employee Name', key: 'employee_name', width: 25 },
                { header: 'Employee ID', key: 'employee', width: 15 },
                { header: 'Period Start', key: 'pay_period_start', width: 15 },
                { header: 'Period End', key: 'pay_period_end', width: 15 },
                { header: 'Gross Earnings', key: 'grand_gross_pay', width: 15 },
                { header: 'Deductions', key: 'total_deduction', width: 15 },
                { header: 'LOP Days', key: 'lop_days', width: 15 },
                { header: 'LOP Amount', key: 'lop', width: 15 },
                { header: 'Net Salary', key: 'grand_net_pay', width: 15 },
            ];

            const mainColCount = mainSheet.columns.length;
            for (let i = 1; i <= mainColCount; i++) {
                const cell = mainSheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            mainSheet.getRow(1).height = 25;

            exportData.forEach((row: any) => {
                mainSheet.addRow({
                    name: row.name,
                    employee_name: row.employee_name,
                    employee: row.employee,
                    pay_period_start: fDate(row.pay_period_start, 'DD-MM-YYYY'),
                    pay_period_end: fDate(row.pay_period_end, 'DD-MM-YYYY'),
                    grand_gross_pay: row.grand_gross_pay ?? row.gross_pay ?? 0,
                    total_deduction: row.total_deduction ?? 0,
                    lop_days: row.lop_days ?? 0,
                    lop: row.lop ?? 0,
                    grand_net_pay: row.grand_net_pay ?? row.net_pay ?? 0,
                });
            });

            mainSheet.eachRow((row, rowNumber) => {
                for (let i = 1; i <= mainColCount; i++) {
                    const cell = row.getCell(i);
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    if (rowNumber > 1 && rowNumber % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
                    }
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF000000' } },
                        bottom: { style: 'thin', color: { argb: 'FF000000' } },
                        left: { style: 'thin', color: { argb: 'FF000000' } },
                        right: { style: 'thin', color: { argb: 'FF000000' } }
                    };
                }
            });

            // --- DETAILED SHEET ---
            const detailSheet = workbook.addWorksheet('Salary Slip Details');

            // Find all unique components across all slips in exportData dynamically
            const uniqueEarnings = Array.from(new Set(
                exportData.flatMap((s: any) => (s.earnings || []).map((e: any) => e.component_name as string))
            )) as string[];

            const uniqueDeductions = Array.from(new Set(
                exportData.flatMap((s: any) => (s.deductions || []).map((d: any) => d.component_name as string))
            )) as string[];

            const baseColumns = [
                { header: 'Slip ID', key: 'name', width: 15 },
                { header: 'Employee Name', key: 'employee_name', width: 25 },
                { header: 'Employee ID', key: 'employee', width: 15 },
                { header: 'Department', key: 'department', width: 15 },
                { header: 'Designation', key: 'designation', width: 15 },
                { header: 'Date of Joining', key: 'date_of_joining', width: 15 },
                { header: 'Period Start', key: 'pay_period_start', width: 15 },
                { header: 'Period End', key: 'pay_period_end', width: 15 },
                { header: 'Total Working Days', key: 'total_working_days', width: 15 },
                { header: 'Actual Present Days', key: 'actual_present_days', width: 15 },
                { header: 'Holiday Count', key: 'holiday_count', width: 15 },
                { header: 'No of Leave', key: 'no_of_leave', width: 15 },
                { header: 'No of Paid Leave', key: 'no_of_paid_leave', width: 15 },
                { header: 'LOP Days', key: 'lop_days', width: 15 },
            ];

            const earningColumns = uniqueEarnings.map((name: string) => ({
                header: name,
                key: `earning_${name.replace(/\s+/g, '_')}`,
                width: 15
            }));

            const deductionColumns = uniqueDeductions.map((name: string) => ({
                header: name,
                key: `deduction_${name.replace(/\s+/g, '_')}`,
                width: 15
            }));

            detailSheet.columns = [
                ...baseColumns,
                ...earningColumns,
                { header: 'Gross Earnings', key: 'grand_gross_pay', width: 15 },
                ...deductionColumns,
                { header: 'LOP Amount', key: 'lop', width: 15 },
                { header: 'Total Deduction', key: 'total_deduction', width: 15 },
                { header: 'Net Salary', key: 'grand_net_pay', width: 15 },
            ];

            const detailColCount = detailSheet.columns.length;
            for (let i = 1; i <= detailColCount; i++) {
                const cell = detailSheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            detailSheet.getRow(1).height = 25;

            exportData.forEach((row: any) => {
                const rowData: any = {
                    name: row.name,
                    employee_name: row.employee_name,
                    employee: row.employee,
                    department: row.department || '-',
                    designation: row.designation || '-',
                    date_of_joining: row.date_of_joining ? fDate(row.date_of_joining, 'DD-MM-YYYY') : '-',
                    pay_period_start: fDate(row.pay_period_start, 'DD-MM-YYYY'),
                    pay_period_end: fDate(row.pay_period_end, 'DD-MM-YYYY'),
                    total_working_days: row.total_working_days ?? 0,
                    actual_present_days: row.actual_present_days ?? 0,
                    holiday_count: row.holiday_count ?? 0,
                    no_of_leave: row.no_of_leave ?? 0,
                    no_of_paid_leave: row.no_of_paid_leave ?? 0,
                    lop_days: row.lop_days ?? 0,
                    grand_gross_pay: row.grand_gross_pay ?? row.gross_pay ?? 0,
                    lop: row.lop ?? 0,
                    total_deduction: row.total_deduction ?? 0,
                    grand_net_pay: row.grand_net_pay ?? row.net_pay ?? 0,
                };

                // Add dynamic earnings
                uniqueEarnings.forEach((name: string) => {
                    const matched = (row.earnings || []).find((c: any) => c.component_name === name);
                    rowData[`earning_${name.replace(/\s+/g, '_')}`] = matched ? matched.amount : 0;
                });

                // Add dynamic deductions
                uniqueDeductions.forEach((name: string) => {
                    const matched = (row.deductions || []).find((c: any) => c.component_name === name);
                    rowData[`deduction_${name.replace(/\s+/g, '_')}`] = matched ? matched.amount : 0;
                });

                detailSheet.addRow(rowData);
            });

            detailSheet.eachRow((row, rowNumber) => {
                for (let i = 1; i <= detailColCount; i++) {
                    const cell = row.getCell(i);
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    if (rowNumber > 1 && rowNumber % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F8' } };
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
            saveAs(new Blob([buffer]), `Salary_Slip_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Excel export failed:', error);
            enqueueSnackbar('Excel export failed!', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const doc = new jsPDF('landscape');

            // Fetch detailed slips with child table data (earnings and deductions)
            const detailedSlips = await fetchSalarySlipsWithDetails({
                start_date: fromDate ? fromDate.format('YYYY-MM-DD') : undefined,
                end_date: toDate ? toDate.format('YYYY-MM-DD') : undefined,
                employee: employee !== 'all' ? employee : undefined,
            });

            const exportData = selected.length > 0
                ? detailedSlips.filter((d: any) => selected.includes(d.name))
                : detailedSlips;

            if (exportData.length === 0) {
                enqueueSnackbar('No data to export', { variant: 'warning' });
                setExportingPdf(false);
                return;
            }

            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Salary Slips Detailed Report', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 282, 32);

            // Find all unique components across all slips in exportData dynamically
            const uniqueEarnings = Array.from(new Set(
                exportData.flatMap((s: any) => (s.earnings || []).map((e: any) => e.component_name as string))
            )) as string[];

            const uniqueDeductions = Array.from(new Set(
                exportData.flatMap((s: any) => (s.deductions || []).map((d: any) => d.component_name as string))
            )) as string[];

            const headers = [
                'Slip ID',
                'Employee Name',
                'Emp ID',
                'Dept',
                'Designation',
                'DOJ',
                'Start',
                'End',
                'Work Days',
                'Present',
                'Holidays',
                'Leave',
                'Paid Leave',
                'LOP Days',
                ...uniqueEarnings,
                'Gross Pay',
                ...uniqueDeductions,
                'LOP Amt',
                'Total Deduct',
                'Net Pay'
            ];

            const body = exportData.map((row: any) => {
                const rowData: any[] = [
                    row.name,
                    row.employee_name,
                    row.employee,
                    row.department || '-',
                    row.designation || '-',
                    row.date_of_joining ? fDate(row.date_of_joining, 'DD-MM-YYYY') : '-',
                    fDate(row.pay_period_start, 'DD-MM-YYYY'),
                    fDate(row.pay_period_end, 'DD-MM-YYYY'),
                    row.total_working_days ?? 0,
                    row.actual_present_days ?? 0,
                    row.holiday_count ?? 0,
                    row.no_of_leave ?? 0,
                    row.no_of_paid_leave ?? 0,
                    row.lop_days ?? 0,
                ];

                // Add dynamic earnings
                uniqueEarnings.forEach((name: string) => {
                    const matched = (row.earnings || []).find((c: any) => c.component_name === name);
                    rowData.push(fNumber(matched ? matched.amount : 0, { locale: hrSettings.default_locale }));
                });

                rowData.push(fNumber(row.grand_gross_pay ?? row.gross_pay ?? 0, { locale: hrSettings.default_locale }));

                // Add dynamic deductions
                uniqueDeductions.forEach((name: string) => {
                    const matched = (row.deductions || []).find((c: any) => c.component_name === name);
                    rowData.push(fNumber(matched ? matched.amount : 0, { locale: hrSettings.default_locale }));
                });

                rowData.push(fNumber(row.lop ?? 0, { locale: hrSettings.default_locale }));
                rowData.push(fNumber(row.total_deduction ?? 0, { locale: hrSettings.default_locale }));
                rowData.push(fNumber(row.grand_net_pay ?? row.net_pay ?? 0, { locale: hrSettings.default_locale }));

                return rowData;
            });

            autoTable(doc, {
                startY: 40,
                head: [headers],
                body: body,
                theme: 'grid',
                headStyles: { 
                    fillColor: [14, 165, 233], 
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold', 
                    halign: 'center',
                    lineColor: [0, 0, 0],
                    lineWidth: 0.15
                },
                styles: { 
                    fontSize: 5, 
                    cellPadding: 1, 
                    overflow: 'linebreak', 
                    lineWidth: 0.15, 
                    lineColor: [0, 0, 0], 
                    valign: 'middle' 
                },
                columnStyles: {
                    0: { halign: 'center' },
                    1: { cellWidth: 'auto' },
                    2: { halign: 'center' },
                }
            });

            doc.save(`Salary_Slip_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            enqueueSnackbar('PDF exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('PDF export failed:', error);
            enqueueSnackbar('PDF export failed!', { variant: 'error' });
        } finally {
            setExportingPdf(false);
        }
    };

    const handleViewDetails = async (name: string) => {
        try {
            const details = await getSalarySlipWithDetails(name);
            setSelectedSlip(details);
            setOpenDetails(true);
        } catch (error) {
            console.error('Failed to fetch details:', error);
            enqueueSnackbar('Failed to load salary slip details', { variant: 'error' });
        }
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

    // Summary calculations
    const totalSlips = reportData.length;
    const totalGross = reportData.reduce((acc, curr) => acc + (curr.grand_gross_pay ?? curr.gross_pay ?? 0), 0);
    const totalNet = reportData.reduce((acc, curr) => acc + (curr.grand_net_pay ?? curr.net_pay ?? 0), 0);
    const totalDeductions = reportData.reduce((acc, curr) => acc + (curr.total_deduction ?? 0), 0);
    const totalLop = reportData.reduce((acc, curr) => acc + (curr.lop ?? 0), 0);

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Salary Slip Report</Typography>
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
                                label="From Period"
                                format="DD-MM-YYYY"
                                value={fromDate}
                                onChange={(newValue) => setFromDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 170 } } }}
                            />
                            <DatePicker
                                label="To Period"
                                format="DD-MM-YYYY"
                                value={toDate}
                                onChange={(newValue) => setToDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, maxWidth: 170 } } }}
                            />
                        </LocalizationProvider>

                        <Autocomplete
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 200 }}
                            options={[{ name: 'all', employee_name: 'All Employees' }, ...employeeOptions]}
                            getOptionLabel={(option) => option.name === 'all' ? option.employee_name : `${option.employee_name} (${option.name})`}
                            value={employee === 'all' ? { name: 'all', employee_name: 'All Employees' } : (employeeOptions.find((opt) => opt.name === employee) || null)}
                            onChange={(event, newValue) => {
                                setEmployee(newValue?.name || 'all');
                            }}
                            disabled={!isHR}
                            renderOption={(props, option) => (
                                <li {...props} key={option.name}>
                                    {option.name === 'all' ? (
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                            {option.employee_name}
                                        </Typography>
                                    ) : (
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                {option.employee_name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                                ID: {option.name}
                                            </Typography>
                                        </Box>
                                    )}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Employee"
                                    placeholder="Select Employee"
                                />
                            )}
                        />

                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 220 }}>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="pay_period_start_desc">Period ↓ (Latest)</MenuItem>
                                <MenuItem value="pay_period_start_asc">Period ↑ (Oldest)</MenuItem>
                                <MenuItem value="net_pay_desc">Net Salary: High to Low</MenuItem>
                                <MenuItem value="net_pay_asc">Net Salary: Low to High</MenuItem>
                                <MenuItem value="gross_pay_desc">Gross Pay: High to Low</MenuItem>
                                <MenuItem value="gross_pay_asc">Gross Pay: Low to High</MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{ flexGrow: 1 }} />
                        {canExport && (
                            <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
                                <Button
                                    variant="contained"
                                    startIcon={exportingExcel ? undefined : <Iconify icon={"solar:export-bold" as any} />}
                                    onClick={handleExport}
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
                                    onClick={handleExportPdf}
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
                    <SummaryCard item={{ label: 'Total Slips', value: totalSlips, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Gross Payable', value: fNumber(totalGross, { locale: hrSettings.default_locale }), prefix: hrSettings.currency_symbol, indicator: 'green' }} />
                    <SummaryCard item={{ label: 'Total Deductions', value: fNumber(totalDeductions, { locale: hrSettings.default_locale }), prefix: hrSettings.currency_symbol, indicator: 'red' }} />
                    <SummaryCard item={{ label: 'Net Payable', value: fNumber(totalNet, { locale: hrSettings.default_locale }), prefix: hrSettings.currency_symbol, indicator: 'green' }} />
                </Box>

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
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Slip ID</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Pay Period</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Gross Pay</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Deductions</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Net Pay</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', position: 'sticky', right: 0, bgcolor: '#f4f6f8', zIndex: 11 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {reportData
                                                .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                                                .map((row) => {
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
                                                            <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{row.name}</TableCell>
                                                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                <Typography variant="subtitle2">{row.employee_name}</Typography>
                                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>{row.employee}</Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                                {fDate(row.pay_period_start, 'DD-MM-YYYY')} to {fDate(row.pay_period_end, 'DD-MM-YYYY')}
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 700 }}>
                                                                <Box component="span" sx={{ fontFamily: 'Arial', mr: 0.2 }}>{hrSettings.currency_symbol}</Box>
                                                                {fNumber(row.grand_gross_pay ?? row.gross_pay ?? 0, { locale: hrSettings.default_locale })}
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                                                                <Box component="span" sx={{ fontFamily: 'Arial', mr: 0.2 }}>{hrSettings.currency_symbol}</Box>
                                                                {fNumber(row.total_deduction ?? 0, { locale: hrSettings.default_locale })}
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                                                <Box component="span" sx={{ fontFamily: 'Arial', mr: 0.2 }}>{hrSettings.currency_symbol}</Box>
                                                                {fNumber(row.grand_net_pay ?? row.net_pay ?? 0, { locale: hrSettings.default_locale })}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper' }}>
                                                                <IconButton onClick={() => handleViewDetails(row.name)} sx={{ color: 'info.main' }}>
                                                                    <Iconify icon={"solar:eye-bold" as any} />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}

                                            {reportData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                                        <Stack spacing={1} alignItems="center">
                                                            <Iconify icon={"solar:filter-bold-duotone" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                            <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                                                                No salary slips found
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
            </Stack>

            <SalarySlipDetailsDialog
                open={openDetails}
                onClose={() => {
                    setOpenDetails(false);
                    setSelectedSlip(null);
                }}
                slip={selectedSlip}
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
        if (t.includes('gross')) return 'solar:wad-of-money-bold-duotone';
        if (t.includes('deduction')) return 'solar:hand-money-bold-duotone';
        if (t.includes('net')) return 'solar:wallet-money-bold-duotone';
        if (t.includes('lop')) return 'solar:danger-circle-bold-duotone';
        return 'solar:bill-list-bold-duotone';
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
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, }}>
                        {item.label}
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                        {item.prefix && (
                            <Box component="span" sx={{ fontFamily: 'Arial', mr: 0.5 }}>
                                {item.prefix}
                            </Box>
                        )}
                        {item.value?.toLocaleString()}
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
