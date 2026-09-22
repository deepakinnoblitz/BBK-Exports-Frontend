import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { fTimeDist } from 'src/utils/format-time';

import { fetchMetaApps } from 'src/api/meta-app';
import { fetchMetaPages } from 'src/api/meta-page';
import { fetchMetaForms } from 'src/api/meta-form';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchMetaLeads, retryMetaLead } from 'src/api/meta-lead';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { TableNoData } from 'src/sections/proposal/table-no-data';
import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';

import { useAuth } from 'src/auth/auth-context';

import { MetaLeadsFiltersDrawer, MetaLeadsFilters } from '../meta-leads-filters-drawer';
// ----------------------------------------------------------------------

const SORT_OPTIONS = [
    { value: 'creation_desc', label: 'Newest First' },
    { value: 'creation_asc', label: 'Oldest First' },
    { value: 'processing_status_asc', label: 'Status: A to Z' },
    { value: 'processing_status_desc', label: 'Status: Z to A' },
];

const TABLE_HEAD = [
    { id: 'meta_lead_id', label: 'Meta Lead ID' },
    { id: 'meta_app', label: 'Meta App', width: 180 },
    { id: 'meta_page', label: 'Meta Page', width: 180 },
    { id: 'meta_form', label: 'Meta Form', width: 180 },
    { id: 'received_time', label: 'Received Time', width: 180 },
    { id: 'processing_status', label: 'Status', width: 130, align: 'center' as const },
    { id: 'actions', label: 'Actions', width: 80, align: 'center' as const },
];

// ----------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    Success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)', color: '#15803d' },
    Failed: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', color: '#b91c1c' },
    Processing: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', color: '#1d4ed8' },
    Pending: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.35)', color: '#374151' },
};

// ----------------------------------------------------------------------

function formatDatetime(val?: string) {
    if (!val) return '—';
    return new Date(val).toLocaleString();
}

// ----------------------------------------------------------------------

