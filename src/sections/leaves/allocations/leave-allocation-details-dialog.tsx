import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';

import { COMMON_COLORS } from 'src/theme';
import { getEmployee } from 'src/api/employees';
import { getHRDoc } from 'src/api/hr-management';
import { type WorkflowAction, getLeaveAllocationWorkflowActions, applyLeaveAllocationWorkflowAction } from 'src/api/leave-allocations';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';


// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    allocationId: string | null;
    onRefresh?: () => void;
    onEdit?: (allocation: any) => void;
    onDelete?: (allocationId: string) => void;
    socket?: any;
};

export function LeaveAllocationDetailsDialog({ open, onClose, allocationId, onRefresh, onEdit, onDelete, socket }: Props) {
    const [allocation, setAllocation] = useState<any>(null);
    const [employeeDetails, setEmployeeDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [actions, setActions] = useState<WorkflowAction[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [actionPending, setActionPending] = useState<string | null>(null);
    const [commentDialogOpen, setCommentDialogOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);

    const { user } = useAuth();
    const userRoles = user?.roles || [];
    const isHR = userRoles.some(r => r.includes('HR')) || userRoles.includes('Administrator') || userRoles.includes('System Manager');

    const fetchData = useCallback(async (isSilent = false) => {
        if (!allocationId) return;
        if (!isSilent) setLoading(true);
        try {
            const data = await getHRDoc('Leave Allocation', allocationId);
            setAllocation(data);
            const empId = data.employee || data.employee_id;
            if (empId) {
                setFetching(true);
                getEmployee(empId).then(setEmployeeDetails).catch(console.error).finally(() => setFetching(false));
            }
            if (data?.workflow_state) {
                const availableActions = await getLeaveAllocationWorkflowActions(data.workflow_state);
                setActions(availableActions);
            }
        } catch (err) {
            console.error('Failed to fetch leave allocation details:', err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [allocationId]);

    useEffect(() => {
        if (open && allocationId) {
            fetchData();
        } else {
            setAllocation(null);
            setActions([]);
        }
    }, [open, allocationId, fetchData]);

    // Real-time: refresh when this specific allocation changes
    useEffect(() => {
        if (!socket || !open || !allocationId) return undefined;

        const handleUpdate = (data: any) => {
            if (data?.name === allocationId) {
                fetchData(true);
            }
        };

        socket.on('leave_allocation_updated', handleUpdate);
        return () => socket.off('leave_allocation_updated', handleUpdate);
    }, [socket, open, allocationId, fetchData]);

    const handleActionClick = (action: WorkflowAction) => {
        setSelectedAction(action);
        const lowerAction = action.action.toLowerCase();
        if (lowerAction.includes('approve') || lowerAction.includes('reject')) {
            handleApplyAction(action);
        } else {
            setCommentDialogOpen(true);
        }
    };

    const handleApplyAction = async (actionOverride?: WorkflowAction) => {
        const actionToApply = actionOverride || selectedAction;
        if (!actionToApply || !allocationId) return;

        try {
            setActionPending(actionToApply.action);
            setSubmitting(true);
            await applyLeaveAllocationWorkflowAction(allocationId, actionToApply.action, comment);
            setComment('');
            setCommentDialogOpen(false);
            if (onRefresh) onRefresh();
            fetchData();
        } catch (e) {
            console.error('Failed to apply action:', e);
        } finally {
            setSubmitting(false);
            setActionPending(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'success';
            case 'Cancelled': return 'error';
            case 'Draft': return 'warning';
            case 'Open': return 'info';
            default: return 'default';
        }
    };

    const renderContent = allocation && (
        <Stack spacing={3.5} sx={{ marginTop: 3, marginBottom: 2 }}>
            {/* Profile Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Avatar
                    src={employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || allocation?.profile_picture || allocation?.image}
                    sx={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        border: (theme: any) => `2px solid ${theme.palette.common.white}`,
                        boxShadow: (theme: any) => `0 8px 24px -4px ${alpha(theme.palette.primary.main, 0.15)}`,
                        bgcolor: (theme: any) => {
                            const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || allocation?.profile_picture || allocation?.image;
                            if (img) return 'transparent';
                            const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                            let hash = 0;
                            const name = allocation?.employee_name || '';
                            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                            return colors[Math.abs(hash) % colors.length];
                        },
                        color: (theme: any) => {
                            const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || allocation?.profile_picture || allocation?.image;
                            return img ? 'inherit' : alpha(theme.palette.common.black, 0.6);
                        },
                        fontSize: '1.75rem',
                        fontWeight: 900,
                    }}
                >
                    {allocation?.employee_name?.charAt(0) || 'U'}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.2, color: 'text.primary' }}>
                        {allocation.employee_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '12px', mt: 0.25 }}>
                        ID: {allocation.employee}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Label
                        variant="soft"
                        color={getStatusColor(allocation.workflow_state || allocation.status)}
                        sx={{ textTransform: 'uppercase', fontWeight: 900, height: 28, px: 1.5 }}
                    >
                        {allocation.workflow_state || allocation.status}
                    </Label>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                        ID: {allocation.name}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Information Grid */}
            <Box sx={{ px: 2 }}>
                <Typography variant="overline" sx={{ color: 'text.primary', fontWeight: 800, mb: 2, display: 'block' }}>
                    Allocation Details
                </Typography>
                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                    }}
                >
                    <DetailItem label="Leave Type" value={allocation.leave_type} icon="solar:letter-bold" />
                    <DetailItem
                        label="Period"
                        value={`${dayjs(allocation.from_date).format('DD MMM YYYY')} - ${dayjs(allocation.to_date).format('DD MMM YYYY')}`}
                        icon="solar:calendar-bold"
                    />
                </Box>
            </Box>

            {/* Usage Visualization */}
            <Box sx={{ p: 2.5, bgcolor: 'background.neutral', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon={"solar:chart-2-bold" as any} width={20} sx={{ color: 'success.main' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Usage Status</Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                        {allocation.total_leaves_taken} / {allocation.total_leaves_allocated} Days
                    </Typography>
                </Stack>

                <LinearProgress
                    variant="determinate"
                    value={Math.min((allocation.total_leaves_taken / allocation.total_leaves_allocated) * 100, 100)}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: (theme) => alpha(theme.palette.divider, 0.12),
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: 'success.main',
                        }
                    }}
                />
            </Box>

            {/* Actions */}
            {/* {(onEdit || onDelete) && allocation && (
                <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                    {onEdit && (
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon="solar:pen-bold" />}
                            onClick={() => onEdit(allocation)}
                            sx={{
                                height: 40,
                                borderRadius: 1,
                                px: 3,
                                fontWeight: 800,
                                bgcolor: (theme) => alpha('#ffab00', 0.08),
                                color: '#ffab00',
                                border: (theme) => `1px solid ${alpha('#ffab00', 0.12)}`,
                                '&:hover': {
                                    bgcolor: (theme) => alpha('#ffab00', 0.16),
                                },
                            }}
                        >
                            Edit
                        </Button>
                    )}

                    {onDelete && allocationId && (
                        <Button
                            variant="contained"
                            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                            onClick={() => onDelete(allocationId)}
                            sx={{
                                height: 40,
                                borderRadius: 1,
                                px: 3,
                                fontWeight: 800,
                                bgcolor: (theme) => alpha('#ff5630', 0.08),
                                color: '#ff5630',
                                border: (theme) => `1px solid ${alpha('#ff5630', 0.12)}`,
                                '&:hover': {
                                    bgcolor: (theme) => alpha('#ff5630', 0.16),
                                },
                            }}
                        >
                            Delete
                        </Button>
                    )}
                </Stack>
            )} */}

            {/* Workflow Actions */}
            {actions.length > 0 && isHR && (
                <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 1 }}>
                    {actions.map((action) => {
                        const isReject = action.action.toLowerCase().includes('reject') || action.action.toLowerCase().includes('cancel');
                        const isApprove = action.action.toLowerCase().includes('approve');
                        const isPendingThis = actionPending === action.action;

                        let label = action.action;
                        if (isPendingThis) {
                            if (isApprove) label = 'Approving...';
                            else if (isReject) label = 'Rejecting...';
                            else label = 'Processing...';
                        }

                        return (
                            <LoadingButton
                                key={action.action}
                                variant="contained"
                                onClick={() => handleActionClick(action)}
                                loading={isPendingThis && submitting}
                                disabled={submitting}
                                sx={{
                                    height: 40,
                                    borderRadius: 1,
                                    px: 3,
                                    fontWeight: 800,
                                    bgcolor: (theme) => alpha(isReject ? theme.palette.error.main : COMMON_COLORS.emerald.main, 0.08),
                                    color: (theme) => isReject ? theme.palette.error.main : COMMON_COLORS.emerald.main,
                                    border: (theme) => `1px solid ${alpha(isReject ? theme.palette.error.main : COMMON_COLORS.emerald.main, 0.12)}`,
                                    '&:hover': {
                                        bgcolor: (theme) => alpha(isReject ? theme.palette.error.main : COMMON_COLORS.emerald.main, 0.16),
                                    },
                                }}
                            >
                                {label}
                            </LoadingButton>
                        );
                    })}
                </Stack>
            )}
        </Stack>
    );

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: { borderRadius: 2.5, maxWidth: 680 }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Allocation Profile</Typography>

                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <IconButton
                            onClick={onClose}
                            sx={{
                                width: 36,
                                height: 36,
                                color: (theme) => theme.palette.grey[500],
                                bgcolor: 'background.paper',
                                boxShadow: (theme) => (theme as any).customShadows?.z1
                            }}
                        >
                            <Iconify icon="mingcute:close-line" />
                        </IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ p: 3, px: 5 }}>
                    {fetching || (loading && !allocation) ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, minHeight: 200 }}>
                            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                            </Box>
                        </Stack>
                    ) : (
                        renderContent
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={commentDialogOpen}
                onClose={() => setCommentDialogOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: { borderRadius: 2 },
                }}
            >
                <DialogTitle sx={{ p: 2.5, pb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Add Remark
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 2.5 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Provide any additional details or remarks..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'background.neutral',
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1 }}>
                    <Button onClick={() => setCommentDialogOpen(false)} sx={{ color: 'text.secondary' }}>
                        Cancel
                    </Button>
                    <LoadingButton
                        variant="contained"
                        onClick={() => handleApplyAction()}
                        loading={submitting}
                        disabled={submitting}
                        sx={{ px: 4, height: 40 }}
                    >
                        {submitting
                            ? (selectedAction?.action.toLowerCase().includes('approve') ? 'Approving...' : (selectedAction?.action.toLowerCase().includes('reject') || selectedAction?.action.toLowerCase().includes('cancel') ? 'Rejecting...' : 'Processing...'))
                            : 'Confirm Action'}
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ----------------------------------------------------------------------

function DetailItem({ label, value, icon, color = 'text.primary' }: { label: string; value?: string | null; icon: string; color?: string }) {
    return (
        <Box>
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconify icon={icon as any} width={16} sx={{ color: 'text.disabled' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
