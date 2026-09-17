import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import { Avatar } from '@mui/material';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getEmployee } from 'src/api/employees';
import { getHRDoc } from 'src/api/hr-management';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { BiometricPunchesTable } from '../../attendance/biometric-punches-table';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    attendanceId: string | null;
};

export function AttendanceDetailsDialog({ open, onClose, attendanceId }: Props) {
    const [attendance, setAttendance] = useState<any>(null);
    const [employeeDetails, setEmployeeDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (open && attendanceId) {
            setLoading(true);
            setFetching(true);
            getHRDoc('Attendance', attendanceId)
                .then((data) => {
                    setAttendance(data);
                    const empId = data.employee || data.employee_id;
                    if (empId) {
                        getEmployee(empId).then(setEmployeeDetails).catch(console.error).finally(() => setFetching(false));
                    } else {
                        setFetching(false);
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch attendance details:', err);
                    setFetching(false);
                })
                .finally(() => setLoading(false));
        }
    }, [open, attendanceId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Present': return 'success';
            case 'Absent': return 'error';
            case 'Missing': return 'warning';
            case 'On Leave': return 'warning';
            case 'Holiday': return 'info';
            case 'Half Day': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            TransitionProps={{ onExited: () => setAttendance(null) }}
            PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24 } }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Attendance Details</Typography>
                </Stack>
                <IconButton onClick={onClose} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) } }}>
                    <Iconify icon="mingcute:close-line" width={24} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, mt: 3.5 }}>
                {fetching || (loading && !attendance) ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <Iconify icon={"svg-spinners:12-dots-scale-rotate" as any} width={40} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : attendance ? (
                    <Stack spacing={3}>
                        {/* Header Summary Card */}
                        <Box
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                border: (theme: any) => `1px solid ${alpha(theme.palette.grey[500], 0.26)}`,
                                boxShadow: (theme: any) => theme.customShadows?.z4,
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
                                        src={employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || attendance?.profile_picture || attendance?.image}
                                        sx={{
                                            width: 72,
                                            height: 72,
                                            borderRadius: '50%',
                                            border: '3px solid #FFFFFF',
                                            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
                                            bgcolor: (theme: any) => {
                                                const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || attendance?.profile_picture || attendance?.image;
                                                if (img) return 'transparent';
                                                const colors = ['#E2F0CB', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FFB7B2', '#FF9AA2'];
                                                let hash = 0;
                                                const name = attendance?.employee_name || '';
                                                for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash * 31) - hash);
                                                return colors[Math.abs(hash) % colors.length];
                                            },
                                            color: (theme: any) => {
                                                const img = employeeDetails?.profile_picture || employeeDetails?.image || employeeDetails?.user_image || attendance?.profile_picture || attendance?.image;
                                                return img ? 'inherit' : alpha(theme.palette.common.black, 0.6);
                                            },
                                            fontSize: '1.75rem',
                                            fontWeight: 900,
                                            flexShrink: 0
                                        }}
                                    >
                                        {attendance?.employee_name?.charAt(0) || 'U'}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', wordBreak: 'break-word' }}>
                                            {attendance.employee_name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5, display: 'block' }}>
                                            Employee ID: {attendance.employee || attendance.employee_id || '-'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Label
                                    color={getStatusColor(attendance.status)}
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
                                        flexShrink: 0
                                    }}
                                >
                                    {attendance.status}
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
                                        Date
                                    </Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                        {dayjs(attendance.attendance_date).format('DD MMM YYYY')}
                                    </Typography>
                                </Stack>

                                <Stack spacing={0.5} alignItems="flex-end" sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                                        Working Hours
                                    </Typography>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                        {attendance.working_hours_display || '00:00'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>

                        <Stack spacing={2}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                                    gap: 2,
                                    p: 3
                                }}
                            >
                                <DetailRow
                                    label="In Time"
                                    value={attendance.in_time ? (dayjs(attendance.in_time.includes(':') && !attendance.in_time.includes('-') ? `2000-01-01 ${attendance.in_time}` : attendance.in_time).isValid() ? dayjs(attendance.in_time.includes(':') && !attendance.in_time.includes('-') ? `2000-01-01 ${attendance.in_time}` : attendance.in_time).format('hh:mm A') : attendance.in_time) : '-'}
                                    icon={"solar:clock-circle-bold" as any}
                                />
                                <DetailRow
                                    label="Out Time"
                                    value={attendance.out_time ? (dayjs(attendance.out_time.includes(':') && !attendance.out_time.includes('-') ? `2000-01-01 ${attendance.out_time}` : attendance.out_time).isValid() ? dayjs(attendance.out_time.includes(':') && !attendance.out_time.includes('-') ? `2000-01-01 ${attendance.out_time}` : attendance.out_time).format('hh:mm A') : attendance.out_time) : '-'}
                                    icon={"solar:clock-circle-bold" as any}
                                />
                                <DetailRow label="Working Hours" value={attendance.working_hours_display || '00:00'} icon="solar:stopwatch-bold" />
                                <DetailRow label="Overtime" value={attendance.overtime_display || '00:00'} icon="solar:stopwatch-bold" />
                                <DetailRow label="Attendance Source" value={attendance.attendance_source || (attendance.manual ? 'Manual' : 'Biometric')} icon="solar:user-id-bold" />
                                <DetailRow label="Manual Override" value={attendance.manual ? 'Yes (Protected)' : 'No'} icon="solar:pen-new-square-bold" />
                            </Box>

                            {attendance.leave_type && (
                                <Box sx={{ px: 3 }}>
                                    <DetailRow label="Leave Type" value={attendance.leave_type} icon="solar:leaf-bold" />
                                </Box>
                            )}

                            {/* Biometric Punch History */}
                            {attendance.attendance_punches && attendance.attendance_punches.length > 0 && (
                                <Box sx={{ px: 1, pb: 2 }}>
                                    <BiometricPunchesTable punches={attendance.attendance_punches} />
                                </Box>
                            )}
                        </Stack>
                    </Stack>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Iconify icon={"solar:ghost-bold" as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Record Found</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

function DetailRow({ label, value, icon }: { label: string; value?: string | null; icon: string }) {
    return (
        <Stack direction="row" spacing={2} alignItems="center">
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 1.25,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    color: 'info.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Iconify icon={icon as any} width={20} />
            </Box>
            <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Stack>
    );
}
