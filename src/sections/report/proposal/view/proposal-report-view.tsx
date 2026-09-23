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

import { fDate } from 'src/utils/format-time';

import { runReport } from 'src/api/reports';
import { getDoctypeList } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { generateProposalPdf } from 'src/components/export/pdf/proposal-pdf-generator';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

const getStatusStyle = (status: string) => {
    const styles: Record<string, { bgcolor: string; border: string; color: string }> = {
        'Draft': {
            bgcolor: 'rgba(156, 163, 175, 0.25)',
            border: '1px solid rgba(156, 163, 175, 0.45)',
            color: '#374151'
        },
        'Sent': {
            bgcolor: 'rgba(99, 102, 241, 0.25)',
            border: '1px solid rgba(99, 102, 241, 0.45)',
            color: '#4338ca'
        },
        'Approved': {
            bgcolor: 'rgba(34, 197, 94, 0.25)',
            border: '1px solid rgba(34, 197, 94, 0.45)',
            color: '#15803d'
        },
        'Rejected': {
            bgcolor: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#991b1b'
        },
        'Expired': {
            bgcolor: 'rgba(251, 146, 60, 0.24)',
            border: '1px solid rgba(251, 146, 60, 0.45)',
            color: '#9a3412'
        }
    };

    return styles[status] || {
        bgcolor: 'rgba(156, 163, 175, 0.25)',
        border: '1px solid rgba(156, 163, 175, 0.45)',
        color: '#374151'
    };
};

