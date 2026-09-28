import { useState } from 'react';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useUnreadCountsContext } from 'src/hooks/unread-counts-context';

import { fTimeDist } from 'src/utils/format-time';

import { markAsRead } from 'src/api/unread-counts';
import { type WorkflowAction, getRequestWorkflowActions } from 'src/api/requests';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ClarificationDialog } from '../report/requests/clarification-dialog';

// ----------------------------------------------------------------------

export type RequestTableRowProps = {
    row: {
        id: string;
        name: string;
        employee_id: string;
        employee_name: string;
        subject: string;
        workflow_state?: string;
        creation?: string;
        modified?: string;
        owner?: string;
        hrQueryCount?: number;
        empReplyCount?: number;
    };
    selected: boolean;
    onSelectRow: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit: boolean;
    canDelete: boolean;
    hideCheckbox?: boolean;
    index?: number;
    onApplyAction: (action: string) => Promise<void>;
    onClarify: (message: string) => Promise<void>;
    isHR?: boolean;
};


export function RequestTableRow({
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
    onApplyAction,
    onClarify,
    isHR,
}: RequestTableRowProps) {
    const { unreadCounts } = useUnreadCountsContext();

    const isUnread = unreadCounts.unread_ids.Request?.includes(row.id);

    const [openMenu, setOpenMenu] = useState<HTMLElement | null>(null);
    const [actions, setActions] = useState<WorkflowAction[]>([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [openClarification, setOpenClarification] = useState(false);
    const [submittingClarification, setSubmittingClarification] = useState(false);
    const [actionPending, setActionPending] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);

    const handleOpenMenu = async (event: React.MouseEvent<HTMLElement>) => {
        setOpenMenu(event.currentTarget);
        try {
            setLoadingActions(true);
            const availableActions = await getRequestWorkflowActions(row.workflow_state || 'Open');
            setActions(availableActions);
        } catch (error) {
            console.error('Failed to fetch actions:', error);
        } finally {
            setLoadingActions(false);
        }
    };

    const handleCloseMenu = () => {
        if (actionPending || actionLoading) return;
        setOpenMenu(null);
    };

    const filteredActions = actions.filter((action) => {
        const lowerAction = action.action.toLowerCase();
        const isClarification = lowerAction.includes('clarification') || lowerAction.includes('query');
        const isReply = lowerAction.includes('reply');

        const hrCount = row.hrQueryCount || 0;
        const empCount = row.empReplyCount || 0;

        if (isClarification && isHR && hrCount >= 5) return false;
        if (isReply && !isHR && empCount >= 5) return false;

        return true;
    });

    const handleAction = async (action: string) => {
        const lowerAction = action.toLowerCase();
        const isApprove = lowerAction.includes('approve');
        const isReject = lowerAction.includes('reject');

        // Mark as read when action is taken
        markAsRead('Request', row.id).then(() => {
            window.dispatchEvent(new CustomEvent('REFRESH_UNREAD_COUNTS'));
        });

        if (lowerAction.includes('clarification') || lowerAction.includes('query') || lowerAction.includes('reply')) {
            setOpenClarification(true);
            handleCloseMenu();
        } else {
            try {
                if (isApprove) {
                    setActionLoading('approve');
                } else if (isReject) {
                    setActionLoading('reject');
                } else {
                    setActionPending(action);
                }
                await onApplyAction(action);
            } catch (error) {
                console.error(error);
            } finally {
                setActionLoading(null);
                setActionPending(null);
                setOpenMenu(null);
            }
        }
    };

    const handleClarifyConfirm = async (message: string) => {
        try {
            setSubmittingClarification(true);
            await onClarify(message);
            setOpenClarification(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmittingClarification(false);
        }
    };

    const getActionColor = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('approve')) return 'success.main';
        if (lower.includes('reject')) return 'error.main';
        if (lower.includes('clarification') || lower.includes('query')) return 'warning.main';
        if (lower.includes('reply')) return 'info.main';
        return 'primary.main';
    };

    const getActionIcon = (action: string): any => {
        const lower = action.toLowerCase();
        if (lower.includes('approve')) return 'solar:check-circle-bold';
        if (lower.includes('reject')) return 'mingcute:close-line';
        if (lower.includes('clarification') || lower.includes('query')) return 'solar:question-square-bold';
        if (lower.includes('reply')) return 'solar:chat-round-dots-bold';
        return 'solar:pen-bold';
    };

    const showActions = canEdit && isHR && (row.workflow_state === 'Pending' || row.workflow_state === 'Open' || row.workflow_state === 'Clarification Requested');

    const getStatusColor = (status: string) => {

        switch (status) {
            case 'Approved': return 'success';
            case 'Rejected': return 'error';
            case 'Pending':
            case 'Clarification Requested': return 'warning';
            case 'Open': return 'info';
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
                <Box>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {row.employee_name || '-'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>
                        {row.employee_id || '-'}
                    </Typography>
                </Box>
            </TableCell>

            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" noWrap sx={{ maxWidth: 500, display: 'block' }}>
                    {row.subject || '-'}
                </Typography>
            </TableCell>

            <TableCell>
                <Label color={getStatusColor(row.workflow_state || '')}>
                    {row.workflow_state || 'Open'}
                </Label>
            </TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Box sx={{ typography: 'body2', color: 'text.secondary', fontWeight: 700, mr: 2, fontSize: 12, display: { xs: 'none', md: 'block' } }}>
                        {row.modified ? fTimeDist(row.modified) : '-'}
                    </Box>
                    <IconButton size="small" color="primary" onClick={onView}>
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

                    {showActions && (
                        <IconButton
                            size="small"
                            onClick={handleOpenMenu}
                            sx={{ color: 'warning.main' }}
                            disabled={!!actionLoading || !!actionPending}
                        >
                            <Iconify icon="eva:more-vertical-fill" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>

            <Popover
                open={!!openMenu}
                anchorEl={openMenu}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: { width: 180, p: 1 },
                }}
            >
                {loadingActions ? (
                    <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                        <Iconify icon={"svg-spinners:18-dots-indicator" as any} />
                    </Box>
                ) : (
                    <>
                        {filteredActions.map((action) => {
                            const isApprove = action.action.toLowerCase().includes('approve');
                            const isReject = action.action.toLowerCase().includes('reject');
                            const isPendingThis = (isApprove && actionLoading === 'approve') || (isReject && actionLoading === 'reject') || (actionPending === action.action);
                            
                            let label = action.action;
                            if (isPendingThis) {
                                if (isApprove) label = 'Approving...';
                                else if (isReject) label = 'Rejecting...';
                                else label = 'Processing...';
                            }

                            return (
                                <MenuItem
                                    key={action.action}
                                    onClick={() => !actionLoading && !actionPending && handleAction(action.action)}
                                    disabled={!!actionLoading || !!actionPending}
                                    sx={{ color: getActionColor(action.action) }}
                                >
                                    <Iconify
                                        icon={isPendingThis ? "svg-spinners:18-dots-indicator" : getActionIcon(action.action)}
                                        sx={{ mr: 2 }}
                                    />
                                    {label}
                                </MenuItem>
                            );
                        })}
                        {actions.length === 0 && (
                            <Typography variant="caption" sx={{ p: 1, color: 'text.disabled', textAlign: 'center', display: 'block' }}>
                                No actions available
                            </Typography>
                        )}
                    </>
                )}
            </Popover>

            <ClarificationDialog
                open={openClarification}
                onClose={() => setOpenClarification(false)}
                onConfirm={handleClarifyConfirm}
                title="Ask Clarification"
                label="Query"
                loading={submittingClarification}
            />
        </TableRow>
    );

}
