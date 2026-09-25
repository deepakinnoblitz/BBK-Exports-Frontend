import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

const getStatusStyle = (status: string) => {
    const styles: Record<string, { bgcolor: string; border: string; color: string }> = {
        'Draft': {
            bgcolor: 'rgba(156, 163, 175, 0.25)',
            border: '1px solid rgba(156, 163, 175, 0.45)',
            color: '#374151'
        },
        'Sent': {
            bgcolor: 'rgba(99, 102, 241, 0.25)',
            border: '1px solid rgba(99, 102, 241, 0.45)',
            color: '#4338ca'
        },
        'Approved': {
            bgcolor: 'rgba(34, 197, 94, 0.25)',
            border: '1px solid rgba(34, 197, 94, 0.45)',
            color: '#15803d'
        },
        'Rejected': {
            bgcolor: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#991b1b'
        },
        'Expired': {
            bgcolor: 'rgba(251, 146, 60, 0.24)',
            border: '1px solid rgba(251, 146, 60, 0.45)',
            color: '#9a3412'
        }
    };

    return styles[status] || {
        bgcolor: 'rgba(156, 163, 175, 0.25)',
        border: '1px solid rgba(156, 163, 175, 0.45)',
        color: '#374151'
    };
};

export type ProposalRowProps = {
    id: string;
    reference_no?: string;
    proposal_title: string;
    lead: string;
    lead_name?: string;
    company_name?: string;
    billing_account_name?: string;
    proposal_date: string;
    status?: string;
    total_attachments?: number;
};

type ProposalTableRowProps = {
    row: ProposalRowProps;
    selected: boolean;
    onSelectRow: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onPrint?: (id: string) => void;
    onPreview?: (id: string) => void;
    canEdit?: boolean;
    canDelete?: boolean;
    canView?: boolean;
    hideCheckbox?: boolean;
    index?: number;
};

export function ProposalTableRow({
    row,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onDelete,
    onPrint,
    onPreview,
    canEdit = true,
    canDelete = true,
    canView = true,
    hideCheckbox = false,
    index,
}: ProposalTableRowProps) {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.proposal;

    const displayView = hasCustomPerms ? !!user?.permissions?.actions?.proposal?.view : canView;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.proposal?.edit : canEdit;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.proposal?.delete : canDelete;
    const { id } = row;

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
                            transition: (theme) =>
                                theme.transitions.create(['all'], {
                                    duration: theme.transitions.duration.shorter,
                                }),
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

            {/* Proposal No */}
            <TableCell component="th" scope="row">
                <Typography variant="subtitle2" sx={{ fontWeight: 700, }}>
                    {row.reference_no || row.id}
                </Typography>
            </TableCell>

            {/* Proposal Title */}
            <TableCell sx={{ maxWidth: 220 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {row.proposal_title}
                </Typography>
            </TableCell>

            {/* Lead */}
            <TableCell sx={{ maxWidth: 180 }}>
                <Stack spacing={0.5}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                        {row.lead_name || row.lead}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                        {row.lead}
                    </Typography>
                </Stack>
            </TableCell>

            {/* Company Name */}
            <TableCell sx={{ maxWidth: 180 }}>
                {row.company_name ? (
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                        {row.company_name}
                    </Typography>
                ) : (
                    '—'
                )}
            </TableCell>

            {/* Proposal Date */}
            <TableCell sx={{ fontWeight: 400 }}>{fDate(row.proposal_date)}</TableCell>

            {/* Status */}
            <TableCell>
                <Label
                    sx={{
                        ...getStatusStyle(row.status || 'Draft'),
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        borderRadius: '6px',
                        padding: '4px 12px',
                    }}
                >
                    {row.status || 'Draft'}
                </Label>
            </TableCell>

            {/* Total Attachments */}
            <TableCell align="center">
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: row.total_attachments ? 'info.main' : 'text.disabled',
                        fontWeight: 700,
                    }}
                >
                    <Iconify icon="solar:paperclip-bold" width={16} />
                    {row.total_attachments ?? 0}
                </Box>
            </TableCell>

            {/* Actions */}
            <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {displayView && (
                        <IconButton onClick={onView} sx={{ color: 'info.main' }} title="View">
                            <Iconify icon={'solar:eye-bold' as any} />
                        </IconButton>
                    )}
                    {displayEdit && (
                        <IconButton onClick={onEdit} sx={{ color: 'primary.main' }} title="Edit">
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}
                    {displayDelete && (
                        <IconButton onClick={onDelete} sx={{ color: 'error.main' }} title="Delete">
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