export function ProposalReportView() {
    const navigate = useNavigate();
    const location = useLocation();

    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { exportingPdf, handleExportPdf } = usePdfExport();

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.proposal_report;
    const canExport = hasCustomPerms && user?.permissions?.actions?.proposal_report ? !!user?.permissions?.actions?.proposal_report?.export : true;

    // Filters
    const [lead, setLead] = useState<any>(location.state?.filters?.lead || null);
    const [company, setCompany] = useState<any>(location.state?.filters?.company || null);
    const [status, setStatus] = useState<string>(location.state?.filters?.status || 'all');
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(
        location.state?.filters?.fromDate ? dayjs(location.state.filters.fromDate) : null
    );
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(
        location.state?.filters?.toDate ? dayjs(location.state.filters.toDate) : null
    );
    const [searchQuery, setSearchQuery] = useState<string>(location.state?.filters?.searchQuery || '');

    const initialSortBy = location.state?.filters?.sortBy || 'modified_desc';
    const [sortBy, setSortBy] = useState<string>(
        initialSortBy === 'date_desc' ? 'proposal_date_desc' : (initialSortBy === 'date_asc' ? 'proposal_date_asc' : initialSortBy)
    );

    const [selectedProposal, setSelectedProposal] = useState<string>(location.state?.filters?.selectedProposal || 'all');

    // Options
    const [leadOptions, setLeadOptions] = useState<any[]>([]);
    const [companyOptions, setCompanyOptions] = useState<any[]>([]);
    const [proposalOptions, setProposalOptions] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selection
    const [selected, setSelected] = useState<string[]>([]);


    useEffect(() => {
        getDoctypeList('Lead', ['name', 'lead_name'])
            .then((data) => {
                setLeadOptions(data || []);
            })
            .catch((error) => console.error('Failed to load Leads for report:', error));

        getDoctypeList('Accounts', ['name', 'account_name'])
            .then((data) => {
                setCompanyOptions(data || []);
            })
            .catch((error) => console.error('Failed to load Accounts for report:', error));

        getDoctypeList('Proposal', ['name', 'proposal_title'])
            .then((data) => {
                setProposalOptions(data || []);
            })
            .catch((error) => console.error('Failed to load Proposals for report:', error));
    }, []);

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const dataList = Array.isArray(reportData) ? reportData : [];
            const newSelected = dataList.map((n) => n.name);
            setSelected(newSelected);
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

    const handleExport = async () => {
        setLoading(true);
        try {
            const listFilters: any[] = [];
            if (lead) listFilters.push(['lead', '=', lead.name]);
            if (status !== 'all') listFilters.push(['status', '=', status]);
            if (company) listFilters.push(['company_name', '=', company.account_name]);
            if (fromDate) listFilters.push(['proposal_date', '>=', fromDate.format('YYYY-MM-DD')]);
            if (toDate) listFilters.push(['proposal_date', '<=', toDate.format('YYYY-MM-DD')]);

            // Fetch valid fields from backend API
            const fieldsRes = await fetch('/api/method/company.company.crm_api.get_proposal_export_fields', { credentials: "include" });
            if (!fieldsRes.ok) throw new Error("Failed to fetch Proposal export fields metadata");
            const validFields: { fieldname: string; label: string }[] = (await fieldsRes.json()).message || [];

            const fieldsToFetch = [...validFields.map(f => f.fieldname), 'creation', 'modified'];

            const queryParams = new URLSearchParams({
                doctype: "Proposal",
                fields: JSON.stringify(fieldsToFetch),
                filters: JSON.stringify(listFilters),
                limit_page_length: "99999"
            });

            const res = await fetch(`/api/method/frappe.client.get_list?${queryParams.toString()}`, {
                method: 'GET',
                credentials: "include"
            });

            if (!res.ok) throw new Error("Failed to fetch data for export");

            const jsonResponse = await res.json();
            const data = jsonResponse.message || [];

            // Fetch attachments for these proposals
            const proposalIds = data.map((row: any) => row.name);
            let files: any[] = [];
            if (proposalIds.length > 0) {
                const fileRes = await fetch(`/api/method/company.company.crm_api.get_proposal_attachments?proposal_ids=${encodeURIComponent(JSON.stringify(proposalIds))}`, {
                    method: 'GET',
                    credentials: "include"
                });
                if (fileRes.ok) {
                    const fileJson = await fileRes.json();
                    files = fileJson.message || [];
                    console.log("Raw attachment fetch response:", files);
                } else {
                    console.error("Failed to fetch Proposal Attachment response:", fileRes.statusText);
                }
            }

            const filesMap: Record<string, any[]> = {};
            files.forEach((f: any) => {
                if (!filesMap[f.parent]) {
                    filesMap[f.parent] = [];
                }
                filesMap[f.parent].push(f);
            });

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Proposal Report');

            // Define sheet columns dynamically with Attachments re-added explicitly
            sheet.columns = [
                ...validFields.map(f => ({
                    header: f.label,
                    key: f.fieldname
                })),
                { header: 'Attachments', key: 'attachments' }
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
            data.forEach((row: any) => {
                const rowDataObj: Record<string, any> = {};
                let maxLines = 1;
                validFields.forEach(f => {
                    let val = row[f.fieldname];
                    if (f.fieldname === 'proposal_date' && val) {
                        val = dayjs(val).format('YYYY-MM-DD');
                    } else if (f.fieldname === 'reference_no' && !val) {
                        val = row.reference_no || row.name;
                    }

                    if ((f.fieldname === 'description' || f.fieldname === 'terms_and_conditions') && val) {
                        // Strip HTML tags and entities
                        val = val
                            .replace(/<[^>]*>/g, '')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .trim();
                        
                        // Estimate number of wrapped lines for a ~50 char line width
                        const lineCount = Math.max(1, Math.ceil(val.length / 50));
                        if (lineCount > maxLines) {
                            maxLines = lineCount;
                        }
                    }

                    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
                        val = '-';
                    }
                    rowDataObj[f.fieldname] = val;
                });
                rowDataObj['attachments'] = ''; // populated dynamically below

                const excelRow = sheet.addRow(rowDataObj);
                
                // Adjust row height based on estimated text lines
                if (maxLines > 1) {
                    excelRow.height = maxLines * 15 + 10;
                } else {
                    excelRow.height = 20;
                }

                const propFiles = filesMap[row.name] || [];
                const attachmentsCell = excelRow.getCell('attachments');
                if (propFiles.length === 1) {
                    const dlUrl = `${window.location.origin}/api/method/company.company.crm_api.download_proposal_attachment?file_id=${encodeURIComponent(propFiles[0].name)}&token=${encodeURIComponent(propFiles[0].token)}`;
                    console.log("Single file download URL:", dlUrl);
                    attachmentsCell.value = {
                        text: propFiles[0].file_name || 'Download',
                        hyperlink: dlUrl
                    };
                    attachmentsCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                } else if (propFiles.length > 1) {
                    attachmentsCell.value = propFiles.map((f: any) => `${window.location.origin}/api/method/company.company.crm_api.download_proposal_attachment?file_id=${encodeURIComponent(f.name)}&token=${encodeURIComponent(f.token)}`).join('\n');
                    attachmentsCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                    attachmentsCell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
                } else {
                    attachmentsCell.value = '—';
                }
            });

            // Auto-fit column widths
            sheet.columns?.forEach((column: any) => {
                if (!column) return;
                
                const isLongTextCol = (column.key === 'description' || column.key === 'terms_and_conditions');
                if (isLongTextCol) {
                    column.width = 55;
                    return;
                }

                let maxLen = 0;
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell: any) => {
                        let value = '';
                        if (cell.value && typeof cell.value === 'object' && cell.value.text) {
                            value = String(cell.value.text);
                        } else if (cell.value) {
                            value = String(cell.value);
                        }
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
                        const columnKey = sheet.columns?.[i - 1]?.key;
                        
                        const isLongTextCol = (columnKey === 'description' || columnKey === 'terms_and_conditions');
                        if (isLongTextCol) {
                            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                        } else {
                            if (columnKey === 'attachments' && cell.alignment) {
                                // keep existing attachment alignment
                            } else {
                                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                            }
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
            saveAs(new Blob([buffer]), `Proposal_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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
            if (lead) filters.lead = lead.name;
            if (status !== 'all') filters.status = status;
            if (company) filters.company_name = company.account_name;
            if (fromDate) filters.from_date = fromDate.format('YYYY-MM-DD');
            if (toDate) filters.to_date = toDate.format('YYYY-MM-DD');

            const result = await runReport('Proposal Report', filters);
            const dataArray = Array.isArray(result) ? result : (result?.result || []);
            setReportData(dataArray);
            setPage(0);
        } catch (error) {
            console.error('Failed to fetch proposal report:', error);
        } finally {
            setLoading(false);
        }
    }, [lead, status, company, fromDate, toDate]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleReset = () => {
        setLead(null);
        setCompany(null);
        setSelectedProposal('all');
        setStatus('all');
        setFromDate(null);
        setToDate(null);
        setSearchQuery('');
        setSortBy('modified_desc');
    };

    const handleViewProposal = (id: string) => {
        navigate(`/proposals/${encodeURIComponent(id)}/view`, {
            state: {
                from: '/reports/proposal',
                filters: {
                    lead,
                    company,
                    status,
                    fromDate: fromDate ? fromDate.toISOString() : null,
                    toDate: toDate ? toDate.toISOString() : null,
                    searchQuery,
                    selectedProposal,
                    sortBy
                }
            }
        });
    };

    // Filter and Sort data in-memory
    const dataList = Array.isArray(reportData) ? reportData : [];
    const filteredData = dataList
        .filter((row) => {
            if (selectedProposal && selectedProposal !== 'all' && row.name !== selectedProposal) {
                return false;
            }
            return true;
        })
        .sort((a, b) => {
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
            if (sortBy === 'proposal_date_desc') {
                return dayjs(b.proposal_date).diff(dayjs(a.proposal_date));
            }
            if (sortBy === 'proposal_date_asc') {
                return dayjs(a.proposal_date).diff(dayjs(b.proposal_date));
            }
            return 0;
        });

    const totalProposals = filteredData.length;
    const approvedProposals = filteredData.filter((p: any) => p.status === 'Approved').length;
    const pendingProposals = filteredData.filter((p: any) => p.status === 'Draft' || p.status === 'Sent').length;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack spacing={3}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h4">Proposal Report</Typography>
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
                                    sx: { width: 160, '& .MuiInputBase-root': { height: '48px !important', alignItems: 'center' } }
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
                                    sx: { width: 160, '& .MuiInputBase-root': { height: '48px !important', alignItems: 'center' } }
                                }
                            }}
                        />
                    </LocalizationProvider>

                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200 }}
                        options={leadOptions}
                        getOptionLabel={(option) => option.lead_name || option.name}
                        value={lead}
                        onChange={(event, newValue) => setLead(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Search Lead"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1.5,
                                        height: 40,
                                        bgcolor: 'background.neutral',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        },
                                    },
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.name}>
                                <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {option.lead_name || option.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        ID: {option.name}
                                    </Typography>
                                </Stack>
                            </li>
                        )}
                    />

                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200 }}
                        options={companyOptions}
                        getOptionLabel={(option) => option.account_name}
                        value={company}
                        onChange={(event, newValue) => setCompany(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Search Company"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1.5,
                                        height: 40,
                                        bgcolor: 'background.neutral',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        },
                                    },
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.name}>
                                <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {option.account_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        ID: {option.name}
                                    </Typography>
                                </Stack>
                            </li>
                        )}
                    />

                    <FormControl size="small" sx={{ minWidth: 240 }}>
                        <Select
                            value={selectedProposal}
                            onChange={(e) => setSelectedProposal(e.target.value as string)}
                            displayEmpty
                            renderValue={(val) => {
                                if (val === 'all') {
                                    return <span style={{ color: '#919EAB' }}>Search Proposal</span>;
                                }
                                const selectedOption = proposalOptions.find((opt) => opt.name === val);
                                return selectedOption ? `${selectedOption.proposal_title || selectedOption.name}` : val;
                            }}
                            sx={{
                                height: 40,
                                bgcolor: 'background.neutral',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <MenuItem value="all">Search Proposal</MenuItem>
                            {proposalOptions.map((option) => (
                                <MenuItem key={option.name} value={option.name}>
                                    <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                            {option.proposal_title || option.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            ID: {option.name}
                                        </Typography>
                                    </Stack>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            displayEmpty
                            sx={{ height: 40 }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Sent">Sent</MenuItem>
                            <MenuItem value="Approved">Approved</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                            <MenuItem value="Expired">Expired</MenuItem>
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
                            <MenuItem value="proposal_date_desc">Proposal Date ↓ (Latest)</MenuItem>
                            <MenuItem value="proposal_date_asc">Proposal Date ↑ (Oldest)</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />
                    <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
                        {canExport &&(
                            <>
                                <Button
                                    variant="contained"
                                    startIcon={<Iconify icon={"solar:export-bold" as any} />}
                                    onClick={handleExport}
                                    disabled={filteredData.length === 0}
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
                                <Button
                                    variant="contained"
                                    startIcon={exportingPdf ? undefined : <Iconify icon={"solar:file-download-bold" as any} />}
                                    onClick={() => handleExportPdf(() => generateProposalPdf({
                                        reportData: filteredData,
                                        selected,
                                        summary: [
                                            { label: 'Total Proposals', value: totalProposals },
                                            { label: 'Approved Proposals', value: approvedProposals },
                                            { label: 'Pending Proposals', value: pendingProposals }
                                        ]
                                    }))}
                                    disabled={exportingPdf || filteredData.length === 0}
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
                            </>
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
                    <SummaryCard item={{ label: 'Total Proposals', value: totalProposals, indicator: 'blue' }} />
                    <SummaryCard item={{ label: 'Approved Proposals', value: approvedProposals, indicator: 'green' }} />
                    <SummaryCard item={{ label: 'Pending Proposals', value: pendingProposals, indicator: 'orange' }} />
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
                                                indeterminate={selected.length > 0 && selected.length < filteredData.length}
                                                checked={filteredData.length > 0 && selected.length === filteredData.length}
                                                onChange={handleSelectAllClick}
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', width: 80 }}>S.No</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Proposal No</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Proposal Title</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Lead</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Company Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Proposal Date</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>Attachments</TableCell>
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
                                                const serialNumber = page * rowsPerPage + index;
                                                return (
                                                    <TableRow
                                                        key={row.name}
                                                        hover
                                                        role="checkbox"
                                                        aria-checked={isSelected}
                                                        selected={isSelected}
                                                        onClick={() => handleViewProposal(row.name)}
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
                                                        <TableCell align="center">
                                                            <Box
                                                                sx={{
                                                                    width: 28,
                                                                    height: 28,
                                                                    display: 'flex',
                                                                    borderRadius: '50%',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                    color: 'primary.main',
                                                                    typography: 'subtitle2',
                                                                    fontWeight: 800,
                                                                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                                                                    mx: 'auto',
                                                                    transition: (theme) =>
                                                                        theme.transitions.create(['all'], {
                                                                            duration: theme.transitions.duration.shorter,
                                                                        }),
                                                                    '&:hover': {
                                                                        bgcolor: 'primary.main',
                                                                        color: 'primary.contrastText',
                                                                        transform: 'scale(1.1)',
                                                                    },
                                                                }}
                                                            >
                                                                {serialNumber + 1}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>
                                                            {row.reference_no || row.name}
                                                        </TableCell>
                                                        <TableCell sx={{ maxWidth: 220 }}>
                                                            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                                                {row.proposal_title}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ maxWidth: 180 }}>
                                                            <Stack spacing={0.5}>
                                                                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                                                                    {row.lead_name || row.lead}
                                                                </Typography>
                                                                <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                                                    {row.lead}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell sx={{ maxWidth: 180 }}>
                                                            {row.company_name ? (
                                                                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                                                                    {row.company_name}
                                                                </Typography>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{fDate(row.proposal_date)}</TableCell>
                                                        <TableCell>
                                                            <Label
                                                                sx={{
                                                                    ...getStatusStyle(row.status || 'Draft'),
                                                                    fontWeight: 700,
                                                                    fontSize: 11,
                                                                    textTransform: 'uppercase',
                                                                    borderRadius: '6px',
                                                                    padding: '4px 12px',
                                                                }}
                                                            >
                                                                {row.status || 'Draft'}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Box
                                                                sx={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                    color: row.total_attachments ? 'info.main' : 'text.disabled',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                <Iconify icon="solar:paperclip-bold" width={16} />
                                                                {row.total_attachments ?? 0}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell
                                                            align="right"
                                                            onClick={(e) => e.stopPropagation()}
                                                            sx={{
                                                                position: 'sticky',
                                                                right: 0,
                                                                bgcolor: 'background.paper',
                                                                boxShadow: '-2px 0 4px rgba(145, 158, 171, 0.08)'
                                                            }}
                                                        >
                                                            <IconButton
                                                                onClick={() => handleViewProposal(row.name)}
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
        if (t.includes('total')) return 'solar:target-bold-duotone';
        if (t.includes('approved')) return 'solar:check-circle-bold-duotone';
        return 'solar:clock-circle-bold-duotone';
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

// Force reload comment