export function MetaLeadListView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.meta_leads;
    const canCreate = hasCustomPerms && user?.permissions?.actions?.meta_leads ? !!user?.permissions?.actions?.meta_leads?.create : true;
    const canEdit = hasCustomPerms && user?.permissions?.actions?.meta_leads ? !!user?.permissions?.actions?.meta_leads?.edit : true;
    const canDelete = hasCustomPerms && user?.permissions?.actions?.meta_leads ? !!user?.permissions?.actions?.meta_leads?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('creation_desc');
    const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const [filters, setFilters] = useState<MetaLeadsFilters>({
        meta_app: 'all',
        meta_page: 'all',
        meta_form: 'all',
        processing_status: 'all',
    });
    const [openFilters, setOpenFilters] = useState(false);
    const [apps, setApps] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [retryingLeads, setRetryingLeads] = useState<Record<string, boolean>>({});

    const handleFilters = useCallback((update: Partial<MetaLeadsFilters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            meta_app: 'all',
            meta_page: 'all',
            meta_form: 'all',
            processing_status: 'all',
        });
        setPage(0);
    }, []);

    const canReset = filters.meta_app !== 'all' || filters.meta_page !== 'all' || filters.meta_form !== 'all' || filters.processing_status !== 'all' || !!filterName;


    const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Newest First';

    useEffect(() => {
        Promise.all([
            fetchMetaApps({ page: 1, page_size: 1000 }),
            fetchMetaPages({ page: 1, page_size: 1000 }),
            fetchMetaForms({ page: 1, page_size: 1000 }),
        ]).then(([appsRes, pagesRes, formsRes]) => {
            setApps(appsRes.data);
            setPages(pagesRes.data);
            setForms(formsRes.data);
        }).catch((err) => {
            console.error('Failed to fetch dropdown options', err);
        });
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchMetaLeads({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                sort_by: sortBy,
                meta_app: filters.meta_app,
                meta_page: filters.meta_page,
                meta_form: filters.meta_form,
                processing_status: filters.processing_status,
            });
            setData(res.data);
            setTotal(res.total);
        } catch {
            enqueueSnackbar('Failed to fetch CRM Meta Leads', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, sortBy, filters, enqueueSnackbar]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRetryRow = async (name: string) => {
        setRetryingLeads((prev) => ({ ...prev, [name]: true }));
        try {
            await retryMetaLead(name);
            enqueueSnackbar('Meta Lead processing retried successfully', { variant: 'success' });
            fetchData();
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to retry Meta Lead', { variant: 'error' });
        } finally {
            setRetryingLeads((prev) => ({ ...prev, [name]: false }));
        }
    };

    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">Meta Leads</Typography>
            </Stack>

            <Card>
                <Toolbar sx={{ height: 96, display: 'flex', justifyContent: 'space-between', p: (t) => t.spacing(0, 1, 0, 3) }}>
                    <OutlinedInput
                        value={filterName}
                        onChange={(e) => { setFilterName(e.target.value); setPage(0); }}
                        placeholder="Search leads..."
                        startAdornment={
                            <InputAdornment position="start">
                                <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                        }
                        sx={{ maxWidth: 480, width: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            disableRipple
                            color="inherit"
                            onClick={() => setOpenFilters(true)}
                            startIcon={
                                <Badge color="error" variant="dot" invisible={!canReset}>
                                    <Iconify icon="ic:round-filter-list" />
                                </Badge>
                            }
                            sx={{
                                height: 40,
                                px: 2,
                                bgcolor: 'background.neutral',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                fontWeight: 500,
                            }}
                        >
                            Filters
                        </Button>

                        <Button
                            variant="text" color="inherit"
                            startIcon={<Iconify icon={"solar:sort-bold" as any} />}
                            onClick={(e) => setSortAnchorEl(e.currentTarget)}
                            sx={{ minWidth: 160, height: 40, px: 2, color: 'text.primary', bgcolor: 'background.neutral', border: '1px solid', borderColor: 'divider', borderRadius: 1, fontWeight: 500, '&:hover': { bgcolor: 'action.hover' } }}
                        >
                            {currentSortLabel}
                        </Button>
                        <Menu
                            anchorEl={sortAnchorEl} open={Boolean(sortAnchorEl)} onClose={() => setSortAnchorEl(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            slotProps={{ paper: { sx: { mt: 1, minWidth: 200, boxShadow: (t) => t.customShadows.z20 } } }}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <MenuItem key={option.value} selected={option.value === sortBy}
                                    onClick={() => { setSortBy(option.value); setSortAnchorEl(null); setPage(0); }}
                                    sx={{ typography: 'body2', ...(option.value === sortBy && { bgcolor: (t) => alpha(t.palette.primary.main, 0.08), fontWeight: 'fontWeightSemiBold' }) }}
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>
                </Toolbar>

                <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                    <Scrollbar>
                        <Table sx={{ minWidth: 800 }}>
                            <ProposalTableHead
                                rowCount={total}
                                numSelected={0}
                                onSelectAllRows={() => {}}
                                hideCheckbox
                                showIndex
                                headLabel={TABLE_HEAD}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => {
                                            const sc = STATUS_COLORS[row.processing_status] || STATUS_COLORS.Pending;
                                            return (
                                                <TableRow key={row.name} hover tabIndex={-1}
                                                    sx={{ '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` }, '&:last-child td, &:last-child th': { borderBottom: 0 } }}
                                                >
                                                    {/* Index */}
                                                    <TableCell align="center">
                                                        <Box sx={{ width: 28, height: 28, display: 'flex', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', bgcolor: (t) => alpha(t.palette.primary.main, 0.08), color: 'primary.main', typography: 'subtitle2', fontWeight: 800, border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.16)}`, mx: 'auto' }}>
                                                            {page * rowsPerPage + index + 1}
                                                        </Box>
                                                    </TableCell>

                                                    {/* Meta Lead ID */}
                                                    <TableCell component="th" scope="row">
                                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                                            <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2', flexShrink: 0 }}>
                                                                <Iconify icon={"logos:meta-icon" as any} width={22} />
                                                            </Box>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.meta_lead_id}</Typography>
                                                        </Stack>
                                                    </TableCell>

                                                    <TableCell>{apps.find((a) => a.name === row.meta_app)?.app_name || row.meta_app || '—'}</TableCell>
                                                    <TableCell>{pages.find((p) => p.name === row.meta_page)?.page_name || row.meta_page || '—'}</TableCell>
                                                    <TableCell>{forms.find((f) => f.name === row.meta_form)?.form_name || row.meta_form || '—'}</TableCell>
                                                    <TableCell>{formatDatetime(row.received_time)}</TableCell>
                                                    
                                                    {/* Status Badge */}
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRadius: '6px', padding: '4px 10px', bgcolor: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                                                            {row.processing_status}
                                                        </Box>
                                                    </TableCell>
                                                    
                                                    {/* Actions */}
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                                                            <Box sx={{ typography: 'body2', color: 'text.secondary', fontWeight: 700, mr: 1, fontSize: 12, whiteSpace: 'nowrap' }}>
                                                                {fTimeDist(row.modified)}
                                                            </Box>
                                                            {row.processing_status === 'Failed' && (
                                                                <IconButton
                                                                    onClick={() => handleRetryRow(row.name)}
                                                                    disabled={retryingLeads[row.name]}
                                                                    sx={{ color: 'primary.main' }}
                                                                    title="Retry Processing"
                                                                >
                                                                    {retryingLeads[row.name] ? (
                                                                        <CircularProgress size={18} color="inherit" />
                                                                    ) : (
                                                                        <Iconify icon="solar:refresh-bold" />
                                                                    )}
                                                                </IconButton>
                                                            )}
                                                            <IconButton onClick={() => navigate(`/lead-integration/meta-leads/${encodeURIComponent(row.name)}/view`)} sx={{ color: 'info.main' }} title="View">
                                                                <Iconify icon="solar:eye-bold" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {notFound && <TableNoData colSpan={8} searchQuery={filterName} />}
                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8} sx={{ p: 0, py: 5 }}>
                                                    <EmptyContent icon={"logos:meta-icon" as any} title="No Meta Leads logged yet" description="Incoming Facebook leads will appear here." />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {!empty && !notFound && data.length < 5 && (
                                            Array.from({ length: 5 - data.length }).map((_, i) => (
                                                <TableRow key={`empty-${i}`} sx={{ height: 68, '& td': { borderBottom: 'none' } }}>
                                                    <TableCell colSpan={8} />
                                                </TableRow>
                                            ))
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </Scrollbar>
                </TableContainer>

                <TablePagination
                    page={page}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Card>

            <MetaLeadsFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                apps={apps}
                pages={pages}
                forms={forms}
            />
        </DashboardContent>
    );
}
