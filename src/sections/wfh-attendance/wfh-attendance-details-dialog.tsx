import { useState, useEffect } from 'react';
import { FaClock, FaHistory, FaUserCheck, FaUserTimes, FaRegCalendarAlt } from 'react-icons/fa';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import { Stack, Avatar, DialogActions } from '@mui/material';

import { fTime } from 'src/utils/format-time';

import { getEmployee } from 'src/api/employees';
import { handleWFHAction, getWFHAttendance } from 'src/api/wfh-attendance';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    wfhId: string | null;
    socket?: any;
};

export function WFHAttendanceDetailsDialog({ open, onClose, wfhId, socket }: Props) {
    const [wfh, setWfh] = useState<any>(null);
    const [employeeDetails, setEmployeeDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const { user } = useAuth();
    const [actionLoading, setActionLoading] = useState(false);
    const [actionPending, setActionPending] = useState<'Approve' | 'Reject' | null>(null);

    const hrRoles = ['HR Manager', 'HR', 'System Manager', 'Administrator'];
    const isHR = user?.roles?.some((role: string) => hrRoles.includes(role));

    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.wfh_attendance;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.wfh_attendance?.edit : true;

    useEffect(() => {
        if (open && wfhId) {
            setLoading(true);
            setFetching(true);
            getWFHAttendance(wfhId)
                .then((data) => {
                    setWfh(data);
                    const empId = data.employee || data.employee_id;
                    if (empId) {
                        getEmployee(empId).then(setEmployeeDetails).catch(console.error).finally(() => setFetching(false));
                    } else {
                        setFetching(false);
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch WFH details:', err);
                    setFetching(false);
                })
                .finally(() => setLoading(false));
        }
    }, [open, wfhId]);

    // Real-time: refresh dialog when this specific WFH entry changes
    useEffect(() => {
        if (!socket || !open || !wfhId) return undefined;

        const handleUpdate = (data: any) => {
            if (data?.name === wfhId) {
                getWFHAttendance(wfhId).then(setWfh).catch(console.error);
            }
        };

        socket.on('wfh_attendance_updated', handleUpdate);
        return () => socket.off('wfh_attendance_updated', handleUpdate);
    }, [socket, open, wfhId]);

    const renderStatus = (status: string) => {
        let color: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' = 'default';

        if (status === 'Approved') color = 'success';
        if (status === 'Rejected') color = 'error';
        if (status === 'Pending') color = 'warning';
        if (status === 'Draft') color = 'info';

        return (
            <Label variant="soft" color={color} sx={{ textTransform: 'uppercase', fontWeight: 800 }}>
                {status}
            </Label>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            TransitionProps={{ onExited: () => setWfh(null) }}
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>WFH Entry Details</Typography>
                <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 4 }}>
                {fetching || (loading && !wfh) ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : wfh ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Header Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                            <Avatar
                                src={employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || wfh?.profile_picture || wfh?.image}
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: '50%',
                                    border: (theme: any) => `2px solid ${theme.palette.common.white}`,
                                    boxShadow: (theme: any) => `0 8px 24px -4px ${alpha(theme.palette.primary.main, 0.15)}`,
                                    bgcolor: (theme: any) => {
                                        const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || wfh?.profile_picture || wfh?.image;
                                        if (img) return 'transparent';
                                        const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                        let hash = 0;
                                        const name = wfh?.employee_name || '';
                                        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                        return colors[Math.abs(hash) % colors.length];
                                    },
                                    color: (theme: any) => {
                                        const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || wfh?.profile_picture || wfh?.image;
                                        return img ? 'inherit' : alpha(theme.palette.common.black, 0.6);
                                    },
                                    fontSize: '1.75rem',
                                    fontWeight: 900,
                                }}
                            >
                                {wfh?.employee_name?.charAt(0) || 'U'}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.2, color: 'text.primary' }}>
                                    {wfh.employee_name || wfh.employee}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '12px', mt: 0.25 }}>
                                    ID: {wfh.employee}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                {renderStatus(wfh.workflow_state || 'Draft')}
                                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                                    ID: {wfh.name}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ borderStyle: 'dashed' }} />

                        {/* Attendance Details Grid */}
                        <Box>
                            <SectionHeader title="Attendance Information" icon="" />
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 2.5,
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                }}
                            >
                                <DetailCard label="Date" value={wfh.date} icon={<FaRegCalendarAlt size={20} />} />
                                <DetailCard label="From Time" value={wfh.from_time ? fTime(wfh.from_time) : '-'} icon={<FaClock size={20} />} />
                                <DetailCard label="To Time" value={wfh.to_time ? fTime(wfh.to_time) : '-'} icon={<FaClock size={20} />} />
                                <DetailCard
                                    label="Total Hours"
                                    value={wfh.total_hours}
                                    icon={<FaHistory size={18} />}
                                />
                                {wfh.approved_by && (
                                    <DetailCard
                                        label={wfh.workflow_state === 'Rejected' ? 'Rejected By' : 'Approved By'}
                                        value={wfh.approved_by}
                                        icon={wfh.workflow_state === 'Rejected' ? <FaUserTimes size={20} /> : <FaUserCheck size={20} />}
                                        sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
                                    />
                                )}
                            </Box>
                        </Box>

                        {/* Task Description Section */}
                        <Box>
                            <SectionHeader title="Task Description" icon="" />
                            <Box
                                sx={{
                                    p: 3,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                    borderRadius: 2,
                                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    {wfh.task_description || 'No specific task description provided.'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold-duotone" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Entry Found</Typography>
                    </Box>
                )}
            </DialogContent>

            {isHR && displayEdit && wfh?.workflow_state === 'Pending' && (
                <DialogActions sx={{ px: 4, py: 3, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04) }}>
                    <Stack direction="row" spacing={1.5} sx={{ width: 1 }}>
                        <LoadingButton
                            fullWidth
                            variant="outlined"
                            color="error"
                            size="large"
                            startIcon={<Iconify icon="mingcute:close-line" />}
                            onClick={() => onAction('Reject')}
                            loading={actionPending === 'Reject'}
                            disabled={actionLoading}
                            sx={{ fontWeight: 800 }}
                        >
                            {actionPending === 'Reject' ? 'Rejecting...' : 'Reject'}
                        </LoadingButton>
                        <LoadingButton
                            fullWidth
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<Iconify icon="solar:check-circle-bold" />}
                            onClick={() => onAction('Approve')}
                            loading={actionPending === 'Approve'}
                            disabled={actionLoading}
                            sx={{
                                fontWeight: 800,
                                bgcolor: 'success.main',
                                '&:hover': { bgcolor: 'success.dark' },
                                boxShadow: (theme) => `0 8px 16px 0 ${alpha(theme.palette.success.main, 0.24)}`,
                            }}
                        >
                            {actionPending === 'Approve' ? 'Approving...' : 'Approve Request'}
                        </LoadingButton>
                    </Stack>
                </DialogActions>
            )}
        </Dialog>
    );

    async function onAction(action: 'Approve' | 'Reject') {
        if (!wfhId) return;
        try {
            setActionPending(action);
            setActionLoading(true);
            await handleWFHAction(wfhId, action);
            const updatedWfh = await getWFHAttendance(wfhId);
            setWfh(updatedWfh);
        } catch (error) {
            console.error(`Failed to ${action} WFH:`, error);
        } finally {
            setActionLoading(false);
            setActionPending(null);
        }
    }
}

