import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { fCurrency } from 'src/utils/format-number';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';


// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '15px') => {
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

export type AssetTableRowProps = {
    row: {
        id: string;
        asset_name: string;
        asset_tag: string;
        category: string;
        current_status: string;
        purchase_cost: number;
        purchase_date: string;
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
};

export function AssetTableRow({
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
}: AssetTableRowProps) {
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

            <TableCell sx={{ fontWeight: 700 }}>{row.asset_name || '-'}</TableCell>

            <TableCell>{row.asset_tag || '-'}</TableCell>

            <TableCell>{row.category || '-'}</TableCell>

            <TableCell>
                <Label
                    color={
                        (row.current_status === 'Available' && 'success') ||
                        (row.current_status === 'Assigned' && 'info') ||
                        (row.current_status === 'Maintenance' && 'warning') ||
                        (row.current_status === 'Disposed' && 'error') ||
                        'default'
                    }
                >
                    {row.current_status || 'Unknown'}
                </Label>
            </TableCell>

            <TableCell>
                {row.purchase_cost ? renderCurrency(row.purchase_cost) : '-'}
            </TableCell>

            <TableCell>
                {row.purchase_date ? new Date(row.purchase_date).toLocaleDateString() : '-'}
            </TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton size="small" color="info" onClick={onView}>
                        <Iconify icon="solar:eye-bold" />
                    </IconButton>

                    {canEdit && (
                        <IconButton size="small" color="primary" onClick={onEdit}>
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
