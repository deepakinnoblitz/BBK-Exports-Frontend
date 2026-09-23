import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchWhatsAppTemplates } from 'src/api/whatsapp-template';
import { fetchWhatsAppAutomations, deleteWhatsAppAutomation } from 'src/api/whatsapp-automation';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/proposal/table-no-data';
import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';

import { useAuth } from 'src/auth/auth-context';

import { WhatsAppAutomationsTableToolbar } from '../whatsapp-automations-table-toolbar';
import { WhatsAppAutomationsFiltersDrawer, WhatsAppAutomationsFiltersProps } from '../whatsapp-automations-filters-drawer';

const TABLE_HEAD = [
    { id: 'automation_name', label: 'Automation Name' },
    { id: 'whatsapp_template', label: 'WhatsApp Template' },
    { id: 'document_type', label: 'Document Type' },
    { id: 'trigger_event', label: 'Trigger Event' },
    { id: 'is_active', label: 'Status', align: 'center' },
    { id: 'action', label: 'Actions', align: 'center' },
];

const defaultFilters: WhatsAppAutomationsFiltersProps = {
    whatsapp_template: 'all',
    document_type: 'all',
    is_active: 'all',
};

export function WhatsAppAutomationsListView() {
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    
    const [filters, setFilters] = useState<WhatsAppAutomationsFiltersProps>(defaultFilters);
    const [openFilters, setOpenFilters] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
    
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [templatesMap, setTemplatesMap] = useState<Record<string, string>>({});
    const { enqueueSnackbar } = useSnackbar();

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.whatsapp_automations;
    const canCreateAutomation = hasCustomPerms && user?.permissions?.actions?.whatsapp_automations ? !!user?.permissions?.actions?.whatsapp_automations?.create : true;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_automations?.edit : true;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_automations?.delete : true;

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const msg = sessionStorage.getItem('whatsapp_automation_success_message');
        if (msg) {
            setSuccessMessage(msg);
            sessionStorage.removeItem('whatsapp_automation_success_message');
        }
    }, []);

    const fetchAutomations = useCallback(async () => {
        setLoading(true);
        try {
            const [res, templatesRes] = await Promise.all([
                fetchWhatsAppAutomations({
                    page: page + 1,
                    page_size: rowsPerPage,
                    search: filterName,
                    sort_by: sortBy,
                    filters: filters,
                }),
                fetchWhatsAppTemplates({ page: 1, page_size: 1000 })
            ]);
            
            const tMap: Record<string, string> = {};
            templatesRes.data.forEach((t: any) => {
                tMap[t.name] = t.template_name;
            });
            setTemplatesMap(tMap);

            setData(res.data);
            setTotal(res.total);
        } catch (err) {
            enqueueSnackbar('Failed to fetch automations', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, sortBy, filters, enqueueSnackbar]);

    useEffect(() => {
        fetchAutomations();
    }, [fetchAutomations]);

    const handleFilters = (update: Partial<WhatsAppAutomationsFiltersProps>) => {
        setFilters((prev) => ({ ...prev, ...update }));
    };

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteRow = async () => {
        if (!confirmDelete.id) return;
        setIsDeleting(true);
        try {
            await deleteWhatsAppAutomation(confirmDelete.id);
            enqueueSnackbar('Automation deleted successfully', { variant: 'success' });
            await fetchAutomations();
            setConfirmDelete({ open: false, id: null });
        } catch (error: any) {
            const isLinkError = error?.message && (
                error.message.includes('LinkExistsError') ||
                error.message.includes('Cannot delete or cancel because') ||
                error.message.includes('is linked with')
            );
            if (isLinkError) {
                enqueueSnackbar('This automation is currently in use and cannot be deleted. Please remove it from any linked records first.', { variant: 'error' });
            } else {
                enqueueSnackbar('Failed to delete automation', { variant: 'error' });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">CRM WhatsApp Automations</Typography>
                
                {canCreateAutomation &&(
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={() => router.push('/whatsapp-automation/new')}
                        sx={{
                            borderRadius: 1.5,
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' },
                        }}
                    >
                        New Automation
                    </Button>
                )}
            </Stack>

            <Card
                sx={{
                    mb: 4,
                    boxShadow: (theme) => theme.customShadows.z8,
                    borderRadius: 2,
                }}
            >
                <WhatsAppAutomationsTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={(e) => setFilterName(e.target.value)}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={!!filterName || filters.whatsapp_template !== 'all' || filters.document_type !== 'all' || filters.is_active !== 'all'}
                />

                <Scrollbar>
                    <TableContainer sx={{ overflow: 'unset' }}>
                        <Table sx={{ minWidth: 960 }}>
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
                                        <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
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
                                                        {page * rowsPerPage + index + 1}
                                                    </Box>
                                                </TableCell>
                                                <TableCell component="th" scope="row">
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {row.automation_name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 180 }}>
                                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                                        {templatesMap[row.whatsapp_template] || row.whatsapp_template || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 150 }}>
                                                    <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                                                        {row.document_type || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 180 }}>
                                                    <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                                                        {row.trigger_event || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box
                                                        sx={{
                                                            display: 'inline-flex',
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            textTransform: 'uppercase',
                                                            borderRadius: '6px',
                                                            padding: '4px 12px',
                                                            ...(row.is_active
                                                                ? {
                                                                      bgcolor: 'rgba(34, 197, 94, 0.25)',
                                                                      border: '1px solid rgba(34, 197, 94, 0.45)',
                                                                      color: '#15803d',
                                                                  }
                                                                : {
                                                                      bgcolor: 'rgba(156, 163, 175, 0.25)',
                                                                      border: '1px solid rgba(156, 163, 175, 0.45)',
                                                                      color: '#374151',
                                                                  }),
                                                        }}
                                                    >
                                                        {row.is_active ? 'Active' : 'Inactive'}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                        <IconButton onClick={() => router.push(`/whatsapp-automation/${row.name}/view`)} sx={{ color: 'info.main' }} title="View">
                                                            <Iconify icon="solar:eye-bold" />
                                                        </IconButton>
                                                        {displayEdit && (
                                                            <IconButton onClick={() => router.push(`/whatsapp-automation/${row.name}/edit`)} sx={{ color: 'primary.main' }} title="Edit">
                                                                <Iconify icon="solar:pen-bold" />
                                                            </IconButton>
                                                        )}
                                                        {displayDelete &&(
                                                            <IconButton onClick={() => setConfirmDelete({ open: true, id: row.name })} sx={{ color: 'error.main' }} title="Delete">
                                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {notFound && <TableNoData searchQuery={filterName} />}
                                                                                
                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={7}>
                                                    <EmptyContent
                                                        title="No WhatsApp Automation lists found"
                                                        description="You haven't created any WhatsApp Automation lists yet."
                                                        icon="solar:calendar-mark-bold-duotone"
                                                        sx={{ py: 12 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {!empty && !notFound && data.length < 5 && (
                                            <>
                                                {Array.from({ length: 5 - data.length }).map((_, i) => (
                                                    <TableRow
                                                        key={`empty-${i}`}
                                                        sx={{
                                                            height: 68,
                                                            '& td': { borderBottom: 'none' },
                                                        }}
                                                    >
                                                        <TableCell colSpan={7} />
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

                <ConfirmDialog
                    open={confirmDelete.open}
                    onClose={() => setConfirmDelete({ open: false, id: null })}
                    title="Delete"
                    content="Are you sure want to delete this WhatsApp automation?"
                    isLoading={isDeleting}
                    action={
                        <LoadingButton variant="contained" color="error" loading={isDeleting} onClick={handleDeleteRow}>
                            Delete
                        </LoadingButton>
                    }
                />

                <WhatsAppAutomationsFiltersDrawer
                    open={openFilters}
                    onOpen={() => setOpenFilters(true)}
                    onClose={() => setOpenFilters(false)}
                    filters={filters}
                    onFilters={handleFilters}
                    canReset={filters.whatsapp_template !== 'all' || filters.document_type !== 'all' || filters.is_active !== 'all'}
                    onResetFilters={() => setFilters(defaultFilters)}
                    options={{
                        templates: Object.entries(templatesMap).map(([name, template_name]) => ({ name, template_name }))
                    }}
                />
            </Card>

            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={() => setSuccessMessage(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
                    {successMessage}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
