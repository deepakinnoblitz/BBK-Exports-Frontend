import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        employee: string;
        employeeName: string;
        leaveType: string;
        allocationSource?: string;
        fromDate: string;
        toDate: string;
        totalLeaves: number;
        leavesTaken: number;
        status: string;
    };
    selected: boolean;
    onSelectRow: VoidFunction;
    onView: VoidFunction;
    onEdit: VoidFunction;
    onDelete: VoidFunction;
    canEdit?: boolean;
    canDelete?: boolean;
    hideCheckbox?: boolean;
    index?: number;
};

export function LeaveAllocationTableRow({
    row,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
    hideCheckbox = false,
    index,
}: Props) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'success';
            case 'Cancelled': return 'error';
            case 'Draft': return 'warning';
            default: return 'default';
        }
    };

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.leave_allocate;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.leave_allocate?.edit : true;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.leave_allocate?.delete : true;

    const handleClick = (event: React.MouseEvent<HTMLElement>, callback: VoidFunction) => {
        event.stopPropagation();
        callback();
    };

    return (
        <TableRow
            hover
            tabIndex={-1}
            role="checkbox"
            selected={selected}
            sx={{
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
            {!hideCheckbox && (
                <TableCell padding="checkbox">
                    <Checkbox disableRipple checked={selected} onChange={onSelectRow} />
                </TableCell>
            )}

            {typeof index === 'number' && (
                <TableCell align="center">
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

            <TableCell>
                <Stack spacing={0.5}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {row.employeeName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {row.employee}
                    </Typography>
                </Stack>
            </TableCell>

            <TableCell>
                <Label variant="soft" color="info" sx={{ fontWeight: 700 }}>
                    {row.leaveType}
                </Label>
            </TableCell>

            <TableCell>
                <Label
                    variant="soft"
                    color={row.allocationSource === 'Auto' ? 'info' : 'warning'}
                    sx={{ fontWeight: 700 }}
                >
                    {(row.allocationSource || 'Manual').toUpperCase()}
                </Label>
            </TableCell>

            <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon={"solar:calendar-bold" as any} width={16} sx={{ color: 'text.disabled' }} />
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                        {dayjs(row.fromDate).format('DD MMM')} - {dayjs(row.toDate).format('DD MMM YYYY')}
                    </Typography>
                </Stack>
            </TableCell>

            <TableCell align="center">
                <Box
                    sx={{
                        typography: 'subtitle2',
                        color: 'primary.main',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        borderRadius: 1,
                        py: 0.5,
                        px: 1,
                        display: 'inline-block',
                        fontWeight: 800,
                    }}
                >
                    {row.totalLeaves}
                </Box>
            </TableCell>

            <TableCell align="center">
                <Box
                    sx={{
                        typography: 'subtitle2',
                        color: 'error.main',
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                        borderRadius: 1,
                        py: 0.5,
                        px: 1,
                        display: 'inline-block',
                        fontWeight: 800,
                    }}
                >
                    {row.leavesTaken}
                </Box>
            </TableCell>

            <TableCell>
                <Label variant="soft" color={getStatusColor(row.status)} sx={{ fontWeight: 800 }}>
                    {row.status}
                </Label>
            </TableCell>

            <TableCell align="right" sx={{ px: 1 }}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton
                        size="small"
                        onClick={(e) => handleClick(e, onView)}
                        color="info"
                    >
                        <Iconify icon="solar:eye-bold" width={20} />
                    </IconButton>

                    {displayEdit && (
                        <IconButton
                            size="small"
                            onClick={(e) => handleClick(e, onEdit)}
                            color="primary"
                        >
                            <Iconify icon={"solar:pen-bold" as any} width={20} />
                        </IconButton>
                    )}

                    {displayDelete && (
                        <IconButton
                            size="small"
                            onClick={(e) => handleClick(e, onDelete)}
                            color="error"
                        >
                            <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                        </IconButton>
                    )}
                </Stack>
            </TableCell>
        </TableRow>
    );
}
