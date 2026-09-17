import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Avatar } from '@mui/material';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { getEmployee } from 'src/api/employees';
import { getHRDoc } from 'src/api/hr-management';
import { fetchBiometricDevices } from 'src/api/biometric';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

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
    const [punchPage, setPunchPage] = useState(0);
    const [punchRowsPerPage, setPunchRowsPerPage] = useState(5);
    const [devicesMap, setDevicesMap] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchBiometricDevices({ page: 1, page_size: 100 })
            .then((res: any) => {
                const list = res?.data || [];
                const map: Record<string, any> = {};
                list.forEach((d: any) => {
                    if (d.name) map[d.name] = d;
                    if (d.device_code) map[d.device_code] = d;
                    if (d.serial_number) map[d.serial_number] = d;
                });
                setDevicesMap(map);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (open && attendanceId) {
            setPunchPage(0);
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
                                    <Card
                                        sx={{
                                            borderRadius: 2,
                                            border: (theme: any) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                                            boxShadow: (theme: any) => theme.customShadows?.z4 || '0 8px 16px 0 rgba(0, 0, 0, 0.08)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box sx={{ px: 2, py: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Iconify icon={"solar:fingerprint-bold" as any} sx={{ color: 'primary.main', width: 18, height: 18 }} />
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.115rem' }}>
                                                    Biometric Punches ({attendance.attendance_punches.length})
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        <TableContainer sx={{ overflow: 'unset' }}>
                                            <Table size="small">
                                                <TableHead
                                                    sx={{
                                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                        '& th': {
                                                            color: 'text.secondary',
                                                            fontWeight: 700,
                                                            fontSize: '0.825rem',
                                                            py: 1.5,
                                                            borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                                                        },
                                                    }}
                                                >
                                                    <TableRow>
                                                        <TableCell sx={{ minWidth: 160 }}>Punch Time</TableCell>
                                                        <TableCell align="center" sx={{ width: 100 }}>Direction</TableCell>
                                                        <TableCell sx={{ minWidth: 150 }}>Terminal / Serial</TableCell>
                                                        <TableCell align="right" sx={{ width: 110, pr: 2.5 }}>Source</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {attendance.attendance_punches
                                                        .slice(punchPage * punchRowsPerPage, punchPage * punchRowsPerPage + punchRowsPerPage)
                                                        .map((p: any, idx: number) => {
                                                            const isIn = p.punch_type === 'IN';
                                                            return (
                                                                <TableRow
                                                                    key={idx}
                                                                    hover
                                                                    sx={{
                                                                        '& td': {
                                                                            py: 1.25,
                                                                            borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                                                        },
                                                                        '&:last-of-type td': {
                                                                            borderBottom: 'none',
                                                                        },
                                                                    }}
                                                                >
                                                                    <TableCell>
                                                                        <Stack direction="row" alignItems="center" spacing={1.25}>
                                                                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary' }}>
                                                                                {dayjs(p.punch_time).format('DD-MM-YYYY hh:mm:ss A')}
                                                                            </Typography>
                                                                        </Stack>
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        <Label
                                                                            variant="soft"
                                                                            color={isIn ? 'success' : 'error'}
                                                                            sx={{
                                                                                fontWeight: 700,
                                                                                minWidth: 56,
                                                                                height: 24,
                                                                                fontSize: '0.7125rem',
                                                                            }}
                                                                        >
                                                                            {p.punch_type}
                                                                        </Label>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {(() => {
                                                                            const deviceObj = (p.device && devicesMap[p.device]) || (p.serial_number && devicesMap[p.serial_number]);
                                                                            const deviceName = p.device_name || deviceObj?.device_name;
                                                                            const deviceId = p.device || deviceObj?.device_code || p.serial_number;

                                                                            return (
                                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                                    <Iconify icon={"solar:devices-bold" as any} sx={{ width: 18, height: 18, color: 'text.disabled', flexShrink: 0 }} />
                                                                                    <Box sx={{ minWidth: 0 }}>
                                                                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.825rem', color: 'text.primary', lineHeight: 1.25 }}>
                                                                                            {deviceName || deviceId || '—'}
                                                                                        </Typography>
                                                                                        {deviceId && deviceName && deviceName !== deviceId && (
                                                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7125rem', fontWeight: 500, display: 'block', lineHeight: 1.2 }}>
                                                                                                {deviceId}
                                                                                            </Typography>
                                                                                        )}
                                                                                    </Box>
                                                                                </Stack>
                                                                            );
                                                                        })()}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ pr: 2.5 }}>
                                                                        <Label
                                                                            variant="soft"
                                                                            color="info"
                                                                            sx={{
                                                                                fontWeight: 700,
                                                                                height: 24,
                                                                                fontSize: '0.65rem',
                                                                                letterSpacing: 0.5,
                                                                                textTransform: 'uppercase',
                                                                            }}
                                                                        >
                                                                            {p.source || 'Biometric'}
                                                                        </Label>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <TablePagination
                                            rowsPerPageOptions={[5, 10, 25]}
                                            component="div"
                                            count={attendance.attendance_punches.length}
                                            rowsPerPage={punchRowsPerPage}
                                            page={punchPage}
                                            onPageChange={(e, newPage) => setPunchPage(newPage)}
                                            onRowsPerPageChange={(e) => {
                                                setPunchRowsPerPage(parseInt(e.target.value, 10));
                                                setPunchPage(0);
                                            }}
                                            sx={{ borderTop: (theme) => `1px solid ${alpha(theme.palette.divider, 0.6)}` }}
                                        />
                                    </Card>
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
