import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchMetaApps, deleteMetaApp } from 'src/api/meta-app';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/proposal/table-no-data';
import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';

import { useAuth } from 'src/auth/auth-context';

import { MetaAppsFiltersDrawer, MetaAppsFilters } from '../meta-apps-filters-drawer';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
    { value: 'modified_desc', label: 'Newest First' },
    { value: 'modified_asc', label: 'Oldest First' },
    { value: 'app_name_asc', label: 'Name: A to Z' },
    { value: 'app_name_desc', label: 'Name: Z to A' },
    { value: 'creation_desc', label: 'Date (Newest)' },
    { value: 'creation_asc', label: 'Date (Oldest)' },
];

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'app_name', label: 'App Name', maxWidth: 220 },
    { id: 'app_id', label: 'App ID', width: 200 },
    { id: 'graph_api_version', label: 'API Version', width: 140, align: 'center' as const },
    { id: 'app_status', label: 'App Status', width: 140, align: 'center' as const },
    { id: 'is_active', label: 'Active', width: 100, align: 'center' as const },
    { id: 'is_default', label: 'Default', width: 100, align: 'center' as const },
    { id: 'action', label: 'Actions', align: 'center' as const, width: 130 },
];

export function MetaAppsListView() {
    const router = useRouter();
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.meta_apps;
    const canCreate = hasCustomPerms && user?.permissions?.actions?.meta_apps ? !!user?.permissions?.actions?.meta_apps?.create : true;
    const canEdit = hasCustomPerms && user?.permissions?.actions?.meta_apps ? !!user?.permissions?.actions?.meta_apps?.edit : true;
    const canDelete = hasCustomPerms && user?.permissions?.actions?.meta_apps ? !!user?.permissions?.actions?.meta_apps?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();

    const [filters, setFilters] = useState<MetaAppsFilters>({
        app_status: 'all',
        is_active: 'all',
        is_default: 'all',
    });
    const [openFilters, setOpenFilters] = useState(false);

    const handleFilters = useCallback((update: Partial<MetaAppsFilters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            app_status: 'all',
            is_active: 'all',
            is_default: 'all',
        });
        setPage(0);
    }, []);

    const canReset = filters.app_status !== 'all' || filters.is_active !== 'all' || filters.is_default !== 'all' || !!filterName;

    const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Newest First';

    useEffect(() => {
        const msg = sessionStorage.getItem('meta_app_success_message');
        if (msg) {
            enqueueSnackbar(msg, { variant: 'success' });
            sessionStorage.removeItem('meta_app_success_message');
        }
    }, [enqueueSnackbar]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchMetaApps({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                sort_by: sortBy,
                app_status: filters.app_status,
                is_active: filters.is_active,
                is_default: filters.is_default,
            });
            setData(res.data);
            setTotal(res.total);
        } catch (err) {
            enqueueSnackbar('Failed to fetch Meta Apps', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, sortBy, filters, enqueueSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        setIsDeleting(true);
        try {
            await deleteMetaApp(confirmDelete.id);
            enqueueSnackbar('Meta App deleted successfully', { variant: 'success' });
            await fetchData();
            setConfirmDelete({ open: false, id: null });
        } catch (error: any) {
            enqueueSnackbar(error?.message || 'Failed to delete Meta App', { variant: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateNew = () => router.push('/lead-integration/meta-apps/new');

    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {/* Header — identical to WhatsApp Templates */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">Meta Apps</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {canCreate && (
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon={"mingcute:add-line" as any} />}
                            onClick={handleCreateNew}
                            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        >
                            New Meta App
                        </Button>
                    )}
                </Box>
            </Stack>



            <Card>
                {/* Toolbar — identical to WhatsApp Templates */}
                <Toolbar
                    sx={{
                        height: 96,
                        display: 'flex',
                        justifyContent: 'space-between',
                        p: (theme) => theme.spacing(0, 1, 0, 3),
                    }}
                >
                    <OutlinedInput
                        value={filterName}
                        onChange={(e) => { setFilterName(e.target.value); setPage(0); }}
                        placeholder="Search apps..."
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

                        {/* Sort dropdown */}
                        <Button
                            variant="text"
                            color="inherit"
                            startIcon={<Iconify icon={"solar:sort-bold" as any} />}
                            onClick={(e) => setSortAnchorEl(e.currentTarget)}
                            sx={{
                                minWidth: 160,
                                height: 40,
                                px: 2,
                                color: 'text.primary',
                                bgcolor: 'background.neutral',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                fontWeight: 500,
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            {currentSortLabel}
                        </Button>
                        <Menu
                            anchorEl={sortAnchorEl}
                            open={Boolean(sortAnchorEl)}
                            onClose={() => setSortAnchorEl(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            slotProps={{ paper: { sx: { mt: 1, minWidth: 200, boxShadow: (theme) => theme.customShadows.z20 } } }}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <MenuItem
                                    key={option.value}
                                    selected={option.value === sortBy}
                                    onClick={() => { setSortBy(option.value); setSortAnchorEl(null); setPage(0); }}
                                    sx={{
                                        typography: 'body2',
                                        ...(option.value === sortBy && {
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                            fontWeight: 'fontWeightSemiBold',
                                        }),
                                    }}
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
                            <ProposalTableHead
                                rowCount={total}
                                numSelected={0}
                                onSelectAllRows={() => { }}
                                hideCheckbox
                                showIndex
                                headLabel={TABLE_HEAD}
                            />
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <TableRow
                                                key={row.name}
                                                hover
                                                tabIndex={-1}
                                                sx={{
                                                    '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                    '&:last-child td, &:last-child th': { borderBottom: 0 },
                                                }}
                                            >
                                                {/* Row number */}
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
                                                        }}
                                                    >
                                                        {page * rowsPerPage + index + 1}
                                                    </Box>
                                                </TableCell>

                                                {/* App Name */}
                                                <TableCell component="th" scope="row">
                                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                                        <Box
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 1.5,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#1877F2',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <Iconify icon={"logos:meta-icon" as any} width={22} />
                                                        </Box>
                                                        <Stack spacing={0.2}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                                                                {row.app_name}
                                                            </Typography>
                                                            {row.business_manager_id && (
                                                                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                                                    BM: {row.business_manager_id}
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                    </Stack>
                                                </TableCell>

                                                {/* App ID */}
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14, }}>
                                                        {row.app_id || '—'}
                                                    </Typography>
                                                </TableCell>

                                                {/* Graph API Version */}
                                                <TableCell align="center">
                                                    <Chip
                                                        label={row.graph_api_version || 'v23.0'}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: alpha('#059669', 0.1),
                                                            color: '#059669',
                                                            border: `1px solid ${alpha('#059669', 0.3)}`,
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            borderRadius: '6px',
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* App Status */}
                                                <TableCell align="center">
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            textTransform: 'uppercase',
                                                            borderRadius: '6px',
                                                            padding: '4px 12px',
                                                            ...(row.app_status === 'Production'
                                                                ? {
                                                                    bgcolor: 'rgba(34, 197, 94, 0.15)',
                                                                    border: '1px solid rgba(34, 197, 94, 0.35)',
                                                                    color: '#15803d',
                                                                }
                                                                : {
                                                                    bgcolor: 'rgba(234, 179, 8, 0.15)',
                                                                    border: '1px solid rgba(234, 179, 8, 0.35)',
                                                                    color: '#a16207',
                                                                }),
                                                        }}
                                                    >
                                                        {row.app_status || 'Development'}
                                                    </Box>
                                                </TableCell>

                                                {/* Is Active */}
                                                <TableCell align="center">
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            textTransform: 'uppercase',
                                                            borderRadius: '6px',
                                                            padding: '4px 10px',
                                                            ...(row.is_active
                                                                ? {
                                                                    bgcolor: 'rgba(34, 197, 94, 0.15)',
                                                                    border: '1px solid rgba(34, 197, 94, 0.35)',
                                                                    color: '#15803d',
                                                                }
                                                                : {
                                                                    bgcolor: 'rgba(156, 163, 175, 0.15)',
                                                                    border: '1px solid rgba(156, 163, 175, 0.35)',
                                                                    color: '#374151',
                                                                }),
                                                        }}
                                                    >
                                                        {row.is_active ? 'Yes' : 'No'}
                                                    </Box>
                                                </TableCell>

                                                {/* Is Default */}
                                                <TableCell align="center">
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            px: 1.5,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            ...(row.is_default
                                                                ? {
                                                                    bgcolor: alpha('#059669', 0.12),
                                                                    border: `1px solid ${alpha('#059669', 0.35)}`,
                                                                    color: '#059669',
                                                                }
                                                                : {
                                                                    bgcolor: 'rgba(156, 163, 175, 0.15)',
                                                                    border: '1px solid rgba(156, 163, 175, 0.35)',
                                                                    color: '#374151',
                                                                }),
                                                        }}
                                                    >
                                                        {row.is_default ? 'Yes' : 'No'}
                                                    </Box>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                        <IconButton
                                                            onClick={() => router.push(`/lead-integration/meta-apps/${row.name}/view`)}
                                                            sx={{ color: 'info.main' }}
                                                            title="View"
                                                        >
                                                            <Iconify icon="solar:eye-bold" />
                                                        </IconButton>
                                                        {canEdit && (
                                                            <IconButton
                                                                onClick={() => router.push(`/lead-integration/meta-apps/${row.name}/edit`)}
                                                                sx={{ color: 'primary.main' }}
                                                                title="Edit"
                                                            >
                                                                <Iconify icon="solar:pen-bold" />
                                                            </IconButton>
                                                        )}
                                                        {canDelete && (
                                                            <IconButton
                                                                onClick={() => setConfirmDelete({ open: true, id: row.name })}
                                                                sx={{ color: 'error.main' }}
                                                                title="Delete"
                                                            >
                                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {notFound && <TableNoData colSpan={8} searchQuery={filterName} />}
                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8} sx={{ p: 0, py: 5 }}>
                                                    <EmptyContent
                                                        icon={"logos:meta-icon" as any}
                                                        title="No Meta Apps found"
                                                        description="Connect your Meta Developer Apps to enable Lead Integrations here."
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {!empty && !notFound && data.length < 5 && (
                                            <>
                                                {Array.from({ length: 5 - data.length }).map((_, i) => (
                                                    <TableRow
                                                        key={`empty-${i}`}
                                                        sx={{ height: 68, '& td': { borderBottom: 'none' } }}
                                                    >
                                                        <TableCell colSpan={8} />
                                                    </TableRow>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Scrollbar>

                <TablePagination
                    page={page}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Card>

            <MetaAppsFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this Meta App? All linked configurations may be affected."
                isLoading={isDeleting}
                action={
                    <LoadingButton variant="contained" color="error" loading={isDeleting} onClick={handleConfirmDelete}>
                        Delete
                    </LoadingButton>
                }
            />
        </DashboardContent>
    );
}
