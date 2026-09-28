import { MdInfo } from "react-icons/md";
import { CgNotes } from "react-icons/cg";
import { IoMdArrowBack } from "react-icons/io";
import { RiMailSendLine } from "react-icons/ri";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha , useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';
import { handleFrappeError } from 'src/utils/api-error-handler';

import { getToDo } from 'src/api/todo';
import { getCall } from 'src/api/calls';
import { CONFIG } from 'src/config-global';
import { getMeeting } from 'src/api/meetings';
import { DashboardContent } from 'src/layouts/dashboard';
import { getDoc, getLead, saveLead, convertLead, getMetaLeadInfo, getWorkflowStates, getWorkflowActions, getFollowupHistory, applyWorkflowAction, getProposalByLeadId, getAutomationPreview, sendAutomationMessage, getLatestWhatsAppMessage, getEmailAutomationPreview, sendEmailAutomationMessage } from 'src/api/leads';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import TodoDialog from 'src/sections/todo/todo-dialog';
import CallDialog from 'src/sections/calls/call-dialog';
import MeetingDialog from 'src/sections/meetings/meeting-dialog';

import { useAuth } from 'src/auth/auth-context';

import LeadNoteDialog from '../lead-note-dialog';
import { LeadConvertDialog } from '../lead-convert-dialog';
import { WhatsappChatDialog } from './whatsapp_chat_dialog';
import { LeadFollowupDetails } from '../lead-followup-details';
import { LeadProposalDetails } from '../lead-proposal-details';
import { LeadPipelineTimeline } from '../lead-pipeline-timeline';
import { EmailAutomationDialog } from '../email-automation-dialog';
import { WhatsappAutomationDialog } from '../whatsapp-automation-dialog';
import { AccountDetailsDialog } from '../../report/account/account-details-dialog';
import { ContactDetailsDialog } from '../../report/contact/contact-details-dialog';

// ----------------------------------------------------------------------

const getClipPath = (index: number, total: number) => {
    if (index === 0) {
        return 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 6px calc(100% - 1px), 3px calc(100% - 3px), 1px calc(100% - 6px), 0 calc(100% - 12px), 0 12px, 1px 6px, 3px 3px, 6px 1px)';
    }
    if (index === total - 1) {
        return 'polygon(0 0, calc(100% - 12px) 0, calc(100% - 6px) 1px, calc(100% - 3px) 3px, calc(100% - 1px) 6px, 100% 12px, 100% calc(100% - 12px), calc(100% - 1px) calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) calc(100% - 1px), calc(100% - 12px) 100%, 0 100%, 12px 50%)';
    }
    return 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)';
};

