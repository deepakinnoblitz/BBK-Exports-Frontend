import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fTimeDist } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        employee: string;
        employeeName: string;
        attendanceDate: string;
        status: string;
        inTime?: string;
        out_time?: string;
        working_hours_display?: string;
        official_overtime?: string;
        unofficial_overtime?: string;
        attendance_source?: string;
        manual?: number | boolean;
        modified: string;
        is_transferred?: number | boolean;
        transfer_type?: string;
        transferred_from_date?: string;
        transferred_to_date?: string;
        attendance_transfer_ref?: string;
    };
    selected: boolean;
    onSelectRow: VoidFunction;
    onView: VoidFunction;
    onEdit: VoidFunction;
    onDelete: VoidFunction;
    canEdit?: boolean;
    canDelete?: boolean;
    canViewUnofficial?: boolean;
    hideCheckbox?: boolean;
    index?: number;
};

export function AttendanceTableRow({
    row,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
    canViewUnofficial = false,
    hideCheckbox = false,
    index,
}: Props) {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.attendance_list;
    const displayEdit = (canEdit !== undefined ? canEdit : true) && (hasCustomPerms ? !!user?.permissions?.actions?.attendance_list?.edit : true);
    const displayDelete = (canDelete !== undefined ? canDelete : true) && (hasCustomPerms ? !!user?.permissions?.actions?.attendance_list?.delete : true);

    // Super Admin: User must have HR (or HR Manager) AND System Manager roles, or be Administrator
    const hasHR = user?.roles?.some((role: string) => ['HR', 'HR Manager'].includes(role));
    const hasSystemManager = user?.roles?.some((role: string) => ['System Manager', 'Administrator'].includes(role));
    const isSuperAdmin = (hasHR && hasSystemManager) || user?.roles?.includes('Administrator');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Present': return 'success';
            case 'Absent': return 'error';
            case 'On Leave': return 'warning';
            case 'Holiday': return 'info';
            case 'Half Day': return 'warning';
            case 'Compensatory Off': return 'secondary';
            default: return 'default';
        }
    };

    return (
        <TableRow
            hover
            tabIndex={-1}
            role="checkbox"
            selected={selected}
            sx={{
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}`, px: 1 },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
            {!hideCheckbox && (
                <TableCell padding="checkbox">
                    <Checkbox disableRipple checked={selected} onChange={onSelectRow} />
                </TableCell>
            )}

            {typeof index === 'number' && (
                <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Box
                        sx={{
                            width: 28,
                            height: 28,
                            display: 'flex',
                            borderRadius: '50%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            color: 'primary.main',
                            typography: 'subtitle2',
                            fontWeight: 800,
                            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                            mx: 'auto',
                            transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                            '&:hover': {
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                transform: 'scale(1.1)',
                            },
                        }}
                    >
                        {index + 1}
                    </Box>
                </TableCell>
            )}

            <TableCell sx={{ minWidth: 140, maxWidth: 170, display: { xs: 'none', md: 'table-cell' } }}>
                <Box sx={{ maxWidth: 170 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 700,
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: 1.3,
                        }}
                    >
                        {row.employeeName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {row.employee}
                    </Typography>
                </Box>
            </TableCell>

            <TableCell>
                <Typography variant="body2" noWrap>
                    {dayjs(row.attendanceDate).format('DD-MM-YYYY')}
                </Typography>
            </TableCell>

            <TableCell>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, alignItems: 'flex-start' }}>
                    <Label color={getStatusColor(row.status)}>{row.status}</Label>
                    {isSuperAdmin && !!row.is_transferred && (
                        <Tooltip
                            title={
                                row.attendance_transfer_ref
                                    ? `Transfer Ref: ${row.attendance_transfer_ref}`
                                    : 'Transferred Attendance'
                            }
                            arrow
                        >
                            <Box
                                component="span"
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.4,
                                    fontSize: '0.675rem',
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    minHeight: 20,
                                    px: 0.85,
                                    py: 0.35,
                                    borderRadius: 0.75,
                                    bgcolor: (theme) => alpha('#36b37e', 0.12),
                                    color: '#2b9065',
                                    border: '1px solid rgba(54, 179, 126, 0.32)',
                                    cursor: 'help',
                                    whiteSpace: 'nowrap',
                                    transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
                                    '&:hover': {
                                        bgcolor: (theme) => alpha('#36b37e', 0.2),
                                        borderColor: 'rgba(54, 179, 126, 0.5)',
                                    }
                                }}
                            >
                                <Iconify icon={"solar:transfer-horizontal-bold-duotone" as any} width={13} />
                                {row.transfer_type === 'Target (Adjusted Working)' && row.transferred_from_date
                                    ? `From ${dayjs(row.transferred_from_date).format('DD/MM')}`
                                    : row.transfer_type === 'Source (Non-Working)' && row.transferred_to_date
                                    ? `To ${dayjs(row.transferred_to_date).format('DD/MM')}`
                                    : 'Transferred'}
                            </Box>
                        </Tooltip>
                    )}
                </Box>
            </TableCell>

            <TableCell>
                {row.manual ? (
                    <Label variant="soft" color="warning">
                        Manual
                    </Label>
                ) : row.attendance_source === 'Biometric' ? (
                    <Label variant="soft" color="info">
                        Biometric
                    </Label>
                ) : row.attendance_source ? (
                    <Label variant="soft" color="default">
                        {row.attendance_source}
                    </Label>
                ) : (
                    <Label variant="soft" color="default">
                        Manual
                    </Label>
                )}
            </TableCell>

            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" noWrap>
                    {row.inTime ? (dayjs(row.inTime.includes(':') && !row.inTime.includes('-') ? `2000-01-01 ${row.inTime}` : row.inTime).isValid() ? dayjs(row.inTime.includes(':') && !row.inTime.includes('-') ? `2000-01-01 ${row.inTime}` : row.inTime).format('hh:mm A') : row.inTime) : '-'}
                </Typography>
            </TableCell>
            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" noWrap>
                    {row.out_time ? (dayjs(row.out_time.includes(':') && !row.out_time.includes('-') ? `2000-01-01 ${row.out_time}` : row.out_time).isValid() ? dayjs(row.out_time.includes(':') && !row.out_time.includes('-') ? `2000-01-01 ${row.out_time}` : row.out_time).format('hh:mm A') : row.out_time) : '-'}
                </Typography>
            </TableCell>
            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" noWrap>
                    {row.working_hours_display || '-'}
                </Typography>
            </TableCell>

            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" noWrap sx={{ color: row.official_overtime && row.official_overtime !== '0:00' ? 'primary.main' : 'text.secondary', fontWeight: row.official_overtime && row.official_overtime !== '0:00' ? 600 : 400 }}>
                    {row.official_overtime || '-'}
                </Typography>
            </TableCell>

            {canViewUnofficial && (
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" noWrap sx={{ color: row.unofficial_overtime && row.unofficial_overtime !== '0:00' ? 'warning.main' : 'text.secondary', fontWeight: row.unofficial_overtime && row.unofficial_overtime !== '0:00' ? 600 : 400 }}>
                        {row.unofficial_overtime || '-'}
                    </Typography>
                </TableCell>
            )}

            <TableCell align="right" sx={{ whiteSpace: 'nowrap', pr: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant="caption"
                        noWrap
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 700,
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                            mr: 0.5,
                        }}
                    >
                        {row.modified ? fTimeDist(row.modified) : '-'}
                    </Typography>

                    <IconButton size="small" onClick={onView} sx={{ color: 'info.main' }}>
                        <Iconify icon="solar:eye-bold" />
                    </IconButton>
                    {displayEdit && (
                        <IconButton size="small" onClick={onEdit} sx={{ color: 'primary.main' }}>
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}
                    {displayDelete && (
                        <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
