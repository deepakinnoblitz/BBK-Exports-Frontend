import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    fetchHRDocumentTemplates,
    deleteHRDocumentTemplate,
    fetchHRDocumentCategories,
    HRDocumentTemplate,
} from 'src/api/hr-document-template';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';

import { useAuth } from 'src/auth/auth-context';

import { HRDocumentTemplateTableToolbar } from '../hr-document-templates-table-toolbar';
import { HRDocumentTemplateFiltersDrawer } from '../hr-document-templates-filters-drawer';

const TABLE_HEAD = [
    { id: 'template_name', label: 'Template Name', minWidth: 250 },
    { id: 'category', label: 'Category', width: 220 },
    { id: 'subject', label: 'Subject', width: 320 },
    { id: 'status', label: 'Status', align: 'center', width: 140 },
    { id: 'action', label: 'Actions', align: 'center', width: 120 },
];

export function HRDocumentTemplateListView() {
    const router = useRouter();
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.hr_document_templates;
    const canCreate = hasCustomPerms ? !!user?.permissions?.actions?.hr_document_templates?.create : true;
    const canEdit = hasCustomPerms ? !!user?.permissions?.actions?.hr_document_templates?.edit : true;
    const canDelete = hasCustomPerms ? !!user?.permissions?.actions?.hr_document_templates?.delete : true;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
        open: false,
        id: null,
    });
    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({ status: 'all', category: 'all' });

    const [data, setData] = useState<HRDocumentTemplate[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();
    const [categories, setCategories] = useState<any[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const msg = sessionStorage.getItem('hr_document_template_success_message');
        if (msg) {
            enqueueSnackbar(msg, { variant: 'success' });
            sessionStorage.removeItem('hr_document_template_success_message');
        }
    }, [enqueueSnackbar]);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchHRDocumentTemplates({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                sort_by: sortBy,
                filters: {
                    category: filters.category,
                    is_active: filters.status === 'Active' ? 'yes' : filters.status === 'Inactive' ? 'no' : 'all',
                },
            });
            setData(res.data);
            setTotal(res.total);
        } catch (err) {
            enqueueSnackbar('Failed to fetch HR document templates', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, sortBy, filters, enqueueSnackbar]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        async function loadCategories() {
            try {
                const cats = await fetchHRDocumentCategories();
                setCategories(cats);
            } catch (err) {
                console.error('Failed to load HR document categories:', err);
            }
        }
        loadCategories();
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        setIsDeleting(true);
        try {
            await deleteHRDocumentTemplate(confirmDelete.id);
            enqueueSnackbar('Template deleted successfully', { variant: 'success' });
            await fetchTemplates();
            setConfirmDelete({ open: false, id: null });
        } catch (error: any) {
            enqueueSnackbar('Failed to delete HR document template', { variant: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterName(event.target.value);
        setPage(0);
    };

    const handleSortChange = (value: string) => {
        setSortBy(value);
        setPage(0);
    };

    const handleFilters = (update: Partial<typeof filters>) => {
        setFilters((prev) => ({ ...prev, ...update }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({ status: 'all', category: 'all' });
        setFilterName('');
        setPage(0);
    };

    const canReset = filters.status !== 'all' || filters.category !== 'all' || !!filterName;
    const notFound = !loading && data.length === 0 && canReset;
    const empty = !loading && data.length === 0 && !canReset;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Document Templates
                    </Typography>
                </Stack>
                {canCreate && (
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={() => router.push('/hr-document-templates/new')}
                        sx={{
                            borderRadius: 1,
                            bgcolor: '#059669',
                            color: 'common.white',
                            '&:hover': { bgcolor: '#047857' },
                        }}
                    >
                        New Template
                    </Button>
                )}
            </Stack>

            <Card>
                <HRDocumentTemplateTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={handleFilterName}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                    onCreateNew={() => router.push('/hr-document-templates/new')}
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
                                                hover
                                                key={row.name}
                                                tabIndex={-1}
                                                sx={{
                                                    '& td, & th': {
                                                        py: 2,
                                                        borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                                    },
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
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                        {row.template_name}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell sx={{ maxWidth: 220 }}>
                                                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                        {row.category || '—'}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell sx={{ maxWidth: 280 }}>
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
                                                        {row.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                    </Box>
                                                </TableCell>

                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                        <IconButton
                                                            onClick={() =>
                                                                router.push(
                                                                    `/hr-document-templates/${encodeURIComponent(row.name)}/view`
                                                                )
                                                            }
                                                            sx={{ color: 'info.main' }}
                                                            title="View"
                                                        >
                                                            <Iconify icon="solar:eye-bold" />
                                                        </IconButton>

                                                        {canEdit && (
                                                            <IconButton
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/hr-document-templates/${encodeURIComponent(row.name)}/edit`
                                                                    )
                                                                }
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

                                        {notFound && (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ p: 0, py: 5 }}>
                                                    <EmptyContent
                                                        icon="solar:magnifer-bold-duotone"
                                                        title="No templates found"
                                                        description={
                                                            filterName
                                                                ? `No results found for "${filterName}". Try checking for typos or adjusting your search filters.`
                                                                : 'No results found for selected filters. Try adjusting your filters.'
                                                        }
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ p: 0, py: 5 }}>
                                                    <EmptyContent
                                                        icon="solar:document-text-bold-duotone"
                                                        title="No templates Found"
                                                        description="Create and manage HR document templates for employee letters and forms here."
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
                                                            height: 56,
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
                    component="div"
                    count={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Card>

            <HRDocumentTemplateFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                categories={categories}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Delete Template"
                content="Are you sure you want to delete this HR Document Template?"
                action={
                    <Button
                        variant="contained"
                        color="error"
                        loading={isDeleting}
                        onClick={handleConfirmDelete}
                    >
                        Delete
                    </Button>
                }
            />
        </DashboardContent>
    );
}
