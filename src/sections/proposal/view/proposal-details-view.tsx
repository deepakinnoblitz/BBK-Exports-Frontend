import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { IoMdCreate , IoMdArrowBack } from "react-icons/io";
import {
    HiOutlineUser,
    HiOutlineClock,
    HiOutlineCalendar,
    HiOutlinePaperClip,
    HiOutlineCheckCircle,
    HiOutlineDocumentText,
    HiOutlineBuildingOffice,
} from 'react-icons/hi2';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import Backdrop from '@mui/material/Backdrop';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { handleDownload, handleDirectPrint } from 'src/utils/print';

import { getDoc } from 'src/api/leads';
import { getAccount } from 'src/api/accounts';
import { DashboardContent } from 'src/layouts/dashboard';
import { getProposal, updateProposal, getProposalPrintUrl } from 'src/api/proposal';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['Draft', 'Sent', 'Approved', 'Rejected', 'Expired'];

const getClipPath = (index: number, total: number) => {
    if (index === 0) {
        return 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 6px calc(100% - 1px), 3px calc(100% - 3px), 1px calc(100% - 6px), 0 calc(100% - 12px), 0 12px, 1px 6px, 3px 3px, 6px 1px)';
    }
    if (index === total - 1) {
        return 'polygon(0 0, calc(100% - 12px) 0, calc(100% - 6px) 1px, calc(100% - 3px) 3px, calc(100% - 1px) 6px, 100% 12px, 100% calc(100% - 12px), calc(100% - 1px) calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) calc(100% - 1px), calc(100% - 12px) 100%, 0 100%, 12px 50%)';
    }
    return 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)';
};

const STATUS_COLORS: Record<string, any> = {
    Draft: 'default',
    Sent: 'info',
    Approved: 'success',
    Rejected: 'error',
    Expired: 'warning',
};

// ----------------------------------------------------------------------

