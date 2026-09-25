import type { EvaluationAutomationRule } from 'src/api/employee-evaluation';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, styled } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// Android 12 Switch Style
const Android12Switch = styled(Switch)(({ theme }) => ({
    width: 36,
    height: 20,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 3,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#00A5D1',
                opacity: 1,
                border: 0,
            },
            '& .MuiSwitch-thumb': {
                backgroundColor: '#fff',
                width: 14,
                height: 14,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 14,
        height: 14,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
    },
    '& .MuiSwitch-track': {
        borderRadius: 20 / 2,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 300,
        }),
    },
}));

const EVENT_COLOR: Record<string, 'error' | 'success' | 'warning' | 'info' | 'default'> = {
    'Late Login': 'warning',
    'Early Exit': 'warning',
    'Task Delayed': 'error',
    'Milestone Achieved': 'success',
    'Continuous Presence': 'info',
    'Daily Log Submission': 'success',
    'Specific Day Leave': 'info',
    'Specific Date Leave': 'info',
};

interface Props {
    row: EvaluationAutomationRule;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
    onToggleEnabled: (enabled: boolean) => void;
}

export function EvaluationAutomationRuleTableRow({ row, index, onEdit, onDelete, onToggleEnabled }: Props) {
    let threshold = '—';
    if (row.event_type === 'Late Login') {
        threshold = row.late_login_after ? `After ${row.late_login_after}` : '—';
    } else if (row.event_type === 'Early Exit') {
        threshold = row.early_exit_before ? `Before ${row.early_exit_before}` : '—';
    } else if (row.event_type === 'Specific Day Leave') {
        threshold = row.specific_day || '—';
    } else if (row.event_type === 'Specific Date Leave') {
        threshold = row.specific_date || '—';
    }

    return (
        <TableRow
            hover
            sx={{
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
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

            <TableCell>
                <Typography variant="subtitle2" noWrap>{row.rule_name}</Typography>
                {row.description && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                        {row.description}
                    </Typography>
                )}
            </TableCell>

            <TableCell>
                <Chip
                    label={row.event_type}
                    color={EVENT_COLOR[row.event_type] || 'default'}
                    size="small"
                    variant="outlined"
                />
            </TableCell>

            <TableCell>
                <Typography variant="body2">{row.trait}</Typography>
            </TableCell>

            <TableCell>
                <Typography variant="body2">{row.evaluation_point}</Typography>
            </TableCell>

            <TableCell>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{threshold}</Typography>
            </TableCell>

            <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Android12Switch
                        size="small"
                        checked={!!row.enabled}
                        onChange={(e) => onToggleEnabled(e.target.checked)}
                    />
                    <Typography variant="caption" sx={{ color: row.enabled ? 'success.main' : 'text.disabled', fontWeight: 'medium' }}>
                        {row.enabled ? 'Active' : 'Off'}
                    </Typography>
                </Stack>
            </TableCell>

            <TableCell align="right">
                <IconButton onClick={onEdit} size="small" title="Edit" sx={{ color: 'primary.main' }}>
                    <Iconify icon="solar:pen-bold" />
                </IconButton>
                <IconButton onClick={onDelete} size="small" color="error" title="Delete">
                    <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}
