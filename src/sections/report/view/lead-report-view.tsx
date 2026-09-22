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

import { useRouter } from 'src/routes/hooks';

import { usePdfExport } from 'src/hooks/use-pdf-export';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';   
import { generateLeadPdf } from 'src/components/export/pdf/lead-pdf-generator';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

export function LeadReportView() {
    const router = useRouter();
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.lead_report;
    const canExport = hasCustomPerms && user?.permissions?.actions?.lead_report ? !!user?.permissions?.actions?.lead_report?.export : true;

    const { exportingPdf, handleExportPdf } = usePdfExport();
    // Filters
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const [leadsType, setLeadsType] = useState('all');
    const [leadsFrom, setLeadsFrom] = useState('all');
    const [service, setService] = useState('all');
    const [owner, setOwner] = useState('all');
    const [sortBy, setSortBy] = useState('modified_desc');

    useEffect(() => {
        if (user?.name) {
            setOwner(user.has_crm_permission ? user.name : 'all');
        }
    }, [user]);

    // Options
    const [leadsFromOptions, setLeadsFromOptions] = useState<string[]>([]);
    const [serviceOptions, setServiceOptions] = useState<string[]>([]);
    const [ownerOptions, setOwnerOptions] = useState<string[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // View Details

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
            // Construct filters for get_list
            const filters: any[] = [];

            if (selected.length > 0) {
                filters.push(['Lead', 'name', 'in', selected]);
            } else {
                // Replicate report filters
                if (fromDate) filters.push(['Lead', 'creation', '>=', fromDate.format('YYYY-MM-DD')]);
                if (toDate) filters.push(['Lead', 'creation', '<=', toDate.format('YYYY-MM-DD')]);
                if (leadsType !== 'all') filters.push(['Lead', 'leads_type', '=', leadsType]);
                if (leadsFrom !== 'all') filters.push(['Lead', 'leads_from', '=', leadsFrom]);
                if (owner !== 'all') {
                    if (owner === 'empty') filters.push(['Lead', 'owner', '=', '']);
                    else filters.push(['Lead', 'owner', '=', owner]);
                }
            }

            // Fetch valid fields from backend API
            const fieldsRes = await fetch('/api/method/company.company.crm_api.get_lead_export_fields', { credentials: "include" });
            if (!fieldsRes.ok) throw new Error("Failed to fetch Lead export fields metadata");
            const validFields: { fieldname: string; label: string }[] = (await fieldsRes.json()).message || [];

            // Reorder the exported columns to start with: Lead ID (name), Name (lead_name), Company Name (company_name), Status (status)
            const desiredOrder = ['name', 'lead_name', 'company_name', 'status'];
            const orderedFields: { fieldname: string; label: string }[] = [];
            desiredOrder.forEach(fieldname => {
                const found = validFields.find(f => f.fieldname === fieldname);
                if (found) {
                    orderedFields.push(found);
                }
            });
            validFields.forEach(f => {
                if (!desiredOrder.includes(f.fieldname)) {
                    orderedFields.push(f);
                }
            });

            const fieldsToFetch = Array.from(new Set([
                ...validFields.map(f => f.fieldname),
                'creation',
                'modified',
                'workflow_state',
                'status'
            ]));

            // Build query params
            const query = new URLSearchParams({
                doctype: "Lead",
                fields: JSON.stringify(fieldsToFetch),
                filters: JSON.stringify(filters),
                limit_page_length: "99999", // Fetch all
            });

            const res = await fetch(`/api/method/frappe.client.get_list?${query.toString()}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch data for export");
            const rawData = (await res.json()).message || [];

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Lead Report');

            // Define sheet columns dynamically
            sheet.columns = orderedFields.map(f => ({
                header: f.label,
                key: f.fieldname
            }));

            const colCount = sheet.columns.length;

            // Header Row Styling (Same blue/teal color FF0ea5e9, bold white font)
            for (let i = 1; i <= colCount; i++) {
                const cell = sheet.getRow(1).getCell(i);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            sheet.getRow(1).height = 25;

            // Populate rows dynamically
            rawData.forEach((row: any) => {
                const rowDataObj: Record<string, any> = {};
                orderedFields.forEach(f => {
                    let val = row[f.fieldname];
                    if (f.fieldname === 'status') {
                        val = row.workflow_state || row.status || 'New Lead';
                    } else if (f.fieldname === 'workflow_state') {
                        val = row.workflow_state || row.status || 'New Lead';
                    } else if (f.fieldname === 'date_and_time' && val) {
                        val = dayjs(val).format('YYYY-MM-DD HH:mm:ss');
                    }

                    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                        val = '-';
                    }
                    rowDataObj[f.fieldname] = val;
                });
                const excelRow = sheet.addRow(rowDataObj);

                // Status conditional styling
                const statusCell = excelRow.getCell('status');
                const statusVal = row.status || '';
                if (statusVal === 'Converted') {
                    statusCell.font = { color: { argb: 'FF22C55E' }, bold: true };
                } else if (statusVal === 'Not Converted') {
                    statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                } else if (statusVal === 'Open') {
                    statusCell.font = { color: { argb: 'FFF97316' }, bold: true };
                }
            });

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
            saveAs(new Blob([buffer]), `Lead_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewLead = useCallback((id: string) => {
        router.push(`/leads/${encodeURIComponent(id)}/view`);
    }, [router]);

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
            if (leadsType !== 'all') filters.leads_type = leadsType;
            if (leadsFrom !== 'all') filters.leads_from = leadsFrom;
            if (service !== 'all') filters.service = service;
            if (owner !== 'all') filters.owner = owner;

            const result = await runReport('Lead', filters);
            setReportData(result.result || []);
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch lead report:', error);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, leadsType, leadsFrom, service, owner]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setFromDate(null);
        setToDate(null);
        setLeadsType('all');
        setLeadsFrom('all');
        setService('all');
        setSortBy('modified_desc');
        if (user?.name) {
            setOwner(user.has_crm_permission ? user.name : 'all');
        }
    };

    useEffect(() => {
        getDoctypeList('Lead From').then(setLeadsFromOptions);
        getDoctypeList('User').then(setOwnerOptions);
        getDoctypeList('Service').then((list) => setServiceOptions(list.map((item: any) => item.name || item.label || String(item))));
    }, []);

    const filteredData = [...reportData].sort((a, b) => {
        if (sortBy === 'creation_desc' || sortBy === 'lead_date_desc') {
            return dayjs(b.creation).diff(dayjs(a.creation));
        }
        if (sortBy === 'creation_asc' || sortBy === 'lead_date_asc') {
            return dayjs(a.creation).diff(dayjs(b.creation));
        }
        if (sortBy === 'modified_desc') {
            return dayjs(b.modified).diff(dayjs(a.modified));
        }
        if (sortBy === 'modified_asc') {
            return dayjs(a.modified).diff(dayjs(b.modified));
        }
        return 0;
    });

    const totalLeads = reportData.length;
    const incomingLeads = reportData.filter((l: any) => l.leads_type === 'Incoming').length;
    const outgoingLeads = reportData.filter((l: any) => l.leads_type === 'Outgoing').length;

    return (
        <DashboardContent maxWidth={false} sx={{mt: 2}}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Lead Report</Typography>
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
                            value={leadsType}
                            onChange={(e) => setLeadsType(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="all">All Leads Type</MenuItem>
                            <MenuItem value="Incoming">Incoming</MenuItem>
                            <MenuItem value="Outgoing">Outgoing</MenuItem>
                        </Select>
                    </FormControl>
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200 }}
                        options={['All Leads From', ...leadsFromOptions]}
                        getOptionLabel={(option) => option || 'All Leads From'}
                        value={leadsFrom === 'all' || !leadsFrom ? 'All Leads From' : leadsFrom}
                        onChange={(event, newValue) => {
                            if (newValue === 'All Leads From' || !newValue) {
                                setLeadsFrom('all');
                            } else {
                                setLeadsFrom(newValue);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="All Leads From"
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
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200 }}
                        options={['All Services', ...serviceOptions]}
                        getOptionLabel={(option) => option || 'All Services'}
                        value={service === 'all' || !service ? 'All Services' : service}
                        onChange={(event, newValue) => {
                            if (newValue === 'All Services' || !newValue) {
                                setService('all');
                            } else {
                                setService(newValue);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="All Services"
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
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 240 }}
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
                            <MenuItem value="lead_date_desc">Lead Date ↓ (Latest)</MenuItem>
                            <MenuItem value="lead_date_asc">Lead Date ↑ (Oldest)</MenuItem>
                        </Select>
                    </FormControl>
                    <Box sx={{ flexGrow: 1 }} />
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
                                onClick={() => handleExportPdf(() => generateLeadPdf({
                                    reportData: filteredData,
                                    selected,
                                    summary: [
                                        { label: 'Total Leads', value: totalLeads },
                                        { label: 'Incoming Leads', value: incomingLeads },
                                        { label: 'Outgoing Leads', value: outgoingLeads }
                                    ]
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

                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: {
                            xs: 'repeat(1, 1fr)',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                        },
                    }}
                >
                    <SummaryCard item={{ label: 'Total Leads', value: totalLeads, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Incoming Leads', value: incomingLeads, indicator: 'green' }} />
                    <SummaryCard item={{ label: 'Outgoing Leads', value: outgoingLeads, indicator: 'orange' }} />
                </Box>

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
                                                indeterminate={selected.length > 0 && selected.length < reportData.length}
                                                checked={reportData.length > 0 && selected.length === reportData.length}
                                                onChange={handleSelectAllClick}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Lead Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Company</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Phone</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Service</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Leads Type</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Leads From</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Owner</TableCell>
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
                                                        <TableCell sx={{ fontWeight: 600 }}>{row.lead_name || '-'}</TableCell>
                                                        <TableCell>{row.company_name || '-'}</TableCell>
                                                        <TableCell>{row.phone_number || '-'}</TableCell>
                                                        <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.service || '-'}</TableCell>
                                                        <TableCell>
                                                            <Label
                                                                variant="soft"
                                                                color={row.leads_type === 'Incoming' ? 'success' : 'warning'}
                                                            >
                                                                {row.leads_type || '-'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell>{row.leads_from || '-'}</TableCell>
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
                                                            <IconButton onClick={() => handleViewLead(row.name)} sx={{ color: 'info.main' }}>
                                                                <Iconify icon="solar:eye-bold" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {reportData.length === 0 && (
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
                        count={reportData.length}
                        page={page}
                        onPageChange={onChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={onChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Card>
            </Stack>


        </DashboardContent >
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
        if (t.includes('total')) return 'solar:target-bold-duotone';
        if (t.includes('incoming')) return 'solar:inbox-in-bold-duotone';
        if (t.includes('outgoing')) return 'solar:inbox-out-bold-duotone';
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
