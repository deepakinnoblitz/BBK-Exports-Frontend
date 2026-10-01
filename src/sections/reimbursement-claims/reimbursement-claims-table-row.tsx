import type { MouseEvent } from 'react';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useUnreadCountsContext } from 'src/hooks/unread-counts-context';

import { fCurrency } from 'src/utils/format-number';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '16px') => {
    const formatted = fCurrency(amount);
    if (!formatted) return '—';
    const index = formatted.indexOf('₹');
    if (index !== -1) {
        return (
            <>
                {formatted.substring(0, index)}
                <span style={{ fontFamily: 'Arial', fontSize: symbolFontSize, display: 'inline-block', verticalAlign: 'baseline', lineHeight: 'normal' }}>₹</span>{' '}
                {formatted.substring(index + 1)}
            </>
        );
    }
    return formatted;
};

type Props = {
    row: {
        id: string;
        employee_name: string;
        employee_id?: string;
        claim_type: string;
        date_of_expense: string;
        amount: number;
        paid: number;
        workflow_state?: string;
    };
    selected: boolean;
    onSelectRow: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onApplyAction: (action: string) => Promise<void>;
    canEdit: boolean;
    canDelete: boolean;
    isHR?: boolean;
    hideCheckbox?: boolean;
    index?: number;
};
export function ReimbursementClaimTableRow({
    row,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onDelete,
    onApplyAction,
    canEdit,
    canDelete,
    isHR,
    hideCheckbox = false,
    index,
}: Props) {
    const { unreadCounts } = useUnreadCountsContext();
    const isUnread = unreadCounts.unread_ids['Reimbursement Claim']?.includes(row.id);

    const [openMenu, setOpenMenu] = useState<HTMLElement | null>(null);
    const [actionPending, setActionPending] = useState<string | null>(null);


    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setOpenMenu(event.currentTarget);
    };

    const handleCloseMenu = () => {
        if (actionPending) return;
        setOpenMenu(null);
    };

    const handleAction = async (action: string) => {
        try {
            setActionPending(action);
            await onApplyAction(action);
            handleCloseMenu();
        } catch (error) {
            console.error(error);
        } finally {
            setActionPending(null);
        }
    };

    const handleClick = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
        event.stopPropagation();
        action();
    };

    const showActions = isHR && canEdit && (row.workflow_state === 'Pending' || row.workflow_state === 'Submitted');

    return (
        <>
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
                    <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                borderRadius: '50%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: COMMON_COLORS.snoBadge.bg,
                                color: COMMON_COLORS.snoBadge.color,
                                typography: 'subtitle2',
                                fontWeight: 800,
                                border: COMMON_COLORS.snoBadge.border,
                                mx: 'auto',
                                transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                                '&:hover': {
                                    bgcolor: COMMON_COLORS.snoBadge.hoverBg,
                                    color: COMMON_COLORS.snoBadge.hoverColor,
                                    transform: 'scale(1.1)',
                                },
                            }}
                        >
                            {index + 1}
                        </Box>
                    </TableCell>
                )}

                <TableCell>
                    <Box>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                            {row.employee_name || '—'}
                        </Typography>
                        {row.employee_id && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {row.employee_id}
                            </Typography>
                        )}
                    </Box>
                </TableCell>

                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{row.claim_type}</TableCell>

                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{dayjs(row.date_of_expense).format('DD/MM/YYYY')}</TableCell>

                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{renderCurrency(row.amount)}</TableCell>

                <TableCell>
                    <Label
                        variant="soft"
                        color={row.paid === 1 || row.workflow_state === 'Approved' ? 'success' : (row.workflow_state === 'Rejected' ? 'error' : 'warning')}
                    >
                        {row.workflow_state || (row.paid === 1 ? 'Paid' : 'Pending')}
                    </Label>
                </TableCell>

                <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canEdit && row.workflow_state !== 'Paid' && (
                            <IconButton onClick={(e) => handleClick(e, onEdit)} color="primary">
                                <Iconify icon="solar:pen-bold" />
                            </IconButton>
                        )}

                        <IconButton onClick={(e) => handleClick(e, onView)} color="info">
                            <Badge
                                color="error"
                                variant="dot"
                                invisible={!isUnread}
                                sx={{
                                    '& .MuiBadge-badge': {
                                        width: 6,
                                        height: 6,
                                        minWidth: 6,
                                    },
                                }}
                            >
                                <Iconify icon="solar:eye-bold" />
                            </Badge>
                        </IconButton>


                        {/* {canDelete && (
                            <IconButton onClick={(e) => handleClick(e, onDelete)} color="error">
                                <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                        )} */}

                        {showActions && (
                            <IconButton onClick={handleOpenMenu} color="warning">
                                <Iconify icon="eva:more-vertical-fill" />
                            </IconButton>
                        )}
                    </Box>
                </TableCell>
            </TableRow>

            <Popover
                open={!!openMenu}
                anchorEl={openMenu}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: { width: 160, p: 1 },
                }}
            >
                <MenuItem
                    onClick={() => !actionPending && handleAction('Approve')}
                    disabled={!!actionPending}
                    sx={{ color: 'success.main' }}
                >
                    <Iconify
                        icon={(actionPending === 'Approve' ? "svg-spinners:18-dots-indicator" : "solar:check-circle-bold") as any}
                        sx={{ mr: 2 }}
                    />
                    {actionPending === 'Approve' ? 'Approving...' : 'Approve'}
                </MenuItem>
 
                <MenuItem
                    onClick={() => !actionPending && handleAction('Reject')}
                    disabled={!!actionPending}
                    sx={{ color: 'error.main' }}
                >
                    <Iconify
                        icon={(actionPending === 'Reject' ? "svg-spinners:18-dots-indicator" : "mingcute:close-line") as any}
                        sx={{ mr: 2 }}
                    />
                    {actionPending === 'Reject' ? 'Rejecting...' : 'Reject'}
                </MenuItem>
            </Popover>
        </>
    );
}