// ----------------------------------------------------------------------

function SectionHeader({ title, icon }: { title: string; icon: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.25, color: 'text.secondary', fontSize: 12 }}>
                {title}
            </Typography>
        </Box>
    );
}

function DetailCard({ label, value, icon, sx }: { label: string; value?: string | null; icon: React.ReactNode; sx?: any }) {
    const theme = useTheme();

    // Determine theme config based on label
    const getThemeConfig = () => {
        if (label === 'Date') {
            return {
                bg: alpha(theme.palette.info.main, 0.04),
                border: theme.palette.info.main,
                iconBg: alpha(theme.palette.info.main, 0.12),
                iconColor: theme.palette.info.main,
            };
        }
        if (label === 'From Time') {
            return {
                bg: alpha(theme.palette.info.main, 0.04),
                border: theme.palette.info.main,
                iconBg: alpha(theme.palette.info.main, 0.12),
                iconColor: theme.palette.info.main,
            };
        }
        if (label === 'To Time') {
            const purpleColor = theme.palette.secondary?.main || '#722ed1';
            return {
                bg: alpha(theme.palette.info.main, 0.04),
                border: theme.palette.info.main,
                iconBg: alpha(theme.palette.info.main, 0.12),
                iconColor: theme.palette.info.main,
            };
        }
        if (label === 'Total Hours') {
            return {
                bg: alpha(theme.palette.info.main, 0.04),
                border: theme.palette.info.main,
                iconBg: alpha(theme.palette.info.main, 0.12),
                iconColor: theme.palette.info.main,
            };
        }
        if (label === 'Rejected By') {
            return {
                bg: alpha(theme.palette.error.main, 0.04),
                border: theme.palette.error.main,
                iconBg: alpha(theme.palette.error.main, 0.12),
                iconColor: theme.palette.error.main,
            };
        }
        // Approved By / default
        return {
            bg: alpha(theme.palette.success.main, 0.04),
            border: theme.palette.success.main,
            iconBg: alpha(theme.palette.success.main, 0.12),
            iconColor: theme.palette.success.main,
        };
    };

    const cfg = getThemeConfig();

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: cfg.bg,
                border: `1px solid ${alpha(cfg.border, 0.12)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                minWidth: 0,
                ...sx,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    bgcolor: cfg.iconBg,
                    color: cfg.iconColor,
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        display: 'block',
                        fontSize: 11,
                        mb: 0.2,
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: 900,
                        color: 'text.primary',
                        fontSize: '15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
