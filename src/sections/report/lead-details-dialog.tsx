import { useState, useEffect, useCallback } from 'react';
import { HiOutlineTag, HiOutlineMapPin, HiOutlineCalendarDays, HiOutlineBuildingOffice2 } from "react-icons/hi2";
import {
    FaTag,
    FaStar,
    FaUser,
    FaCity,
    FaPhone,
    FaGlobe,
    FaEnvelope,
    FaLightbulb,
    FaListCheck,
    FaFileLines,
    FaLocationDot,
    FaCalendarDays
} from "react-icons/fa6";

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { handleFrappeError } from 'src/utils/api-error-handler';

import { getLead, convertLead, getWorkflowStates } from 'src/api/leads';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { SalesPipeline } from '../lead/sales-pipeline';
import { LeadFollowupDetails } from '../lead/lead-followup-details';
import { LeadPipelineTimeline } from '../lead/lead-pipeline-timeline';
import { AccountDetailsDialog } from './account/account-details-dialog';
import { ContactDetailsDialog } from './contact/contact-details-dialog';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    leadId: string | null;
    onEdit?: () => void;
};

export function LeadDetailsDialog({ open, onClose, leadId, onEdit }: Props) {
    const [lead, setLead] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState('general');
    const [allWorkflowStates, setAllWorkflowStates] = useState<string[]>([]);

    // Convert Lead State
    const [converting, setConverting] = useState(false);
    const [convertMsg, setConvertMsg] = useState<any>(null);

    const [openAccount, setOpenAccount] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [openContact, setOpenContact] = useState(false);
    const [selectedContact, setSelectedContact] = useState<string | null>(null);

    const [openConfirm, setOpenConfirm] = useState(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const handleCloseSnackbar = useCallback(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    }, []);

    useEffect(() => {
        if (open && leadId) {
            setLoading(true);
            getLead(leadId)
                .then(setLead)
                .catch((err) => console.error('Failed to fetch lead details:', err))
                .finally(() => setLoading(false));

            // Fetch workflow states for pipeline visualization
            getWorkflowStates('Lead').then(wf => setAllWorkflowStates(wf.states));
        }
    }, [open, leadId]);

    const handleConvert = async () => {
        if (!leadId) return;
        setConverting(true);
        setConvertMsg(null);
        try {
            const result = await convertLead(leadId);
            setConvertMsg(result);

            // Show messages in snackbar if available
            if (result.messages && result.messages.length > 0) {
                // For simplicity, we show the first message or a summary
                // If there are multiple, showing them all in a snackbar might be tricky.
                // Usually we'd show the most important one.
                const firstMsg = result.messages[0];
                setSnackbar({
                    open: true,
                    message: firstMsg.text,
                    severity: firstMsg.type === 'success' ? 'success' : 'warning'
                });
            } else {
                setSnackbar({ open: true, message: 'Lead converted successfully', severity: 'success' });
            }

            // Refresh lead data to show conversion results
            const updatedLead = await getLead(leadId);
            setLead(updatedLead);
        } catch (err: any) {
            console.error(err);
            const errorMsg = handleFrappeError(err, 'Failed to convert lead');
            setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        } finally {
            setConverting(false);
        }
    };

    const renderStatus = (status: string) => {
        let color: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' = 'default';
        if (status === 'New Lead') color = 'info';
        if (status === 'Qualified' || status === 'Closed') color = 'success';
        if (status === 'Not Interested' || status === 'In Active') color = 'error';
        if (status === 'Contacted' || status === 'Proposal Sent' || status === 'In Negotiation') color = 'warning';

        return (
            <Label variant="soft" color={color}>
                {status}
            </Label>
        );
    };

    const renderPremiumStatus = (status: string) => {
        let bgColor = '#1B53F4';
        let icon: React.ReactNode | string = 'solar:star-bold';
        let iconColor = '#FFE054';

        if (status === 'New Lead') {
            bgColor = '#1B53F4';
            icon = <FaStar />;
            iconColor = '#FFFFFF';
        } else if (status === 'Qualified' || status === 'Closed') {
            bgColor = '#0E9F6E';
            icon = 'solar:check-circle-bold';
            iconColor = '#6EE7B7';
        } else if (status === 'Not Interested' || status === 'In Active') {
            bgColor = '#E02424';
            icon = 'solar:close-circle-bold';
            iconColor = '#FCA5A5';
        } else if (status === 'Contacted' || status === 'Proposal Sent' || status === 'In Negotiation') {
            bgColor = '#D97706';
            icon = 'solar:chat-round-call-bold';
            iconColor = '#FDE047';
        } else {
            bgColor = '#4B5563';
            icon = 'solar:info-circle-bold';
            iconColor = '#E5E7EB';
        }

        return (
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    px: 1.8,
                    py: 0.6,
                    height: 30,
                    borderRadius: 50,
                    bgcolor: bgColor,
                    color: '#ffffff',
                    boxShadow: (themeVar) => `0 4px 10px ${alpha(bgColor, 0.3)}`,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
            >
                {typeof icon === 'string' ? (
                    <Iconify icon={icon as any} width={14} sx={{ color: iconColor, display: 'inline-flex', alignItems: 'center' }} />
                ) : (
                    <Box sx={{ color: iconColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', '& svg': { width: 14, height: 14 } }}>
                        {icon}
                    </Box>
                )}
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        fontSize: 10.5,
                        color: '#ffffff',
                        lineHeight: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}
                >
                    {status}
                </Typography>
            </Box>
        );
    };

    const renderInterest = (level: string) => {
        let color: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' = 'default';
        if (level === 'High') color = 'success';
        if (level === 'Medium') color = 'warning';
        if (level === 'Low') color = 'error';

        return (
            <Label variant="outlined" color={color}>
                {level}
            </Label>
        );
    };

    const TABS = [
        { value: 'general', label: 'General' },
        { value: 'pipeline', label: 'Pipeline' },
        { value: 'followups', label: 'Followups' },
        { value: 'convert', label: 'Convert Lead' },
    ];

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2, boxShadow: (theme) => theme.customShadows.z24, } }}>
            <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Lead Profile</Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500], bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    pr: 2.5
                }}
            >
                <Tabs
                    value={currentTab}
                    onChange={(e, newValue) => setCurrentTab(newValue)}
                    sx={{ px: 2.5 }}
                >
                    {TABS.map((tab) => (
                        <Tab
                            key={tab.value}
                            value={tab.value}
                            label={tab.label}
                            iconPosition="start"
                            sx={{ minHeight: 48, fontWeight: 700 }}
                        />
                    ))}
                </Tabs>

            </Box>

            <DialogContent sx={{ p: 4, m: 0, mt: 0 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : lead ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Premium Header Banner */}
                        <Box
                            sx={{
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2.5,
                                px: 3,
                                py: 3.5,
                                borderRadius: 2.5,
                                background: (theme) =>
                                    theme.palette.mode === 'light'
                                        ? `linear-gradient(135deg, #F6FAFE 0%, #EDF4FB 100%)`
                                        : alpha(theme.palette.primary.main, 0.08),
                                border: (theme) =>
                                    `1px solid ${theme.palette.mode === 'light' ? '#E2EAF5' : alpha(theme.palette.primary.main, 0.16)}`,
                            }}
                        >
                            {/* Decorative Wave 1 */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: -250,
                                    bottom: -250,
                                    width: 600,
                                    height: 600,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(255, 255, 255, 0.65)',
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            />
                            {/* Decorative Wave 2 */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: -180,
                                    bottom: -180,
                                    width: 460,
                                    height: 460,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(255, 255, 255, 0.45)',
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            />
                            {/* Decorative Wave 3 */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: -110,
                                    bottom: -110,
                                    width: 320,
                                    height: 320,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            />

                            {/* Avatar with online dot */}
                            {/* <Box sx={{ position: 'relative', flexShrink: 0, zIndex: 1 }}>
                                <Box
                                    sx={{
                                        width: 76,
                                        height: 76,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#fff',
                                        color: 'primary.main',
                                        border: (theme) => `2px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                                        boxShadow: (theme) => `0 4px 16px ${alpha(theme.palette.primary.main, 0.14)}`,
                                    }}
                                >
                                    <FaUserTie size={34} />
                                </Box>
                            </Box> */}

                            {/* Name, Company, Location, Tags */}
                            <Box sx={{ flexGrow: 1, minWidth: 0, position: 'relative', zIndex: 1, ml: 1 }}>
                                <Typography
                                    variant="h5"
                                    sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: -0.4, lineHeight: 1.2, mb: 1.5, ml: 1 }}
                                    noWrap
                                >
                                    {lead.lead_name}
                                </Typography>

                                {/* Company */}
                                {lead.company_name && (
                                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75, ml: 1 }}>
                                        <HiOutlineBuildingOffice2 size={20} style={{ color: '#637381', flexShrink: 0 }} />
                                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: 13 }} noWrap>
                                            {lead.company_name}
                                        </Typography>
                                    </Stack>
                                )}

                                {/* Location + Lead Type chips */}
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ pt: 0.5 }}>
                                    {(lead.city || lead.state || lead.country) && (
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                            sx={{
                                                px: 2,
                                                py: 0.75,
                                                borderRadius: 50,
                                                bgcolor: '#ffffff',
                                                boxShadow: (themeVar) => `0 2px 8px ${alpha(themeVar.palette.grey[500], 0.08)}`,
                                                border: (themeVar) => `1px solid ${alpha(themeVar.palette.grey[500], 0.06)}`,
                                            }}
                                        >
                                            <HiOutlineMapPin size={15} style={{ color: '#1B3D74' }} />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: '#2E3A59',
                                                    fontSize: '12px',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}
                                            </Typography>
                                        </Stack>
                                    )}
                                    {lead.leads_type && (
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                            sx={{
                                                px: 2,
                                                py: 0.75,
                                                borderRadius: 50,
                                                bgcolor: '#ffffff',
                                                boxShadow: (themeVar) => `0 2px 8px ${alpha(themeVar.palette.grey[500], 0.08)}`,
                                                border: (themeVar) => `1px solid ${alpha(themeVar.palette.grey[500], 0.06)}`,
                                            }}
                                        >
                                            <HiOutlineTag size={15} style={{ color: '#23a198' }} />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: '#23a198',
                                                    fontSize: '12px',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {lead.leads_type}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Stack>
                            </Box>

                            {/* Right: Status + ID + Date */}
                            <Box sx={{ textAlign: 'right', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                                {renderPremiumStatus(lead.workflow_state || lead.status)}
                                <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: '#334155', fontWeight: 700, fontSize: '12px' }}>
                                        ID: {lead.name}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={0.75} justifyContent="flex-end" sx={{ mt: 0.75 }}>
                                    <HiOutlineCalendarDays size={15} style={{ color: '#64748B' }} />
                                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                                        {new Date(lead.creation).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {currentTab === 'general' && (
                            <>
                                {/* General Information */}
                                <Box sx={{ margin: 2 }}>
                                    <SectionHeader title="Contact & Service" icon={<FaPhone size={16} />} />
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gap: 3,
                                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                                        }}
                                    >
                                        <DetailItem label="Email" value={lead.email} icon={<FaEnvelope size={13} />} />
                                        <DetailItem label="Phone" value={lead.phone_number} icon={<FaPhone size={13} />} />
                                        <DetailItem label="Service" value={lead.service} icon={<FaLightbulb size={13} />} color="info.main" />
                                        <DetailItem label="Leads Type" value={lead.leads_type} icon={<FaTag size={13} />} />
                                        <DetailItem label="Leads From" value={lead.leads_from} icon={<FaGlobe size={13} />} />
                                        <DetailItem label="GSTIN" value={lead.gstin} icon={<FaListCheck size={13} />} />
                                    </Box>
                                </Box>

                                {/* Location & Status */}
                                <Box sx={{ margin: 2 }}>
                                    <SectionHeader title="Location & Preferences" icon={<FaLocationDot size={16} />} />
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gap: 3,
                                            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                                        }}
                                    >
                                        <DetailItem label="Country" value={lead.country} icon={<FaGlobe size={13} />} />
                                        <DetailItem label="State" value={lead.state} icon={<FaLocationDot size={13} />} />
                                        <DetailItem label="City" value={lead.city} icon={<FaCity size={13} />} />
                                        <DetailItem label="Owner" value={lead.owner_name || lead.owner} icon={<FaUser size={13} />} color="secondary.main" />
                                        <DetailItem label="Creation" value={`${new Date(lead.creation) .toLocaleDateString('en-GB') .replace(/\//g, '-')} ${new Date(lead.creation).toLocaleTimeString('en-GB')}`} icon={<FaCalendarDays size={13} />} />
                                    </Box>
                                </Box>

                                {/* Additional Info */}
                                <Box
                                    sx={{
                                        p: 3,
                                        bgcolor: (theme) => theme.palette.mode === 'light' ? '#F4F7FB' : alpha(theme.palette.primary.main, 0.04),
                                        borderRadius: 2.5,
                                        margin: 2,
                                        border: (theme) => `1px solid ${theme.palette.mode === 'light' ? '#E8EEF5' : alpha(theme.palette.primary.main, 0.12)}`,
                                    }}
                                >
                                    <SectionHeader title="Additional Information" icon={<FaFileLines size={18} />} noMargin />
                                    <Box sx={{ mt: 3.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', mb: 1, display: 'block', letterSpacing: 0.8 }}>
                                                Billing Address
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, lineHeight: 1.6 }}>
                                                {lead.billing_address || 'No address provided'}
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ borderStyle: 'solid', borderColor: (theme) => theme.palette.mode === 'light' ? '#E8EEF5' : alpha(theme.palette.divider, 0.5) }} />
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', mb: 1, display: 'block', letterSpacing: 0.8 }}>
                                                Remarks
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: lead.remarks ? '#1E293B' : '#64748B', fontWeight: lead.remarks ? 600 : 500, fontStyle: lead.remarks ? 'normal' : 'italic', lineHeight: 1.6 }}>
                                                {lead.remarks || 'No remarks added'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </>
                        )}

                        {currentTab === 'pipeline' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <SalesPipeline
                                    currentStage={lead.workflow_state || lead.status}
                                    stages={allWorkflowStates}
                                    leadName={lead.lead_name}
                                    service={lead.service}
                                    disabled
                                />
                                <LeadPipelineTimeline
                                    title="Stage History"
                                    list={lead.converted_pipeline_timeline || []}
                                />
                            </Box>
                        )}

                        {currentTab === 'followups' && (
                            <LeadFollowupDetails
                                title="Followup History"
                                list={lead.followup_details || []}
                            />
                        )}

                        {currentTab === 'convert' && (
                            <Box sx={{ py: 3 }}>
                                {lead.converted_account || lead.converted_contact ? (
                                    <Box>
                                        <Box sx={{ p: 3, bgcolor: 'background.neutral', borderRadius: 2 }}>
                                            <Stack spacing={2.5}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                                        Converted Company
                                                    </Typography>
                                                    <Typography
                                                        variant="subtitle1"
                                                        sx={{
                                                            fontWeight: 800,
                                                            color: 'primary.main',
                                                            cursor: lead.converted_account ? 'pointer' : 'default'
                                                        }}
                                                        onClick={() => {
                                                            if (lead.converted_account) {
                                                                setSelectedAccount(lead.converted_account);
                                                                setOpenAccount(true);
                                                            }
                                                        }}
                                                    >
                                                        {lead.converted_account || 'N/A'}
                                                    </Typography>
                                                </Box>
                                                <Divider sx={{ borderStyle: 'dashed' }} />
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                                        Converted Client
                                                    </Typography>
                                                    <Typography
                                                        variant="subtitle1"
                                                        sx={{
                                                            fontWeight: 800,
                                                            color: 'primary.main',
                                                            cursor: lead.converted_contact ? 'pointer' : 'default'
                                                        }}
                                                        onClick={() => {
                                                            if (lead.converted_contact) {
                                                                setSelectedContact(lead.converted_contact);
                                                                setOpenContact(true);
                                                            }
                                                        }}
                                                    >
                                                        {lead.converted_contact || 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box sx={{ py: 5, textAlign: 'center' }}>
                                        <Box
                                            sx={{
                                                width: 120,
                                                height: 120,
                                                borderRadius: '50%',
                                                bgcolor: alpha('#1877F2', 0.08),
                                                color: '#1877F2',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mx: 'auto',
                                                mb: 3
                                            }}
                                        >
                                            <Iconify icon={"solar:user-plus-bold-duotone" as any} width={64} />
                                        </Box>
                                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 400, mx: 'auto' }}>
                                            Convert this lead into a permanent Client and Company record in the CRM.
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            color="primary"
                                            startIcon={converting ? <Iconify icon={"svg-spinners:18-dots-indicator" as any} /> : <Iconify icon={"solar:refresh-bold" as any} />}
                                            onClick={() => setOpenConfirm(true)}
                                            disabled={converting}
                                            sx={{ px: 4, height: 48, fontWeight: 800 }}
                                        >
                                            {converting ? 'Converting...' : 'Convert Lead Now'}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Profile Found</Typography>
                    </Box>
                )}
            </DialogContent>

            <AccountDetailsDialog
                open={openAccount}
                onClose={() => setOpenAccount(false)}
                accountId={selectedAccount}
            />

            <ContactDetailsDialog
                open={openContact}
                onClose={() => setOpenContact(false)}
                contactId={selectedContact}
            />

            <ConfirmDialog
                open={openConfirm}
                onClose={() => setOpenConfirm(false)}
                title="Convert Lead"
                icon="solar:user-check-rounded-bold-duotone"
                iconColor="success.main"
                content="Are you sure you want to convert this lead? This will create a permanent Client and Company record."
                action={
                    <Button
                        variant="contained"
                        color="success"
                        onClick={() => {
                            handleConvert();
                            setOpenConfirm(false);
                        }}
                        sx={{ borderRadius: 1.5 }}
                    >
                        Convert
                    </Button>
                }
            />

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
        </Dialog>
    );
}

function SectionHeader({ title, icon, noMargin = false }: { title: string; icon: React.ReactNode, noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: noMargin ? 0 : 2.5 }}>
            <Box sx={{ color: 'primary.main', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 15 }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailItem({ label, value, icon, color = 'text.primary' }: { label: string; value?: string | null; icon: React.ReactNode; color?: string }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ color: 'text.disabled', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
