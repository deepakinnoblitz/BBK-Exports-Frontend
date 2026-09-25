import type { TooltipProps } from '@mui/material/Tooltip';

import { useNavigate } from 'react-router-dom';
import { GrDocumentTime, GrDocumentVerified } from "react-icons/gr";

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, styled } from '@mui/material/styles';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: theme.palette.common.white,
        color: theme.palette.text.primary,
        boxShadow: theme.customShadows.z24,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        fontWeight: theme.typography.fontWeightBold,
        fontFamily: theme.typography.fontFamily,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
        borderTop: `3px solid ${theme.palette.primary.main}`,
        marginTop: '10px !important',
        textTransform: 'uppercase',
    },
    [`& .${tooltipClasses.arrow}`]: {
        color: theme.palette.common.white,
        '&:before': {
            border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
        }
    },
}));

// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        title: string;
        account: string;
        accountName?: string;
        contact: string;
        contactName: string;
        value: number;
        stage: string;
        expectedCloseDate?: string;
        avatarUrl: string;
    };
    selected: boolean;
    onEdit: VoidFunction;
    onView: VoidFunction;
    onDelete: VoidFunction;
    onSelectRow: VoidFunction;
    canEdit?: boolean;
    canDelete?: boolean;
    hideCheckbox?: boolean;
    index?: number;
};

export function DealTableRow({
    row,
    selected,
    onEdit,
    onView,
    onDelete,
    onSelectRow,
    canEdit = true,
    canDelete = true,
    hideCheckbox = false,
    index,
}: Props) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const hasCustomPerms = !!user?.permissions?.custom_permissions_assigned;

    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.prospects?.edit : canEdit;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.prospects?.delete : canDelete;
    
    // Quick-create actions driven by target doctype create permission
    const displayEstimationCreate = hasCustomPerms && user?.permissions?.actions?.estimation ? !!user?.permissions?.actions?.estimation?.create : true;
    const displayInvoiceCreate = hasCustomPerms && user?.permissions?.actions?.invoice ? !!user?.permissions?.actions?.invoice?.create : true;

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'Just In':
                return 'info';

            case 'Working':
                return 'primary';

            case 'Estimation Created':
            case 'Invoice Created':
                return 'secondary';

            case 'Estimation Sent':
            case 'Invoice Sent':
            case 'Proposal Sent':
            case 'Negotiation':
                return 'warning';

            case 'Special Approval':
                return 'info';

            case 'Closed Lost':
                return 'error';

            case 'Closed':
            case 'Closed Won':
            case 'Project Started':
                return 'success';

            default:
                return 'default';
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

            <TableCell component="th" scope="row" sx={{ maxWidth: 260 }}>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: 'text.primary',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block'
                    }}
                >
                    {row.title}
                </Typography>
            </TableCell>

            <TableCell>
                <Typography variant="subtitle2" sx={{ fontSize: '14px', maxWidth: 320 }}>
                    {row.accountName || row.account}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                    {row.account}
                </Typography>
            </TableCell>

            <TableCell>
                <Typography variant="subtitle2" sx={{ fontSize: '14px', maxWidth: 240 }}>
                    {row.contactName || row.contact || '-'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '12px' }}>
                    {row.contact}
                </Typography>
            </TableCell>

            <TableCell>
                <Label variant="soft" color={getStageColor(row.stage)}>
                    {row.stage}
                </Label>
            </TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IconButton
                        onClick={onView}
                        sx={{
                            color: 'info.main',
                        }}
                    >
                        <Iconify icon="solar:eye-bold" />
                    </IconButton>

                    {displayEstimationCreate && (
                        <StyledTooltip title="Create Estimation" placement="top" arrow>
                            <IconButton
                                onClick={() => navigate(`/estimations/new?deal_id=${encodeURIComponent(row.id)}`)}
                                sx={{
                                    color: '#10B981',
                                    transition: (theme) => theme.transitions.create(['transform'], { duration: theme.transitions.duration.shorter }),
                                    '&:hover': { transform: 'scale(1.2)', bgcolor: (theme) => alpha('#10B981', 0.08) }
                                }}
                            >
                                <GrDocumentTime size={20} />
                            </IconButton>
                        </StyledTooltip>
                    )}

                    {displayInvoiceCreate && (
                        <StyledTooltip title="Create Invoice" placement="top" arrow>
                            <IconButton
                                onClick={() => navigate(`/invoices/new?deal_id=${encodeURIComponent(row.id)}`)}
                                sx={{
                                    color: '#D97706',
                                    transition: (theme) => theme.transitions.create(['transform'], { duration: theme.transitions.duration.shorter }),
                                    '&:hover': { transform: 'scale(1.2)', bgcolor: (theme) => alpha('#D97706', 0.08) }
                                }}
                            >
                                <GrDocumentVerified size={20} />
                            </IconButton>
                        </StyledTooltip>
                    )}

                    {displayEdit && (
                        <IconButton
                            onClick={onEdit}
                            sx={{
                                color: 'primary.main',
                            }}
                        >
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}

                    {displayDelete && (
                        <IconButton
                            onClick={onDelete}
                            sx={{
                                color: 'error.main',
                            }}
                        >
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
