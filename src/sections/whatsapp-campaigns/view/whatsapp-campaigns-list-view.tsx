import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { useWhatsAppCampaigns } from 'src/hooks/useWhatsAppCampaigns';

import { DashboardContent } from 'src/layouts/dashboard';
import { deleteWhatsAppCampaign } from 'src/api/whatsapp-campaign';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { TableNoData } from 'src/sections/proposal/table-no-data';
import { ProposalTableHead } from 'src/sections/proposal/proposal-table-head';
import { WhatsAppCampaignTableToolbar } from 'src/sections/whatsapp-campaigns/whatsapp-campaign-table-toolbar';

import { useAuth } from 'src/auth/auth-context';

import { WhatsAppCampaignTableRow } from '../whatsapp-campaign-table-row';
import { WhatsAppCampaignTableFiltersDrawer } from '../whatsapp-campaign-table-filters-drawer';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'campaign_name', label: 'Campaign Name' },
    { id: 'whatsapp_template', label: 'WhatsApp Template Name' },
    { id: 'target_type', label: 'Target Type' },
    { id: 'total_recipients', label: 'Total Recipients' },
    { id: 'sent_count', label: 'Sent Count' },
    { id: 'status', label: 'Status' },
    { id: 'action', label: 'Actions', align: 'center' },
];

export function WhatsAppCampaignsListView() {
    const router = useRouter();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterName, setFilterName] = useState('');
    const [sortBy, setSortBy] = useState('modified_desc');
    const [filters, setFilters] = useState({ status: 'all', target_type: 'all' });
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
    const [deleting, setDeleting] = useState(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.whatsapp_campaigns;
    const canCreateCampaign = hasCustomPerms && user?.permissions?.actions?.whatsapp_campaigns ? !!user?.permissions?.actions?.whatsapp_campaigns?.create : true;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_campaigns?.edit : true;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_campaigns?.delete : true;

    const [openFilters, setOpenFilters] = useState(false);

    const { data, total, loading, refetch } = useWhatsAppCampaigns(
        page,
        rowsPerPage,
        filterName,
        sortBy,
        filters
    );

    const handleFilters = (newFilters: any) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters({ status: 'all', target_type: 'all' });
        setFilterName('');
        setPage(0);
    };

    const canReset = filters.status !== 'all' || filters.target_type !== 'all' || !!filterName;

    const handleViewRow = (id: string) => {
        router.push(`/whatsapp-campaigns/${encodeURIComponent(id)}/view`);
    };

    const handleEditRow = (id: string) => {
        router.push(`/whatsapp-campaigns/${encodeURIComponent(id)}/edit`);
    };

    const handleDeleteRow = useCallback((id: string) => {
        setConfirmDelete({ open: true, id });
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete.id) return;
        setDeleting(true);
        try {
            await deleteWhatsAppCampaign(confirmDelete.id);
            setSnackbar({ open: true, message: 'WhatsApp Campaign deleted successfully', severity: 'success' });
            await refetch();
            setConfirmDelete({ open: false, id: null });
        } catch (e: any) {
            console.error(e);
            const isLinkError = e?.message && (
                e.message.includes('LinkExistsError') ||
                e.message.includes('Cannot delete or cancel because') ||
                e.message.includes('is linked with')
            );
            const msg = isLinkError
                ? 'This campaign is currently in use and cannot be deleted. Please remove it from any linked records first.'
                : 'Failed to delete WhatsApp Campaign';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const notFound = !loading && data.length === 0 && !!filterName;
    const empty = !loading && data.length === 0 && !filterName;

    useEffect(() => {
        const msg = sessionStorage.getItem('whatsapp_campaign_success');

        if (msg) {
            setSnackbar({
                open: true,
                message: msg,
                severity: 'success',
            });

            sessionStorage.removeItem('whatsapp_campaign_success');
        }
    }, []);

    useEffect(() => {
        const msg = sessionStorage.getItem('whatsapp_campaign_edit_success');

        if (msg) {
            setSnackbar({
                open: true,
                message: msg,
                severity: 'success',
            });

            sessionStorage.removeItem('whatsapp_campaign_edit_success');
        }
    }, []);

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h4">CRM WhatsApp Campaigns</Typography>
                {canCreateCampaign &&(
                    <Button
                        variant="contained"
                        startIcon={<Iconify icon={"mingcute:add-line" as any} />}
                        onClick={() => router.push('/whatsapp-campaigns/new')}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        New Campaign
                    </Button>
                )}
            </Stack>

            <Card>
                <WhatsAppCampaignTableToolbar
                    numSelected={0}
                    filterName={filterName}
                    onFilterName={(e) => setFilterName(e.target.value)}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onOpenFilter={() => setOpenFilters(true)}
                    canReset={canReset}
                />

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
                                        <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                            <CircularProgress sx={{ color: '#059669' }} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {data.map((row, index) => (
                                            <WhatsAppCampaignTableRow
                                                key={row.name}
                                                index={page * rowsPerPage + index}
                                                hideCheckbox
                                                row={{
                                                    id: row.name,
                                                    campaign_name: row.campaign_name,
                                                    whatsapp_template: row.whatsapp_template,
                                                    target_type: row.target_type,
                                                    total_recipients: row.total_recipients,
                                                    sent_count: row.sent_count,
                                                    status: row.status,
                                                    template_name: row.template_name,
                                                }}
                                                onView={() => handleViewRow(row.name)}
                                                onEdit={() => handleEditRow(row.name)}
                                                onDelete={() => handleDeleteRow(row.name)}
                                                canEdit = {displayEdit}
                                                canDelete = {displayDelete}
                                            />
                                        ))}

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
                                                        <TableCell colSpan={8} />
                                                    </TableRow>
                                                ))}
                                            </>
                                        )}

                                        {notFound && <TableNoData searchQuery={filterName} colSpan={8} />}

                                        {empty && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <EmptyContent
                                                        title="No WhatsApp Campaigns lists found"
                                                        description="You haven't created any WhatsApp Campaigns lists yet."
                                                        icon="solar:calendar-mark-bold-duotone"
                                                        sx={{ py: 12 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
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

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <WhatsAppCampaignTableFiltersDrawer
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
                content="Are you sure you want to delete this WhatsApp Campaign?"
                isLoading={deleting}
                action={
                    <LoadingButton onClick={handleConfirmDelete} loading={deleting} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </LoadingButton>
                }
            />
        </DashboardContent>
    );
}
