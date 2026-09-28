import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { fDate, fTime, fDecimalHours } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

type Props = {
    row: any;
    index: number;
    isHR?: boolean;
    onView: VoidFunction;
};

export function EmployeeDailyLogTableRow({ row, index, isHR, onView }: Props) {
    const theme = useTheme();

    const {
        status,
        login_time,
        login_date,
        logout_time,
        total_work_hours,
        employee,
        employee_name,
        breaks = []
    } = row;

    const totalBreakHours = breaks.reduce((sum: number, b: any) => sum + (b.break_duration || 0), 0) / 60;

    const isActive = status === 'Active';

  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.daily_log;
  const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.daily_log?.edit : true;

    return (
        <TableRow
            hover
            sx={{
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
            <TableCell>
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        display: 'flex',
                        borderRadius: '50%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                        typography: 'subtitle2',
                        fontWeight: 800,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                        mx: 'auto',
                        transition: theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
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

            {isHR && (
                <TableCell>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {employee_name || 'N/A'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                        {employee || 'N/A'}
                    </Typography>
                </TableCell>
            )}

            <TableCell>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                    {fDate(login_date, 'DD-MM-YYYY')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                    {fDate(login_date, 'dddd')}
                </Typography>
            </TableCell>

            {/* <TableCell>
                <Label
                    variant="soft"
                    color={isActive ? 'success' : 'default'}
                    sx={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '0.65rem' }}
                >
                    {status}
                </Label>
            </TableCell> */}

            <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{fTime(login_time)}</Typography>
            </TableCell>

            <TableCell>
                <Typography variant="body2" sx={{ color: !logout_time ? 'primary.main' : 'text.primary', fontWeight: !logout_time ? 700 : 500 }}>
                    {logout_time ? fTime(logout_time) : 'Active'}
                </Typography>
            </TableCell>

            <TableCell>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 900,
                        color: total_work_hours >= 8 ? 'success.main' : 'text.primary'
                    }}
                >
                    {total_work_hours ? fDecimalHours(total_work_hours) : '0 secs'}
                </Typography>
            </TableCell>

            <TableCell>
                <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 700 }}>
                    {fDecimalHours(totalBreakHours)}
                </Typography>
            </TableCell>

            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <IconButton onClick={onView} sx={{ color: 'primary.main' }}>
                    <Iconify icon="solar:eye-bold" />
                </IconButton>

                {isHR && !isActive && displayEdit &&(
                    <IconButton onClick={() => row.onEdit?.()} sx={{ color: 'info.main' }}>
                        <Iconify icon="solar:pen-bold" />
                    </IconButton>
                )}
            </TableCell>
        </TableRow>
    );
}
