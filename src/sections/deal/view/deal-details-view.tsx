import { IoMdArrowBack } from "react-icons/io";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { GrDocumentTime , GrDocumentStore } from "react-icons/gr";
import { HiOutlineUser, HiOutlineClock, HiOutlineCalendar, HiOutlineBriefcase, HiOutlineDocumentText, HiOutlineBuildingOffice, HiOutlineClipboardDocumentCheck } from "react-icons/hi2";

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { getDeal, updateDeal } from 'src/api/deals';
import { fetchRelatedInvoices } from 'src/api/invoice';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchRelatedEstimations } from 'src/api/estimation';
import { getAutomationPreview, sendAutomationMessage, getLatestWhatsAppMessage, getEmailAutomationPreview, sendEmailAutomationMessage } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { EmailAutomationDialog } from 'src/sections/lead/email-automation-dialog';
import { WhatsappAutomationDialog } from 'src/sections/lead/whatsapp-automation-dialog';

import { useAuth } from 'src/auth/auth-context';

import { DealRelatedList } from '../deal-related-list';

const STAGE_OPTIONS = [
    { value: 'Just In', label: 'Just In' },
    { value: 'Working', label: 'Working' },
    { value: 'Estimation Created', label: 'Estimation\nCreated' },
    { value: 'Estimation Sent', label: 'Estimation\nSent' },
    { value: 'Invoice Created', label: 'Invoice\nCreated' },
    { value: 'Invoice Sent', label: 'Invoice\nSent' },
    { value: 'Special Approval', label: 'Special\nApproval' },
    { value: 'Project Started', label: 'Project\nStarted' },
    { value: 'Closed', label: 'Closed' },
];

const getClipPath = (index: number, total: number) => {
    if (index === 0) {
        return 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 6px calc(100% - 1px), 3px calc(100% - 3px), 1px calc(100% - 6px), 0 calc(100% - 12px), 0 12px, 1px 6px, 3px 3px, 6px 1px)';
    }
    if (index === total - 1) {
        return 'polygon(0 0, calc(100% - 12px) 0, calc(100% - 6px) 1px, calc(100% - 3px) 3px, calc(100% - 1px) 6px, 100% 12px, 100% calc(100% - 12px), calc(100% - 1px) calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) calc(100% - 1px), calc(100% - 12px) 100%, 0 100%, 12px 50%)';
    }
    return 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)';
};

// ----------------------------------------------------------------------

