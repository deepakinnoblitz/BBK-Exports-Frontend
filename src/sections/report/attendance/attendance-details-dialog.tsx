import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import { Avatar } from '@mui/material';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getEmployee } from 'src/api/employees';
import { getHRDoc } from 'src/api/hr-management';
import { getAttendanceTransferDetails } from 'src/api/attendance-transfer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { BiometricPunchesTable } from '../../attendance/biometric-punches-table';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    attendanceId: string | null;
};

export function AttendanceDetailsDialog({ open, onClose, attendanceId }: Props) {
    const { user } = useAuth();
    const isSystemManager = user?.roles?.some((role: string) =>
        ['System Manager', 'Administrator'].includes(role)
    );

    const hasHR = user?.roles?.some((role: string) => ['HR', 'HR Manager'].includes(role));
    const isSuperAdmin = (hasHR && isSystemManager) || user?.roles?.includes('Administrator');

    const [attendance, setAttendance] = useState<any>(null);
    const [employeeDetails, setEmployeeDetails] = useState<any>(null);
    const [transferDetails, setTransferDetails] = useState<any>(null);
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
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

                    if (data.is_transferred || data.attendance_transfer_ref) {
                        getAttendanceTransferDetails(data.attendance_transfer_ref, attendanceId)
                            .then((tData) => {
                                setTransferDetails(tData);
                                if (!data.attendance_transfer_ref && tData?.name) {
                                    setAttendance((prev: any) => ({ ...prev, attendance_transfer_ref: tData.name }));
                                }
                            })
                            .catch((err) => {
                                console.warn('Could not fetch linked transfer details:', err);
                                setTransferDetails(null);
                            });
                    } else {
                        setTransferDetails(null);
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
            case 'Compensatory Off': return 'secondary';
            default: return 'default';
        }
    };

    return (
        <>
            <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            TransitionProps={{
                onExited: () => {
                    setAttendance(null);
                    setEmployeeDetails(null);
                    setTransferDetails(null);
                    setReasonDialogOpen(false);
                }
            }}
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
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
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
                                        }}
                                    >
                                        {attendance.status}
                                    </Label>
                                    {isSuperAdmin && !!attendance.is_transferred && (
                                        <Label
                                            color="info"
                                            variant="filled"
                                            sx={{
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.25,
                                                px: 1.25,
                                                py: 2,
                                                borderRadius: 1,
                                                fontSize: '0.75rem',
                                                bgcolor: (t) => alpha(t.palette.info.main, 0.9),
                                            }}
                                        >
                                            {attendance.transfer_type === 'Target (Adjusted Working)' ? 'Adjusted Working' : (attendance.transfer_type || 'Transferred')}
                                        </Label>
                                    )}
                                </Stack>
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

                        {/* Attendance Transfer Details (Super Admin Only) */}
                        {isSuperAdmin && !!attendance.is_transferred && (
                            <Card
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    borderRadius: 2,
                                    border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.04),
                                    boxShadow: (theme) => `0 4px 16px 0 ${alpha(theme.palette.info.main, 0.06)}`,
                                }}
                            >
                                <Stack spacing={2}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Box
                                                sx={{
                                                    p: 1.2,
                                                    borderRadius: 1.5,
                                                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.12),
                                                    color: 'info.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Iconify icon={"solar:transfer-horizontal-bold" as any} width={24} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                                    Attendance Transfer Information
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {transferDetails?.status && (
                                                <Label
                                                    color={transferDetails.status === 'Submitted' ? 'success' : 'error'}
                                                    variant="soft"
                                                    sx={{ fontWeight: 800, textTransform: 'uppercase' }}
                                                >
                                                    {transferDetails.status}
                                                </Label>
                                            )}
                                            <Label
                                                color="info"
                                                variant="soft"
                                                sx={{ fontWeight: 700 }}
                                            >
                                                {attendance.transfer_type || 'Working Day Adjustment'}
                                            </Label>
                                        </Stack>
                                    </Stack>

                                    <Divider sx={{ borderStyle: 'dashed', borderColor: (theme) => alpha(theme.palette.info.main, 0.24) }} />

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                                Transfer Ref ID
                                            </Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25}}>
                                                {attendance.attendance_transfer_ref || transferDetails?.name || '-'}
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                                Transferred From (Source)
                                            </Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main', mt: 0.25 }}>
                                                {attendance.transferred_from_date ? dayjs(attendance.transferred_from_date).format('DD MMM YYYY') : (transferDetails?.source_date ? dayjs(transferDetails.source_date).format('DD MMM YYYY') : '-')}
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                                Adjusted To (Target)
                                            </Typography>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main', mt: 0.25 }}>
                                                {attendance.transferred_to_date ? dayjs(attendance.transferred_to_date).format('DD MMM YYYY') : (transferDetails?.target_date ? dayjs(transferDetails.target_date).format('DD MMM YYYY') : dayjs(attendance.attendance_date).format('DD MMM YYYY'))}
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                                Reason
                                            </Typography>
                                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                    onClick={() => setReasonDialogOpen(true)}
                                                    startIcon={<Iconify icon="solar:eye-bold" width={13} />}
                                                    sx={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        px: 1,
                                                        py: 0.2,
                                                        minHeight: 22,
                                                        height: 22,
                                                        borderRadius: 0.75,
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    View Detail
                                                </Button>
                                            </Stack>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 11 }}>
                                                Transferred By:{' '}
                                                <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>
                                                    {transferDetails?.transferred_by_name
                                                        ? `${transferDetails.transferred_by_name}${transferDetails.transferred_by && transferDetails.transferred_by !== transferDetails.transferred_by_name ? ` (${transferDetails.transferred_by})` : ''}`
                                                        : transferDetails?.transferred_by || transferDetails?.owner || 'Authorized Administrator'}
                                                </Box>
                                                {(transferDetails?.transfer_datetime || transferDetails?.creation) ? (
                                                    <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                                        on {dayjs(transferDetails?.transfer_datetime || transferDetails?.creation).format('DD MMM YYYY, hh:mm A')}
                                                    </Box>
                                                ) : null}
                                            </Typography>
                                        </Grid>

                                        {transferDetails?.status === 'Reverted' && (
                                            <Grid size={{ xs: 12 }}>
                                                <Box
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: 1.25,
                                                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                                                        border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.24)}`,
                                                    }}
                                                >
                                                    <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, display: 'block', mb: 0.25 }}>
                                                        Transfer Reverted
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'error.darker', fontWeight: 600 }}>
                                                        Reverted by <strong>{transferDetails.reverted_by_name || transferDetails.reverted_by}</strong> on {dayjs(transferDetails.revert_datetime).format('DD MMM YYYY, hh:mm A')}
                                                        {transferDetails.revert_reason ? ` — Reason: "${transferDetails.revert_reason}"` : ''}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Stack>
                            </Card>
                        )}

                        {attendance.manual ? (
                            <Box
                                sx={{
                                    p: 1.75,
                                    px: 2,
                                    mx: 3,
                                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                                    borderRadius: 1.5,
                                    border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.24)}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <Iconify icon={"solar:shield-warning-bold" as any} width={22} sx={{ color: 'warning.main', flexShrink: 0 }} />
                                <Typography variant="body2" sx={{ color: 'warning.darker', fontWeight: 600 }}>
                                    Manual Entry: Entered by {attendance.created_by_name || (attendance.owner && attendance.owner !== 'Guest' ? attendance.owner : 'Authorized User')}. Protected from biometric sync overwrite.
                                </Typography>
                            </Box>
                        ) : null}

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
                                <DetailRow label="Overtime" value={attendance.official_overtime || attendance.overtime_display || '00:00'} icon="solar:stopwatch-bold" />
                                {isSystemManager && (
                                    <DetailRow label="Extra Overtime" value={attendance.unofficial_overtime || '00:00'} icon="solar:stopwatch-bold" />
                                )}
                                <DetailRow label="Attendance Source" value={attendance.attendance_source || (attendance.manual ? 'Manual' : 'Biometric')} icon="solar:user-id-bold" />
                                <DetailRow label="Manual Override" value={attendance.manual ? 'Yes (Protected)' : 'No'} icon="solar:pen-new-square-bold" />
                                {isSuperAdmin && !!attendance.is_transferred && (
                                    <DetailRow
                                        label="Transfer Shift"
                                        value={attendance.transferred_from_date ? `From ${dayjs(attendance.transferred_from_date).format('DD MMM')}` : (attendance.transferred_to_date ? `To ${dayjs(attendance.transferred_to_date).format('DD MMM')}` : 'Transferred')}
                                        icon={"solar:transfer-horizontal-bold" as any}
                                    />
                                )}
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

                            {/* Audit Log Card */}
                            <Box sx={{ px: 1 }}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        p: 3,
                                        borderRadius: 2,
                                        border: (theme) => `1px solid ${theme.palette.divider}`,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Created / Entered By"
                                                value={attendance.created_by_name || (attendance.owner && attendance.owner !== 'Guest' ? attendance.owner : 'Administrator')}
                                                icon={<Iconify icon={"solar:user-bold" as any} width={20} />}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Created Date & Time"
                                                value={attendance.creation ? dayjs(attendance.creation).format('DD-MM-YYYY hh:mm A') : '-'}
                                                icon={<Iconify icon={"solar:calendar-date-bold" as any} width={20} />}
                                            />
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                            <Divider sx={{ borderStyle: 'dashed' }} />
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Last Modified By"
                                                value={attendance.modified_by_name || attendance.modified_by || 'Administrator'}
                                                icon={<Iconify icon={"solar:user-check-bold" as any} width={20} />}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <DetailItem
                                                label="Last Modified Date & Time"
                                                value={attendance.modified ? dayjs(attendance.modified).format('DD-MM-YYYY hh:mm A') : '-'}
                                                icon={<Iconify icon={"solar:calendar-date-bold" as any} width={20} />}
                                            />
                                        </Grid>
                                    </Grid>
                                </Card>
                            </Box>
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

        {/* Reason & Transfer Details Dialog */}
        <Dialog
            open={reasonDialogOpen}
            onClose={() => setReasonDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
            PaperProps={{
                sx: { borderRadius: 2, boxShadow: (theme) => theme.customShadows.z24 }
            }}
        >
            <DialogTitle sx={{ pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800}>
                            Transfer Reason & Details
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={() => setReasonDialogOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
                    <Iconify icon={"mingcute:close-line" as any} width={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ my: 2.5 }}>
                <Stack spacing={2.5}>
                    {/* Reason Highlight Card */}
                    <Box
                        sx={{
                            p: 2.5,
                            borderRadius: 1.5,
                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.06),
                            border: (theme) => `1px dashed ${alpha(theme.palette.info.main, 0.36)}`,
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                            <Iconify icon={"solar:chat-round-dots-bold" as any} width={16} /> Reason / Administrative Note
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', fontStyle: 'italic', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            &ldquo;{transferDetails?.reason || 'No reason specified'}&rdquo;
                        </Typography>
                    </Box>

                    {/* Transfer Metadata Summary */}
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 1.5,
                            bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'background.neutral',
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                    Transfer Reference ID
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25 }}>
                                    {transferDetails?.name || attendance?.attendance_transfer_ref || '-'}
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                    Batch Status
                                </Typography>
                                <Box sx={{ mt: 0.25 }}>
                                    <Label
                                        color={transferDetails?.status === 'Submitted' ? 'success' : 'error'}
                                        variant="soft"
                                        sx={{ fontWeight: 800 }}
                                    >
                                        {transferDetails?.status || 'Submitted'}
                                    </Label>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                    Original Date (Source)
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main', mt: 0.25 }}>
                                    {transferDetails?.source_date ? dayjs(transferDetails.source_date).format('DD MMM YYYY') : (attendance?.transferred_from_date ? dayjs(attendance.transferred_from_date).format('DD MMM YYYY') : '-')}
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                    Adjusted Working Date (Target)
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.main', mt: 0.25 }}>
                                    {transferDetails?.target_date ? dayjs(transferDetails.target_date).format('DD MMM YYYY') : (attendance?.transferred_to_date ? dayjs(attendance.transferred_to_date).format('DD MMM YYYY') : dayjs(attendance?.attendance_date).format('DD MMM YYYY'))}
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                    Transferred By
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25 }}>
                                    {transferDetails?.transferred_by_name || transferDetails?.transferred_by || transferDetails?.owner || 'Authorized Administrator'}
                                </Typography>
                                {transferDetails?.transferred_by && transferDetails.transferred_by !== transferDetails.transferred_by_name && (
                                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                                        {transferDetails.transferred_by}
                                    </Typography>
                                )}
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                                    Transferred Timestamp
                                </Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 0.25 }}>
                                    {transferDetails?.transfer_datetime
                                        ? dayjs(transferDetails.transfer_datetime).format('DD MMM YYYY, hh:mm A')
                                        : (transferDetails?.creation ? dayjs(transferDetails.creation).format('DD MMM YYYY, hh:mm A') : '-')}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Reverted Alert if applicable */}
                    {transferDetails?.status === 'Reverted' && (
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.25,
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                                border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.24)}`,
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ color: 'error.main', fontWeight: 800 }}>
                                Transfer Reverted
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                Reverted by: <strong>{transferDetails.reverted_by_name || transferDetails.reverted_by || 'Super Admin'}</strong>
                                {transferDetails.revert_datetime ? ` on ${dayjs(transferDetails.revert_datetime).format('DD MMM YYYY, hh:mm A')}` : ''}
                            </Typography>
                            {transferDetails.revert_reason && (
                                <Typography variant="body2" sx={{ color: 'error.dark', fontStyle: 'italic', mt: 0.5 }}>
                                    Revert Reason: &ldquo;{transferDetails.revert_reason}&rdquo;
                                </Typography>
                            )}
                        </Box>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    </>
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
                    color: 'primary.main',
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

function DetailItem({ label, value, icon }: { label: string; value?: string | null; icon: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                    color: 'info.main',
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
