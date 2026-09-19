import type { AutoLeaveAllocationLog } from 'src/api/leave-allocations';

import { alpha } from '@mui/material/styles';
import {
    Box,
    Stack,
    Tooltip,
    TableRow,
    TableCell,
    Typography,
    IconButton,
} from '@mui/material';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    row: AutoLeaveAllocationLog;
    index: number;
    onView: () => void;
};

export function AutoAllocateLogTableRow({ row, index, onView }: Props) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Success':
                return 'success';
            case 'Partial':
                return 'warning';
            case 'Failed':
                return 'error';
            default:
                return 'default';
        }
    };

    const getModeLabel = (mode: string) => {
        const isCron = mode === 'Scheduled Cron';
        return (
            <Label
                variant="soft"
                color={isCron ? 'secondary' : 'info'}
                startIcon={<Iconify icon={isCron ? 'solar:clock-circle-bold' : 'solar:user-bold'} width={14} />}
                sx={{ fontWeight: 700 }}
            >
                {isCron ? 'Scheduled' : 'Manual'}
            </Label>
        );
    };

    return (
        <TableRow
            hover
            tabIndex={-1}
            sx={{
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
            <TableCell align="center" sx={{ width: 60 }}>
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

            <TableCell sx={{ minWidth: 180 }}>
                <Stack spacing={0.25}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {row.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {row.execution_date ? new Date(row.execution_date).toLocaleString() : '—'}
                    </Typography>
                </Stack>
            </TableCell>

            <TableCell sx={{ minWidth: 160 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.target_period || `${row.month}/${row.year}`}
                </Typography>
                {row.attendance_evaluated_month && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Att: {row.attendance_evaluated_month}
                    </Typography>
                )}
            </TableCell>

            <TableCell sx={{ minWidth: 120 }}>
                {getModeLabel(row.execution_type)}
            </TableCell>

            <TableCell sx={{ minWidth: 140 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {row.executed_by || 'System'}
                </Typography>
            </TableCell>

            <TableCell align="center" sx={{ minWidth: 150 }}>
                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <Tooltip title="Allocations Created">
                        <Label variant="soft" color="success" sx={{ fontWeight: 700 }}>
                            {row.created_count} Allocated
                        </Label>
                    </Tooltip>
                    {row.skipped_count > 0 && (
                        <Tooltip title="Skipped">
                            <Label variant="soft" color="default" sx={{ fontWeight: 700 }}>
                                {row.skipped_count} Skipped
                            </Label>
                        </Tooltip>
                    )}
                    {row.error_count > 0 && (
                        <Tooltip title="Errors">
                            <Label variant="soft" color="error" sx={{ fontWeight: 700 }}>
                                {row.error_count} Errors
                            </Label>
                        </Tooltip>
                    )}
                </Stack>
            </TableCell>

            <TableCell align="center" sx={{ minWidth: 100 }}>
                <Label color={getStatusColor(row.status)} sx={{ fontWeight: 800 }}>
                    {row.status}
                </Label>
            </TableCell>

            <TableCell align="right" sx={{ width: 80 }}>
                <Tooltip title="View Details">
                    <IconButton onClick={onView} size="small" sx={{ color: '#08a3cd', '&:hover': { bgcolor: alpha('#08a3cd', 0.08) } }}>
                        <Iconify icon="solar:eye-bold" width={20} />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
}
