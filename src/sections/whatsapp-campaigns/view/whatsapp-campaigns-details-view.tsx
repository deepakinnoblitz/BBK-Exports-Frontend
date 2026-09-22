import dayjs from 'dayjs';
import { enqueueSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VscDebugStart, VscDebugPause, VscDebugStop } from "react-icons/vsc";
import { IoMdArrowBack, IoMdMail, IoMdCalendar, IoMdPerson, IoMdStats, IoMdCreate, IoMdTrash, IoMdList, IoMdRefresh } from "react-icons/io";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
    getWhatsAppCampaign,
    deleteWhatsAppCampaign,
    startCampaign as startWhatsAppCampaign,
    pauseCampaign as pauseWhatsAppCampaign,
    cancelCampaign as cancelWhatsAppCampaign,
    fetchWhatsAppQueue,
    WhatsAppQueueItem,
    previewRecipients
} from 'src/api/whatsapp-campaign';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

export function WhatsAppCampaignsDetailsView() {
    const { id } = useParams();
    const router = useRouter();
    const navigate = useNavigate();

    const [campaign, setCampaign] = useState<any>(null);
    const [whatsappQueue, setWhatsappQueue] = useState<WhatsAppQueueItem[]>([]);
    const [fetching, setFetching] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [recipients, setRecipients] = useState<any[]>([]);
    const [recipientsPage, setRecipientsPage] = useState(0);
    const [recipientsRowsPerPage, setRecipientsRowsPerPage] = useState(10);
    const [recipientsSearch, setRecipientsSearch] = useState('');

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.whatsapp_campaigns;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.whatsapp_campaigns?.edit : true;

    useEffect(() => {
        if (id) {
            getWhatsAppCampaign(id)
                .then(setCampaign)
                .finally(() => setFetching(false));
        }
    }, [id]);

    const handleRefresh = async () => {
        if (!id) return;
        try {
            const data = await getWhatsAppCampaign(id);
            setCampaign(data);
            enqueueSnackbar('Campaign status refreshed', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Failed to refresh campaign', { variant: 'error' });
        }
    };

    useEffect(() => {
        if (campaign?.name) {
            fetchWhatsAppQueue(campaign.name)
                .then(setWhatsappQueue)
                .catch((err) => console.error('Failed to fetch WhatsApp queue:', err));
        }
        if (campaign?.target_type) {
            const parsedFilters: any[] = Array.isArray(campaign.filters) ? campaign.filters : [];
            previewRecipients(campaign.target_type, parsedFilters)
                .then((res) => {
                    if (res && res.recipients) {
                        setRecipients(res.recipients);
                    }
                })
                .catch(err => console.error('Failed to fetch recipients:', err));
        }
    }, [campaign]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!campaign) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">WhatsApp Campaign not found</Typography>
                <Button onClick={() => router.push('/whatsapp-campaigns')} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const {
        campaign_name,
        template_name,
        whatsapp_template,
        subject,
        status,
        target_type,
        filters,
        total_recipients,
        sent_count,
        failed_count,
        schedule_date,
    } = campaign;

    const handleEdit = () => {
        router.push(`/whatsapp-campaigns/${encodeURIComponent(id || '')}/edit`);
    };

    const handleStartCampaign = async () => {
        try {
            await startWhatsAppCampaign(campaign.name);
            const updated = await getWhatsAppCampaign(campaign.name);
            setCampaign(updated);
            enqueueSnackbar('Campaign started successfully', { variant: 'success' });
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to start campaign', { variant: 'error' });
        }
    };

    const handlePauseCampaign = async () => {
        try {
            await pauseWhatsAppCampaign(campaign.name);
            const updated = await getWhatsAppCampaign(campaign.name);
            setCampaign(updated);
            enqueueSnackbar('Campaign paused', { variant: 'info' });
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to pause campaign', { variant: 'error' });
        }
    };

    const handleStopCampaign = async () => {
        try {
            await cancelWhatsAppCampaign(campaign.name);
            const updated = await getWhatsAppCampaign(campaign.name);
            setCampaign(updated);
            enqueueSnackbar('Campaign stopped', { variant: 'warning' });
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to stop campaign', { variant: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await deleteWhatsAppCampaign(id);
            router.push('/whatsapp-campaigns');
            setConfirmDeleteOpen(false);
        } catch (error: any) {
            console.error('Failed to delete WhatsApp campaign:', error);
            const isLinkError = error?.message && (
                error.message.includes('LinkExistsError') ||
                error.message.includes('Cannot delete or cancel because') ||
                error.message.includes('is linked with')
            );
            if (isLinkError) {
                enqueueSnackbar('This campaign is currently in use and cannot be deleted. Please remove it from any linked records first.', { variant: 'error' });
            } else {
                enqueueSnackbar('Failed to delete WhatsApp campaign', { variant: 'error' });
            }
        } finally {
            setDeleting(false);
        }
    };

    const filteredQueue = whatsappQueue.filter((item) => {
        const query = searchQuery.toLowerCase();
        return (
            (item.recipient_name || '').toLowerCase().includes(query) ||
            (item.recipient_phone || '').toLowerCase().includes(query) ||
            (item.status || '').toLowerCase().includes(query)
        );
    });

    const filteredRecipients = recipients.filter((item) => {
        const query = recipientsSearch.toLowerCase();
        return (
            (item.name || '').toLowerCase().includes(query) ||
            (item.phone || '').toLowerCase().includes(query)
        );
    });

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3} className="no-print">
                <Typography variant="h4">WhatsApp Campaign: {campaign_name}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => navigate(-1)}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            }
                        }}
                    >
                        Go Back
                    </Button>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleRefresh}
                        startIcon={<IoMdRefresh size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                borderColor: 'primary.main',
                            }
                        }}
                    >
                        Refresh
                    </Button>
                    {displayEdit && campaign.status !== 'Running' && campaign.status !== 'Completed' && campaign.status !== 'Cancelled' && (
                        <Button
                            variant="contained"
                            startIcon={<VscDebugStart />}
                            onClick={handleStartCampaign}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: '#36b37e',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#2f9d6c' },
                            }}
                        >
                            Start Campaign
                        </Button>
                    )}
                    {displayEdit && campaign.status === 'Running' && (
                        <Button
                            variant="contained"
                            startIcon={<VscDebugPause />}
                            onClick={handlePauseCampaign}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: '#f59e0b',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#d97706' },
                            }}
                        >
                            Pause
                        </Button>
                    )}
                    {displayEdit && campaign.status === 'Running' && (
                        <Button
                            variant="contained"
                            startIcon={<VscDebugStop />}
                            onClick={handleStopCampaign}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: '#ef4444',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#dc2626' },
                            }}
                        >
                            Stop
                        </Button>
                    )}
                    {displayEdit &&(
                        <Button
                            variant="contained"
                            onClick={handleEdit}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' }
                            }}
                        >
                            Edit
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Card sx={{ p: 4, borderRadius: 2 }}>
                <Stack spacing={4}>
                    <Box
                        sx={{
                            display: 'grid',
                            columnGap: 4,
                            rowGap: 3,
                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        }}
                    >
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                                <IoMdMail size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Campaign Details</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                                    {campaign_name}
                                </Typography>
                                <Stack spacing={1.5} sx={{ mt: 3 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100 }}>WhatsApp Template:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{template_name || whatsapp_template || '-'}</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100 }}>Subject:</Typography>
                                        <Typography variant="body2" sx={{ wordBreak: 'break-word', fontWeight: 500 }}>{subject || '-'}</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100 }}>Status:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{status || '-'}</Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>

                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                                <IoMdPerson size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Target Settings</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                                    {target_type}
                                </Typography>
                                {schedule_date && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                        Schedule: {schedule_date}
                                    </Typography>
                                )}
                                {filters && filters.length > 0 && (
                                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                                        {filters.map((filter: any, index: number) => (
                                            <Stack key={index} direction="row" spacing={1.5}>
                                                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>{filter.field_name}</Typography>
                                                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>{filter.operator}  {filter.value}</Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>

                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                                <IoMdStats size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>Campaign Stats</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="text.secondary">Total Recipients</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{total_recipients}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="text.secondary">Sent</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>{sent_count}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="text.secondary">Failed</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>{failed_count}</Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>

                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                            <IoMdPerson size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', color: 'text.secondary' }}>List of WhatsApp Recipients</Typography>
                        </Stack>
                        <Card sx={{ p: 0, mt: 2, borderRadius: 1.5, border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <OutlinedInput
                                    size="small"
                                    placeholder="Search recipient..."
                                    value={recipientsSearch}
                                    onChange={(e) => {
                                        setRecipientsSearch(e.target.value);
                                        setRecipientsPage(0);
                                    }}
                                    startAdornment={
                                        <InputAdornment position="start">
                                            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                        </InputAdornment>
                                    }
                                    sx={{ width: 320 }}
                                />
                            </Box>
                            <Scrollbar>
                                <TableContainer>
                                    <Table size="medium">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ pl: 3 }}>S.No</TableCell>
                                                <TableCell>Recipient Name</TableCell>
                                                <TableCell>Phone Number</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredRecipients.length > 0 ? (
                                                filteredRecipients.slice(recipientsPage * recipientsRowsPerPage, recipientsPage * recipientsRowsPerPage + recipientsRowsPerPage).map((item, index) => (
                                                    <TableRow key={index} hover>
                                                        <TableCell sx={{ pl: 3 }}>
                                                            <Typography
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
                                                                }}
                                                            >
                                                                {recipientsPage * recipientsRowsPerPage + index + 1}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                                                        <TableCell>{item.phone}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center">
                                                        <Typography variant="body2" color="text.secondary" sx={{ my: 3 }}>No recipients found</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Scrollbar>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={filteredRecipients.length}
                                rowsPerPage={recipientsRowsPerPage}
                                page={recipientsPage}
                                onPageChange={(_e: any, newPage: number) => setRecipientsPage(newPage)}
                                onRowsPerPageChange={(e: any) => {
                                    setRecipientsRowsPerPage(parseInt(e.target.value, 10));
                                    setRecipientsPage(0);
                                }}
                            />
                        </Card>
                    </Stack>

                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#059669' }}>
                            <IoMdList size={20} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', color: 'text.secondary' }}>List of WhatsApp Sends</Typography>
                        </Stack>
                        <Card sx={{ p: 0, mt: 2, borderRadius: 1.5, border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}` }}>
                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <OutlinedInput
                                    size="small"
                                    placeholder="Search recipient..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setPage(0);
                                    }}
                                    startAdornment={
                                        <InputAdornment position="start">
                                            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                        </InputAdornment>
                                    }
                                    sx={{ width: 320 }}
                                />
                            </Box>
                            <Scrollbar>
                                <TableContainer>
                                    <Table size="medium">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ pl: 3 }}>S.No</TableCell>
                                                <TableCell>Recipient Name</TableCell>
                                                <TableCell>Phone Number</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Sent On</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredQueue.length > 0 ? (
                                                filteredQueue.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, index) => (
                                                    <TableRow key={item.name || index} hover>
                                                        <TableCell sx={{ pl: 3 }}>
                                                            <Typography
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
                                                                }}
                                                            >
                                                                {page * rowsPerPage + index + 1}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>{item.recipient_name}</TableCell>
                                                        <TableCell>{item.recipient_phone}</TableCell>
                                                        <TableCell>
                                                            <Label
                                                                sx={{
                                                                    textTransform: 'uppercase',
                                                                    fontWeight: 600,
                                                                    fontSize: 10,
                                                                    ...(item.status === 'Sent' && { color: 'success.main', bgcolor: 'success.lighter' }),
                                                                    ...(item.status === 'Failed' && { color: 'error.main', bgcolor: 'error.lighter' }),
                                                                    ...(item.status === 'Pending' && { color: 'warning.main', bgcolor: 'warning.lighter' }),
                                                                }}
                                                            >
                                                                {item.status}
                                                            </Label>
                                                        </TableCell>
                                                        <TableCell>{item.sent_on ? dayjs(item.sent_on).format('DD-MM-YYYY hh:mm A') : '-'}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center">
                                                        <Typography variant="body2" color="text.secondary" sx={{ my: 3 }}>No WhatsApp sends found</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Scrollbar>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={filteredQueue.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(_e: any, newPage: number) => setPage(newPage)}
                                onRowsPerPageChange={(e: any) => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                            />
                        </Card>
                    </Stack>
                </Stack>
            </Card>

            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                title="Confirm Delete"
                content="Are you sure you want to delete this WhatsApp Campaign?"
                isLoading={deleting}
                action={
                    <LoadingButton
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        loading={deleting}
                        sx={{ borderRadius: 1.5, minWidth: 100 }}
                    >
                        Delete
                    </LoadingButton>
                }
            />
        </DashboardContent>
    );
}