export function ProposalDetailsView() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const location = useLocation();
    const theme = useTheme();

    const backUrl = location.state?.from || '/proposals';
    const backState = location.state?.filters
        ? { filters: location.state.filters }
        : (location.state?.parentState
            ? { ...location.state.parentState, leadTab: location.state.leadTab }
            : (location.state?.leadTab ? { leadTab: location.state.leadTab } : undefined));

    const [proposal, setProposal] = useState<any>(null);
    const [ownerDetails, setOwnerDetails] = useState<{ full_name: string; email: string } | null>(null);
    const [billingAccountName, setBillingAccountName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);
    const [viewAttachment, setViewAttachment] = useState<any>(null);

    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [confirmStatusUpdate, setConfirmStatusUpdate] = useState(false);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

    const decodedId = decodeURIComponent(id || '');

    const { user } = useAuth();

    const proposalPerms = user?.permissions?.actions?.proposal;
    const hasCustomLead = !!user?.permissions?.custom_permissions_assigned && !!proposalPerms;
    const canEditProposal = hasCustomLead ? !!proposalPerms?.edit : true;

    useEffect(() => {
        if (id) {
            setLoading(true);
            getProposal(decodedId)
                .then(async (data) => {
                    setProposal(data);
                    setSelectedStatus(data.status || 'Draft');

                    const ownerUserId = (data as any).owner_name || (data as any).owner || data.created_by;
                    if (ownerUserId) {
                        try {
                            const userDoc = await getDoc("User", ownerUserId);
                            setOwnerDetails({
                                full_name: userDoc.full_name || userDoc.first_name || ownerUserId,
                                email: userDoc.email || ownerUserId,
                            });
                        } catch (e) {
                            console.error("Failed to fetch proposal owner user doc:", e);
                            setOwnerDetails(null);
                        }
                    }

                    if (data.company_name) {
                        try {
                            const accountData = await getAccount(data.company_name);
                            if (accountData && accountData.account_name) {
                                setBillingAccountName(accountData.account_name);
                            }
                        } catch (err) {
                            console.error('Failed to fetch account info:', err);
                        }
                    }
                })
                .catch((err) => console.error('Failed to fetch proposal:', err))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleUpdateStatus = useCallback(async () => {
        if (!proposal || !selectedStatus || selectedStatus === proposal.status) return;
        const prev = proposal.status;
        setConfirmStatusUpdate(false);
        setUpdatingStatus(true);
        try {
            await updateProposal(decodedId, { status: selectedStatus as any });
            const updated = await getProposal(decodedId);
            setProposal(updated);
            setSnackbar({
                open: true,
                message: `Status updated from "${prev}" to "${selectedStatus}"`,
                severity: 'success',
            });
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message || 'Failed to update status', severity: 'error' });
            setSelectedStatus(proposal.status || 'Draft');
        } finally {
            setUpdatingStatus(false);
        }
    }, [proposal, selectedStatus, decodedId]);

    const handlePrint = () => {
        handleDownload(
            getProposalPrintUrl(decodedId),
            `${proposal?.reference_no || decodedId}.pdf`,
            () => setPrinting(true),
            () => setPrinting(false)
        );
    };

    const handlePreview = () => {
        handleDirectPrint(
            getProposalPrintUrl(decodedId),
            () => setPrinting(true),
            () => setPrinting(false)
        );
    };

    if (loading) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!proposal) {
        return (
            <DashboardContent maxWidth={false}>
                <Box sx={{ py: 20, textAlign: 'center' }}>
                    <Iconify icon={'solar:ghost-bold' as any} width={80} sx={{ color: 'text.disabled', mb: 3 }} />
                    <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                        Proposal Not Found
                    </Typography>
                    <Button onClick={() => router.push(backUrl, backState)} sx={{ mt: 3 }} variant="contained">
                        Go back to proposals
                    </Button>
                </Box>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={2}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Proposal: {proposal.name}
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push(backUrl, backState)}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Go Back
                    </Button>
                    {canEditProposal &&(
                        <Button
                            variant="contained"
                            onClick={() => router.push(`/proposals/${encodeURIComponent(decodedId)}/edit`)}
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

            {/* Status Pipeline */}
            <Card sx={{ mb: 3, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 2, borderRadius: 2 }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    overflowX: 'auto',
                    flexGrow: 1,
                    py: 0.5,
                    px: 0.5,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                }}>
                    {STATUS_OPTIONS.map((stage, index) => {
                        const activeIndex = STATUS_OPTIONS.indexOf(selectedStatus);
                        const isCompleted = index < activeIndex;
                        const isActive = index === activeIndex;
                        const isPending = index > activeIndex;

                        return (
                            <Box
                                key={stage}
                                onClick={() => setSelectedStatus(stage)}
                                sx={{
                                    height: 50,
                                    display: 'flex',
                                    flex: '1 1 0',
                                    minWidth: { xs: 125, md: 110 },
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pl: index === 0 ? 3 : 4.5,
                                    pr: index === STATUS_OPTIONS.length - 1 ? 3 : 2,
                                    ml: index === 0 ? 0 : '-10px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    clipPath: getClipPath(index, STATUS_OPTIONS.length),
                                    bgcolor: isCompleted
                                        ? '#22c55e'
                                        : isActive
                                            ? '#2081C3'
                                            : (themeVar) => themeVar.palette.mode === 'dark' ? alpha(themeVar.palette.grey[700], 0.4) : '#f4f6f8',
                                    color: isCompleted || isActive
                                        ? 'common.white'
                                        : (themeVar) => themeVar.palette.mode === 'dark' ? 'text.secondary' : '#4c545a',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    zIndex: STATUS_OPTIONS.length - index,
                                    '&:hover': {
                                        opacity: 0.92,
                                    }
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1.2} sx={{ zIndex: 1 }}>
                                    {isCompleted && (
                                        <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'common.white' }} />
                                    )}
                                    {isActive && (
                                        <Iconify icon={"solar:stop-circle-bold" as any} width={18} sx={{ color: 'common.white' }} />
                                    )}
                                    {isPending && (
                                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: 'currentColor', opacity: 0.6 }} />
                                    )}
                                    <Stack spacing={0.2} sx={{ textAlign: 'left' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: 12, md: 13 }, lineHeight: 1.2 }}>
                                            {stage}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 10, opacity: 0.8, lineHeight: 1.1 }}>
                                            {isCompleted ? 'Completed' : isActive ? 'Current' : 'Pending'}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        );
                    })}
                </Box>
                {canEditProposal &&(
                <Button
                    variant="contained"
                    disabled={!selectedStatus || selectedStatus === proposal.status || updatingStatus}
                    onClick={() => setConfirmStatusUpdate(true)}
                    sx={{
                        height: 36,
                        px: 3,
                        borderRadius: 1.5,
                        fontWeight: 700,
                        textTransform: 'none',
                        bgcolor: '#2081C3',
                        color: 'common.white',
                        minWidth: 130,
                        '&:hover': { bgcolor: '#1a699f' },
                        '&:disabled': { bgcolor: 'action.disabledBackground', color: 'text.disabled' }
                    }}
                >
                    {updatingStatus ? <CircularProgress size={20} color="inherit" /> : 'Update Status'}
                </Button>
                )}
            </Card>

            <Card sx={{ overflow: 'hidden', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Sidebar */}
                    <Box
                        sx={{
                            width: { xs: '100%', md: 320 },
                            flexShrink: 0,
                            borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
                            borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
                            bgcolor: alpha(theme.palette.grey[500], 0.02),
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Scrollbar sx={{ p: 4, flexGrow: 1, height: 1 }}>
                            <Stack spacing={5}>
                                {/* Identity */}
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                                        {proposal.proposal_title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        {proposal.reference_no}
                                    </Typography>
                                </Box>

                                <Divider sx={{ borderStyle: 'dashed' }} />

                                {/* Proposal Info */}
                                <Box>
                                    <SectionHeader title="Proposal Information" />
                                    <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                                        <DetailItem label="Lead" value={proposal.lead_name || proposal.lead} subValue={proposal.lead} icon={<HiOutlineUser size={20} />} />
                                        <DetailItem label="Company Name" value={billingAccountName || proposal.company_name || '—'} subValue={billingAccountName ? proposal.company_name : undefined} icon={<HiOutlineBuildingOffice size={20} />} />
                                        <DetailItem label="Proposal Date" value={fDate(proposal.proposal_date)} icon={<HiOutlineCalendar size={20} />} />
                                        {proposal.valid_until && (
                                            <DetailItem label="Valid Until" value={fDate(proposal.valid_until)} icon={<HiOutlineClock size={20} />} />
                                        )}
                                        {proposal.prospect && (
                                            <DetailItem label="Prospect" value={proposal.prospect} icon={<HiOutlineDocumentText size={20} />} />
                                        )}
                                        {proposal.subject && (
                                            <DetailItem label="Subject" value={proposal.subject} icon={<HiOutlineCheckCircle size={20} />} />
                                        )}
                                        <DetailItem label="Total Attachments" value={String(proposal.total_attachments || 0)} icon={<HiOutlinePaperClip size={20} />} />
                                        <DetailItem
                                            label="Proposal Owner"
                                            value={ownerDetails?.full_name || proposal.owner_name || proposal.owner || proposal.created_by || '—'}
                                            subValue={ownerDetails?.email || (proposal.owner && proposal.owner.includes('@') ? proposal.owner : (proposal.created_by && proposal.created_by.includes('@') ? proposal.created_by : null))}
                                            icon={<HiOutlineUser size={20} />}
                                        />
                                    </Stack>
                                </Box>

                                {/* Sync Info */}
                                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.04), border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.1)}` }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
                                        Last Modified:
                                    </Typography>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                                        {proposal.modified ? new Date(proposal.modified).toLocaleString() : '—'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Scrollbar>
                    </Box>

                    {/* Main Content */}
                    <Box sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
                        <Stack spacing={4}>
                            {/* Description */}
                            {proposal.description && (
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                                        Description
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 3,
                                            borderRadius: 2,
                                            bgcolor: 'rgb(222 242 255 / 20%)',
                                            border: (t) => `1px solid ${t.palette.divider}`,
                                        }}
                                        dangerouslySetInnerHTML={{ __html: proposal.description }}
                                    />
                                </Box>
                            )}

                            {/* Terms & Conditions */}
                            {proposal.terms_and_conditions && (
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                                        Terms & Conditions
                                    </Typography>
                                    <Box
                                        sx={{
                                            p: 3,
                                            borderRadius: 2,
                                            bgcolor: 'rgb(222 242 255 / 20%)',
                                            border: (t) => `1px solid ${t.palette.divider}`,
                                        }}
                                        dangerouslySetInnerHTML={{ __html: proposal.terms_and_conditions }}
                                    />
                                </Box>
                            )}

                            {/* Attachments Table */}
                            <Box>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Attachments
                                        <Chip label={proposal.total_attachments || 0} size="small" sx={{ ml: 1, fontWeight: 700 }} color="primary" />
                                    </Typography>
                                </Stack>

                                {proposal.attachments_table && proposal.attachments_table.length > 0 ? (
                                    <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5 }}>
                                        <Table>
                                            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.08), '& th': { fontWeight: 700, fontSize: 13 } }}>
                                                <TableRow>
                                                    <TableCell width={50} align="center">S.No</TableCell>
                                                    <TableCell>File Name</TableCell>
                                                    <TableCell>Description</TableCell>
                                                    <TableCell>File Size</TableCell>
                                                    <TableCell>Uploaded On</TableCell>
                                                    <TableCell>Uploaded By</TableCell>
                                                    <TableCell align="center">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {proposal.attachments_table.map((att: any, index: number) => (
                                                    <TableRow key={att.name || index} hover>
                                                        <TableCell align="center">{index + 1}</TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                <Chip
                                                                    label={att.file_name || att.attachment?.split('/')?.pop() || '—'}
                                                                    size="small"
                                                                    icon={<HiOutlineDocumentText size={16} style={{ color: '#ffffff', marginLeft: 8, marginRight: 2 }} />}
                                                                    sx={{
                                                                        height: 'auto',
                                                                        bgcolor: '#22c55e',
                                                                        color: '#ffffff',
                                                                        fontWeight: 500,
                                                                        '& .MuiChip-icon': {
                                                                            ml: 0.5,
                                                                            color: '#ffffff',
                                                                        },
                                                                        '& .MuiChip-label': {
                                                                            whiteSpace: 'normal',
                                                                            wordBreak: 'break-all',
                                                                            display: 'inline-block',
                                                                            py: 0.5,
                                                                            lineHeight: 1.2,
                                                                        },
                                                                    }}
                                                                />
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                {att.description || '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                {att.file_size || '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                {att.uploaded_on ? new Date(att.uploaded_on).toLocaleDateString() : '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                {att.uploaded_by || '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                                <IconButton size="small" onClick={() => setViewAttachment(att)} sx={{ color: 'info.main' }} title="View Details">
                                                                    <Iconify icon="solar:eye-bold" width={18} />
                                                                </IconButton>
                                                                {att.attachment && (
                                                                    <IconButton size="small" component="a" href={att.attachment} download={att.file_name} sx={{ color: 'success.main' }} title="Download">
                                                                        <Iconify icon="solar:download-bold" width={18} />
                                                                    </IconButton>
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box sx={{ py: 4, textAlign: 'center', borderRadius: 2, border: (t) => `1px dashed ${t.palette.divider}` }}>
                                        <Iconify icon="solar:paperclip-bold" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                            No attachments
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Card>

            {/* Confirm Status Update */}
            <ConfirmDialog
                open={confirmStatusUpdate}
                onClose={() => setConfirmStatusUpdate(false)}
                title="Confirm Status Update"
                content={`Are you sure you want to update the proposal status to "${selectedStatus}"?`}
                icon="solar:info-circle-bold"
                iconColor="#2081C3"
                action={
                    <Button onClick={handleUpdateStatus} color="primary" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Update
                    </Button>
                }
            />

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog
                open={!!viewAttachment}
                onClose={() => setViewAttachment(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Attachment Details</Typography>
                    <IconButton
                        onClick={() => setViewAttachment(null)}
                        sx={{
                            color: theme.palette.grey[500],
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'background.default' },
                        }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: 3, pb: 4, pt: 3 }}>
                    {viewAttachment && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Document Info Card */}
                            <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.grey[500], 0.04), border: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}` }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                            <Iconify icon="solar:document-bold" width={14} />
                                            File Name
                                        </Typography>
                                        <Typography variant="subtitle2" sx={{ wordBreak: 'break-all' }}>{viewAttachment.file_name || viewAttachment.attachment?.split('/')?.pop() || '—'}</Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                            <Iconify icon={"solar:diskette-bold" as any} width={14} />
                                            File Size
                                        </Typography>
                                        <Typography variant="subtitle2">{viewAttachment.file_size || '—'}</Typography>
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                        <Iconify icon="solar:notes-bold" width={14} />
                                        Description
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: viewAttachment.description ? 'text.primary' : 'text.disabled' }}>
                                        {viewAttachment.description || 'No description provided.'}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Meta Info */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, px: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.success.main, 0.1), color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Iconify icon="solar:calendar-date-bold" width={16} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Uploaded On</Typography>
                                        <Typography variant="subtitle2" sx={{ fontSize: 13 }}>
                                            {viewAttachment.uploaded_on ? new Date(viewAttachment.uploaded_on).toLocaleString() : '—'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.warning.main, 0.1), color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Iconify icon={"solar:user-circle-bold" as any} width={16} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Uploaded By</Typography>
                                        <Typography variant="subtitle2" sx={{ fontSize: 13 }}>{viewAttachment.uploaded_by || '—'}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ m: 1 }}>
                    <Button
                        onClick={() => {
                            if (viewAttachment?.attachment) {
                                window.open(viewAttachment.attachment, '_blank');
                            }
                        }}
                        variant="contained"
                        disabled={!viewAttachment?.attachment}
                        startIcon={<Iconify icon="solar:eye-bold" />}
                    >
                        View File
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Print Backdrop */}
            <Backdrop sx={{ color: '#fff', zIndex: (t) => t.zIndex.drawer + 1 }} open={printing}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </DashboardContent>
    );
}

// ----------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '13px' }}>
                {title}
            </Typography>
        </Stack>
    );
}

function DetailItem({ label, value, subValue, icon }: { label: string; value?: string | null; subValue?: string | null; icon: React.ReactNode }) {
    return (
        <Box sx={{ pb: 2, borderBottom: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}` }}>
            <Typography variant="caption" sx={{ color: '#2081C3', fontWeight: 800, textTransform: 'uppercase', mb: 0.75, display: 'block', fontSize: 11, letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: 'text.secondary', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                    {icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word', lineHeight: 1.4, fontSize: 14 }}>
                        {value || '—'}
                    </Typography>
                    {subValue && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, fontSize: 12, fontWeight: 600 }}>
                            {subValue}
                        </Typography>
                    )}
                </Box>
            </Stack>
        </Box>
    );
}
