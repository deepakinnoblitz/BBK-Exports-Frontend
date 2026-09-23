import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchHRDocumentTemplates } from 'src/api/hr-document-template';
import {
    fetchHRDocumentGenerations,
    deleteHRDocumentGeneration,
    HRDocumentGeneration,
} from 'src/api/hr-document-generation';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';

import { HRDocumentGenerationTableToolbar } from '../hr-document-generation-table-toolbar';
import { HRDocumentGenerationFiltersDrawer } from '../hr-document-generation-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'employee_name', label: 'Employee', minWidth: 220 },
    { id: 'document_template', label: 'Document Template', width: 200 },
    { id: 'document_type', label: 'Document Type', width: 180 },
    { id: 'generated_on', label: 'Generated On', width: 220 },
    { id: 'status', label: 'Status', align: 'center', width: 160 },
    { id: 'action', label: 'Actions', align: 'center', width: 120 },
];

const getStatusStyle = (status?: string) => {
    switch (status) {
        case 'Generated':
            return {
                bgcolor: 'rgba(34, 197, 94, 0.25)',
                border: '1px solid rgba(34, 197, 94, 0.45)',
                color: '#15803d',
            };
        case 'Printed':
            return {
                bgcolor: 'rgba(59, 130, 246, 0.25)',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                color: '#1d4ed8',
            };
        case 'Cancelled':
            return {
                bgcolor: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#b91c1c',
            };
        case 'Draft':
        default:
            return {
                bgcolor: 'rgba(156, 163, 175, 0.25)',
                border: '1px solid rgba(156, 163, 175, 0.45)',
                color: '#374151',
            };
    }
};

export function HRDocumentGenerationListView() {
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
        open: false,
        id: null,
    });
    const [openFilters, setOpenFilters] = useState(false);
    const [filters, setFilters] = useState({ status: 'all', document_template: 'all' });

    const [data, setData] = useState<HRDocumentGeneration[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();
    const [templates, setTemplates] = useState<any[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const msg = sessionStorage.getItem('hr_document_generation_success_message');
        if (msg) {
            setSuccessMessage(msg);
            sessionStorage.removeItem('hr_document_generation_success_message');
        }
    }, []);

    const fetchGenerations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchHRDocumentGenerations({
                page: page + 1,
                page_size: rowsPerPage,
                search: filterName,
                sort_by: sortBy,
                filters: {
                    document_template: filters.document_template,
                    status: filters.status,
                },
            });
            setData(res.data);
            setTotal(res.total);
        } catch (err) {
            enqueueSnackbar('Failed to fetch HR document generations', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterName, sortBy, filters, enqueueSnackbar]);

    useEffect(() => {
        fetchGenerations();
    }, [fetchGenerations]);

    useEffect(() => {
        async function loadTemplates() {
            try {
                const res = await fetchHRDocumentTemplates({ page: 1, page_size: 100 });
                setTemplates(res.data);
            } catch (err) {
                console.error('Failed to load templates:', err);
            }
        }
        loadTemplates();
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        setIsDeleting(true);
        try {
            await deleteHRDocumentGeneration(confirmDelete.id);
            setSuccessMessage('Document deleted successfully');
            await fetchGenerations();
            setConfirmDelete({ open: false, id: null });
        } catch (error: any) {
            enqueueSnackbar('Failed to delete document', { variant: 'error' });
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
        setFilters({ status: 'all', document_template: 'all' });
        setFilterName('');
        setPage(0);
    };

    const canReset = filters.status !== 'all' || filters.document_template !== 'all' || !!filterName;
    const notFound = !loading && data.length === 0 && canReset;
    const empty = !loading && data.length === 0 && !canReset;

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Document Generation
                    </Typography>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={() => router.push('/hr-document-generation/new')}
                    sx={{
                        borderRadius: 1,
                        bgcolor: '#059669',
                        color: 'common.white',
                        '&:hover': { bgcolor: '#047857' },
                    }}
                >
                    New Document
                </Button>
            </Stack>

            <Card>
                <HRDocumentGenerationTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={handleFilterName}
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
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
                                                    <Box>
                                                        <Typography variant="subtitle2" noWrap sx={{ textTransform: 'capitalize', fontWeight: 700 }}>
                                                            {row.employee_name || '—'}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                                                            {row.employee || '—'}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>

                                                <TableCell sx={{ maxWidth: 220 }}>
                                                    <Typography variant="body2" noWrap sx={{ color: 'text.primary' }}>
                                                        {row.document_template || '—'}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell sx={{ maxWidth: 180 }}>
                                                    <Typography variant="body2" noWrap sx={{ color: 'text.primary' }}>
                                                        {row.document_type || '—'}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell sx={{ minWidth: 200 }}>
                                                    <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                                                        {(row.generated_on || row.creation) ? fDateTime(row.generated_on || row.creation, 'DD-MM-YYYY hh:mm:ss A') : '—'}
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
                                                            ...getStatusStyle(row.status),
                                                        }}
                                                    >
                                                        {row.status ? row.status.toUpperCase() : 'DRAFT'}
                                                    </Box>
                                                </TableCell>

                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                        <IconButton
                                                            onClick={() =>
                                                                router.push(
                                                                    `/hr-document-generation/${encodeURIComponent(row.name)}/view`
                                                                )
                                                            }
                                                            sx={{ color: 'info.main' }}
                                                            title="View"
                                                        >
                                                            <Iconify icon="solar:eye-bold" />
                                                        </IconButton>

                                                        <IconButton
                                                            onClick={() =>
                                                                router.push(
                                                                    `/hr-document-generation/${encodeURIComponent(row.name)}/edit`
                                                                )
                                                            }
                                                            sx={{ color: 'primary.main' }}
                                                            title="Edit"
                                                        >
                                                            <Iconify icon="solar:pen-bold" />
                                                        </IconButton>

                                                        <IconButton
                                                            onClick={() => setConfirmDelete({ open: true, id: row.name })}
                                                            sx={{ color: 'error.main' }}
                                                            title="Delete"
                                                        >
                                                            <Iconify icon="solar:trash-bin-trash-bold" />
                                                        </IconButton>
                                                    </Box>
                                                </TableCell>

                                            </TableRow>
                                        ))}

                                        {notFound && (
                                            <TableRow>
                                                <TableCell colSpan={6} sx={{ p: 0, py: 5 }}>
                                                    <EmptyContent
                                                        icon="solar:magnifer-bold-duotone"
                                                        title="No documents found"
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
                                                <TableCell colSpan={6} sx={{ p: 0, py: 5 }}>
                                                    <EmptyContent
                                                        icon="solar:document-text-bold-duotone"
                                                        title="No documents Found"
                                                        description="Generated HR documents for employees will appear here."
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

            <HRDocumentGenerationFiltersDrawer
                open={openFilters}
                onOpen={() => setOpenFilters(true)}
                onClose={() => setOpenFilters(false)}
                filters={filters}
                onFilters={handleFilters}
                canReset={canReset}
                onResetFilters={handleResetFilters}
                templates={templates}
            />

            <ConfirmDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null })}
                title="Delete Document"
                content="Are you sure you want to delete this Document Generation record?"
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
