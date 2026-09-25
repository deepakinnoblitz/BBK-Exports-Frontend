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
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { getConnectedMetaPages } from 'src/api/meta-app';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';
import { MetaSyncWizardDialog } from 'src/sections/meta-app/meta-sync-wizard-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'page_name', label: 'Page Name' },
    { id: 'page_id', label: 'Page ID', width: 220 },
    { id: 'is_active', label: 'Active', align: 'center' as const },
    { id: 'is_connected_state', label: 'Connected', align: 'center' as const },
    { id: 'subscription_status', label: 'Webhook Subscription', align: 'center' as const },
    { id: 'is_connected', label: 'Sync Status', align: 'center' as const },
    { id: 'action', label: 'Actions', align: 'center' as const, width: 140 },
];

type MetaPageSelectionCardProps = {
    accountName?: string | null;
    isConnectedAccount: boolean;
    onRefresh?: () => void;
    refreshSignal?: number;
    autoOpenWizard?: boolean;
    onCloseAutoWizard?: () => void;
};

export function MetaPageSelectionCard({
    accountName,
    isConnectedAccount,
    onRefresh,
    refreshSignal,
    autoOpenWizard,
    onCloseAutoWizard,
}: MetaPageSelectionCardProps) {
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);

    useEffect(() => {
        if (autoOpenWizard) {
            setWizardOpen(true);
        }
    }, [autoOpenWizard]);

    const handleCloseWizard = () => {
        setWizardOpen(false);
        if (onCloseAutoWizard) onCloseAutoWizard();
    };
    const [pages, setPages] = useState<any[]>([]);

    const [filterName, setFilterName] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // Initial load: read from DB (fast, no Graph API call)
    const loadPages = useCallback(async () => {
        if (!isConnectedAccount) {
            setPages([]);
            return;
        }
        setLoading(true);
        try {
            const res = await getConnectedMetaPages(accountName || undefined);
            if (res?.pages) {
                setPages(res.pages);
            }
        } catch (err: any) {
            console.error('Failed to load connected pages:', err);
        } finally {
            setLoading(false);
        }
    }, [accountName, isConnectedAccount]);

    useEffect(() => {
        loadPages();
    }, [loadPages, refreshSignal]);

    const handleWizardSuccess = (importedPagesCount: number, importedFormsCount: number) => {
        enqueueSnackbar(
            `Imported ${importedPagesCount} Page${importedPagesCount === 1 ? '' : 's'} and ${importedFormsCount} Form${importedFormsCount === 1 ? '' : 's'} successfully`,
            { variant: 'success' }
        );
        loadPages();
        if (onRefresh) onRefresh();
    };

    const filteredPages = pages.filter((item) => {
        if (!filterName) return true;
        const searchLower = filterName.toLowerCase().trim();
        const pageNameMatch = item.page_name?.toLowerCase().includes(searchLower);
        const pageIdMatch = item.page_id?.toString().toLowerCase().includes(searchLower);
        return pageNameMatch || pageIdMatch;
    });

    const notFound = !loading && filteredPages.length === 0 && !!filterName;
    const paginatedPages = filteredPages.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    useEffect(() => {
        if (page > 0 && page * rowsPerPage >= filteredPages.length) {
            setPage(0);
        }
    }, [filteredPages.length, page, rowsPerPage]);

    if (!isConnectedAccount) {
        return null;
    }

    return (
        <Card sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Stack spacing={0.5}>
                    <Typography variant="h6">Connected Facebook Pages</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Select the Facebook Pages you want to receive Lead Ad submissions from.
                    </Typography>
                </Stack>

                <Button
                    variant="contained"
                    onClick={() => setWizardOpen(true)}
                    startIcon={<Iconify icon={"mingcute:refresh-1-line" as any} sx={{ width: 18, height: 18 }} />}
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
                    Sync Facebook Pages
                </Button>
            </Stack>

            {pages.length > 0 && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <OutlinedInput
                        value={filterName}
                        onChange={(e) => {
                            setFilterName(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Search pages by name or ID..."
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
            ) : pages.length === 0 ? (
                <Stack alignItems="center" py={4} spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        No Facebook Pages discovered yet. Click &quot;Sync Facebook Pages&quot; to fetch your pages.
                    </Typography>
                </Stack>
            ) : (
                <>
                    <Scrollbar>
                        <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
                            <Table sx={{ minWidth: 720 }}>
                                <ProposalTableHead
                                    rowCount={filteredPages.length}
                                    numSelected={0}
                                    onSelectAllRows={() => { }}
                                    hideCheckbox
                                    showIndex
                                    headLabel={TABLE_HEAD}
                                />
                                <TableBody>
                                    {paginatedPages.map((row, index) => (
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

                                            {/* Page Name */}
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
                                                        {row.page_name}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>

                                            {/* Page ID */}
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
                                                    {row.page_id || '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* Active */}
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
                                                    {row.is_active ? 'Active' : 'Inactive'}
                                                </Box>
                                            </TableCell>

                                            {/* Connected */}
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
                                                        ...(row.is_connected
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
                                                    {row.is_connected ? 'Connected' : 'Disconnected'}
                                                </Box>
                                            </TableCell>

                                            {/* Webhook Subscription Status */}
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
                                                        ...(row.subscription_status === 'Subscribed' || row.is_connected
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
                                                    {row.subscription_status || (row.is_connected ? 'Subscribed' : 'Failed')}
                                                </Box>
                                            </TableCell>

                                            {/* Sync Status */}
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
                                                        ...(row.is_connected
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
                                                    {row.is_connected ? 'Active' : 'Inactive'}
                                                </Box>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                    <IconButton
                                                        onClick={() => router.push(`/lead-integration/meta-pages/${encodeURIComponent(row.name)}/edit`)}
                                                        sx={{ color: 'primary.main' }}
                                                        title="Edit"
                                                    >
                                                        <Iconify icon="solar:pen-bold" />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {notFound && <TableNoData colSpan={8} searchQuery={filterName} />}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Scrollbar>

                    <TablePagination
                        component="div"
                        count={filteredPages.length}
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
                onClose={handleCloseWizard}
                accountName={accountName}
                onSuccess={handleWizardSuccess}
            />
        </Card>
    );
}
