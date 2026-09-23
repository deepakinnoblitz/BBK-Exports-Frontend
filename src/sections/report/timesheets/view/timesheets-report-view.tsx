import dayjs from 'dayjs';
import jsPDF from 'jspdf';
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

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { getTimesheet } from 'src/api/timesheets';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useAuth } from 'src/auth/auth-context';

import { TimesheetDetailsDialog } from '../timesheets-details-dialog';
import { TimesheetReportCalendar } from './timesheet-report-calendar';


// ----------------------------------------------------------------------

export function TimesheetsReportView() {
    const theme = useTheme();
    const { user } = useAuth();
    const actionPerms =
      user?.permissions?.actions?.my_timesheet_report ||
      user?.permissions?.actions?.timesheet_report ||
      user?.permissions?.actions?.report_timesheet;
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const canExport = hasCustomPerms ? !!actionPerms?.export : true;
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const { enqueueSnackbar } = useSnackbar();

    const [isHR, setIsHR] = useState(false);

    // Filters
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const [employee, setEmployee] = useState<string[]>([]);
    const [project, setProject] = useState('all');
    const [activityType, setActivityType] = useState('all');
    const [sortBy, setSortBy] = useState('date_asc');

    // Options
    const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
    const [projectOptions, setProjectOptions] = useState<any[]>([]);
    const [activityTypeOptions, setActivityTypeOptions] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    // Details Dialog
    const [openDetails, setOpenDetails] = useState(false);
    const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');

    useEffect(() => {
        if (employee.length !== 1) {
            setCurrentView('list');
        }
    }, [employee]);

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

    const handleViewDetails = async (name: string) => {
        setLoadingDetails(true);
        try {
            const data = await getTimesheet(name);
            setSelectedTimesheet(data);
            setOpenDetails(true);
        } catch (error) {
            console.error('Failed to fetch timesheet details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = reportData.filter(d => d.timesheet_date !== 'TOTAL').map((n, index) => `${n.employee}-${index}`);
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
            if (project !== 'all') filters.project = project;
            if (activityType !== 'all') filters.activity_type = activityType;

            const result = await runReport('Timesheet Report', filters);
            let finalData = result.result || [];

            // Sort Data
            finalData = [...finalData].sort((a, b) => {
                const dateA = a.timesheet_date || '';
                const dateB = b.timesheet_date || '';
                const nameA = (a.employee_name || '').toLowerCase();
                const nameB = (b.employee_name || '').toLowerCase();

                if (dateA === 'TOTAL') return 1;
                if (dateB === 'TOTAL') return -1;

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
        } catch (error) {
            console.error('Failed to fetch timesheet report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, employee, project, activityType, sortBy]);

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
        setProject('all');
        setActivityType('all');
        setSortBy('date_asc');
    };


    useEffect(() => {
        getDoctypeList('Employee', ['name', 'employee_name']).then(setEmployeeOptions);
        getDoctypeList('Project', ['name', 'project']).then(setProjectOptions);
        getDoctypeList('Activity Type', ['name', 'activity_type']).then(setActivityTypeOptions);
    }, []);
    const handleExport = async () => {
        setExportingExcel(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Timesheet Report');

            const dataToExport = reportData.filter(d => d.timesheet_date !== 'TOTAL');

            // Selection Logic
            const exportData = selected.length > 0
                ? dataToExport.filter((row, index) => selected.includes(`${row.employee}-${index}`))
                : dataToExport;

            sheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Employee', key: 'employee_name', width: 25 },
                { header: 'Employee ID', key: 'employee', width: 15 },
                { header: 'Project', key: 'project', width: 20 },
                { header: 'Activity Type', key: 'activity', width: 25 },
                { header: 'Hours', key: 'hours', width: 12 },
                { header: 'Description', key: 'description', width: 50 },
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
                sheet.addRow({
                    date: fDate(row.timesheet_date, 'DD-MM-YYYY'),
                    employee_name: row.employee_name,
                    employee: row.employee,
                    project: row.project || '---',
                    activity: row.activity_type || '---',
                    hours: row.hours || 0,
                    description: row.description || ''
                });
            });

            // Merging logic for Date, Employee, and Employee ID (to group entries)
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

                        // Align merged cells to middle
                        ['A', 'B', 'C'].forEach(col => {
                            sheet.getCell(`${col}${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'center' };
                        });
                    }
                    mergeStart = i + 1;
                }
            }

            // Alternating row colors and black borders (Limited to data columns only)
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1 && rowNumber <= sheet.rowCount - 1) { // Apply to data rows only (excluding TOTAL)
                    for (let i = 1; i <= columnCount; i++) {
                        const cell = row.getCell(i);
                        // Description (column 7) should be left aligned
                        cell.alignment = { 
                            vertical: 'middle', 
                            horizontal: i === 7 ? 'left' : 'center' 
                        };
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

            // Add Total row
            const totalHoursVal = exportData.reduce((acc, curr) => acc + (curr.hours || 0), 0);
            const totalRow = sheet.addRow(['TOTAL', '', '', '', '', totalHoursVal, '']);
            totalRow.font = { bold: true };
            totalRow.getCell(6).numFmt = '0.00 "hrs"';

            for (let i = 1; i <= columnCount; i++) {
                totalRow.getCell(i).border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Timesheet_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
            enqueueSnackbar('Excel exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Excel Export failed:', error);
            enqueueSnackbar('Failed to export Excel. Please try again.', { variant: 'error' });
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const doc = new jsPDF('landscape');
            const dataToExport = reportData.filter(d => d.timesheet_date !== 'TOTAL');

            // Selection Logic
            const exportData = selected.length > 0
                ? dataToExport.filter((row, index) => selected.includes(`${row.employee}-${index}`))
                : dataToExport;

            if (exportData.length === 0) {
                enqueueSnackbar('No data to export', { variant: 'warning' });
                setExportingPdf(false);
                return;
            }

            // Header
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233);
            doc.setFont('helvetica', 'bold');
            doc.text('Timesheet Report', 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${dayjs().format('DD MMM YYYY, h:mm A')}`, 14, 27);

            // Accent line
            doc.setDrawColor(14, 165, 233);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const tableDataObjects: any[] = [];
            for (let i = 0; i < exportData.length; i++) {
                const row = exportData[i];
                const currentDate = fDate(row.timesheet_date, 'DD-MM-YYYY') || '-';
                const currentEmployee = row.employee_name || '-';
                const currentEmployeeId = row.employee || '-';

                // Check if this row is the start of a new group (Date + Employee + Employee ID)
                let isFirstInGroup = true;
                if (i > 0) {
                    const prevRow = exportData[i - 1];
                    const prevDate = fDate(prevRow.timesheet_date, 'DD-MM-YYYY') || '-';
                    if (prevDate === currentDate &&
                        prevRow.employee_name === currentEmployee &&
                        prevRow.employee === currentEmployeeId) {
                        isFirstInGroup = false;
                    }
                }

                if (isFirstInGroup) {
                    // Calculate rowSpan for the group
                    let rowSpanCount = 1;
                    for (let j = i + 1; j < exportData.length; j++) {
                        const nextRow = exportData[j];
                        const nextDate = fDate(nextRow.timesheet_date, 'DD-MM-YYYY') || '-';
                        if (nextDate === currentDate &&
                            nextRow.employee_name === currentEmployee &&
                            nextRow.employee === currentEmployeeId) {
                            rowSpanCount++;
                        } else {
                            break;
                        }
                    }

                    tableDataObjects.push({
                        date: rowSpanCount > 1 ? { content: currentDate, rowSpan: rowSpanCount } : currentDate,
                        employee: rowSpanCount > 1 ? { content: currentEmployee, rowSpan: rowSpanCount } : currentEmployee,
                        employeeId: rowSpanCount > 1 ? { content: currentEmployeeId, rowSpan: rowSpanCount } : currentEmployeeId,
                        project: row.project || '-',
                        activity: row.activity_type || '-',
                        hours: `${(row.hours || 0).toFixed(2)} hrs`,
                        description: row.description || ''
                    });
                } else {
                    // Omit grouped columns as they are covered by rowSpan from the first row
                    tableDataObjects.push({
                        date: null,
                        employee: null,
                        employeeId: null,
                        project: row.project || '-',
                        activity: row.activity_type || '-',
                        hours: `${(row.hours || 0).toFixed(2)} hrs`,
                        description: row.description || ''
                    });
                }
            }

            // Add Total Row
            const totalHoursVal = exportData.reduce((acc, curr) => acc + (curr.hours || 0), 0);
            tableDataObjects.push({
                date: 'TOTAL',
                employee: '',
                employeeId: '',
                project: '',
                activity: '',
                hours: `${totalHoursVal.toFixed(2)} hrs`,
                description: ''
            });

            autoTable(doc, {
                startY: 40,
                columns: [
                    { header: 'Date', dataKey: 'date' },
                    { header: 'Employee', dataKey: 'employee' },
                    { header: 'Employee ID', dataKey: 'employeeId' },
                    { header: 'Project', dataKey: 'project' },
                    { header: 'Activity Type', dataKey: 'activity' },
                    { header: 'Hours', dataKey: 'hours' },
                    { header: 'Description', dataKey: 'description' },
                ],
                body: tableDataObjects,
                theme: 'grid',
                headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', lineWidth: 0.15, lineColor: [60, 60, 60], valign: 'middle' },
                columnStyles: {
                    date: { cellWidth: 22, halign: 'center' },
                    employee: { cellWidth: 45, halign: 'center' },
                    employeeId: { cellWidth: 22, halign: 'center' },
                    project: { cellWidth: 35 },
                    activity: { cellWidth: 28 },
                    hours: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
                    description: { cellWidth: 'auto' }
                },
                didParseCell: (data) => {
                    // Style the TOTAL row
                    if (data.row.index === tableDataObjects.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [244, 246, 248];
                        if (data.column.dataKey === 'date') {
                            data.cell.styles.halign = 'left';
                        }
                    }
                }
            });

            doc.save(`Timesheet_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
            enqueueSnackbar('PDF exported successfully!', { variant: 'success' });
        } catch (error) {
            console.error('PDF Export failed:', error);
            enqueueSnackbar('Failed to export PDF. Please try again.', { variant: 'error' });
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

    const totalHours = reportData
        .filter(d => d.timesheet_date !== 'TOTAL')
        .reduce((acc, curr) => acc + (curr.hours || 0), 0);
    const totalEntries = reportData.filter(d => d.timesheet_date !== 'TOTAL').length;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Timesheet Report</Typography>
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
                        flexDirection: 'column',   // 🔥 make vertical
                        gap: 2,
                        bgcolor: 'background.neutral',
                        border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                >

                    {/* 🔹 Top Row – Filters */}
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

                        {/* Project */}
                        <Autocomplete
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 180 }}
                            options={[{ name: 'all', project: 'All Projects' }, ...projectOptions]}
                            getOptionLabel={(option) => option.project || ''}
                            value={
                                project === 'all'
                                    ? { name: 'all', project: 'All Projects' }
                                    : projectOptions.find((opt) => opt.name === project) || null
                            }
                            onChange={(event, newValue) => setProject(newValue?.name || 'all')}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} sx={{ fontSize: '0.85rem' }}>
                                    {option.project}
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField {...params} label="Project" placeholder="Select Project" />
                            )}
                        />

                        {/* Activity */}
                        <Autocomplete
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 180 }}
                            options={[{ name: 'all', activity_type: 'All Activities' }, ...activityTypeOptions]}
                            getOptionLabel={(option) => option.activity_type || ''}
                            value={
                                activityType === 'all'
                                    ? { name: 'all', activity_type: 'All Activities' }
                                    : activityTypeOptions.find((opt) => opt.name === activityType) || null
                            }
                            onChange={(event, newValue) => setActivityType(newValue?.name || 'all')}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} sx={{ fontSize: '0.85rem' }}>
                                    {option.activity_type}
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField {...params} label="Activity" placeholder="Select Activity" />
                            )}
                        />

                        {/* Sort */}
                        <FormControl size="small" sx={{ flexGrow: 1, minWidth: 140 }}>
                            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <MenuItem value="date_asc" sx={{ fontSize: '0.85rem' }}>Date ↓ (Latest)</MenuItem>
                                <MenuItem value="date_desc" sx={{ fontSize: '0.85rem' }}>Date ↑ (Oldest)</MenuItem>
                                <MenuItem value="name_asc" sx={{ fontSize: '0.85rem' }}>Name: A to Z</MenuItem>
                                <MenuItem value="name_desc" sx={{ fontSize: '0.85rem' }}>Name: Z to A</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Employee */}
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
                        },
                    }}
                >
                    <SummaryCard item={{ label: 'Total Entries', value: totalEntries, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Total Hours', value: totalHours, indicator: 'green', suffix: 'hrs' }} />
                </Box>

                {employee.length === 1 && (
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
                                { value: 'calendar', label: 'Calendar View', icon: 'solar:calendar-bold' }
                            ].map((tab) => {
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
                )}

                {currentView === 'list' ? (
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
                                                indeterminate={selected.length > 0 && selected.length < reportData.length - 1}
                                                checked={reportData.length > 1 && selected.length === reportData.length - 1}
                                                onChange={handleSelectAllClick}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Employee</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Project</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Activity Type</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Hours</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Description</TableCell>
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
                                                .filter(d => d.timesheet_date !== 'TOTAL')
                                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                                .map((row, index) => {
                                                    const absoluteIndex = page * rowsPerPage + index;
                                                    const rowId = `${row.employee}-${absoluteIndex}`;
                                                    const isSelected = selected.indexOf(rowId) !== -1;
                                                    return (
                                                        <TableRow
                                                            key={index}
                                                            hover
                                                            role="checkbox"
                                                            aria-checked={isSelected}
                                                            selected={isSelected}
                                                            sx={{
                                                                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                                '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                            }}
                                                        >
                                                            <TableCell padding="checkbox">
                                                                <Checkbox checked={isSelected} onClick={(event) => handleClick(event, rowId)} />
                                                            </TableCell>
                                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.timesheet_date, 'DD-MM-YYYY')}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="subtitle2">{row.employee_name}</Typography>
                                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>{row.employee}</Typography>
                                                            </TableCell>
                                                            <TableCell>{row.project}</TableCell>
                                                            <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.activity_type}</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold' }}>{row.hours} hrs</TableCell>
                                                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {row.description}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', boxShadow: '-2px 0 4px rgba(145, 158, 171, 0.08)' }}>
                                                                <IconButton onClick={() => handleViewDetails(row.name)} sx={{ color: 'info.main' }}>
                                                                    <Iconify icon={"solar:eye-bold" as any} />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}

                                            {/* Total Row */}
                                            {reportData.length > 0 && (
                                                <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                                                    <TableCell padding="checkbox" />
                                                    <TableCell colSpan={4} sx={{ fontWeight: 'bold', color: 'success.main' }}>TOTAL</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>{totalHours.toFixed(2)} hrs</TableCell>
                                                    <TableCell colSpan={2} />
                                                </TableRow>
                                            )}

                                            {reportData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                                        <Stack spacing={1} alignItems="center">
                                                            <Iconify icon={"eva:slash-outline" as any} width={48} sx={{ color: 'text.disabled' }} />
                                                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>No data found</Typography>
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
                        count={reportData.filter(d => d.timesheet_date !== 'TOTAL').length}
                        page={page}
                        onPageChange={onChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={onChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
                ) : (
                    <TimesheetReportCalendar
                        reportData={reportData}
                        fromDate={fromDate}
                        toDate={toDate}
                        onEventClick={handleViewDetails}
                    />
                )}
            </Stack>

            <TimesheetDetailsDialog
                open={openDetails}
                timesheet={selectedTimesheet}
                onClose={() => {
                    setOpenDetails(false);
                    setSelectedTimesheet(null);
                }}
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
        if (t.includes('hours')) return 'solar:clock-circle-bold-duotone';
        if (t.includes('entries')) return 'solar:list-bold-duotone';
        return 'solar:chart-2-bold-duotone';
    };

    const color = getIndicatorColor(item.indicator);

    return (
        <Card
            sx={{
                p: 3,
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
            <Stack direction="row" alignItems="center" spacing={2.5}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        display: 'flex',
                        borderRadius: 1.5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        bgcolor: alpha(color, 0.1),
                    }}
                >
                    <Iconify icon={getIcon(item.label) as any} width={28} />
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>
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
