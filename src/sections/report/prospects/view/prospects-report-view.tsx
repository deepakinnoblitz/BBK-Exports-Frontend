import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
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

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { generateProspectsPdf } from 'src/components/export/pdf/prospects-pdf-generator';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

const STAGE_OPTIONS = [
    'Just In',
    'Working',
    'Estimation Created',
    'Estimation Sent',
    'Invoice Created',
    'Invoice Sent',
    'Special Approval',
    'Project Started',
    'Closed',
];

const getStageStyle = (stage: string) => {
    const styles: Record<string, { bgcolor: string; border: string; color: string }> = {
        'Just In': {
            bgcolor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.40)',
            color: '#4338ca',
        },
        'Working': {
            bgcolor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.40)',
            color: '#1d4ed8',
        },
        'Estimation Created': {
            bgcolor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.40)',
            color: '#b45309',
        },
        'Estimation Sent': {
            bgcolor: 'rgba(251, 146, 60, 0.15)',
            border: '1px solid rgba(251, 146, 60, 0.40)',
            color: '#9a3412',
        },
        'Invoice Created': {
            bgcolor: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.40)',
            color: '#7e22ce',
        },
        'Invoice Sent': {
            bgcolor: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.40)',
            color: '#6d28d9',
        },
        'Special Approval': {
            bgcolor: 'rgba(236, 72, 153, 0.15)',
            border: '1px solid rgba(236, 72, 153, 0.40)',
            color: '#9d174d',
        },
        'Project Started': {
            bgcolor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.40)',
            color: '#15803d',
        },
        'Closed': {
            bgcolor: 'rgba(156, 163, 175, 0.25)',
            border: '1px solid rgba(156, 163, 175, 0.45)',
            color: '#374151',
        },
    };
    return styles[stage] || {
        bgcolor: 'rgba(156, 163, 175, 0.25)',
        border: '1px solid rgba(156, 163, 175, 0.45)',
        color: '#374151',
    };
};

// Summary Card — matches Proposal Report style exactly
function SummaryCard({ item }: { item: { label: string; value: any; indicator?: string } }) {
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
        if (t.includes('total')) return 'solar:target-bold-duotone';
        if (t.includes('active')) return 'solar:check-circle-bold-duotone';
        return 'solar:clock-circle-bold-duotone';
    };

    const color = getIndicatorColor(item.indicator || 'blue');

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

            {/* Decorative background circle */}
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

// ----------------------------------------------------------------------

