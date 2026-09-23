import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
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

import { fDateTime } from 'src/utils/format-time';  

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchEmailTemplates, deleteEmailTemplate, fetchEmailTemplateCategories } from 'src/api/email-template';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/proposal/table-no-data';
import { TableEmptyRows } from 'src/sections/proposal/table-empty-rows';
import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';

import { useAuth } from 'src/auth/auth-context';

import { EmailTemplateTableToolbar } from '../email-templates-table-toolbar';
import { EmailTemplateFiltersDrawer } from '../email-templates-filters-drawer';

const TABLE_HEAD = [
    { id: 'template_name', label: 'Template Name', minWidth: 250 },
    { id: 'category', label: 'Category', width: 180 },
    { id: 'subject', label: 'Subject', width: 400 },
    { id: 'status', label: 'Status', align: 'center', width: 240 },
    { id: 'action', label: 'Actions', align: 'center', width: 120 },
];

export function EmailTemplateListView() {
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({ status: 'all', category: 'all', created_by: '' });
    
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();
    const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<any[]>([]);

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.email_templates;
    const canCreateTemplete = hasCustomPerms && user?.permissions?.actions?.email_templates ? !!user?.permissions?.actions?.email_templates?.create : true;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.email_templates?.edit : true;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.email_templates?.delete : true;

    useEffect(() => {
        const msg = sessionStorage.getItem('email_template_success_message');
        if (msg) {
            setSuccessMessage(msg);
            sessionStorage.removeItem('email_template_success_message');
        }
    }, []);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchEmailTemplates({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                sort_by: sortBy,
                filters: {
                    category: filters.category,
                    is_active: filters.status === 'Active' ? 'yes' : filters.status === 'Inactive' ? 'no' : 'all'
                }
            });
            setData(res.data);
            setTotal(res.total);
        } catch (err) {
            enqueueSnackbar('Failed to fetch templates', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, sortBy, filters, enqueueSnackbar]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        setIsDeleting(true);
        try {
            await deleteEmailTemplate(confirmDelete.id);
            enqueueSnackbar('Template deleted successfully', { variant: 'success' });
            await fetchTemplates();
            setConfirmDelete({ open: false, id: null });
        } catch (error: any) {
            const isLinkError = error?.message && (
                error.message.includes('LinkExistsError') ||
                error.message.includes('Cannot delete or cancel because') ||
                error.message.includes('is linked with')
            );
            if (isLinkError) {
                enqueueSnackbar('This template is currently in use and cannot be deleted. Please remove it from any linked Campaigns/Automations first.', { variant: 'error' });
            } else {
                enqueueSnackbar('Failed to delete template', { variant: 'error' });
            }
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        async function loadCategories() {
            try {
                const categoriesData = await fetchEmailTemplateCategories();
                setCategories(categoriesData);
                const map = Object.fromEntries(
                    categoriesData.map((item) => [item.name, item.category])
                );
                setCategoryMap(map);
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        }

        loadCategories();
    }, []);

    const handleCreateNew = () => router.push('/email-templates/new');

    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">Email Templates</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {canCreateTemplete && (
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon={"mingcute:add-line" as any} />}
                            onClick={handleCreateNew}
                            sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                        >
                            New Template
                        </Button>
                    )}
                </Box>
            </Stack>

            <Card>
                <EmailTemplateTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={(e) => setFilterName(e.target.value)}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={!!filterName || filters.status !== 'all' || filters.category !== 'all' || !!filters.created_by}
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
                                        <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
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
                                                        {row.template_name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 180 }}>
                                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                                        {categoryMap[row.category] || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 220 }}>
                                                    <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                                                        {row.subject || '—'}
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
                                                        <IconButton onClick={() => router.push(`/email-templates/${row.name}/view`)} sx={{ color: 'info.main' }} title="View">
                                                            <Iconify icon="solar:eye-bold" />
                                                        </IconButton>
                                                        { displayEdit && (
                                                            <IconButton onClick={() => router.push(`/email-templates/${row.name}/edit`)} sx={{ color: 'primary.main' }} title="Edit">
                                                                <Iconify icon="solar:pen-bold" />
                                                            </IconButton>
                                                        )}
                                                        
                                                        { displayDelete && (
                                                        <IconButton onClick={() => setConfirmDelete({ open: true, id: row.name })} sx={{ color: 'error.main' }} title="Delete">
                                                            <Iconify icon="solar:trash-bin-trash-bold" />
                                                        </IconButton>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {notFound && <TableNoData colSpan={6} searchQuery={filterName} />}
                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={6} sx={{ p: 0,py:5 }}>
                                                    <EmptyContent
                                                        icon="solar:letter-bold-duotone"
                                                        title="No email templates found"
                                                        description="Create and manage email templates for CRM communications here."
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
                                                        <TableCell colSpan={6} />
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

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Confirm Delete"
                content="Are you sure you want to delete this template?"
                isLoading={isDeleting}
                action={
                    <LoadingButton variant="contained" color="error" loading={isDeleting} onClick={handleConfirmDelete}>
                        Delete
                    </LoadingButton>
                }
            />

            <EmailTemplateFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={(update) => setFilters(prev => ({ ...prev, ...update }))}
                canReset={!!filterName || filters.status !== 'all' || filters.category !== 'all' || !!filters.created_by}
                onResetFilters={() => { setFilterName(''); setFilters({ status: 'all', category: 'all', created_by: '' }); }}
                categories={categories}
            />

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