export function DealDetailsView() {
    const { id } = useParams();
    const theme = useTheme();
    const router = useRouter();
    const location = useLocation();

    const backPath = location.state?.from || '/deals';

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned;
    const canViewEstimations = hasCustomPerms && user?.permissions?.actions?.estimation ? !!user?.permissions?.actions?.estimation?.view : true;
    const canViewInvoices = hasCustomPerms && user?.permissions?.actions?.invoice ? !!user?.permissions?.actions?.invoice?.view : true;
    const canCreateEstimation = hasCustomPerms && user?.permissions?.actions?.estimation ? !!user?.permissions?.actions?.estimation?.create : true;
    const canCreateInvoice = hasCustomPerms && user?.permissions?.actions?.invoice ? !!user?.permissions?.actions?.invoice?.create : true;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.prospects?.edit : true;
    
    const [deal, setDeal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const TABS = [
        ...(canViewEstimations ? [{ value: 'estimations', label: 'Estimations', icon: <HiOutlineClipboardDocumentCheck size={18} /> }] : []),
        ...(canViewInvoices ? [{ value: 'invoices', label: 'Invoices', icon: <HiOutlineDocumentText size={18} /> }] : []),
        { value: 'stage_history', label: 'Stage History', icon: <HiOutlineClock size={18} /> },
    ];

    const [currentTab, setCurrentTab] = useState(TABS[0]?.value || 'stage_history');

    useEffect(() => {
        if (TABS.length > 0 && !TABS.some(t => t.value === currentTab)) {
            setCurrentTab(TABS[0].value);
        }
    }, [canViewEstimations, canViewInvoices]);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [updatingStage, setUpdatingStage] = useState(false);
    const [confirmUpdate, setConfirmUpdate] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [automationData, setAutomationData] = useState<any>(null);
    const [openAutomationDialog, setOpenAutomationDialog] = useState(false);
    const [emailAutomationData, setEmailAutomationData] = useState<any>(null);
    const [openEmailAutomationDialog, setOpenEmailAutomationDialog] = useState(false);

    useEffect(() => {
        if (deal && deal.stage) {
            const validStage = STAGE_OPTIONS.some(s => s.value === deal.stage) ? deal.stage : 'Just In';
            setSelectedStage(validStage);
        }
    }, [deal]);

    const handleUpdateStage = useCallback(async () => {
        if (!deal || !selectedStage || selectedStage === deal.stage) return;
        const previousStage = deal.stage;
        setConfirmUpdate(false);
        setUpdatingStage(true);
        try {
            await updateDeal(deal.name, { stage: selectedStage as any });
            const updated = await getDeal(deal.name);
            setDeal(updated);
            setSnackbar({
                open: true,
                message: `Prospect stage updated from "${previousStage}" to "${selectedStage}" successfully`,
                severity: 'success'
            });

            // Fetch WhatsApp automation preview
            try {
                const preview = await getAutomationPreview('Deal', deal.name, previousStage);
                if (preview && preview.show_confirmation) {
                    setAutomationData(preview);
                    setOpenAutomationDialog(true);
                }
            } catch (automationErr: any) {
                console.error('Failed to fetch WhatsApp automation preview:', automationErr);
            }
            try {
                const emailPreview = await getEmailAutomationPreview(
                    "Deal",
                    deal.name,
                    previousStage
                );

                if (emailPreview?.show_confirmation) {
                    setEmailAutomationData(emailPreview);
                    setOpenEmailAutomationDialog(true);
                }
            } catch (err) {
                console.error(err);
            }
        } catch (err: any) {
            console.error('Failed to update stage:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to update stage',
                severity: 'error'
            });
        } finally {
            setUpdatingStage(false);
        }
    }, [deal, selectedStage]);

    const handleSendAutomationMessage = useCallback(async (proposalName: string | null) => {
        if (!deal || !automationData) return;
        try {
            await sendAutomationMessage(
                automationData.automation_name,
                'Deal',
                deal.name,
                proposalName
            );

            const latestMsg = await getLatestWhatsAppMessage(deal.name, true);
            if (latestMsg && latestMsg.status === 'Failed') {
                let errMsg = 'Unable to send WhatsApp message.';
                try {
                    if (latestMsg.raw_payload) {
                        const payload = JSON.parse(latestMsg.raw_payload);
                        const fbErrMessage = payload?.error?.error?.message || payload?.error?.message || payload?.error;
                        if (fbErrMessage) {
                            errMsg = fbErrMessage.replace(/^\(#\d+\)\s*/, '');
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse raw_payload:", e);
                }
                throw new Error(errMsg);
            }

            setSnackbar({
                open: true,
                message: 'WhatsApp Message Sent Successfully',
                severity: 'success'
            });
        } catch (err: any) {
            setSnackbar({
                open: true,
                message: err.message || 'Failed to send message.',
                severity: 'error'
            });
            throw err;
        }
    }, [deal, automationData]);

    const handleSendEmailAutomation = useCallback(async (proposalName: string | null, attachments?: { file_url: string }[] | null) => {

        if (!deal || !emailAutomationData) return;

        try {

            await sendEmailAutomationMessage(
                emailAutomationData.automation_name,
                "Deal",
                deal.name,
                proposalName,
                attachments
            );

            setSnackbar({
                open: true,
                message: "Email sent successfully.",
                severity: "success",
            });

        } catch (err: any) {

            setSnackbar({
                open: true,
                message: err.message || "Failed to send Email.",
                severity: "error",
                });

            throw err;
        }
    },
        [deal, emailAutomationData]
    );

    const handleStageUpdateClick = useCallback(async () => {
        if (!deal || !selectedStage) return;

        if (selectedStage === 'Estimation Created' || selectedStage === 'Estimation Sent') {
            try {
                setUpdatingStage(true);
                const estimations = await fetchRelatedEstimations(deal.name);
                setUpdatingStage(false);
                if (estimations.length === 0) {
                    setSnackbar({
                        open: true,
                        message: 'At least one Estimation must be created.',
                        severity: 'error'
                    });
                    setSelectedStage(deal.stage);
                    return;
                }
            } catch (err) {
                setUpdatingStage(false);
                console.error('Failed to validate estimations:', err);
            }
        }

        if (selectedStage === 'Invoice Created' || selectedStage === 'Invoice Sent') {
            try {
                setUpdatingStage(true);
                const invoices = await fetchRelatedInvoices(deal.name);
                setUpdatingStage(false);
                if (invoices.length === 0) {
                    setSnackbar({
                        open: true,
                        message: 'At least one Invoice must be created.',
                        severity: 'error'
                    });
                    setSelectedStage(deal.stage);
                    return;
                }
            } catch (err) {
                setUpdatingStage(false);
                console.error('Failed to validate invoices:', err);
            }
        }

        setConfirmUpdate(true);
    }, [deal, selectedStage]);

    useEffect(() => {
        if (id) {
            setLoading(true);
            getDeal(id)
                .then((dealData) => {
                    setDeal(dealData);
                })
                .catch((err) => console.error('Failed to fetch deal details:', err))
                .finally(() => setLoading(false));
        } else {
            setCurrentTab('estimations');
        }
    }, [id]);

    const handleCreateEstimation = useCallback(() => {
        if (deal) {
            router.push(`/estimations/new?deal_id=${deal.name}&client_id=${deal.contact}`);
        }
    }, [deal, router]);

    const handleCreateInvoice = useCallback(() => {
        if (deal) {
            router.push(`/invoices/new?deal_id=${deal.name}`);
        }
    }, [deal, router]);

    if (loading) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!deal) {
        return (
            <DashboardContent maxWidth={false}>
                <Box sx={{ py: 20, textAlign: 'center' }}>
                    <Iconify icon={"solar:ghost-bold" as any} width={80} sx={{ color: 'text.disabled', mb: 3 }} />
                    <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 800 }}>Prospect Not Found</Typography>
                    <Button onClick={() => router.push('/deals')} sx={{ mt: 3 }} variant="contained">
                        Go back to deals
                    </Button>
                </Box>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false}>
            {/* Top Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={2}>
                <Typography variant="h4">Prospect Details: {deal.name}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push(backPath, location.state)}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (themeVar) => alpha(themeVar.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            }
                        }}
                    >
                        Go Back
                    </Button>
                    {canCreateEstimation && (
                        <Button
                            variant="contained"
                            onClick={handleCreateEstimation}
                            startIcon={<GrDocumentTime size={17} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                color: '#fff',
                                '&:hover': { bgcolor: '#047857' }
                            }}
                        >
                            Create Estimation
                        </Button>
                    )}
                    {canCreateInvoice && (
                        <Button
                            variant="contained"
                            onClick={handleCreateInvoice}
                            startIcon={<GrDocumentStore size={17} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: '#fff',
                                '&:hover': { bgcolor: '#007850' }
                            }}
                        >
                            Create Invoice
                        </Button>
                    )}
                </Stack>
            </Stack>

            {/* Stage Tracker Bar */}
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
                    {(() => {
                        const effectiveDealStage = STAGE_OPTIONS.some(s => s.value === deal.stage) ? deal.stage : 'Just In';
                        const currentActiveStage = selectedStage || effectiveDealStage;

                        return STAGE_OPTIONS.map((stageOption, index) => {
                            const activeIndex = STAGE_OPTIONS.findIndex(s => s.value === currentActiveStage);
                            const isCompletedOrActive = index <= activeIndex;
                            const isActive = stageOption.value === currentActiveStage;

                            return (
                                <Box
                                    key={stageOption.value}
                                    onClick={() => setSelectedStage(stageOption.value)}
                                    sx={{
                                        height: 46,
                                        display: 'flex',
                                        flex: '1 1 0',
                                        minWidth: { xs: 100, md: 92 },
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        px: 1,
                                        ml: index === 0 ? 0 : '-10px',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        clipPath: getClipPath(index, STAGE_OPTIONS.length),
                                        bgcolor: isCompletedOrActive ? '#2081C3' : (themeVar) => themeVar.palette.mode === 'dark' ? alpha(themeVar.palette.grey[700], 0.5) : '#e0e0e0b5',
                                        color: isCompletedOrActive ? 'common.white' : (themeVar) => themeVar.palette.mode === 'dark' ? 'text.secondary' : '#4c545a',
                                        fontWeight: isActive ? 800 : 600,
                                        fontSize: { xs: 11, md: 11.5 },
                                        lineHeight: 1.15,
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'pre-line',
                                        position: 'relative',
                                        zIndex: STAGE_OPTIONS.length - index,
                                        '&:hover': {
                                            opacity: 0.88,
                                        }
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', textAlign: 'inherit', zIndex: 1, pl: index === 0 ? 0 : 1, pr: index === STAGE_OPTIONS.length - 1 ? 0 : 1 }}>
                                        {stageOption.label}
                                    </Typography>
                                </Box>
                            );
                        });
                    })()}
                </Box>
                {displayEdit  &&(
                    <Button
                        variant="contained"
                        disabled={!selectedStage || selectedStage === (STAGE_OPTIONS.some(s => s.value === deal.stage) ? deal.stage : 'Just In') || updatingStage}
                        onClick={handleStageUpdateClick}
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
                        {updatingStage ? <CircularProgress size={20} color="inherit" /> : 'Update Stage'}
                    </Button>
                )}
            </Card>

            <Card sx={{ overflow: 'hidden', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', minHeight: '75vh', flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Sidebar: Prospect Details */}
                    <Box
                        sx={{
                            width: { xs: '100%', md: 320 },
                            borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
                            borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
                            bgcolor: alpha(theme.palette.grey[500], 0.02),
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Box
                            sx={{
                                p: 4,
                                flexGrow: 1,
                            }}>
                            <Stack spacing={5}>
                                {/* Prospect Identity */}
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                                        {deal.deal_title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '14px' }}>
                                        ID: {deal.name}
                                    </Typography>
                                </Box>

                                <Divider sx={{ borderStyle: 'dashed' }} />

                                {/* Relationships */}
                                <Box>
                                    <SectionHeader title="Prospect Information" />
                                    <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                                        <DetailItem label="Company" value={deal.account_name || deal.account} subValue={deal.account_name ? deal.account : null} icon={<HiOutlineBuildingOffice size={20} />} />
                                        <DetailItem label="Client" value={deal.contact_name || deal.contact} subValue={deal.contact_name ? deal.contact : null} icon={<HiOutlineUser size={20} />} />
                                        <DetailItem label="Expected Close" value={deal.expected_close_date} icon={<HiOutlineCalendar size={20} />} />
                                        <DetailItem label="Prospect Owner" value={deal.deal_owner_name || deal.deal_owner || deal.owner} subValue={deal.deal_owner_name && (deal.deal_owner || deal.owner) !== deal.deal_owner_name ? (deal.deal_owner || deal.owner) : null} icon={<HiOutlineBriefcase size={20} />} />
                                    </Stack>
                                </Box>

                                {/* Notes */}
                                <Box>
                                    <SectionHeader title="Notes" />
                                    <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', fontWeight: 600, fontStyle: deal.notes ? 'normal' : 'italic' }}>
                                        {deal.notes || 'No notes added'}
                                    </Typography>
                                </Box>


                                {/* Synchronization Info */}
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.04),
                                        border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.1)}`,
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
                                            Last Synchronized:
                                        </Typography>
                                    </Stack>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {deal.modified ? new Date(deal.modified).toLocaleString() : '—'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Box>

                    {/* Main Content: Tabs & Related Data */}
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: { xs: '100%', md: 'calc(100% - 320px)' } }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs
                                value={currentTab}
                                onChange={(e, newValue) => setCurrentTab(newValue)}
                                sx={{
                                    px: 3,
                                    '& .MuiTab-root': {
                                        minHeight: 64,
                                        fontWeight: 800,
                                        fontSize: 15,
                                        '&.Mui-selected': { color: 'primary.main' },
                                    },
                                    '& .MuiTabs-indicator': {
                                        height: 3,
                                        borderRadius: '3px 3px 0 0',
                                    }
                                }}
                            >
                                {TABS.map((tab) => (
                                    <Tab
                                        key={tab.value}
                                        value={tab.value}
                                        label={tab.label}
                                        icon={tab.icon}
                                        iconPosition="start"
                                    />
                                ))}
                            </Tabs>
                        </Box>

                        <Box sx={{ flexGrow: 1, p: 4, bgcolor: 'background.paper', overflow: 'auto' }}>
                            <DealRelatedList dealId={id || ''} type={currentTab as any} deal={deal} />
                        </Box>
                    </Box>
                </Box>
            </Card>

            <ConfirmDialog
                open={confirmUpdate}
                onClose={() => setConfirmUpdate(false)}
                title="Confirm Stage Update"
                content={`Are you sure you want to update the deal stage to "${selectedStage}"?`}
                icon="solar:info-circle-bold"
                iconColor="#2081C3"
                action={
                    <Button onClick={handleUpdateStage} color="primary" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Update
                    </Button>
                }
            />

            {automationData && (
                <WhatsappAutomationDialog
                    open={openAutomationDialog}
                    onClose={() => {
                        setOpenAutomationDialog(false);
                        setAutomationData(null);
                    }}
                    automation={automationData}
                    lead={deal}
                    onSend={handleSendAutomationMessage}
                />
            )}

            {emailAutomationData && (
                <EmailAutomationDialog
                    open={openEmailAutomationDialog}
                    onClose={() => {
                        setOpenEmailAutomationDialog(false);
                        setEmailAutomationData(null);
                    }}
                    automation={emailAutomationData}
                    lead={deal}
                    onSend={handleSendEmailAutomation}
                />
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '13px' }}>
                {title}
            </Typography>
        </Stack>
    );
}

function DetailItem({ label, value, subValue, icon, color = 'text.primary', onClick, sx }: { label: string; value?: string | null | number; subValue?: string | null; icon: React.ReactNode; color?: string; onClick?: () => void; sx?: any }) {
    return (
        <Box sx={{ pb: 2, borderBottom: (themeVar) => `1px dashed ${alpha(themeVar.palette.grey[500], 0.2)}`, ...sx }}>
            <Typography variant="caption" sx={{ color: '#2081C3', fontWeight: 800, textTransform: 'uppercase', mb: 0.75, display: 'block', fontSize: 11, letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                onClick={onClick}
                sx={{
                    ...(onClick && {
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.72 },
                    }),
                }}
            >
                <Box sx={{ color: 'text.secondary', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                    {icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color, wordBreak: 'break-word', lineHeight: 1.4, fontSize: 14 }}>
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
