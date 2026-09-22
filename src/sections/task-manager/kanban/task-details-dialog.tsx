import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Timeline from '@mui/lab/Timeline';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import TimelineDot from '@mui/lab/TimelineDot';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import TimelineContent from '@mui/lab/TimelineContent';
import DialogActions from '@mui/material/DialogActions';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { fDate, fDateTime } from 'src/utils/format-time';

import {
    TaskManager,
    acceptTaskManager,
    closeTaskManager,
    reopenTaskManager,
    putOnHoldTaskManager,
    resumeTaskManager,
    getTaskManager
} from 'src/api/task-manager';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { TaskCloseDialog } from './task-close-dialog';
import { TaskReopenDialog } from './task-reopen-dialog';
import { TaskResumeDialog } from './task-resume-dialog';
import { TaskOnHoldDialog } from './task-on-hold-dialog';

// ----------------------------------------------------------------------

type Props = {
    task: TaskManager | null;
    open: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSuccess?: () => void;
    permissions: { read: boolean; write: boolean; create: boolean; delete: boolean };
};

// ── Status config ──
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
    'Open': { color: '#0ea5e9', bg: '#e0f2fe', border: '#bae6fd', icon: 'solar:circle-bottom-up-bold' },
    'In Progress': { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', icon: 'solar:refresh-bold' },
    'Completed': { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', icon: 'solar:check-circle-bold' },
    'Reopened': { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: 'solar:restart-bold' },
    'On Hold': { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'solar:pause-bold' },
};

// ── Priority config ──
const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
    'High': { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: 'solar:double-alt-arrow-up-bold' },
    'Medium': { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'solar:alt-arrow-up-bold' },
    'Low': { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: 'solar:alt-arrow-down-bold' },
};

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#f97316'];

function avatarColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function initials(name: string) {
    const parts = name.trim().split(' ');
    return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function StatusBadge({ conf, label }: { conf: { color: string; bg: string; border: string; icon: string }; label: string }) {
    return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.55, borderRadius: 1, bgcolor: conf.bg, border: `1.5px solid ${conf.border}` }}>
            <Iconify icon={conf.icon as any} width={14} sx={{ color: conf.color }} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: conf.color, lineHeight: 1 }}>{label}</Typography>
        </Box>
    );
}

function InfoRow({ icon, iconColor, label, value }: { icon: string; iconColor: string; label: string; value: React.ReactNode }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1.25, bgcolor: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Iconify icon={icon as any} width={18} sx={{ color: iconColor }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block' }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.1, wordWrap: 'break-word' }}>{value}</Typography>
            </Box>
        </Stack>
    );
}

