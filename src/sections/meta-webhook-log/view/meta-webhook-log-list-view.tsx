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

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchMetaWebhookLogs } from 'src/api/meta-webhook-log';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';

import { TableNoData } from 'src/sections/proposal/table-no-data';
import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';

import { useAuth } from 'src/auth/auth-context';

import { MetaWebhookLogFiltersDrawer, MetaWebhookLogFilters } from '../meta-webhook-log-filters-drawer';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
    { value: 'creation_desc', label: 'Newest First' },
    { value: 'creation_asc', label: 'Oldest First' },
    { value: 'status_asc', label: 'Status: A to Z' },
    { value: 'status_desc', label: 'Status: Z to A' },
];

const TABLE_HEAD = [
    { id: 'name', label: 'Log ID' },
    { id: 'http_status', label: 'HTTP Status', width: 130 },
    { id: 'execution_time', label: 'Exec Time (s)', width: 150 },
    { id: 'retry_count', label: 'Retries', width: 100, align: 'center' as const },
    { id: 'response', label: 'Response' },
    { id: 'status', label: 'Status', width: 130, align: 'center' as const },
    { id: 'actions', label: 'Actions', width: 80, align: 'center' as const },
];

// ----------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    Verified: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)', color: '#15803d' },
    Failed:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  color: '#b91c1c' },
    Unverified: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.35)', color: '#374151' },
};

function formatDatetime(val?: string) {
    if (!val) return '—';
    return new Date(val).toLocaleString();
}

// ----------------------------------------------------------------------

export function MetaWebhookLogListView() {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.webhook_logs;
    const canCreate = hasCustomPerms && user?.permissions?.actions?.webhook_logs ? !!user?.permissions?.actions?.webhook_logs?.create : true;
    const canEdit = hasCustomPerms && user?.permissions?.actions?.webhook_logs ? !!user?.permissions?.actions?.webhook_logs?.edit : true;
    const canDelete = hasCustomPerms && user?.permissions?.actions?.webhook_logs ? !!user?.permissions?.actions?.webhook_logs?.delete : true;

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

    const [filters, setFilters] = useState<MetaWebhookLogFilters>({
        http_status: 'all',
        status: 'all',
    });
    const [openFilters, setOpenFilters] = useState(false);

    const handleFilters = useCallback((update: Partial<MetaWebhookLogFilters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({ http_status: 'all', status: 'all' });
        setPage(0);
    }, []);

    const canReset = filters.http_status !== 'all' || filters.status !== 'all' || !!filterName;


    const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Newest First';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchMetaWebhookLogs({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                sort_by: sortBy,
                http_status: filters.http_status,
                status: filters.status,
            });
            setData(res.data);
            setTotal(res.total);
        } catch {
            enqueueSnackbar('Failed to fetch Webhook Logs', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, sortBy, filters, enqueueSnackbar]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const notFound = !loading && data.length === 0 && !!filterName;
    const empty    = !loading && data.length === 0 && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">Meta Webhook Logs</Typography>
            </Stack>

            <Card>
                <Toolbar sx={{ height: 96, display: 'flex', justifyContent: 'space-between', p: (t) => t.spacing(0, 1, 0, 3) }}>
                    <OutlinedInput
                        value={filterName}
                        onChange={(e) => { setFilterName(e.target.value); setPage(0); }}
                        placeholder="Search logs..."
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

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 960 }}>
                            <ProposalTableHead rowCount={total} numSelected={0} onSelectAllRows={() => {}} hideCheckbox showIndex headLabel={TABLE_HEAD} />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => {
                                            const sc = STATUS_COLORS[row.status] || STATUS_COLORS.Unverified;
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

                                                    {/* Log ID */}
                                                    <TableCell component="th" scope="row">
                                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                                            <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2', flexShrink: 0 }}>
                                                                <Iconify icon={"logos:meta-icon" as any} width={22} />
                                                            </Box>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
                                                        </Stack>
                                                    </TableCell>

                                                    {/* HTTP Status */}
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.http_status ?? '—'}</Typography>
                                                    </TableCell>

                                                    {/* Execution Time */}
                                                    <TableCell>
                                                        <Typography variant="body2">{row.execution_time != null ? `${row.execution_time}s` : '—'}</Typography>
                                                    </TableCell>

                                                    {/* Retry Count */}
                                                    <TableCell align="center">
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{row.retry_count ?? 0}</Typography>
                                                    </TableCell>

                                                    {/* Response */}
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: 13, color: row.status === 'Failed' ? 'error.main' : 'text.secondary', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.response || ''}>
                                                            {row.response || '—'}
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Status badge */}
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRadius: '6px', padding: '4px 10px', bgcolor: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                                                            {row.status}
                                                        </Box>
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                            <Box sx={{ typography: 'body2', color: 'text.secondary', fontWeight: 700, mr: 1, fontSize: 12, whiteSpace: 'nowrap', pt: 1 }}>
                                                                {fTimeDist(row.modified)}
                                                            </Box>
                                                            <IconButton
                                                                onClick={() => navigate(`/lead-integration/webhook-logs/${encodeURIComponent(row.name)}/view`)}
                                                                sx={{ color: 'info.main' }}
                                                                title="View"
                                                            >
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
                                                    <EmptyContent icon={"logos:meta-icon" as any} title="No Webhook Logs found" description="Incoming Meta lead ad webhook payloads will appear here." />
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
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    page={page} component="div" count={total} rowsPerPage={rowsPerPage}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Card>

            <MetaWebhookLogFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />
        </DashboardContent>
    );
}