export function ProspectsReportView() {
    const navigate = useNavigate();
    const location = useLocation();

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.prospects_report;
    const canExport = hasCustomPerms && user?.permissions?.actions?.prospects_report ? !!user?.permissions?.actions?.prospects_report?.export : true;

    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { exportingPdf, handleExportPdf } = usePdfExport();

    // Filters (restored from navigation state if coming back from details)
    const [client, setClient] = useState<any>(location.state?.filters?.client || null);
    const [company, setCompany] = useState<any>(location.state?.filters?.company || null);
    const [stage, setStage] = useState<string>(location.state?.filters?.stage || 'all');
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(
        location.state?.filters?.fromDate ? dayjs(location.state.filters.fromDate) : null
    );
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(
        location.state?.filters?.toDate ? dayjs(location.state.filters.toDate) : null
    );
    const [sortBy, setSortBy] = useState<string>(location.state?.filters?.sortBy || 'modified_desc');

    // Dropdown options
    const [clientOptions, setClientOptions] = useState<any[]>([]);
    const [companyOptions, setCompanyOptions] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);

    useEffect(() => {
        getDoctypeList('Contacts', ['name', 'first_name'])
            .then((data) => setClientOptions(data || []))
            .catch((error) => console.error('Failed to load Contacts for report:', error));

        getDoctypeList('Accounts', ['name', 'account_name'])
            .then((data) => setCompanyOptions(data || []))
            .catch((error) => console.error('Failed to load Accounts for report:', error));
    }, []);

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const dataList = Array.isArray(reportData) ? reportData : [];
            setSelected(dataList.map((n) => n.name));
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
        event.stopPropagation();
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
            if (client) filters.contact = client.name;
            if (company) filters.account = company.name;
            if (stage !== 'all') filters.stage = stage;
            if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');

            const result = await runReport('Prospect Report', filters);
            const dataArray = Array.isArray(result) ? result : (result?.result || []);
            setReportData(dataArray);
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch prospects report:', error);
        } finally {
            setLoading(false);
        }
    }, [client, company, stage, fromDate, toDate]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setClient(null);
        setCompany(null);
        setStage('all');
        setFromDate(null);
        setToDate(null);
        setSortBy('modified_desc');
        setSelected([]);
    };

    const handleViewProspect = (id: string) => {
        navigate(`/deals/${encodeURIComponent(id)}/view`, {
            state: {
                from: '/reports/prospects',
                filters: {
                    client,
                    company,
                    stage,
                    fromDate: fromDate ? fromDate.toISOString() : null,
                    toDate: toDate ? toDate.toISOString() : null,
                    sortBy,
                },
            },
        });
    };

    // Sort in-memory
    const dataList = Array.isArray(reportData) ? reportData : [];
    const filteredData = [...dataList].sort((a, b) => {
        if (sortBy === 'creation_desc') return dayjs(b.creation).diff(dayjs(a.creation));
        if (sortBy === 'creation_asc') return dayjs(a.creation).diff(dayjs(b.creation));
        if (sortBy === 'modified_desc') return dayjs(b.modified).diff(dayjs(a.modified));
        if (sortBy === 'modified_asc') return dayjs(a.modified).diff(dayjs(b.modified));
        if (sortBy === 'prospect_date_desc') return dayjs(b.creation).diff(dayjs(a.creation));
        if (sortBy === 'prospect_date_asc') return dayjs(a.creation).diff(dayjs(b.creation));
        return 0;
    });

    const totalProspects = filteredData.length;
    const closedProspects = filteredData.filter((p: any) => p.stage === 'Closed').length;
    const activeProspects = totalProspects - closedProspects;

    const summaryCards = [
        { label: 'Total Prospects', value: totalProspects, indicator: 'blue' },
        { label: 'Active Prospects', value: activeProspects, indicator: 'green' },
        { label: 'Closed Prospects', value: closedProspects, indicator: 'orange' },
    ];

    const handleExportExcel = async () => {
        setLoading(true);
        try {
            const dataToExport = selected.length > 0
                ? filteredData.filter((row) => selected.includes(row.name))
                : filteredData;

            // Fetch valid fields from backend API
            const fieldsRes = await fetch('/api/method/company.company.crm_api.get_prospect_export_fields', { credentials: "include" });
            if (!fieldsRes.ok) throw new Error("Failed to fetch Prospects export fields metadata");
            const validFields: { fieldname: string; label: string }[] = (await fieldsRes.json()).message || [];

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Prospects');

            // Define sheet columns dynamically
            sheet.columns = [
                { header: 'S.No', key: 's_no' },
                ...validFields.map(f => ({
                    header: f.label,
                    key: f.fieldname
                }))
            ];

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
            dataToExport.forEach((row: any, idx) => {
                const rowDataObj: Record<string, any> = {
                    s_no: idx + 1
                };
                validFields.forEach(f => {
                    let val = row[f.fieldname];
                    
                    // Keep the existing Company/Client (Name + ID) formatting and Stage label formatting intact
                    if (f.fieldname === 'deal_title') {
                        val = row.deal_title;
                    } else if (f.fieldname === 'account') {
                        val = row.account;
                    } else if (f.fieldname === 'company_name') {
                        val = row.company_name;
                    } else if (f.fieldname === 'contact') {
                        val = row.contact;
                    } else if (f.fieldname === 'contact_name') {
                        val = row.contact_name;
                    }

                    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                        val = '-';
                    }
                    rowDataObj[f.fieldname] = val;
                });
                sheet.addRow(rowDataObj);
            });

            // Auto-fit column widths
            sheet.columns?.forEach((column: any) => {
                if (!column) return;
                let maxLen = 0;
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell: any) => {
                        const value = cell.value ? String(cell.value) : '';
                        if (value.length > maxLen) {
                            maxLen = value.length;
                        }
                    });
                }
                column.width = Math.max(maxLen + 4, 12);
            });

            // Row styling (alternating row background, alignment and borders)
            sheet.eachRow((row: any, rowNumber: number) => {
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
            saveAs(new Blob([buffer]), `Prospects_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                {/* Header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Prospects Report</Typography>
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

                {/* Filter Card */}
                <Card
                    sx={{
                        py: 2.5,
                        px: 2,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                        bgcolor: 'background.neutral',
                        border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                >
                    {/* From Date */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="From Date"
                            value={fromDate}
                            onChange={(newValue) => setFromDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 190, '& .MuiInputBase-root': { height: 48, alignItems: 'center' } },
                                },
                            }}
                        />
                    </LocalizationProvider>

                    {/* To Date */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="To Date"
                            value={toDate}
                            onChange={(newValue) => setToDate(newValue)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { width: 190, '& .MuiInputBase-root': { height: 48, alignItems: 'center' } },
                                },
                            }}
                        />
                    </LocalizationProvider>

                    {/* Search Client */}
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 250 }}
                        options={clientOptions}
                        getOptionLabel={(option) => option ? `${option.first_name || ''} (${option.name || ''})` : ''}
                        value={client}
                        onChange={(event, newValue) => setClient(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Search Client"
                                placeholder="Search Client"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1.5,
                                        bgcolor: 'background.neutral',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    },
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.name}>
                                <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {option.first_name || option.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        ID: {option.name}
                                    </Typography>
                                </Stack>
                            </li>
                        )}
                    />

                    {/* Search Company */}
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 250 }}
                        options={companyOptions}
                        getOptionLabel={(option) => option ? `${option.account_name || ''} (${option.name || ''})` : ''}
                        value={company}
                        onChange={(event, newValue) => setCompany(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Search Company"
                                placeholder="Search Company"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1.5,
                                        bgcolor: 'background.neutral',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    },
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.name}>
                                <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {option.account_name || option.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        ID: {option.name}
                                    </Typography>
                                </Stack>
                            </li>
                        )}
                    />

                    {/* Stage Filter */}
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                            displayEmpty
                            sx={{ height: 40     }}
                        >
                            <MenuItem value="all">All Stages</MenuItem>
                            {STAGE_OPTIONS.map((s) => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Sort Filter */}
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
                            <MenuItem value="prospect_date_desc">Prospect Date ↓ (Latest)</MenuItem>
                            <MenuItem value="prospect_date_asc">Prospect Date ↑ (Oldest)</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />
                        {canExport && (
                            <>
                                <Button
                                    variant="contained"
                                    startIcon={<Iconify icon={"solar:export-bold" as any} />}
                                    onClick={handleExportExcel}
                                    disabled={filteredData.length === 0}
                                    sx={{ mr: 1 }}
                                >
                                    Export Excel
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                                    onClick={() => handleExportPdf(() => generateProspectsPdf({
                                        reportData: filteredData,
                                        selected,
                                        summary: summaryCards,
                                    }))}
                                    disabled={exportingPdf || filteredData.length === 0}
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
                            </>
                        )}
                </Card>

                {/* Summary Cards */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: {
                            xs: 'repeat(1, 1fr)',
                            sm: 'repeat(3, 1fr)',
                        },
                    }}
                >
                    {summaryCards.map((item, index) => (
                        <SummaryCard key={index} item={item} />
                    ))}
                </Box>

                {/* Table */}
                <Card>
                    <Scrollbar>
                        <TableContainer sx={{ minWidth: 900, overflowX: 'auto', position: 'relative' }}>
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
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>S.No</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Title</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Company</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Client</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Stage</TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                fontWeight: 700,
                                                color: 'text.secondary',
                                                position: 'sticky',
                                                right: 0,
                                                bgcolor: '#f4f6f8',
                                                zIndex: 11,
                                            }}
                                        >
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                                <CircularProgress sx={{ color: '#059669' }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                                                const isSelected = selected.indexOf(row.name) !== -1;
                                                const stageStyle = getStageStyle(row.stage);
                                                return (
                                                    <TableRow
                                                        key={index}
                                                        hover
                                                        role="checkbox"
                                                        aria-checked={isSelected}
                                                        selected={isSelected}
                                                        onClick={() => handleViewProspect(row.name)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                            '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                        }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onClick={(event) => handleClick(event, row.name)}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ color: 'text.secondary', minWidth: 50 }}>
                                                            {page * rowsPerPage + index + 1}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600, minWidth: 180 }}>
                                                            {row.deal_title || '-'}
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 160 }}>
                                                            <Stack spacing={0}>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    {row.company_name || '-'}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                    {row.account || '-'}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 160 }}>
                                                            <Stack spacing={0}>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    {row.contact_name || '-'}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                    {row.contact || '-'}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Label
                                                                sx={{
                                                                    bgcolor: stageStyle.bgcolor,
                                                                    border: stageStyle.border,
                                                                    color: stageStyle.color,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.72rem',
                                                                    px: 1.5,
                                                                    py: 0.5,
                                                                }}
                                                            >
                                                                {row.stage || '-'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell
                                                            align="right"
                                                            sx={{
                                                                position: 'sticky',
                                                                right: 0,
                                                                bgcolor: 'background.paper',
                                                                boxShadow: '-2px 0 4px rgba(145, 158, 171, 0.08)',
                                                            }}
                                                        >
                                                            <IconButton
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewProspect(row.name);
                                                                }}
                                                                sx={{ color: 'info.main' }}
                                                            >
                                                                <Iconify icon="solar:eye-bold" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {filteredData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                                        <Stack spacing={1} alignItems="center">
                                                            <Iconify
                                                                icon={"eva:slash-outline" as any}
                                                                width={48}
                                                                sx={{ color: 'text.disabled' }}
                                                            />
                                                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
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
                        </TableContainer>
                    </Scrollbar>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={filteredData.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={onChangePage}
                        onRowsPerPageChange={onChangeRowsPerPage}
                    />
                </Card>
            </Stack>
        </DashboardContent>
    );
}