export default function TaskDetailsDialog({ task: initialTask, open, onClose, onEdit, onDelete, onSuccess, permissions }: Props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [task, setTask] = useState<TaskManager | null>(null);
    const [closeTaskOpen, setCloseTaskOpen] = useState(false);
    const [reopenTaskOpen, setReopenTaskOpen] = useState(false);
    const [onHoldOpen, setOnHoldOpen] = useState(false);
    const [resumeOpen, setResumeOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (open && initialTask?.name) {
            setTask(initialTask); // Show basic info immediately
            getTaskManager(initialTask.name).then(fullTask => {
                setTask((prev) => ({ ...prev, ...fullTask, assignees: prev?.assignees || fullTask.assignees }));
            }).catch(err => {
                console.error("Failed to fetch full task details", err);
            });
        }
    }, [open, initialTask]);

    if (!task) return null;

    const statusConf = STATUS_CONFIG[task.status] || { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', icon: 'solar:info-circle-bold' };
    const priorityConf = PRIORITY_CONFIG[task.priority] || { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', icon: 'solar:minus-circle-bold' };

    const handleAction = async (action: () => Promise<void>, successMessage?: string) => {
        setLoading(true);
        try {
            await action();
            setSnackbar({ open: true, message: successMessage || 'Action completed successfully', severity: 'success' });
            if (onSuccess) onSuccess();
            setTimeout(() => onClose(), 1000); // Small delay to show snackbar before closing
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to complete action', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmClose = async (hours: string, remarks: string, attachment?: string) => {
        setLoading(true);
        try {
            await closeTaskManager(task.name, hours, remarks, attachment);
            setCloseTaskOpen(false);
            setSnackbar({ open: true, message: 'Task closed successfully', severity: 'success' });
            if (onSuccess) onSuccess();
            setTimeout(() => onClose(), 1000);
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to close task', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReopen = async (remarks: string) => {
        setLoading(true);
        try {
            await reopenTaskManager(task.name, remarks);
            setReopenTaskOpen(false);
            setSnackbar({ open: true, message: 'Task reopened successfully', severity: 'success' });
            if (onSuccess) onSuccess();
            setTimeout(() => onClose(), 1000);
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to reopen task', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOnHold = async (remarks: string) => {
        setLoading(true);
        try {
            await putOnHoldTaskManager(task.name, remarks);
            setOnHoldOpen(false);
            setSnackbar({ open: true, message: 'Task put on hold', severity: 'success' });
            if (onSuccess) onSuccess();
            setTimeout(() => onClose(), 1000);
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to put task on hold', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmResume = async (remarks: string) => {
        setLoading(true);
        try {
            await resumeTaskManager(task.name, remarks);
            setResumeOpen(false);
            setSnackbar({ open: true, message: 'Task resumed successfully', severity: 'success' });
            if (onSuccess) onSuccess();
            setTimeout(() => onClose(), 1000);
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: error?.message || 'Failed to resume task', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const actionPerms = user?.permissions?.actions?.task_manager || user?.permissions?.actions?.tasks;
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && !!actionPerms;
    const displayEdit = hasCustomPerms && actionPerms ? !!actionPerms?.edit : true;
    const displayDelete = hasCustomPerms && actionPerms ? !!actionPerms?.delete : true;


    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: 2.5,
                        overflow: 'hidden',
                        m: { xs: 1.5, sm: 2 },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' }
                    }
                }}
            >

                {/* ── Top bar ── */}
                <DialogTitle
                    sx={{
                        m: 0,
                        p: { xs: 2, sm: 2.5 },
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Task Details</Typography>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: 'text.disabled',
                            bgcolor: 'background.paper',
                            boxShadow: (theme: any) => theme.customShadows?.z1
                        }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>

                {/* ── Body ── */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: { xs: 'auto', md: 460 }, p: { xs: 1.5, sm: 2 }, pt: 3, overflowY: 'auto' }}>

                    {/* ══ LEFT PANEL ══ */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{ flex: 1, px: { xs: 1, sm: 3 }, pb: 2, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto' }}>

                            {/* Hero card */}
                            <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f4f6f8', border: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: '#1877f214', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Iconify icon={"solar:clipboard-list-bold" as any} width={24} sx={{ color: '#14b8a6' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 0, maxWidth: 480 }}>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block', pb: 0.5 }}>Task Title</Typography>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3, wordWrap: 'break-word' }}>
                                                {task.title}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Stack direction="row" spacing={3} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                                                Status
                                            </Typography>
                                            <StatusBadge conf={statusConf} label={task.status} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                                                Priority
                                            </Typography>
                                            <StatusBadge conf={priorityConf} label={task.priority || 'None'} />
                                        </Box>
                                    </Stack>
                                </Box>
                            </Box>

                            {/* Info rows — Custom grid */}
                            <Stack spacing={2.5}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 2, py: 1 }}>
                                    <InfoRow icon="solar:folder-favourite-bookmark-bold" iconColor="#6366f1" label="Project" value={task.project || 'N/A'} />
                                    <InfoRow icon="solar:buildings-bold" iconColor="#8b5cf6" label="Department" value={task.department || 'N/A'} />
                                    <InfoRow icon="solar:calendar-date-bold" iconColor="#f97316" label="Due Date"
                                        value={
                                            task.due_date ? (
                                                fDateTime(`${task.due_date} ${task.due_time || '00:00:00'}`)
                                            ) : (
                                                '—'
                                            )
                                        }
                                    />
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 2, py: 1 }}>
                                    {task.creation && (
                                        <InfoRow icon="solar:clock-circle-bold" iconColor="#14b8a6" label="Created On" value={fDateTime(task.creation)} />
                                    )}

                                    <InfoRow icon="solar:user-bold" iconColor="#0ea5e9" label="Created By" value={task.owner || 'N/A'} />

                                </Box>
                            </Stack>

                            {/* Description */}
                            {task.description && (
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                                        Description
                                    </Typography>
                                    <Box
                                        sx={{ p: 2, bgcolor: '#f4f6f8', borderRadius: 1.5, color: 'text.secondary', typography: 'body2', lineHeight: 1.75, border: '1px solid', borderColor: 'divider', '& p': { m: 0 } }}
                                        dangerouslySetInnerHTML={{ __html: task.description }}
                                    />
                                </Box>
                            )}

                            {/* History Timeline */}
                            {task.history && task.history.length > 0 && (
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1.5 }}>
                                        History
                                    </Typography>
                                    <Timeline
                                        sx={{
                                            p: 0,
                                            m: 0,
                                            [`& .${timelineItemClasses.root}:before`]: {
                                                flex: 0,
                                                padding: 0,
                                            },
                                        }}
                                    >
                                        {task.history.map((historyItem, index) => {
                                            const isLast = index === task.history!.length - 1;
                                            return (
                                                <TimelineItem key={historyItem.name || index}>
                                                    <TimelineSeparator>
                                                        <TimelineDot color="info" sx={{ mt: 0.5 }} />
                                                        {!isLast && <TimelineConnector />}
                                                    </TimelineSeparator>
                                                    <TimelineContent sx={{ pb: isLast ? 0 : 3, pt: 0, px: 2 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                            {historyItem.event}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                                                            {historyItem.done_on ? fDate(historyItem.done_on) : ''} by {' '}
                                                            <Typography
                                                                component="span"
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    color: 'text.primary',
                                                                    fontSize: '0.8rem'
                                                                }}
                                                            >
                                                                {historyItem.done_by}
                                                            </Typography>
                                                        </Typography>
                                                        {historyItem.hours_spent && (
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                                                Hours: {historyItem.hours_spent}
                                                            </Typography>
                                                        )}
                                                        {historyItem.remarks && (
                                                            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f4f6f8', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                                                                    Remarks
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                    {historyItem.remarks}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                        {historyItem.closing_attachment && (
                                                            <Button
                                                                variant="outlined"
                                                                color="info"
                                                                size="small"
                                                                startIcon={<Iconify icon="solar:paperclip-bold" />}
                                                                href={historyItem.closing_attachment}
                                                                target="_blank"
                                                                sx={{ mt: 1.5, borderRadius: 1, fontSize: '0.75rem', py: 0.5 }}
                                                            >
                                                                Closing Attachment
                                                            </Button>
                                                        )}
                                                    </TimelineContent>
                                                </TimelineItem>
                                            );
                                        })}
                                    </Timeline>
                                </Box>
                            )}

                        </Box>
                    </Box>

                    {/* ══ RIGHT PANEL — Assignees ══ */}
                    <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

                        {/* Section header */}
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                            <Iconify icon="solar:users-group-rounded-bold" width={18} sx={{ color: 'primary.main' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.primary' }}>
                                Assignees
                            </Typography>
                            {task.assignees && task.assignees.length > 0 && (
                                <Box
                                    sx={{
                                        ml: 1,
                                        minWidth: 20,
                                        height: 20,
                                        px: 0.75,
                                        borderRadius: 10,
                                        bgcolor: '#059669',
                                        color: 'common.white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        boxShadow: '0 2px 4px rgba(8, 163, 205, 0.24)',
                                    }}
                                >
                                    {task.assignees.length}
                                </Box>
                            )}
                        </Stack>

                        {/* Scrollable assignee list */}
                        <Box sx={{ flex: 1, mx: 2, mb: 2, borderRadius: 2, bgcolor: '#f4f6f8', overflowY: 'auto', maxHeight: { xs: 320, md: 'calc(100vh - 350px)' }, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {task.assignees && task.assignees.length > 0 ? (
                                task.assignees.map((assignee) => (
                                    <Box
                                        key={assignee.name}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            px: 1.5,
                                            py: 1.25,
                                            borderRadius: 1.5,
                                            bgcolor: 'background.paper',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <Avatar
                                            src={assignee.profile_pic}
                                            sx={{ width: 38, height: 38, fontSize: 13, fontWeight: 800, bgcolor: avatarColor(assignee.employee_name), flexShrink: 0 }}
                                        >
                                            {initials(assignee.employee_name)}
                                        </Avatar>

                                        <Box sx={{ overflow: 'hidden', flex: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {assignee.employee_name}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, display: 'block' }}>
                                                {assignee.employee}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 4, opacity: 0.45 }}>
                                    <Iconify icon="solar:users-group-rounded-bold" width={36} sx={{ color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>No assignees</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* ── Dialog Actions (Pinned at End of Dialog) ── */}
                <Divider />
                <DialogActions sx={{ p: 2, px: 3, bgcolor: 'background.neutral', gap: 1.5, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                        {/* Accept — Open or Reopened */}
                        {(task.status === 'Open' || task.status === 'Reopened') && displayEdit && (
                            <Button
                                variant="contained"
                                color="info"
                                size="medium"
                                disabled={loading}
                                startIcon={<Iconify icon="solar:play-bold" width={16} />}
                                onClick={() => handleAction(() => acceptTaskManager(task.name), 'Task Accepted')}
                                sx={{ fontWeight: 800, px: 2, borderRadius: 1.25 }}
                            >
                                Accept Task
                            </Button>
                        )}

                        {/* Close Task — In Progress or On Hold */}
                        {(task.status === 'In Progress' || task.status === 'On Hold') && displayEdit && (
                            <Button
                                variant="contained"
                                color="success"
                                size="medium"
                                disabled={loading}
                                startIcon={<Iconify icon="solar:check-circle-bold" />}
                                onClick={() => setCloseTaskOpen(true)}
                                sx={{ fontWeight: 800, px: 2, borderRadius: 1.25 }}
                            >
                                Close Task
                            </Button>
                        )}

                        {/* Put On Hold — only when In Progress */}
                        {task.status === 'In Progress' && displayEdit && (
                            <Button
                                variant="contained"
                                size="medium"
                                disabled={loading}
                                startIcon={<Iconify icon="solar:pause-bold" width={16} />}
                                onClick={() => setOnHoldOpen(true)}
                                sx={{
                                    fontWeight: 800,
                                    px: 2,
                                    borderRadius: 1.25,
                                    bgcolor: '#f59e0b',
                                    color: '#fff',
                                    '&:hover': { bgcolor: '#d97706' },
                                }}
                            >
                                Put On Hold
                            </Button>
                        )}

                        {/* Resume — only when On Hold */}
                        {task.status === 'On Hold' && (
                            <Button
                                variant="contained"
                                size="medium"
                                disabled={loading}
                                startIcon={<Iconify icon={"solar:play-circle-bold" as any} />}
                                onClick={() => setResumeOpen(true)}
                                sx={{
                                    fontWeight: 800,
                                    px: 2,
                                    borderRadius: 1.25,
                                    bgcolor: '#0891b2',
                                    '&:hover': { bgcolor: '#0e7490' },
                                }}
                            >
                                Resume Task
                            </Button>
                        )}

                        {/* Reopen — visible to Task Manager role only */}
                        {(() => {
                            const isTaskManager = user?.roles?.includes('Task Manager') || user?.roles?.includes('HR') || user?.roles?.includes('Administrator');

                            return task.status === 'Completed' && isTaskManager && displayEdit && (
                                <Button
                                    variant="contained"
                                    color="error"
                                    size="medium"
                                    disabled={loading}
                                    startIcon={<Iconify icon="solar:restart-bold" />}
                                    onClick={() => setReopenTaskOpen(true)}
                                    sx={{ fontWeight: 800, px: 2, borderRadius: 1.25 }}
                                >
                                    Reopen Task
                                </Button>
                            );
                        })()}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        {(() => {
                            const isTaskManager = user?.roles?.includes('Task Manager') || user?.roles?.includes('HR') || user?.roles?.includes('Administrator');
                            return isTaskManager && displayEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<Iconify icon="solar:pen-bold" />}
                                    onClick={onEdit}
                                    sx={{ borderRadius: 1.5, fontWeight: 800, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                                >
                                    Edit
                                </Button>
                            );
                        })()}
                        {displayDelete && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={onDelete}
                                sx={{ borderRadius: 1.5, minWidth: 48 }}
                            >
                                <Iconify icon="solar:trash-bin-trash-bold" />
                            </Button>
                        )}
                    </Stack>
                </DialogActions>
            </Dialog>

            <TaskCloseDialog
                open={closeTaskOpen}
                onClose={() => setCloseTaskOpen(false)}
                onConfirmed={handleConfirmClose}
                attachmentRequired={Boolean(task.attachment_required)}
                loading={loading}
            />

            <TaskReopenDialog
                open={reopenTaskOpen}
                onClose={() => setReopenTaskOpen(false)}
                onConfirmed={handleConfirmReopen}
                loading={loading}
            />

            <TaskOnHoldDialog
                open={onHoldOpen}
                onClose={() => setOnHoldOpen(false)}
                onConfirmed={handleConfirmOnHold}
                loading={loading}
            />

            <TaskResumeDialog
                open={resumeOpen}
                onClose={() => setResumeOpen(false)}
                onConfirmed={handleConfirmResume}
                loading={loading}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