export function LeadDetailsView() {
    const { user } = useAuth();
    const { id } = useParams();
    const router = useRouter();
    const navigate = useNavigate();
    const location = useLocation();

    const leadPerms = user?.permissions?.actions?.lead;
    const hasCustomLead = !!user?.permissions?.custom_permissions_assigned && !!leadPerms;
    const canEditLead = hasCustomLead ? !!leadPerms?.edit : true;

    const eventsPerms = user?.permissions?.actions?.calendar;
    const hasCustomEvents = !!user?.permissions?.custom_permissions_assigned && !!eventsPerms;
    const canCreateFollowup = hasCustomEvents ? !!eventsPerms?.create : true;
    const canViewFollowups = hasCustomEvents ? !!eventsPerms?.view : true;

    const proposalPerms = user?.permissions?.actions?.proposal;
    const hasCustomProposal = !!user?.permissions?.custom_permissions_assigned && !!proposalPerms;
    const canCreateProposal = hasCustomProposal ? !!proposalPerms?.create : true;
    const canViewProposals = hasCustomProposal ? !!proposalPerms?.view : true;

    const clientPerms = user?.permissions?.actions?.clients;
    const hasCustomClient = !!user?.permissions?.custom_permissions_assigned && !!clientPerms;
    const canCreateClient = hasCustomClient ? !!clientPerms?.create : true;

    const companyPerms = user?.permissions?.actions?.company;
    const hasCustomCompany = !!user?.permissions?.custom_permissions_assigned && !!companyPerms;
    const canCreateCompany = hasCustomCompany ? !!clientPerms?.create : true;

    const [openWhatsapp, setOpenWhatsapp] = useState(false);
    const [automationData, setAutomationData] = useState<any>(null);
    const [openAutomationDialog, setOpenAutomationDialog] = useState(false);

    const [emailAutomationData, setEmailAutomationData] = useState<any>(null);
    const [openEmailAutomationDialog, setOpenEmailAutomationDialog] = useState(false);

    const [lead, setLead] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState(location.state?.leadTab || 'general');

    useEffect(() => {
        if (location.state?.leadTab) {
            setCurrentTab(location.state.leadTab);
        }
    }, [location.state?.leadTab]);
    const [allWorkflowData, setAllWorkflowData] = useState<{ states: string[]; actions: { action: string; next_state: string }[] }>({ states: [], actions: [] });

    // Convert Lead State
    const [converting, setConverting] = useState(false);

    const [openAccount, setOpenAccount] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [openContact, setOpenContact] = useState(false);
    const [selectedContact, setSelectedContact] = useState<string | null>(null);

    const [convertedAccountName, setConvertedAccountName] = useState<string | null>(null);
    const [convertedContactName, setConvertedContactName] = useState<string | null>(null);

    const [openConfirm, setOpenConfirm] = useState(false);
    const [openConvertDialog, setOpenConvertDialog] = useState(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [updatingStage, setUpdatingStage] = useState(false);
    const [confirmUpdate, setConfirmUpdate] = useState(false);

    const [followupHistory, setFollowupHistory] = useState<any[]>([]);
    const [followupLoading, setFollowupLoading] = useState(false);

    const [proposalHistory, setProposalHistory] = useState([]);

    // Lead Notes States
    const [openNoteDialog, setOpenNoteDialog] = useState(false);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [openNoteDeleteConfirm, setOpenNoteDeleteConfirm] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<any>(null);
    const [noteMenuAnchorEl, setNoteMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [activeMenuNote, setActiveMenuNote] = useState<any>(null);
    const [showNotes, setShowNotes] = useState(false);

    const handleOpenNoteMenu = useCallback((event: React.MouseEvent<HTMLElement>, note: any) => {
        setNoteMenuAnchorEl(event.currentTarget);
        setActiveMenuNote(note);
    }, []);

    const handleCloseNoteMenu = useCallback(() => {
        setNoteMenuAnchorEl(null);
        setActiveMenuNote(null);
    }, []);

    const handleSaveNote = useCallback(async (title: string, description: string) => {
        if (!lead) return;

        let updatedNotes = [];
        if (selectedNote && selectedNote.name) {
            // Edit mode
            updatedNotes = (lead.lead_notes || []).map((n: any) =>
                n.name === selectedNote.name ? { ...n, title, description } : n
            );
        } else {
            // Create mode
            updatedNotes = [...(lead.lead_notes || []), { title, description }];
        }

        await saveLead({ ...lead, lead_notes: updatedNotes });

        setSnackbar({
            open: true,
            message: selectedNote ? 'Note updated successfully' : 'Note added successfully',
            severity: 'success'
        });

        // Refresh lead details
        const refreshedLead = await getLead(lead.name);
        setLead(refreshedLead);
    }, [lead, selectedNote]);

    const handleDeleteNoteClick = useCallback((note: any) => {
        setNoteToDelete(note);
        setOpenNoteDeleteConfirm(true);
        handleCloseNoteMenu();
    }, [handleCloseNoteMenu]);

    const handleConfirmDeleteNote = useCallback(async () => {
        if (!lead || !noteToDelete) return;

        setOpenNoteDeleteConfirm(false);
        try {
            const updatedNotes = (lead.lead_notes || []).filter((n: any) => n.name !== noteToDelete.name);
            await saveLead({ ...lead, lead_notes: updatedNotes });

            setSnackbar({
                open: true,
                message: 'Note deleted successfully',
                severity: 'success'
            });

            const refreshedLead = await getLead(lead.name);
            setLead(refreshedLead);
        } catch (err: any) {
            console.error('Failed to delete note:', err);
            setSnackbar({
                open: true,
                message: err.message || 'Failed to delete note',
                severity: 'error'
            });
        } finally {
            setNoteToDelete(null);
        }
    }, [lead, noteToDelete]);

    // Follow-up creation states
    const theme = useTheme();
    const [openTypeDialog, setOpenTypeDialog] = useState(false);
    const [openCallDialog, setOpenCallDialog] = useState(false);
    const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
    const [openTodoDialog, setOpenTodoDialog] = useState(false);

    const [selectedCallDoc, setSelectedCallDoc] = useState<any>(null);
    const [selectedMeetingDoc, setSelectedMeetingDoc] = useState<any>(null);
    const [selectedTodoDoc, setSelectedTodoDoc] = useState<any>(null);

    const handleViewFollowup = useCallback(async (name: string, type: string) => {
        try {
            if (type === 'Call') {
                const call = await getCall(name);
                setSelectedCallDoc(call);
                setOpenCallDialog(true);
            } else if (type === 'Meeting') {
                const meeting = await getMeeting(name);
                setSelectedMeetingDoc(meeting);
                setOpenMeetingDialog(true);
            } else if (type === 'ToDo' || type === 'To-do') {
                const todo = await getToDo(name);
                setSelectedTodoDoc(todo);
                setOpenTodoDialog(true);
            }
        } catch (error) {
            console.error('Failed to fetch event details:', error);
            setSnackbar({ open: true, message: 'Failed to fetch event details', severity: 'error' });
        }
    }, []);

    const refreshFollowupHistory = useCallback(async () => {
        if (!lead?.name) return;
        try {
            setFollowupLoading(true);
            const history = await getFollowupHistory("Lead", lead.name);
            setFollowupHistory(history || []);
        } catch (error) {
            console.error("Failed to load followup history", error);
        } finally {
            setFollowupLoading(false);
        }
    }, [lead?.name]);

    useEffect(() => {
        const loadFollowups = async () => {
            if (!lead?.name) return;

            try {
                setFollowupLoading(true);

                const history = await getFollowupHistory(
                    "Lead",
                    lead.name
                );

                setFollowupHistory(history || []);
            } catch (error) {
                console.error("Failed to load followup history", error);
            } finally {
                setFollowupLoading(false);
            }
        };

        loadFollowups();
    }, [lead?.name]);

    useEffect(() => {
        if (!lead?.name) return;

        getProposalByLeadId(lead.name)
            .then(setProposalHistory)
            .catch(console.error);
    }, [lead?.name]);

    useEffect(() => {
        if (lead) {
            setSelectedStage(lead.workflow_state);
        }
    }, [lead]);

    const [ownerDetails, setOwnerDetails] = useState<{ full_name: string; email: string } | null>(null);

    useEffect(() => {
        const loadNames = async () => {
            if (lead?.owner) {
                try {
                    const userDoc = await getDoc("User", lead.owner);
                    setOwnerDetails({
                        full_name: userDoc.full_name || userDoc.first_name || lead.owner,
                        email: userDoc.email || lead.owner,
                    });
                } catch (e) {
                    console.error("Failed to fetch owner user doc:", e);
                }
            }

            if (lead?.converted_account) {
                const company = await getDoc(
                    "Accounts",
                    lead.converted_account
                );

                setConvertedAccountName(
                    company.account_name
                );
            }

            if (lead?.converted_contact) {
                const client = await getDoc(
                    "Contacts",
                    lead.converted_contact
                );

                setConvertedContactName(
                    client.first_name
                );
            }
        };

        loadNames();
    }, [lead]);

    useEffect(() => {
        const fetchWorkflowData = async () => {
            if (!lead) return;
            const currentState = lead.workflow_state || lead.status || 'New Lead';

            try {
                const wf = await getWorkflowStates('Lead');
                const actions = await getWorkflowActions('Lead', currentState);
                setAllWorkflowData({ states: wf.states, actions });
            } catch (error) {
                console.error('Failed to fetch workflow data:', error);
            }
        };

        fetchWorkflowData();
    }, [lead]);

    const handleCloseSnackbar = useCallback(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    }, []);

    const [metaInfo, setMetaInfo] = useState<any>(null);

    useEffect(() => {
        if (id) {
            setLoading(true);
            getLead(id)
                .then(setLead)
                .catch((err) => console.error('Failed to fetch lead details:', err))
                .finally(() => setLoading(false));

            getMetaLeadInfo(id)
                .then(setMetaInfo)
                .catch((err) => console.error('Failed to fetch meta lead info:', err));
        }
    }, [id]);

    const handleConvert = async () => {
        if (!id) return;
        setConverting(true);
        try {
            const result = await convertLead(id);

            if (result.messages && result.messages.length > 0) {
                const firstMsg = result.messages[0];
                setSnackbar({
                    open: true,
                    message: firstMsg.text,
                    severity: firstMsg.type === 'success' ? 'success' : 'warning'
                });
            } else {
                setSnackbar({ open: true, message: 'Lead converted successfully', severity: 'success' });
            }

            const updatedLead = await getLead(id);
            setLead(updatedLead);
        } catch (err: any) {
            console.error('Failed to convert lead:', err);
            const errorMsg = handleFrappeError(err, 'Failed to convert lead');
            setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        } finally {
            setConverting(false);
        }
    };

    const handleUpdateStage = useCallback(async () => {
        if (!lead || !selectedStage || selectedStage === lead.workflow_state) return;

        const action = allWorkflowData.actions.find(a => a.next_state === selectedStage)?.action;

        if (!action) {
            setSnackbar({
                open: true,
                message: `Invalid state transition to "${selectedStage}" from current state.`,
                severity: 'error'
            });
            setSelectedStage(lead.workflow_state);
            return;
        }

        const previousStage = lead.workflow_state;
        setConfirmUpdate(false);
        setUpdatingStage(true);
        try {
            await applyWorkflowAction('Lead', lead.name, action);
            const updated = await getLead(lead.name);
            setLead(updated);
            setSnackbar({
                open: true,
                message: `Lead status updated from "${previousStage}" to "${selectedStage}" successfully`,
                severity: 'success'
            });

            // Fetch WhatsApp automation preview
            try {
                const preview = await getAutomationPreview('Lead', lead.name, previousStage);
                if (preview && preview.show_confirmation) {
                    setAutomationData(preview);
                    setOpenAutomationDialog(true);
                }
            } catch (automationErr: any) {
                console.error('Failed to fetch WhatsApp automation preview:', automationErr);
            }
            try {
                const emailPreview = await getEmailAutomationPreview('Lead', lead.name, previousStage);
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
                message: err.message || 'Failed to update status',
                severity: 'error'
            });
            setSelectedStage(lead.workflow_state || previousStage);
        } finally {
            setUpdatingStage(false);
        }
    }, [lead, selectedStage, allWorkflowData]);

    const handleSendAutomationMessage = useCallback(async (proposalName: string | null) => {
        if (!lead || !automationData) return;
        try {
            await sendAutomationMessage(
                automationData.automation_name,
                'Lead',
                lead.name,
                proposalName
            );

            const latestMsg = await getLatestWhatsAppMessage(lead.name, false);
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
    }, [lead, automationData]);

    const handleSendEmailAutomation = useCallback(
        async (proposalName: string | null, attachments?: { file_url: string }[] | null) => {
            if (!lead || !emailAutomationData) return;

            try {
                await sendEmailAutomationMessage(
                    emailAutomationData.automation_name,
                    "Lead",
                    lead.name,
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
        [lead, emailAutomationData]
    );

    const handleStageUpdateClick = useCallback(() => {
        if (!lead || !selectedStage || selectedStage === (lead.workflow_state || 'New Lead')) {
            return;
        }
        setConfirmUpdate(true);
    }, [lead, selectedStage]);

    const renderPremiumStatus = (status: string) => {
        let bgColor = '#1B53F4';
        let icon: React.ReactNode | string = 'solar:star-bold';
        let iconColor = '#FFE054';

        if (status === 'New Lead') {
            bgColor = '#1B53F4';
            icon = <FaStar />;
            iconColor = '#FFFFFF';
        } else if (status === 'Qualified' || status === 'Proposal Approved') {
            bgColor = '#0E9F6E';
            icon = 'solar:check-circle-bold';
            iconColor = '#6EE7B7';
        } else if (status === 'Not Interested' || status === 'In Active' || status === 'Proposal Rejected') {
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
                    boxShadow: () => `0 4px 10px ${alpha(bgColor, 0.3)}`,
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

    const TABS = [
        { value: 'general', label: 'General' },
        { value: 'convert', label: 'Convert Lead' },
        ...(canViewFollowups ? [{ value: 'followups', label: 'Followups' }] : []),
        { value: 'pipeline', label: 'Stage History' },
        ...(canViewProposals ? [{ value: 'proposal', label: 'Proposals' }] : []),
        { value: 'notes', label: 'Notes' },
    ];

    if (loading) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!lead) {
        return (
            <DashboardContent maxWidth={false}>
                <Box sx={{ py: 20, textAlign: 'center' }}>
                    <Iconify icon={"solar:ghost-bold" as any} width={80} sx={{ color: 'text.disabled', mb: 3 }} />
                    <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 800 }}>Lead Not Found</Typography>
                    <Button onClick={() => router.push('/leads')} sx={{ mt: 3 }} variant="contained">
                        Go back to leads
                    </Button>
                </Box>
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth={false}>
            {/* Top Header */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={4}
                mt={2}
            >
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    Lead Profile
                </Typography>

                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                            if (location.state?.from) {
                                navigate(location.state.from, { state: location.state?.parentState || location.state });
                            } else {
                                navigate(-1);
                            }
                        }}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Go Back
                    </Button>

                    {canCreateFollowup && (
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon="solar:calendar-add-bold" />}
                            onClick={() => setOpenTypeDialog(true)}
                            sx={{ borderRadius: 1.5, fontWeight: 700, bgcolor: '#0e9f6e' }}
                        >
                            Create Follow-up
                        </Button>
                    )}

                    {canCreateProposal && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                                router.push(`/proposals/new?lead=${lead.name}`, {
                                    from: location.pathname + location.search,
                                    leadTab: 'proposal',
                                    parentState: location.state,
                                });
                            }}
                            startIcon={
                                <RiMailSendLine />
                            }
                            sx={{
                                bgcolor: '#9625d3ff',
                                color: '#fff',
                                borderRadius: 1.5,
                                fontWeight: 700,
                                textTransform: 'none',
                                px: 2.5,
                                '&:hover': {
                                    bgcolor: '#9625d3ff',
                                },
                            }}
                        >
                            Create Proposal
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        color="success"
                        onClick={() => setOpenWhatsapp(true)}
                        startIcon={
                            <Iconify
                                icon={"ic:baseline-whatsapp" as any}
                            />
                        }
                        sx={{
                            bgcolor: '#25D366',
                            color: '#fff',
                            borderRadius: 2.5,
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 2.5,
                            boxShadow: '0 4px 12px rgba(37,211,102,0.25)',

                            '&:hover': {
                                bgcolor: '#22c55e',
                            },
                        }}
                    >
                        WhatsApp
                    </Button>
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
                        const stages = allWorkflowData.states.length > 0 ? allWorkflowData.states : ['New Lead'];
                        const effectiveLeadStage = lead.workflow_state || lead.status || 'New Lead';
                        const currentActiveStage = selectedStage || effectiveLeadStage;
                        const activeIndex = stages.findIndex(s => s === currentActiveStage);

                        return stages.map((stage: string, index: number) => {
                            const isCompletedOrActive = index <= activeIndex;
                            const isActive = stage === currentActiveStage;

                            return (
                                <Box
                                    key={stage}
                                    onClick={() => setSelectedStage(stage)}
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
                                        clipPath: getClipPath(index, stages.length),
                                        bgcolor: isCompletedOrActive ? '#2081C3' : '#e0e0e0b5',
                                        color: isCompletedOrActive ? 'common.white' : '#4c545a',
                                        fontWeight: isActive ? 800 : 600,
                                        fontSize: { xs: 11, md: 11.5 },
                                        lineHeight: 1.15,
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'pre-line',
                                        position: 'relative',
                                        zIndex: stages.length - index,
                                        '&:hover': {
                                            opacity: 0.88,
                                        }
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', textAlign: 'inherit', zIndex: 1, pl: index === 0 ? 0 : 1, pr: index === stages.length - 1 ? 0 : 1 }}>
                                        {stage}
                                    </Typography>
                                </Box>
                            );
                        });
                    })()}
                </Box>
                {canEditLead && (
                    <Button
                        variant="contained"
                        disabled={!selectedStage || selectedStage === (lead.workflow_state || lead.status || 'New Lead') || updatingStage}
                        onClick={handleStageUpdateClick}
                        sx={{
                            height: 36,
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
                        {updatingStage ? <CircularProgress size={20} color="inherit" /> : 'Edit Status'}
                    </Button>
                )}
            </Card>

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
                    mb: 3,
                    background:
                        theme.palette.mode === 'light'
                            ? `linear-gradient(135deg, #F6FAFE 0%, #EDF4FB 100%)`
                            : alpha(theme.palette.primary.main, 0.08),
                    border:
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

            {/* Grid layout containing left column (details & tabs) and right column (notes) */}
            <Grid container spacing={3}>
                <Grid
                    size={{ xs: 12, md: showNotes ? 8.4 : 12 }}
                    sx={{
                        transition: (themeVar) => themeVar.transitions.create(['width', 'flex-basis', 'max-width'], {
                            duration: themeVar.transitions.duration.shorter,
                        })
                    }}
                >
                    <Card
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            borderRadius: 2.5,
                            border: (themeVar) => `1px solid ${themeVar.palette.mode === 'light' ? '#E2EAF5' : alpha(themeVar.palette.primary.main, 0.16)}`,
                            bgcolor: 'background.paper',
                            boxShadow: 'none',
                        }}
                    >
                        {/* Tabs */}
                        <Box
                            sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                            }}
                        >
                            <Tabs
                                value={currentTab}
                                onChange={(e, newValue) => {
                                    setCurrentTab(newValue);
                                    setShowNotes(newValue === 'notes');
                                }}
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

                        {/* Tab Content */}
                        <Box
                            sx={{
                                p: 4,
                                flexGrow: 1,
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {(currentTab === 'general' || currentTab === 'notes') && (
                                    <>
                                        {/* General Information */}
                                        <Box sx={{ margin: 2 }}>
                                            <SectionHeader title="Contact & Service" icon={<FaPhone size={15} />} />
                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gap: 3,
                                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                                                }}
                                            >
                                                <DetailItem
                                                    label="Phone"
                                                    value={
                                                        lead.phone_numbers?.length
                                                            ? lead.phone_numbers.map((p: any) => p.phone).join(", ")
                                                            : lead.phone_number
                                                    }
                                                    icon={<FaPhone size={13} />}
                                                />
                                                <DetailItem
                                                    label="Email"
                                                    value={
                                                        lead.emails?.length
                                                            ? lead.emails.map((e: any) => e.email).join(", ")
                                                            : lead.email
                                                    }
                                                    icon={<FaEnvelope size={13} />}
                                                />
                                                <DetailItem label="Service" value={lead.service} icon={<FaLightbulb size={13} />} color="info.main" />
                                                <DetailItem label="Leads Type" value={lead.leads_type} icon={<FaTag size={13} />} />
                                                <DetailItem label="Leads From" value={lead.leads_from} icon={<FaGlobe size={13} />} />
                                                <DetailItem label="GSTIN" value={lead.gstin} icon={<FaListCheck size={13} />} />
                                            </Box>
                                        </Box>

                                        {/* Location & Status */}
                                        <Box sx={{ margin: 2 }}>
                                            <SectionHeader title="Location & Preferences" icon={<FaLocationDot size={15} />} />
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
                                            </Box>
                                        </Box>

                                        {/* System Information */}
                                        <Box sx={{ margin: 2 }}>
                                            <SectionHeader title="System Information" icon={<MdInfo size={18} />} />
                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gap: 3,
                                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                                                }}
                                            >
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                                                        Owner
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                                        <Box sx={{ color: 'text.disabled', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <FaUser size={13} />
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                                {ownerDetails?.full_name || lead.owner_name || lead.owner || '-'}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block' }}>
                                                                {ownerDetails?.email || (lead.owner && lead.owner.includes('@') ? lead.owner : '')}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                <DetailItem label="Creation" value={`${new Date(lead.creation).toLocaleDateString('en-GB').replace(/\//g, '-')} ${new Date(lead.creation).toLocaleTimeString('en-GB')}`} icon={<FaCalendarDays size={13} />} />
                                                <DetailItem label="Modified" value={`${new Date(lead.modified).toLocaleDateString('en-GB').replace(/\//g, '-')} ${new Date(lead.modified).toLocaleTimeString('en-GB')}`} icon={<FaCalendarDays size={13} />} />
                                            </Box>
                                        </Box>

                                         {/* Notes Section (Outside Additional Info) */}
                                         {(lead.notes || (metaInfo && (metaInfo.form_name || metaInfo.page_name))) && (
                                             <Box
                                                 sx={{
                                                     p: 3,
                                                     bgcolor: theme.palette.mode === 'light' ? '#F4F7FB' : alpha(theme.palette.primary.main, 0.04),
                                                     borderRadius: 2.5,
                                                     border: `1px solid ${theme.palette.mode === 'light' ? '#E8EEF5' : alpha(theme.palette.primary.main, 0.12)}`,
                                                 }}
                                             >
                                                 <SectionHeader title="Notes" icon={<CgNotes size={18} />} noMargin />
                                                 {lead.notes && (
                                                     <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                                                         {lead.notes.split('\n\n').map((item: string, idx: number) => {
                                                             const parts = item.split('\n');
                                                             const label = parts[0] || '';
                                                             let value = parts.slice(1).join('\n') || '';

                                                             // Format raw option key strings like '1000_(starter)' -> '1000 (Starter)'
                                                             if (value && value.includes('_') && value.includes('(') && value.includes(')')) {
                                                                 const cleanedVal = value.replace(/_/g, ' ');
                                                                 const vParts = cleanedVal.split('(');
                                                                 if (vParts.length === 2 && vParts[1].endsWith(')')) {
                                                                     const inner = vParts[1].slice(0, -1).trim();
                                                                     const capitalizedInner = inner.charAt(0).toUpperCase() + inner.slice(1);
                                                                     value = `${vParts[0].trim()} (${capitalizedInner})`;
                                                                 }
                                                             }

                                                             return (
                                                                 <Box key={idx}>
                                                                     <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 800, mb: 0.5, fontSize: 15 }}>
                                                                         {label}
                                                                     </Typography>
                                                                     <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap', opacity: 0.8, fontSize: 15 }}>
                                                                         {value}
                                                                     </Typography>
                                                                 </Box>
                                                             );
                                                         })}
                                                     </Box>
                                                 )}

                                                 {metaInfo && (metaInfo.form_name || metaInfo.page_name) && (
                                                     <>
                                                         {lead.notes && (
                                                             <Divider sx={{ my: 3, borderStyle: 'solid', borderColor: theme.palette.mode === 'light' ? '#E8EEF5' : alpha(theme.palette.divider, 0.5) }} />
                                                         )}
                                                         <Box
                                                             sx={{
                                                                 mt: lead.notes ? 0 : 3,
                                                                 display: 'grid',
                                                                 gap: 3,
                                                                 gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                                                             }}
                                                         >
                                                             {metaInfo.form_name && (
                                                                 <Box>
                                                                     <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block', letterSpacing: 0.2 }}>
                                                                         Form Details
                                                                     </Typography>
                                                                     <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>
                                                                         {metaInfo.form_name} {metaInfo.form_id ? `(${metaInfo.form_id})` : ''}
                                                                     </Typography>
                                                                 </Box>
                                                             )}
                                                             {metaInfo.page_name && (
                                                                 <Box>
                                                                     <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block', letterSpacing: 0.2 }}>
                                                                         Page Details
                                                                     </Typography>
                                                                     <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: 14 }}>
                                                                         {metaInfo.page_name} {metaInfo.page_id ? `(${metaInfo.page_id})` : ''}
                                                                     </Typography>
                                                                 </Box>
                                                             )}
                                                         </Box>
                                                     </>
                                                 )}
                                             </Box>
                                         )}

                                        {/* Additional Info */}
                                        <Box
                                            sx={{
                                                p: 3,
                                                bgcolor: theme.palette.mode === 'light' ? '#F4F7FB' : alpha(theme.palette.primary.main, 0.04),
                                                borderRadius: 2.5,
                                                border: `1px solid ${theme.palette.mode === 'light' ? '#E8EEF5' : alpha(theme.palette.primary.main, 0.12)}`,
                                            }}
                                        >
                                            <SectionHeader title="Additional Information" icon={<FaFileLines size={18} />} noMargin />
                                            <Box sx={{ mt: 3.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#68707bff', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block', letterSpacing: 0.2 }}>
                                                        Billing Address
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, lineHeight: 1.6 }}>
                                                        {lead.billing_address || 'No address provided'}
                                                    </Typography>
                                                </Box>
                                                <Divider sx={{ borderStyle: 'solid', borderColor: theme.palette.mode === 'light' ? '#E8EEF5' : alpha(theme.palette.divider, 0.5) }} />
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#68707bff', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block', letterSpacing: 0.8 }}>
                                                        Remark
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
                                        <LeadPipelineTimeline
                                            title="Stage History"
                                            list={lead.converted_pipeline_timeline || []}
                                        />
                                    </Box>
                                )}

                                {currentTab === 'followups' && canViewFollowups && (
                                    <LeadFollowupDetails
                                        title="Followup History"
                                        list={followupHistory}
                                        onView={handleViewFollowup}
                                    />
                                )}

                                {currentTab === 'proposal' && canViewProposals && (
                                    <LeadProposalDetails
                                        title="Proposal List"
                                        list={proposalHistory}
                                    />
                                )}

                                {currentTab === 'convert' && (
                                    <Box sx={{ py: 3 }}>
                                        {lead.converted_account || lead.converted_contact ? (
                                            <Box>
                                                <Box sx={{ padding: 5, bgcolor: theme.palette.mode === 'light' ? '#F4F7FB' : alpha(theme.palette.primary.main, 0.04), borderRadius: 2.5, border: `1px solid ${theme.palette.mode === 'light' ? '#E8EEF5' : alpha(theme.palette.primary.main, 0.12)}`, }}>
                                                    <Stack spacing={2.5}>
                                                        <Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                                                    Converted Company
                                                                </Typography>
                                                            </Box>
                                                            <Typography
                                                                variant="h6"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    color: 'text.primary',
                                                                    lineHeight: 1.3,
                                                                }}
                                                            >
                                                                {convertedAccountName || 'NA'}
                                                            </Typography>

                                                            {lead.converted_contact && (
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: 'primary.main',
                                                                        fontWeight: 700,
                                                                        mt: 0.5,
                                                                    }}
                                                                >
                                                                    {lead.converted_account}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <Divider sx={{ borderStyle: 'dashed' }} />
                                                        <Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                                                    Converted Client
                                                                </Typography>
                                                            </Box>
                                                            <Typography
                                                                variant="h6"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    color: 'text.primary',
                                                                    lineHeight: 1.3,
                                                                }}
                                                            >
                                                                {convertedContactName || 'NA'}
                                                            </Typography>

                                                            {lead.converted_contact && (
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: 'primary.main',
                                                                        fontWeight: 700,
                                                                        mt: 0.5,
                                                                    }}
                                                                >
                                                                    {lead.converted_contact}
                                                                </Typography>
                                                            )}

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
                                                {canCreateClient && canCreateCompany && (
                                                    <Button
                                                        variant="contained"
                                                        size="large"
                                                        color="primary"
                                                        startIcon={converting ? <Iconify icon={"svg-spinners:18-dots-indicator" as any} /> : <Iconify icon={"solar:refresh-bold" as any} />}
                                                        onClick={() => setOpenConvertDialog(true)}
                                                        disabled={converting}
                                                        sx={{ px: 4, height: 48, fontWeight: 800 }}
                                                    >
                                                        {converting ? 'Converting...' : 'Convert Lead Now'}
                                                    </Button>
                                                )}
                                                {!canCreateClient && !canCreateCompany && (
                                                    <Typography variant="body1" sx={{ color: '#ff0010', mb: 4, maxWidth: 400, mx: 'auto', fontWeight: 600 }}>
                                                        Permission denied. You cannot convert this lead.
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Card>
                </Grid>

                {showNotes && (
                    <Grid size={{ xs: 12, md: 3.6 }}>
                        <Card
                            sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                minHeight: 400,
                                borderRadius: 2.5,
                                border: (themeVar) => `1px solid ${themeVar.palette.mode === 'light' ? '#E2EAF5' : alpha(themeVar.palette.primary.main, 0.16)}`,
                                bgcolor: 'background.paper',
                                boxShadow: 'none',
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Lead Notes
                                </Typography>
                                {canEditLead && (
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            setSelectedNote(null);
                                            setOpenNoteDialog(true);
                                        }}
                                        sx={{
                                            borderRadius: 5.5,
                                            fontWeight: 700,
                                            textTransform: 'none',
                                            px: 2.1,
                                            height: 32,
                                            bgcolor: '#2081C3',
                                            color: '#fff',
                                            fontSize: '0.8125rem',
                                            letterSpacing: 0.2,
                                            '&:hover': { bgcolor: '#1a699f' },
                                            boxShadow: '0 2px 8px rgba(32,129,195,0.25)',
                                        }}
                                    >
                                        Add Note
                                    </Button>
                                )}

                            </Stack>

                            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 800, pr: 0.5 }}>
                                {!lead.lead_notes || lead.lead_notes.length === 0 ? (
                                    <Box sx={{ py: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <Iconify icon="solar:notes-bold-duotone" width={56} sx={{ color: 'text.disabled', mb: 2, opacity: 0.24 }} />
                                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            No notes added yet
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5 }}>
                                            Click &quot;Add Note&quot; to create a note.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={2}>
                                        {[...lead.lead_notes].reverse().map((note: any, index: number) => (
                                            <Card
                                                key={note.name || index}
                                                sx={(() => {
                                                    const palettes = [
                                                        { light: '#FFFBEB', dark: 'rgba(251,191,36,0.10)', border: '#FDE68A' },  // yellow
                                                        { light: '#EFF6FF', dark: 'rgba(96,165,250,0.10)', border: '#BFDBFE' },  // blue
                                                        { light: '#F0FDF4', dark: 'rgba(74,222,128,0.10)', border: '#BBF7D0' },  // green
                                                        { light: '#FAF5FF', dark: 'rgba(192,132,252,0.10)', border: '#E9D5FF' },  // purple
                                                    ];
                                                    const p = palettes[index % palettes.length];
                                                    return {
                                                        p: 2.5,
                                                        borderRadius: 1.5,
                                                        position: 'relative',
                                                        boxShadow: 'none',
                                                        border: (themeVar: any) => `1px solid ${themeVar.palette.mode === 'light' ? p.border : 'rgba(255,255,255,0.08)'}`,
                                                        bgcolor: (themeVar: any) => themeVar.palette.mode === 'light' ? p.light : p.dark,
                                                    };
                                                })()}
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleOpenNoteMenu(e, note)}
                                                    sx={{ position: 'absolute', top: 12, right: 12, color: 'text.disabled' }}
                                                >
                                                    <Iconify icon="eva:more-vertical-fill" width={18} />
                                                </IconButton>

                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, pr: 4, color: 'text.primary' }}>
                                                    {note.title}
                                                </Typography>

                                                {note.description && (
                                                    <Box
                                                        dangerouslySetInnerHTML={{ __html: note.description }}
                                                        sx={{
                                                            typography: 'body2',
                                                            color: 'text.secondary',
                                                            mt: 1,
                                                            wordBreak: 'break-word',
                                                            '& p': { margin: 0 },
                                                            '& ul, & ol': { pl: 2, my: 0.5 }
                                                        }}
                                                    />
                                                )}

                                                {(note.creation || note.owner) && (
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        justifyContent="space-between"
                                                        mt={1.5}
                                                    >
                                                        {note.creation ? (
                                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                                                {fDateTime(note.creation)}
                                                            </Typography>
                                                        ) : <span />}

                                                        {note.owner && (
                                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                                                                {note.owner}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                )}
                                            </Card>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Card>
                    </Grid>
                )}
            </Grid>

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

            <WhatsappChatDialog
                open={openWhatsapp}
                onClose={() => setOpenWhatsapp(false)}
                lead={lead}
            />

            <LeadConvertDialog
                open={openConvertDialog}
                onClose={() => setOpenConvertDialog(false)}
                lead={lead}
                onReadyToConvert={() => setOpenConfirm(true)}
                onError={(msg) => setSnackbar({ open: true, message: msg, severity: 'error' })}
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

            <ConfirmDialog
                open={confirmUpdate}
                onClose={() => setConfirmUpdate(false)}
                title="Confirm Status Update"
                content={selectedStage ? `Are you sure you want to update the lead status to "${selectedStage}"?` : 'Are you sure you want to update the lead status?'}
                icon="solar:info-circle-bold"
                iconColor="#2081C3"
                action={
                    <Button onClick={handleUpdateStage} color="primary" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        {updatingStage ? <CircularProgress size={20} color="inherit" /> : 'Update'}
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
                    lead={lead}
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
                    lead={lead}
                    onSend={handleSendEmailAutomation}
                />
            )}

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

            {/* Event Type Selection Dialog */}
            <Dialog open={openTypeDialog} onClose={() => setOpenTypeDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: (t: any) => t.customShadows.z24, } }}>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Choose Event Type
                    <IconButton onClick={() => setOpenTypeDialog(false)} sx={{ color: 'text.secondary' }}>
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ py: 2 }}>
                        {[
                            {
                                label: 'Calls',
                                icon: `${CONFIG.assetsDir}/images/calls-3d-white.png`,
                                color: 'primary',
                                sub: 'Schedule a call',
                                handler: () => {
                                    setOpenTypeDialog(false);
                                    setOpenCallDialog(true);
                                },
                            },
                            {
                                label: 'Meeting',
                                icon: `${CONFIG.assetsDir}/images/meeting-3d-white.png`,
                                color: 'success',
                                sub: 'Schedule a meeting',
                                handler: () => {
                                    setOpenTypeDialog(false);
                                    setOpenMeetingDialog(true);
                                },
                            },
                            {
                                label: 'To-do',
                                icon: `${CONFIG.assetsDir}/images/todo-3d-white.png`,
                                color: 'warning',
                                sub: 'Create a task',
                                handler: () => {
                                    setOpenTypeDialog(false);
                                    setOpenTodoDialog(true);
                                },
                            },
                        ].map((item) => (
                            <Grid key={item.label} size={{ xs: 12, md: 4 }}>
                                <Box
                                    onClick={item.handler}
                                    sx={{
                                        p: 3,
                                        borderRadius: 2.5,
                                        cursor: 'pointer',
                                        transition: theme.transitions.create(['all'], {
                                            duration: theme.transitions.duration.shorter,
                                        }),
                                        textAlign: 'center',
                                        bgcolor: alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.04),
                                        border: `1px solid ${alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.1)}`,
                                        backdropFilter: 'blur(12px) saturate(160%)',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.08),
                                            borderColor: theme.palette[item.color as 'primary' | 'success' | 'warning'].main,
                                            transform: 'translateY(-6px)',
                                            boxShadow: `0 12px 24px -4px ${alpha(theme.palette[item.color as 'primary' | 'success' | 'warning'].main, 0.16)}`,
                                            '& img': {
                                                transform: 'scale(1.1) rotate(5deg)',
                                            }
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mb: 1,
                                            display: 'inline-flex',
                                            transition: theme.transitions.create(['transform']),
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={item.icon}
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                objectFit: 'contain',
                                                mixBlendMode: 'multiply',
                                                filter: 'contrast(1.2) brightness(1.1)',
                                                transition: theme.transitions.create(['transform']),
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{item.label}</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.813rem' }}>
                                        {item.sub}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
            </Dialog>

            {/* Event Form Dialogs prefilled with lead details */}
            {openCallDialog && lead && (
                <CallDialog
                    open={openCallDialog}
                    onClose={() => {
                        setOpenCallDialog(false);
                        setSelectedCallDoc(null);
                    }}
                    selectedCall={selectedCallDoc}
                    initialData={{
                        lead_name: lead.name,
                        title: `Follow up call with ${lead.lead_name}`
                    }}
                    onSuccess={() => {
                        setOpenCallDialog(false);
                        setSelectedCallDoc(null);
                        refreshFollowupHistory();
                        setSnackbar({ open: true, message: 'Call saved successfully', severity: 'success' });
                    }}
                />
            )}

            {openMeetingDialog && lead && (
                <MeetingDialog
                    open={openMeetingDialog}
                    onClose={() => {
                        setOpenMeetingDialog(false);
                        setSelectedMeetingDoc(null);
                    }}
                    selectedMeeting={selectedMeetingDoc}
                    initialData={{
                        lead_name: lead.name,
                        title: `Follow up meeting with ${lead.lead_name}`
                    }}
                    onSuccess={() => {
                        setOpenMeetingDialog(false);
                        setSelectedMeetingDoc(null);
                        refreshFollowupHistory();
                        setSnackbar({ open: true, message: 'Meeting saved successfully', severity: 'success' });
                    }}
                />
            )}

            {openTodoDialog && lead && (
                <TodoDialog
                    open={openTodoDialog}
                    onClose={() => {
                        setOpenTodoDialog(false);
                        setSelectedTodoDoc(null);
                    }}
                    selectedTodo={selectedTodoDoc}
                    initialData={{
                        description: `Follow up task for lead: ${lead.lead_name}`
                    }}
                    onSuccess={() => {
                        setOpenTodoDialog(false);
                        setSelectedTodoDoc(null);
                        refreshFollowupHistory();
                        setSnackbar({ open: true, message: 'To-do task saved successfully', severity: 'success' });
                    }}
                />
            )}
            {/* Note Dialogs & Menus */}
            <LeadNoteDialog
                open={openNoteDialog}
                onClose={() => {
                    setOpenNoteDialog(false);
                    setSelectedNote(null);
                }}
                selectedNote={selectedNote}
                onSave={handleSaveNote}
            />

            <ConfirmDialog
                open={openNoteDeleteConfirm}
                onClose={() => {
                    setOpenNoteDeleteConfirm(false);
                    setNoteToDelete(null);
                }}
                title="Confirm Delete"
                content="Are you sure you want to delete this note? This action cannot be undone."
                icon="solar:trash-bin-trash-bold"
                iconColor="error.main"
                action={
                    <Button onClick={handleConfirmDeleteNote} color="error" variant="contained" sx={{ borderRadius: 1.5, minWidth: 100 }}>
                        Delete
                    </Button>
                }
            />

            <Menu
                anchorEl={noteMenuAnchorEl}
                open={Boolean(noteMenuAnchorEl)}
                onClose={handleCloseNoteMenu}
                onClick={(e) => e.stopPropagation()}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: { width: 140 }
                    }
                }}
            >
                <MenuItem
                    onClick={() => {
                        setSelectedNote(activeMenuNote);
                        setOpenNoteDialog(true);
                        handleCloseNoteMenu();
                    }}
                    sx={{
                        gap: 1.5,
                        typography: 'body2',
                        fontWeight: 600,
                        color: 'info.main',
                        '& svg': { color: 'inherit' }
                    }}
                >
                    <Iconify icon="solar:pen-bold" width={18} />
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={() => handleDeleteNoteClick(activeMenuNote)}
                    sx={{
                        gap: 1.5,
                        typography: 'body2',
                        fontWeight: 600,
                        color: 'error.main',
                        '& svg': { color: 'inherit' }
                    }}
                >
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                    Delete
                </MenuItem>
            </Menu>
        </DashboardContent>
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
