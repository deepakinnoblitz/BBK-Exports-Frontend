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

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { generateCallsPdf } from 'src/components/export/pdf/calls-pdf-generator';

import { useAuth } from 'src/auth/auth-context';

import { CallsCalendar } from './calls-calendar';
import { CallDetailsDialog } from '../call-details-dialog';

// ----------------------------------------------------------------------

export function CallsReportView() {
    const theme = useTheme();
    const [reportData, setReportData] = useState<any[]>([]);
    const [summaryData, setSummaryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.calls_report;
    const canExport = hasCustomPerms && user?.permissions?.actions?.calls_report ? !!user?.permissions?.actions?.calls_report?.export : true;

    const { exportingPdf, handleExportPdf } = usePdfExport();
    // Filters
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const [callFor, setCallFor] = useState('all');
    const [status, setStatus] = useState('all');
    const [owner, setOwner] = useState('all');
    const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');

    useEffect(() => {
        if (user?.name) {
            setOwner(user.has_crm_permission ? user.name : 'all');
        }
    }, [user]);

    useEffect(() => {
        if (owner === 'all') {
            setCurrentView('list');
        }
    }, [owner]);

    const [reminder, setReminder] = useState('all');
    const [sortBy, setSortBy] = useState('modified_desc');

    // Options
    const [ownerOptions, setOwnerOptions] = useState<string[]>([]);
    const [statusOptions] = useState(['Scheduled', 'Completed']);
    const [callForOptions] = useState([
        { value: 'Lead', label: 'Lead' },
        { value: 'Contact', label: 'Client' },
        { value: 'Accounts', label: 'Company' },
        { value: 'Others', label: 'Others' }
    ]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // View Details
    const [openView, setOpenView] = useState(false);
    const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);


    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = reportData.map((n) => n.name);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, name);
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

    const handleExport = async () => {
        setLoading(true);
        try {
            const idsToExport = selected.length > 0 ? selected : reportData.map(r => r.name);

            if (idsToExport.length === 0) {
                setLoading(false);
                return;
            }

            const filters: any[] = [['Calls', 'name', 'in', idsToExport]];
            // Fetch valid fields from backend API
            const fieldsRes = await fetch('/api/method/company.company.crm_api.get_call_export_fields', { credentials: "include" });
            if (!fieldsRes.ok) throw new Error("Failed to fetch Calls export fields metadata");
            const validFields: { fieldname: string; label: string }[] = (await fieldsRes.json()).message || [];

            const fieldsToFetch = [...validFields.map(f => f.fieldname), 'creation', 'modified'];

            const query = new URLSearchParams({
                doctype: "Calls",
                fields: JSON.stringify(fieldsToFetch),
                filters: JSON.stringify(filters),
                limit_page_length: "99999",
            });

            const res = await fetch(`/api/method/frappe.client.get_list?${query.toString()}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch data for export");
            const data = (await res.json()).message || [];

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Calls Report');

            // Define sheet columns dynamically
            sheet.columns = validFields.map(f => ({
                header: f.label,
                key: f.fieldname
            }));

            const colCount = sheet.columns.length;

            // Header Row Styling (Teal/blue fill FF0ea5e9, bold white font)
            for (let i = 1; i <= colCount; i++) {
                const cell = sheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            sheet.getRow(1).height = 25;

            // Populate rows dynamically
            data.forEach((row: any) => {
                const rowDataObj: Record<string, any> = {};
                validFields.forEach(f => {
                    let val = row[f.fieldname];
                    if ((f.fieldname === 'call_start_time' || f.fieldname === 'call_end_time') && val) {
                        val = dayjs(val).format('YYYY-MM-DD HH:mm:ss');
                    }

                    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                        val = '-';
                    }
                    rowDataObj[f.fieldname] = val;
                });
                sheet.addRow(rowDataObj);
            });

            // Auto-fit column widths
            sheet.columns?.forEach((column) => {
                if (!column) return;
                let maxLen = 0;
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const value = cell.value ? String(cell.value) : '';
                        if (value.length > maxLen) {
                            maxLen = value.length;
                        }
                    });
                }
                column.width = Math.max(maxLen + 4, 12);
            });

            // Row styling (alternating row background, alignment and borders)
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
            saveAs(new Blob([buffer]), `Calls_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewCall = useCallback((id: string) => {
        setSelectedCallId(id);
        setOpenView(true);
    }, []);

    const onChangePage = useCallback((event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const onChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');
            if (callFor !== 'all') filters.call_for = callFor;
            if (status !== 'all') filters.status = status;
            if (owner !== 'all') filters.owner_name = owner;
            if (reminder !== 'all') filters.enable_reminder = reminder;

            const result = await runReport('Calls Report', filters);
            setReportData(result.result || []);
            setSummaryData(result.report_summary || []);
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch calls report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, callFor, status, owner, reminder]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        setCallFor('all');
        setStatus('all');
        setReminder('all');
        setSortBy('modified_desc');
        if (user?.name) {
            setOwner(user.has_crm_permission ? user.name : 'all');
        }
    };

    useEffect(() => {
        getDoctypeList('User').then(setOwnerOptions);
    }, []);

    const filteredData = [...reportData].sort((a, b) => {
        if (sortBy === 'creation_desc') {
            return dayjs(b.creation).diff(dayjs(a.creation));
        }
        if (sortBy === 'creation_asc') {
            return dayjs(a.creation).diff(dayjs(b.creation));
        }
        if (sortBy === 'modified_desc') {
            return dayjs(b.modified).diff(dayjs(a.modified));
        }
        if (sortBy === 'modified_asc') {
            return dayjs(a.modified).diff(dayjs(b.modified));
        }
        if (sortBy === 'call_date_desc') {
            return dayjs(b.call_start_time).diff(dayjs(a.call_start_time));
        }
        if (sortBy === 'call_date_asc') {
            return dayjs(a.call_start_time).diff(dayjs(b.call_start_time));
        }
        return 0;
    });

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Calls Report</Typography>
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

                <Card
                    sx={{
                        py: 3,
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
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="From Date"
                            format="DD-MM-YYYY"
                            value={fromDate}
                            onChange={(newValue) => setFromDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 160, '& .MuiInputBase-root': { height: 48, alignItems: 'center' } }
                                }
                            }}
                        />
                        <DatePicker
                            label="To Date"
                            format="DD-MM-YYYY"
                            value={toDate}
                            onChange={(newValue) => setToDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 160, '& .MuiInputBase-root': { height: 48, alignItems: 'center' } }
                                }
                            }}
                        />
                    </LocalizationProvider>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={callFor}
                            onChange={(e) => setCallFor(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="all">Call For</MenuItem>
                            {callForOptions.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="all">Status</MenuItem>
                            {statusOptions.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 250 }}
                        disabled={user?.has_crm_permission}
                        options={['All Owners', ...ownerOptions.filter((opt) => opt !== 'Administrator')]}
                        getOptionLabel={(option) => option || 'All Owners'}
                        value={owner === 'all' || !owner ? 'All Owners' : owner}
                        onChange={(event, newValue) => {
                            if (newValue === 'All Owners' || !newValue) {
                                setOwner('all');
                            } else {
                                setOwner(newValue);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="All Owners"
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
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={reminder}
                            onChange={(e) => setReminder(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="all">Reminder</MenuItem>
                            <MenuItem value="1">Enabled</MenuItem>
                            <MenuItem value="0">Disabled</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            sx={{ height: 40 }}
                        >
                            <MenuItem value="creation_desc">Created ↓ (Latest)</MenuItem>
                            <MenuItem value="creation_asc">Created ↑ (Oldest)</MenuItem>
                            <MenuItem value="modified_desc">Modified ↓ (Latest)</MenuItem>
                            <MenuItem value="modified_asc">Modified ↑ (Oldest)</MenuItem>
                            <MenuItem value="call_date_desc">Call Date ↓ (Latest)</MenuItem>
                            <MenuItem value="call_date_asc">Call Date ↑ (Oldest)</MenuItem>
                        </Select>
                    </FormControl>
                    <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                        {canExport && (
                            <Button
                                variant="contained"
                                startIcon={<Iconify icon={"solar:export-bold" as any} />}
                                onClick={handleExport}
                                disabled={reportData.length === 0}
                            >
                                Export Excel
                            </Button>
                        )}
                        {canExport && (
                            <Button
                                variant="contained"
                                startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                                onClick={() => handleExportPdf(() => generateCallsPdf({
                                    reportData: filteredData,
                                    selected,
                                    summary: summaryData.length > 0 ? summaryData : [
                                        { label: 'Total Calls', value: reportData.length },
                                        { label: 'Scheduled', value: reportData.filter((r: any) => r.status === 'Scheduled').length },
                                        { label: 'Completed', value: reportData.filter((r: any) => r.status === 'Completed').length },
                                        { label: 'With Reminder', value: reportData.filter((r: any) => r.remind_before).length },
                                    ]
                                }))}
                                disabled={exportingPdf || reportData.length === 0}
                                sx={{
                                    bgcolor: '#f43f5e',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: '#e11d48' },
                                    height: 37,
                                    px: 3,
                                }}
                            >
                                {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
                            </Button>
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
                    {summaryData.map((item, index) => (
                        <SummaryCard key={index} item={item} />
                    ))}
                    {summaryData.length === 0 && (
                        <>
                            <SummaryCard item={{ label: 'Total Calls', value: 0, indicator: 'blue' }} />
                            <SummaryCard item={{ label: 'Scheduled', value: 0, indicator: 'orange' }} />
                            <SummaryCard item={{ label: 'Completed', value: 0, indicator: 'green' }} />
                            <SummaryCard item={{ label: 'With Reminder', value: 0, indicator: 'red' }} />
                        </>
                    )}
                </Box>

                {owner !== 'all' && (
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
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Title</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Call For</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Lead/Client</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Company</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Time</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Owner</TableCell>
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
                                            {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                                                const isSelected = selected.indexOf(row.name) !== -1;
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
                                                            <Checkbox checked={isSelected} onClick={(event) => handleClick(event, row.name)} />
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{row.title}</TableCell>
                                                        <TableCell>{row.call_for}</TableCell>
                                                        <TableCell sx={{ maxWidth: 180 }}>
                                                            {(() => {
                                                                const title = row.lead_title || row.contact_title;
                                                                const id = row.lead_name || row.contact_name;
                                                                const mainText = title || id;
                                                                if (!mainText) return '-';
                                                                return (
                                                                    <Stack spacing={0.5}>
                                                                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                                                                            {mainText}
                                                                        </Typography>
                                                                        {id && title && id !== title && (
                                                                            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                                                                {id}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell sx={{ maxWidth: 180 }}>
                                                            {(() => {
                                                                if (!row.account_name) return '-';
                                                                const title = row.account_title || row.account_name;
                                                                const id = row.account_name;
                                                                return (
                                                                    <Stack spacing={0.5}>
                                                                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                                                                            {title}
                                                                        </Typography>
                                                                        {id && title && id !== title && (
                                                                            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                                                                {id}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell>{row.outgoing_call_status}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">{row.call_start_time ? dayjs(row.call_start_time).format('DD MMM YYYY HH:mm') : '-'}</Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ maxWidth: 180 }}>
                                                            <Stack spacing={0.5}>
                                                                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                                                                    {row.owner_full_name || row.owner_name || '-'}
                                                                </Typography>
                                                                <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                                                    {row.owner_name || row.owner || '-'}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper', boxShadow: '-2px 0 4px rgba(145, 158, 171, 0.08)' }}>
                                                            <IconButton onClick={() => handleViewCall(row.name)} sx={{ color: 'info.main' }}>
                                                                <Iconify icon="solar:eye-bold" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {reportData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
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
                        count={reportData.length}
                        page={page}
                        onPageChange={onChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={onChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
                ) : (
                    <CallsCalendar
                        reportData={reportData}
                        owner={owner}
                        fromDate={fromDate}
                        toDate={toDate}
                        onEventClick={handleViewCall}
                    />
                )}
            </Stack>

            <CallDetailsDialog
                open={openView}
                callId={selectedCallId}
                onClose={() => {
                    setOpenView(false);
                    setSelectedCallId(null);
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
        if (t.includes('call')) return 'solar:phone-calling-rounded-bold-duotone';
        if (t.includes('scheduled')) return 'solar:calendar-mark-bold-duotone';
        if (t.includes('completed')) return 'solar:check-circle-bold-duotone';
        if (t.includes('reminder')) return 'solar:bell-bing-bold-duotone';
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
