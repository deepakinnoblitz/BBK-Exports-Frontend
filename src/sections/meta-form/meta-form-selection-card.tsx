import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { getConnectedMetaForms, toggleMetaFormConnection } from 'src/api/meta-app';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';
import { MetaSyncWizardDialog } from 'src/sections/meta-app/meta-sync-wizard-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'form_name', label: 'Form Name' },
    { id: 'form_id', label: 'Form ID', width: 200 },
    { id: 'form_status', label: 'Status', align: 'center' as const },
    { id: 'is_active', label: 'Lead Sync', align: 'center' as const },
    { id: 'action', label: 'Actions', align: 'center' as const, width: 180 },
];

type MetaFormSelectionCardProps = {
    isConnectedPage: boolean;
};

export function MetaFormSelectionCard({ isConnectedPage }: MetaFormSelectionCardProps) {
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [forms, setForms] = useState<any[]>([]);

    const [filterName, setFilterName] = useState('');
    const [selectedPageName, setSelectedPageName] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const loadForms = useCallback(async () => {
        if (!isConnectedPage) {
            setForms([]);
            return;
        }
        setLoading(true);
        try {
            const res = await getConnectedMetaForms(selectedPageName || undefined);
            if (res?.forms) {
                setForms(res.forms);
            }
        } catch (err: any) {
            console.error('Failed to fetch Meta Forms:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedPageName, isConnectedPage]);

    useEffect(() => {
        loadForms();
    }, [loadForms]);


    const handleToggleForm = async (formName: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus;
        try {
            setForms((prev) =>
                prev.map((f) => (f.name === formName ? { ...f, is_active: nextStatus ? 1 : 0 } : f))
            );
            await toggleMetaFormConnection(formName, nextStatus);
            enqueueSnackbar(`Form ${nextStatus ? 'enabled' : 'disabled'} for lead sync`, { variant: 'success' });
        } catch (err: any) {
            console.error('Failed to toggle form:', err);
            enqueueSnackbar(err?.message || 'Failed to update form status', { variant: 'error' });
            loadForms();
        }
    };

    const filteredForms = forms.filter((item) => {
        if (!filterName) return true;
        const searchLower = filterName.toLowerCase().trim();
        const formNameMatch = item.form_name?.toLowerCase().includes(searchLower);
        const formIdMatch = item.form_id?.toString().toLowerCase().includes(searchLower);
        return formNameMatch || formIdMatch;
    });

    const notFound = !loading && filteredForms.length === 0 && !!filterName;
    const paginatedForms = filteredForms.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    useEffect(() => {
        if (page > 0 && page * rowsPerPage >= filteredForms.length) {
            setPage(0);
        }
    }, [filteredForms.length, page, rowsPerPage]);

    if (!isConnectedPage) {
        return null;
    }

    return (
        <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Stack spacing={0.5}>
                    <Typography variant="h6">Discovered Lead Ad Instant Forms</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Choose which Instant Forms should automatically import leads into CRM.
                    </Typography>
                </Stack>

                <Button
                    variant="contained"
                    onClick={() => setWizardOpen(true)}
                    startIcon={<Iconify icon={"mingcute:refresh-1-line" as any} sx={{ width: 18, height: 18 }}/>}
                    sx={{
                        bgcolor: '#1877F2',
                        color: '#ffffff',
                        fontWeight: 700,
                        px: 2,
                        py: 1,
                        borderRadius: 1.5,
                        fontSize: 13,
                        '&:hover': { bgcolor: '#166fe5' },
                    }}
                >
                    Sync Lead Forms
                </Button>
            </Stack>

            {forms.length > 0 && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <OutlinedInput
                        value={filterName}
                        onChange={(e) => {
                            setFilterName(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Search forms by name or ID..."
                        startAdornment={
                            <InputAdornment position="start">
                                <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                        }
                        sx={{ maxWidth: 360, width: 1, height: 50 }}
                    />
                </Stack>
            )}

            {loading ? (
                <Stack alignItems="center" py={4}>
                    <CircularProgress size={28} />
                </Stack>
            ) : forms.length === 0 ? (
                <Stack alignItems="center" py={4} spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        No Instant Forms discovered for this Facebook Page yet. Click &quot;Sync Lead Forms&quot; to fetch active forms.
                    </Typography>
                </Stack>
            ) : (
                <>
                    <Scrollbar>
                        <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
                            <Table sx={{ minWidth: 720 }}>
                                <ProposalTableHead
                                    rowCount={filteredForms.length}
                                    numSelected={0}
                                    onSelectAllRows={() => { }}
                                    hideCheckbox
                                    showIndex
                                    headLabel={TABLE_HEAD}
                                />
                                <TableBody>
                                    {paginatedForms.map((row, index) => (
                                        <TableRow
                                            key={row.name}
                                            hover
                                            tabIndex={-1}
                                            sx={{
                                                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                                                '&:last-child td, &:last-child th': { borderBottom: 0 },
                                            }}
                                        >
                                            {/* S.No / Row index */}
                                            <TableCell align="center">
                                                <Box
                                                    sx={{
                                                        width: 28,
                                                        height: 28,
                                                        display: 'flex',
                                                        borderRadius: '50%',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                                                        color: 'primary.main',
                                                        typography: 'subtitle2',
                                                        fontWeight: 800,
                                                        border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.16)}`,
                                                        mx: 'auto',
                                                    }}
                                                >
                                                    {page * rowsPerPage + index + 1}
                                                </Box>
                                            </TableCell>

                                            {/* Form Name */}
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
                                                            bgcolor: (t) => alpha('#1877F2', 0.08),
                                                            color: '#1877F2',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Iconify icon={"logos:meta-icon" as any} width={22} />
                                                    </Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {row.form_name}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>

                                            {/* Form ID */}
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
                                                    {row.form_id || '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* Status */}
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
                                                        ...(row.form_status === 'ACTIVE'
                                                            ? {
                                                                bgcolor: 'rgba(34, 197, 94, 0.15)',
                                                                border: '1px solid rgba(34, 197, 94, 0.35)',
                                                                color: '#15803d',
                                                            }
                                                            : {
                                                                bgcolor: 'rgba(239, 68, 68, 0.15)',
                                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                                color: '#b91c1c',
                                                            }),
                                                    }}
                                                >
                                                    {row.form_status || 'ACTIVE'}
                                                </Box>
                                            </TableCell>

                                            {/* Lead Sync */}
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
                                                                bgcolor: 'rgba(239, 68, 68, 0.15)',
                                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                                color: '#b91c1c',
                                                            }),
                                                    }}
                                                >
                                                    {row.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                </Box>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell align="center">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    startIcon={<Iconify icon={"solar:pen-bold" as any} sx={{ width: 16, height: 16 }}/>}
                                                    onClick={() => router.push(`/lead-integration/meta-forms/${encodeURIComponent(row.name)}/edit?from=account`)}
                                                    sx={{
                                                        bgcolor: '#00ab71',
                                                        color: '#ffffff',
                                                        fontWeight: 700,
                                                        whiteSpace: 'nowrap',
                                                        px: 2,
                                                        py: 0.75,
                                                        borderRadius: 1.5,
                                                        fontSize: 12,
                                                        '&:hover': { bgcolor: '#00ab71' },
                                                    }}
                                                >
                                                    Mapping & Rules
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {notFound && <TableNoData colSpan={7} searchQuery={filterName} />}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Scrollbar>

                    <TablePagination
                        component="div"
                        count={filteredForms.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25]}
                    />
                </>
            )}

            <MetaSyncWizardDialog
                open={wizardOpen}
                initialStep={2}
                onClose={() => setWizardOpen(false)}
                onSuccess={() => loadForms()}
            />
        </Card>
    );
}
