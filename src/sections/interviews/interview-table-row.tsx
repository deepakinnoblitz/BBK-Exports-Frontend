import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        job_applicant: string;
        job_applied: string;
        designation?: string;
        scheduled_on: string;
        from_time: string;
        overall_status: string;
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

export function InterviewTableRow({
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
    const renderStatus = (status: string) => {
        let color: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' = 'default';

        switch (status) {
            case 'Selected':
            case 'Completed':
                color = 'success';
                break;
            case 'Rejected':
            case 'Cancelled':
            case 'No-Show':
                color = 'error';
                break;
            case 'On Hold':
            case 'Rescheduled':
                color = 'warning';
                break;
            case 'Scheduled':
            case 'In Progress':
                color = 'info';
                break;
            case 'Applied':
            case 'Screening':
            case 'Shortlisted':
                color = 'primary';
                break;
            default:
                color = 'default';
        }

        return (
            <Label variant="soft" color={color}>
                {status}
            </Label>
        );
    };

    const formatDateTime = (date: string, time: string) => {
        if (!date) return '-';
        return `${new Date(date).toLocaleDateString()} ${time || ''}`;
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
                    <Checkbox checked={selected} onClick={onSelectRow} />
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
                <Stack direction="row" alignItems="center" spacing={2}>
                    {/* <Avatar alt={row.job_applicant} sx={{ bgcolor: 'info.main', color: 'common.white' }}>
                        {row.job_applicant.charAt(0).toUpperCase()}
                    </Avatar> */}
                    <Box>
                        <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{ cursor: 'pointer', fontWeight: 700 }}
                            onClick={onView}
                        >
                            {row.job_applicant}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                            {row.job_applied || 'No Job Assigned'}{row.designation ? ` - ${row.designation}` : ''}
                        </Typography>
                    </Box>
                </Stack>
            </TableCell>

            <TableCell>{formatDateTime(row.scheduled_on, row.from_time) || "-"}</TableCell>

            <TableCell>{renderStatus(row.overall_status)}</TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton size="small" color="primary" onClick={onView}>
                        <Iconify icon="solar:eye-bold" />
                    </IconButton>

                    {canEdit && (
                        <IconButton size="small" color="info" onClick={onEdit}>
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}

                    {canDelete && (
                        <IconButton size="small" color="error" onClick={onDelete}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
