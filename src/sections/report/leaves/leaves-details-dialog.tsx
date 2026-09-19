import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';
import { FaFileAlt, FaExternalLinkAlt } from 'react-icons/fa';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { getEmployee } from 'src/api/employees';
import { getHRDoc } from 'src/api/hr-management';
import { type WorkflowAction, getLeaveWorkflowActions, updateLeaveStatus, applyLeaveWorkflowAction, checkLeaveOverlap } from 'src/api/leaves';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { ClarificationDialog } from '../requests/clarification-dialog';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    leaveId: string | null;
    onRefresh?: () => void;
    socket?: any;
};

export function LeavesDetailsDialog({ open, onClose, leaveId, onRefresh, socket }: Props) {
    const [leave, setLeave] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [actions, setActions] = useState<WorkflowAction[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [commentDialogOpen, setCommentDialogOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);

    const [openClarification, setOpenClarification] = useState(false);
    const [clarificationType, setClarificationType] = useState<'HR' | 'Employee'>('HR');
    const [employeeDetails, setEmployeeDetails] = useState<any>(null);
    const [fetching, setFetching] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const { user } = useAuth();
    const userRoles = user?.roles || [];
    const isHR = userRoles.some(r => r.includes('HR')) || userRoles.includes('Administrator') || userRoles.includes('System Manager');
    const isEmployee = !isHR;

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.leaves;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.leaves?.edit : true;

    const fetchData = useCallback(async (isSilent = false) => {
        if (!leaveId) return;
        if (!isSilent) setLoading(true);
        try {
            const data = await getHRDoc('Leave Application', leaveId);
            setLeave(data);
            const empId = data.employee || data.employee_id;
            if (empId) {
                getEmployee(empId).then(setEmployeeDetails).catch(console.error);
            }
            if (data?.workflow_state) {
                const availableActions = await getLeaveWorkflowActions(data.workflow_state);
                setActions(availableActions);
            }
        } catch (err) {
            console.error('Failed to fetch leave details:', err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [leaveId]);

    useEffect(() => {
        if (open && leaveId) {
            fetchData();
        }
    }, [open, leaveId, fetchData]);

    // Real-time: refresh when this specific leave application changes
    useEffect(() => {
        if (!socket || !open || !leaveId) return undefined;

        const handleUpdate = (data: any) => {
            if (data?.name === leaveId) {
                fetchData(true); // silent refresh
            }
        };

        socket.on('leave_application_updated', handleUpdate);
        return () => socket.off('leave_application_updated', handleUpdate);
    }, [socket, open, leaveId, fetchData]);

    const handleActionClick = async (action: WorkflowAction) => {
        setSelectedAction(action);
        const lowerAction = action.action.toLowerCase();

        if (lowerAction.includes('clarification') || lowerAction.includes('query')) {
            setClarificationType('HR');
            setOpenClarification(true);
        } else if (lowerAction.includes('reply')) {
            setClarificationType('Employee');
            setOpenClarification(true);
        } else if (lowerAction.includes('approve')) {
            // 🛡️ PREEMPTIVE OVERLAP CHECK
            try {
                setSubmitting(true);
                const res = await checkLeaveOverlap({
                    employee: leave.employee,
                    from_date: leave.from_date,
                    to_date: leave.to_date,
                    exclude_doc: leave.name
                });

                if (res.overlap) {
                    enqueueSnackbar(res.message, { variant: 'error' });
                    setSubmitting(false);
                    return;
                }
                await handleApplyAction(action);
            } catch (error) {
                console.error("Overlap check failed", error);
                await handleApplyAction(action); // Fallback to normal flow if check fails
            }
        } else if (lowerAction.includes('reject')) {
            await handleApplyAction(action);
        } else {
            setCommentDialogOpen(true);
        }
    };

    const handleApplyAction = async (actionOverride?: WorkflowAction, message?: string) => {
        const actionToApply = actionOverride || selectedAction;
        if (!actionToApply || !leaveId) return;

        try {
            setSubmitting(true);
            const status = actionToApply.next_state || actionToApply.action;
            const updateData: any = {};

            if (message) {
                if (clarificationType === 'HR') {
                    const fields = ['hr_query', 'hr_query_2', 'hr_query_3', 'hr_query_4', 'hr_query_5'];
                    const nextField = fields.find(f => !leave[f]);
                    if (nextField) updateData[nextField] = message;
                } else {
                    const fields = ['employee_reply', 'employee_reply_2', 'employee_reply_3', 'employee_reply_4', 'employee_reply_5'];
                    const nextField = fields.find(f => !leave[f]);
                    if (nextField) updateData[nextField] = message;
                }
            }

            if (comment) {
                // If there's a generic comment, we could handle it too, but here we focus on clarifications
            }

            const res = await applyLeaveWorkflowAction(leaveId, actionToApply.action, comment, updateData);

            setComment('');
            setCommentDialogOpen(false);
            setOpenClarification(false);
            setSelectedAction(null);

            await fetchData();
            if (onRefresh) onRefresh();

            // Only close if not a clarification/reply
            const lowerAction = actionToApply.action.toLowerCase();
            const isClarify = lowerAction.includes('clarification') || lowerAction.includes('query') || lowerAction.includes('reply');

            let successMessage = `Leave application ${actionToApply.action.toLowerCase().endsWith('e') ? `${actionToApply.action}d` : `${actionToApply.action}ed`} successfully`;
            if (lowerAction.includes('clarification') || lowerAction.includes('query')) {
                successMessage = 'Clarification requested successfully';
            } else if (lowerAction.includes('reply')) {
                successMessage = 'Reply submitted successfully';
            } else if (lowerAction.includes('approve')) {
                successMessage = 'Leave application approved successfully';
            } else if (lowerAction.includes('reject')) {
                successMessage = 'Leave application rejected successfully';
            }

            enqueueSnackbar(successMessage, { variant: 'success' });
            if (res?.email_warning) {
                enqueueSnackbar(res.email_warning, { variant: 'info' });
            }

            if (!isClarify) {
                onClose();
            }
        } catch (error: any) {
            console.error('Failed to apply action:', error);
            enqueueSnackbar(error?.message || `Failed to ${actionToApply.action.toLowerCase()} leave application`, { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'success';
            case 'Rejected': return 'error';
            case 'Pending': return 'warning';
            case 'Clarification Requested': return 'info';
            case 'Open': return 'info';
            default: return 'default';
        }
    };

    const getActionColor = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('approve')) return 'success';
        if (lower.includes('reject')) return 'error';
        if (lower.includes('clarification')) return 'info';
        return 'primary';
    };

    const getConversation = useCallback(() => {
        if (!leave) return [];
        const thread: { type: 'hr' | 'employee', text: string }[] = [];
        // Loop through all 5 potential query/reply pairs
        for (let i = 1; i <= 5; i++) {
            const hrField = i === 1 ? 'hr_query' : `hr_query_${i}`;
            const empField = i === 1 ? 'employee_reply' : `employee_reply_${i}`;

            const hrVal = leave[hrField];
            const empVal = leave[empField];

            if (hrVal && String(hrVal).trim()) {
                thread.push({ type: 'hr', text: String(hrVal).trim() });
            }
            if (empVal && String(empVal).trim()) {
                thread.push({ type: 'employee', text: String(empVal).trim() });
            }
        }
        return thread;
    }, [leave]);

    const conversation = getConversation();

    const hrQueryCount = [1, 2, 3, 4, 5].filter(i => {
        const field = i === 1 ? 'hr_query' : `hr_query_${i}`;
        return leave?.[field] && String(leave[field]).trim();
    }).length;

    const empReplyCount = [1, 2, 3, 4, 5].filter(i => {
        const field = i === 1 ? 'employee_reply' : `employee_reply_${i}`;
        return leave?.[field] && String(leave[field]).trim();
    }).length;

    // Filter available actions based on 5 conversation limit
    const filteredActions = actions.filter(action => {
        const lowerAction = action.action.toLowerCase();
        const isClarification = lowerAction.includes('clarification') || lowerAction.includes('query');
        const isReply = lowerAction.includes('reply');

        // If it's a clarification action and the limit is reached for the user's role
        if (isClarification && isHR && hrQueryCount >= 5) return false;
        if (isReply && isEmployee && empReplyCount >= 5) return false;

        return true;
    });

    const renderConversation = (
        <Box sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
            <SectionHeader title="Clarification History" icon="" />
            <Box
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    p: 2.5,
                    bgcolor: 'background.neutral',
                    borderRadius: 2,
                    overflowY: 'auto',
                    minHeight: 400,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                {conversation.length > 0 ? (
                    conversation.map((msg, idx) => {
                        const isSelf = (isHR && msg.type === 'hr') || (isEmployee && msg.type === 'employee');

                        return (
                            <Box
                                key={idx}
                                sx={{
                                    position: 'relative',
                                    maxWidth: '85%',
                                    alignSelf: isSelf ? 'flex-end' : 'flex-start',
                                    bgcolor: isSelf ? 'primary.main' : 'background.paper',
                                    color: isSelf ? 'primary.contrastText' : 'text.primary',
                                    p: 1.5,
                                    px: 2,
                                    borderRadius: 1.5,
                                    borderTopRightRadius: isSelf ? 0 : 1.5,
                                    borderTopLeftRadius: !isSelf ? 0 : 1.5,
                                    boxShadow: (theme) => theme.customShadows?.z1 || '0 1px 2px rgba(0,0,0,0.1)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        width: 0,
                                        height: 0,
                                        borderStyle: 'solid',
                                        ...(isSelf
                                            ? {
                                                right: -10,
                                                borderWidth: '0 0 12px 12px',
                                                borderColor: (theme) => `transparent transparent transparent ${theme.palette.primary.main}`,
                                            }
                                            : {
                                                left: -10,
                                                borderWidth: '0 12px 12px 0',
                                                borderColor: (theme) => `transparent ${theme.palette.background.paper} transparent transparent`,
                                            }),
                                    },
                                }}
                            >
                                {!isSelf && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 700,
                                            color: 'primary.main',
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {msg.type === 'hr' ? 'HR' : (leave?.employee_name || 'Employee')}
                                    </Typography>
                                )}
                                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                    {msg.text}
                                </Typography>
                            </Box>
                        );
                    })
                ) : (
                    <Box sx={{ height: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                        <Typography variant="body2">No comments yet</Typography>
                    </Box>
                )}
                {isEmployee && empReplyCount >= 5 && leave?.workflow_state === 'Clarification Requested' && (
                    <Typography variant="caption" color="error" sx={{ textAlign: 'center', mt: 1, fontWeight: 700 }}>
                        Maximum reply limit (5) reached.
                    </Typography>
                )}
                {isHR && hrQueryCount >= 5 && (leave?.workflow_state === 'Pending' || leave?.workflow_state === 'Clarification Requested' || !leave?.workflow_state) && (
                    <Typography variant="caption" color="error" sx={{ textAlign: 'center', mt: 1, fontWeight: 700 }}>
                        Maximum clarification limit (5) reached.
                    </Typography>
                )}
            </Box>
        </Box>
    );

    const hasHistory = conversation.length > 0;

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth={hasHistory ? 'lg' : 'md'}
                PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24 } }}
                TransitionProps={{ onExited: () => { setLeave(null); setActions([]); } }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>Application Details</Typography>
                    </Stack>
                    <IconButton onClick={onClose} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) } }}>
                        <Iconify icon="mingcute:close-line" width={24} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, mt: 3 }}>
                    {fetching || (loading && !leave) ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                            <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                        </Box>
                    ) : leave ? (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
                                gap: 3,
                            }}
                        >
                            {/* Left Column: Details */}
                            <Box sx={{ gridColumn: { lg: hasHistory ? 'span 8' : 'span 12' } }}>
                                <Stack spacing={3}>
                                    {/* Header Summary Card */}
                                    <Box
                                        sx={{
                                            p: 3,
                                            borderRadius: 2,
                                            bgcolor: 'background.paper',
                                            border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.26)}`,
                                            boxShadow: (theme) => theme.customShadows?.z4,
                                        }}
                                    >
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                            spacing={2}
                                            sx={{ position: 'relative', zIndex: 1 }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                                                <Avatar
                                                    src={employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || leave?.profile_picture || leave?.image}
                                                    sx={{
                                                        width: 76,
                                                        height: 76,
                                                        borderRadius: '50%',
                                                        border: '3px solid #FFFFFF',
                                                        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
                                                        bgcolor: (theme: any) => {
                                                            const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || leave?.profile_picture || leave?.image;
                                                            if (img) return 'transparent';
                                                            const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                                            let hash = 0;
                                                            const name = leave?.employee_name || '';
                                                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                                            return colors[Math.abs(hash) % colors.length];
                                                        },
                                                        color: (theme: any) => {
                                                            const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || leave?.profile_picture || leave?.image;
                                                            return img ? 'inherit' : alpha(theme.palette.common.black, 0.6);
                                                        },
                                                        fontSize: '1.75rem',
                                                        fontWeight: 900,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {leave?.employee_name?.charAt(0) || 'U'}
                                                </Avatar>
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', wordBreak: 'break-word' }}>
                                                        {leave?.employee_name}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5, display: 'block' }}>
                                                        Employee ID: {leave?.employee || leave?.employee_id || '-'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Label
                                                color={getStatusColor(leave?.workflow_state)}
                                                variant="soft"
                                                sx={{
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.25,
                                                    px: 1.5,
                                                    py: 2,
                                                    borderRadius: 1,
                                                    fontSize: '0.75rem',
                                                    alignSelf: { xs: 'flex-start', sm: 'center' },
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {leave?.workflow_state || 'Pending'}
                                            </Label>
                                        </Stack>

                                        <Divider sx={{ borderStyle: 'dashed', my: 2.5 }} />

                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                        >
                                            <Stack spacing={0.5}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                                                    Leave Type
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                                    {leave?.leave_type || 'N/A'}
                                                </Typography>
                                            </Stack>

                                            <Stack spacing={0.5} alignItems="flex-end" sx={{ textAlign: 'right' }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: 0.5 }}>
                                                    Duration
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                    {leave?.permission_hours || leave?.leave_type?.toLowerCase() === 'permission'
                                                        ? `${leave?.permission_hours} Mins`
                                                        : `${leave?.total_days} ${leave?.total_days === 1 ? 'Day' : 'Days'}`
                                                    }
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    </Box>

                                    <Divider />

                                    {/* Date Details */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, px: 2 }}>
                                        <DetailRow label="Applied On" value={dayjs(leave?.creation).format('DD MMM YYYY HH:mm')} icon="solar:calendar-bold" />
                                        <DetailRow label="Half Day" value={leave?.half_day === 1 ? 'Yes' : 'No'} icon="solar:history-bold" />
                                        <DetailRow label="From Date" value={dayjs(leave?.from_date).format('DD MMM YYYY')} icon="solar:calendar-date-bold" />
                                        <DetailRow label="To Date" value={dayjs(leave?.to_date).format('DD MMM YYYY')} icon="solar:calendar-date-bold" />
                                    </Box>

                                    <Divider />

                                    {/* Reason Section */}
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, display: 'block', ml: 1.5 }}>
                                            Reason
                                        </Typography>
                                        <Box sx={{ p: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '14.5px' }}>
                                                {leave?.reson || 'No reason specified'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Attachments */}
                                    {leave?.attachment && (
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, display: 'block', ml: 1.5 }}>
                                                Attachment
                                            </Typography>
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 1.5,
                                                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.02),
                                                }}
                                            >
                                                <Stack direction="row" alignItems="center" spacing={2}>
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 1,
                                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                            color: 'info.main',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <FaFileAlt size={20} />
                                                    </Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                        {decodeURIComponent(leave.attachment.split('/').pop()?.split('?')[0] || 'Attachment Document')}
                                                    </Typography>
                                                </Stack>
                                                <Button
                                                    href={leave.attachment}
                                                    target="_blank"
                                                    variant="text"
                                                    color="primary"
                                                    endIcon={<FaExternalLinkAlt size={14} />}
                                                    sx={{
                                                        fontWeight: 700,
                                                        textTransform: 'none',
                                                        fontSize: '0.875rem',
                                                        '&:hover': {
                                                            bgcolor: 'transparent',
                                                        }
                                                    }}
                                                >
                                                    View Attachment
                                                </Button>
                                            </Stack>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>

                            {/* Right Column: Conversation */}
                            {hasHistory && (
                                <Box sx={{ gridColumn: { lg: 'span 4' } }}>
                                    {renderConversation}
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                            <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Application Found</Typography>
                        </Box>
                    )}
                </DialogContent>

                {filteredActions.length > 0 && (
                    <>
                        <Divider />
                        {displayEdit &&(
                        <DialogActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1.5 }}>
                            {filteredActions.map((action) => {
                                const isPendingThis = submitting && selectedAction?.action === action.action;
                                const isApprove = action.action.toLowerCase().includes('approve');
                                const isReject = action.action.toLowerCase().includes('reject');

                                let label = action.action;
                                if (isPendingThis) {
                                    if (isApprove) label = 'Approving...';
                                    else if (isReject) label = 'Rejecting...';
                                    else label = 'Processing...';
                                }

                                return (
                                    <Button
                                        key={action.action}
                                        variant="contained"
                                        color={getActionColor(action.action)}
                                        onClick={() => handleActionClick(action)}
                                        disabled={submitting}
                                        sx={{ fontWeight: 800, px: 3 }}
                                        startIcon={isPendingThis ? <Iconify icon={"svg-spinners:18-dots-indicator" as any} /> : null}
                                    >
                                        {label}
                                    </Button>
                                );
                            })}
                        </DialogActions>
                        )}
                    </>
                )}
            </Dialog >

            <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Iconify icon={"solar:pen-bold" as any} sx={{ color: getActionColor(selectedAction?.action || '') }} />
                    {selectedAction?.action}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        Are you sure you want to perform this action? You can add an optional comment below.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Comment / Message"
                        placeholder="Type your message here..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        autoFocus
                    />
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={getActionColor(selectedAction?.action || '')}
                        onClick={() => handleApplyAction()}
                        disabled={submitting}
                        startIcon={submitting ? <Iconify icon={"svg-spinners:18-dots-indicator" as any} /> : null}
                    >
                        {submitting ? (
                            selectedAction?.action.toLowerCase().includes('approve')
                                ? 'Approving...'
                                : (selectedAction?.action.toLowerCase().includes('reject')
                                    ? 'Rejecting...'
                                    : 'Processing...')
                        ) : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ClarificationDialog
                open={openClarification}
                onClose={() => setOpenClarification(false)}
                onConfirm={(msg) => handleApplyAction(undefined, msg)}
                title={clarificationType === 'HR' ? 'Ask Clarification' : 'Reply to HR'}
                label={clarificationType === 'HR' ? 'Query' : 'Reply'}
                loading={submitting}
            />
        </>
    );
}

function SectionHeader({ title, icon, noMargin = false }: { title: string; icon: string; noMargin?: boolean }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: noMargin ? 0 : 2.5 }}>
            <Iconify icon={icon as any} width={20} sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailRow({ label, value, icon }: { label: string; value?: string | null; icon: string }) {
    return (
        <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center" sx={{ width: 1 }}>
            <Box
                sx={{
                    p: 1,
                    borderRadius: 1.25,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    color: 'info.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Iconify icon={icon as any} width={22} />
            </Box>
            <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25, fontSize: { xs: 10, sm: 12 } }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: { xs: 13, sm: 14 } }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Stack>
    );
}
