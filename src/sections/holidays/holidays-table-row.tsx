import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { COMMON_COLORS } from 'src/theme';

import { Iconify } from 'src/components/iconify';



// ----------------------------------------------------------------------

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getMonthName = (month: string | number): string => {
    if (!month) return '-';
    const monthNum = typeof month === 'string' ? parseInt(month, 10) : month;
    if (monthNum >= 1 && monthNum <= 12) {
        return MONTH_NAMES[monthNum - 1];
    }
    return '-';
};

export type HolidayListTableRowProps = {
    row: {
        id: string;
        holiday_list_name: string;
        year: number;
        month: string;
        working_days: number;
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

export function HolidayListTableRow({
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
}: HolidayListTableRowProps) {
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

            <TableCell sx={{ fontWeight: 600 }}>{row.holiday_list_name || '-'}</TableCell>

            <TableCell>{row.year || '-'}</TableCell>

            <TableCell>{getMonthName(row.month)}</TableCell>

            <TableCell sx={{ fontWeight: 700 }}>{row.working_days || '-'}</TableCell>

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
