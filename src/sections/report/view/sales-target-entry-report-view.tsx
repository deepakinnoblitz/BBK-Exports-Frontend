import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
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

import { usePdfExport } from 'src/hooks/use-pdf-export';

import { fCurrency } from 'src/utils/format-number';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { generateSalesTargetEntryPdf } from 'src/components/export/pdf/sales-target-entry-pdf-generator';

import { SalesTargetEntryDetailsDialog } from 'src/sections/sales-target-entry/sales-target-entry-details-dialog';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['New', 'Confirmed', 'In Progress', 'Completed', 'Hold', 'Cancelled'];
const MONTH_OPTIONS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const renderCurrency = (amount: any, symbolFontSize: string = '15px') => {
    const formatted = fCurrency(amount);
    if (!formatted) return '—';
    const index = formatted.indexOf('₹');
    if (index !== -1) {
        return (
            <>
                {formatted.substring(0, index)}
                <span style={{ fontFamily: 'Arial', fontSize: symbolFontSize, display: 'inline-block', verticalAlign: 'baseline', lineHeight: 'normal' }}>₹</span>{' '}
                {formatted.substring(index + 1)}
            </>
        );
    }
    return formatted;
};

export function SalesTargetEntryReportView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.sales_target_entry_report;
    const canExport = hasCustomPerms ? !!user?.permissions?.actions?.sales_target_entry_report?.export : true;

    const { exportingPdf, handleExportPdf } = usePdfExport();

    const [reportData, setReportData] = useState<any[]>([]);
    const [reportSummaryData, setReportSummaryData] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);

    // Filters in exact required order: From Date, To Date, Sales Person, Month, Status
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const [salesPerson, setSalesPerson] = useState('all');
    const [month, setMonth] = useState('all');
    const [status, setStatus] = useState('all');

    // Options
    const [salesPersonOptions, setSalesPersonOptions] = useState<any[]>([]);
    const [contactsOptions, setContactsOptions] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    // Details View Dialog
    const [openView, setOpenView] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);

    useEffect(() => {
        getDoctypeList('User', ['name', 'full_name'])
            .then((list) => setSalesPersonOptions(list || []))
            .catch(console.error);

        getDoctypeList('Contacts', ['name', 'first_name', 'last_name'])
            .then((list) => setContactsOptions(list || []))
            .catch(console.error);
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');
            if (salesPerson !== 'all' && salesPerson) filters.sales_person = salesPerson;
            if (month !== 'all' && month) filters.month = month;
            if (status !== 'all' && status) filters.status = status;

            const result = await runReport('Sales Target Entry Report', filters);
            setReportData(result.result || []);
            if (result.report_summary) {
                setReportSummaryData(result.report_summary);
            } else {
                setReportSummaryData(null);
            }
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch Sales Target Entry report:', error);
            setReportData([]);
            setReportSummaryData(null);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, salesPerson, month, status]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        setSalesPerson('all');
        setMonth('all');
        setStatus('all');
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = filteredData.map((n) => n.sales_entry_id || n.name);
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

    const onChangePage = useCallback((event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const handleViewEntry = (entry: any) => {
        setSelectedEntry(entry);
        setOpenView(true);
    };

    const filteredData = reportData;

    const handleExport = async () => {
        setLoading(true);
        try {
            const dataToExport = selected.length > 0
                ? filteredData.filter((r) => selected.includes(r.sales_entry_id || r.name))
                : filteredData;

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Sales Target Entry Report');

            const columnsDef = [
                { header: 'Sales Entry ID', key: 'sales_entry_id' },
                { header: 'Sales Person', key: 'sales_person' },
                { header: 'Month', key: 'month' },
                { header: 'In Date', key: 'in_date' },
                { header: 'Contact', key: 'contact_name' },
                { header: 'Contact Number', key: 'contact_number' },
                { header: 'Value', key: 'value' },
                { header: 'Advance', key: 'advance' },
                { header: 'Balance', key: 'balance' },
                { header: 'Status', key: 'status' },
                { header: 'Out Date', key: 'out_date' },
            ];

            sheet.columns = columnsDef;

            const colCount = columnsDef.length;

            for (let i = 1; i <= colCount; i++) {
                const cell = sheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            sheet.getRow(1).height = 25;

            dataToExport.forEach((row: any) => {
                const spObj = salesPersonOptions.find((u) => u.name === row.sales_person || u.full_name === row.sales_person);
                const spName = spObj?.full_name || row.sales_person_name || row.sales_person || '-';

                const contactObj = contactsOptions.find((c) => c.name === row.contact_name);
                const contactNameStr = contactObj ? ([contactObj.first_name, contactObj.last_name].filter(Boolean).join(' ') || contactObj.name) : (row.contact_name || '-');

                const excelRow = sheet.addRow({
                    sales_entry_id: row.sales_entry_id || '-',
                    sales_person: spName,
                    month: row.month || '-',
                    in_date: row.in_date || '-',
                    contact_name: contactNameStr,
                    contact_number: row.contact_number || '-',
                    value: row.value != null ? Number(row.value) : 0,
                    advance: row.advance != null ? Number(row.advance) : 0,
                    balance: row.balance != null ? Number(row.balance) : 0,
                    status: row.status || '-',
                    out_date: row.out_date || '-',
                });

                const statusCell = excelRow.getCell('status');
                const statusVal = row.status || '';
                if (statusVal === 'Completed' || statusVal === 'Confirmed') {
                    statusCell.font = { color: { argb: 'FF22C55E' }, bold: true };
                } else if (statusVal === 'Cancelled') {
                    statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                } else if (statusVal === 'In Progress' || statusVal === 'Hold') {
                    statusCell.font = { color: { argb: 'FFF97316' }, bold: true };
                }
            });

            sheet.columns?.forEach((column) => {
                if (!column) return;
                let maxLen = 0;
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const val = cell.value ? String(cell.value) : '';
                        if (val.length > maxLen) {
                            maxLen = val.length;
                        }
                    });
                }
                column.width = Math.max(maxLen + 4, 14);
            });

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    for (let i = 1; i <= colCount; i++) {
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

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Sales_Target_Entry_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary Metrics
    const totalSales = reportSummaryData
        ? (reportSummaryData.find((s) => s.label === 'Total Sales')?.value ?? 0)
        : reportData.reduce((sum, r) => sum + (Number(r.value) || 0), 0);

    const totalAdvance = reportSummaryData
        ? (reportSummaryData.find((s) => s.label === 'Total Advance')?.value ?? 0)
        : reportData.reduce((sum, r) => sum + (Number(r.advance) || 0), 0);

    const totalBalance = reportSummaryData
        ? (reportSummaryData.find((s) => s.label === 'Total Balance')?.value ?? 0)
        : reportData.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);

    const totalEntries = reportSummaryData
        ? (reportSummaryData.find((s) => s.label === 'Total Entries')?.value ?? 0)
        : reportData.length;

    const summaryItems = [
        { label: 'Total Sales', value: totalSales, indicator: 'Green', datatype: 'Currency' },
        { label: 'Total Advance', value: totalAdvance, indicator: 'Blue', datatype: 'Currency' },
        { label: 'Total Balance', value: totalBalance, indicator: 'Orange', datatype: 'Currency' },
        { label: 'Total Entries', value: totalEntries, indicator: 'Purple', datatype: 'Int' },
    ];

    const getStatusColor = (statusVal: string): 'info' | 'success' | 'warning' | 'error' | 'default' => {
        switch (statusVal) {
            case 'New': return 'info';
            case 'Confirmed': return 'success';
            case 'In Progress': return 'warning';
            case 'Completed': return 'success';
            case 'Hold': return 'warning';
            case 'Cancelled': return 'error';
            default: return 'default';
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                {/* Header Title & Top Controls */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Sales Target Entry Report</Typography>
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
                            startIcon={<Iconify icon="solar:restart-bold" />}
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                    </Stack>
                </Stack>

                {/* Filters Section (Exact required order: From Date, To Date, Sales Person, Month, Status) */}
                <Card
                    sx={{
                        py: 2.5,
                        px: 2,
                        display: 'flex',
                        columnGap: 2,
                        rowGap: 1.5,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        bgcolor: 'background.neutral',
                        border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                >
                    {/* 1. From Date */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="From Date"
                            format="DD-MM-YYYY"
                            value={fromDate}
                            onChange={(newValue) => setFromDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 160, '& .MuiInputBase-root': { height: 40, alignItems: 'center' } }
                                }
                            }}
                        />
                        {/* 2. To Date */}
                        <DatePicker
                            label="To Date"
                            format="DD-MM-YYYY"
                            value={toDate}
                            onChange={(newValue) => setToDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 160, '& .MuiInputBase-root': { height: 40, alignItems: 'center' } }
                                }
                            }}
                        />
                    </LocalizationProvider>

                    {/* 3. Sales Person */}
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 240 }}
                        options={[{ name: 'all', full_name: 'All Sales Persons' }, ...salesPersonOptions]}
                        getOptionLabel={(option: any) => typeof option === 'string' ? option : (option.full_name || option.name || '')}
                        value={salesPersonOptions.find((u) => u.name === salesPerson) || { name: 'all', full_name: 'All Sales Persons' }}
                        onChange={(event, newValue: any) => {
                            if (!newValue || newValue.name === 'all') {
                                setSalesPerson('all');
                            } else {
                                setSalesPerson(newValue.name);
                            }
                        }}
                        renderOption={(props, option: any) => {
                            const { key, ...optionProps } = props as any;
                            if (option.name === 'all') {
                                return (
                                    <Box component="li" key={key || 'all'} {...optionProps} sx={{ py: 0.8 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            All Sales Persons
                                        </Typography>
                                    </Box>
                                );
                            }
                            return (
                                <Box component="li" key={key || option.name} {...optionProps} sx={{ display: 'block', py: 0.5 }}>
                                    <Stack spacing={0.2} sx={{ width: '100%' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {option.full_name || option.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            ID: {option.name}
                                        </Typography>
                                    </Stack>
                                </Box>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="All Sales Persons"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1.5,
                                        bgcolor: 'background.neutral',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        },
                                    },
                                }}
                            />
                        )}
                    />

                    {/* 4. Month */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            displayEmpty
                            sx={{ height: 40, borderRadius: 1.5, bgcolor: 'background.neutral' }}
                        >
                            <MenuItem value="all">All Months</MenuItem>
                            {MONTH_OPTIONS.map((m) => (
                                <MenuItem key={m} value={m}>{m}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* 5. Status */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            displayEmpty
                            sx={{ height: 40, borderRadius: 1.5, bgcolor: 'background.neutral' }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            {STATUS_OPTIONS.map((s) => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />

                    {/* Export Action Buttons */}
                    <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
                        {canExport && (
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon={"solar:export-bold" as any} />}
                                onClick={handleExport}
                                disabled={reportData.length === 0}
                                sx={{
                                    bgcolor: '#0ea5e9',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#0284c7' },
                                    height: 40,
                                    px: 3,
                                }}
                            >
                                Export Excel
                            </Button>
                        )}
                        {canExport && (
                            <Button
                                variant="contained"
                                startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                                onClick={() => handleExportPdf(() => generateSalesTargetEntryPdf({
                                    reportData: filteredData,
                                    selected,
                                    summary: summaryItems.map(item => ({
                                        label: item.label,
                                        value: item.value,
                                        isCurrency: item.datatype === 'Currency'
                                    }))
                                }))}
                                disabled={exportingPdf || reportData.length === 0}
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
                        )}
                    </Stack>
                </Card>

                {/* Summary Cards (Total Sales, Total Advance, Total Balance, Total Entries) */}
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
                    {summaryItems.map((item) => (
                        <SummaryCard key={item.label} item={item} />
                    ))}
                </Box>

                {/* Report Table (Exact column order: Sales Entry ID, Sales Person, Month, Contact, Value, Advance, Balance, GST Type, Status) */}
                <Card>
                    <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                        <Scrollbar>
                            <Table size="medium" stickyHeader sx={{ borderCollapse: 'collapse' }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={selected.length > 0 && selected.length < filteredData.length}
                                                checked={filteredData.length > 0 && selected.length === filteredData.length}
                                                onChange={handleSelectAllClick}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Sales Entry ID</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Sales Person</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Month</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Client</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Value</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Advance</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Balance</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', position: 'sticky', right: 0, bgcolor: '#f4f6f8', zIndex: 11 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                                                const rowId = row.sales_entry_id || row.name || `row-${index}`;
                                                const isSelected = selected.indexOf(rowId) !== -1;
                                                return (
                                                    <TableRow
                                                        key={rowId}
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
                                                        <TableCell sx={{ fontWeight: 600 }}>{row.sales_entry_id || '-'}</TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                if (!row.sales_person) return '-';
                                                                const userObj = salesPersonOptions.find(
                                                                    (u) => u.name === row.sales_person || u.full_name === row.sales_person
                                                                );
                                                                const fullName = userObj?.full_name || row.sales_person_name || row.sales_person;
                                                                const userId = userObj?.name || (userObj?.full_name ? row.sales_person : '');

                                                                return (
                                                                    <Stack spacing={0.2}>
                                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                            {fullName}
                                                                        </Typography>
                                                                        {userId && userId !== fullName && (
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                ID: {userId}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell>{row.month || '-'}</TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                if (!row.contact_name) return '-';
                                                                const contactObj = contactsOptions.find((c) => c.name === row.contact_name);
                                                                const contactName = contactObj
                                                                    ? ([contactObj.first_name, contactObj.last_name].filter(Boolean).join(' ') || contactObj.name)
                                                                    : row.contact_name;
                                                                const contactId = row.contact_name;

                                                                return (
                                                                    <Stack spacing={0.2}>
                                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                            {contactName}
                                                                        </Typography>
                                                                        {contactId && contactId !== contactName && (
                                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                                {contactId}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                            {row.value != null ? renderCurrency(row.value) : '-'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                                                            {row.advance != null ? renderCurrency(row.advance) : '-'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: (row.balance || 0) > 0 ? 'error.main' : 'text.primary' }}>
                                                            {row.balance != null ? renderCurrency(row.balance) : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Label color={getStatusColor(row.status || '')}>
                                                                {row.status || 'New'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', boxShadow: '-2px 0 4px rgba(145, 158, 171, 0.08)' }}>
                                                            <IconButton onClick={() => handleViewEntry(row)} sx={{ color: 'info.main' }}>
                                                                <Iconify icon="solar:eye-bold" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {filteredData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
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
                        count={filteredData.length}
                        page={page}
                        onPageChange={onChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={onChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
            </Stack>

            {/* View Details Dialog */}
            <SalesTargetEntryDetailsDialog
                open={openView}
                onClose={() => setOpenView(false)}
                entry={selectedEntry}
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
            case 'purple': return '#8e33ff';
            case 'red': return theme.palette.error.main;
            default: return theme.palette.primary.main;
        }
    };

    const getIcon = (label: string) => {
        const t = label.toLowerCase();
        if (t.includes('sales')) return 'solar:wad-of-money-bold-duotone';
        if (t.includes('advance')) return 'solar:wallet-money-bold-duotone';
        if (t.includes('balance')) return 'solar:hand-money-bold-duotone';
        if (t.includes('entries')) return 'solar:bill-list-bold-duotone';
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
                        {item.datatype === 'Currency' || item.isCurrency
                            ? renderCurrency(item.value, '22px')
                            : (item.value?.toLocaleString() ?? 0)}
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
