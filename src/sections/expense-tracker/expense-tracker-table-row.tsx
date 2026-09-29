import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { fCurrency } from 'src/utils/format-number';

import { COMMON_COLORS } from 'src/theme/common-colors';

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

export type ExpenseTrackerTableRowProps = {
    row: {
        id: string;
        name: string;
        type: 'Income' | 'Expense';
        titlenotes: string;
        amount: number;
        creation: string;
        date_time?: string;
    };
    selected: boolean;
    onSelectRow: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
    index?: number;
    hideCheckbox?: boolean;
};

export function ExpenseTrackerTableRow({
    row,
    selected,
    onSelectRow,
    onEdit,
    onDelete,
    canEdit = true,
    canDelete = true,
    index,
    hideCheckbox = false,
}: ExpenseTrackerTableRowProps) {
    const { type, titlenotes, amount, date_time } = row;

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

            <TableCell sx={{ fontWeight: 700 }}>{titlenotes || '-'}</TableCell>

            <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                {date_time ? dayjs(date_time).format('DD MMM YYYY - hh:mm A') : '-'}
            </TableCell>

            <TableCell>
                <Label color={(type === 'Income' && 'success') || 'error'}>{type}</Label>
            </TableCell>

            <TableCell sx={{ fontWeight: 600 }}>
                {renderCurrency(amount)}
            </TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    {canEdit && (
                        <IconButton
                            size="small"
                            onClick={onEdit}
                            sx={{
                                color: COMMON_COLORS.emerald.main,
                                '&:hover': { bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08) },
                            }}
                        >
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
