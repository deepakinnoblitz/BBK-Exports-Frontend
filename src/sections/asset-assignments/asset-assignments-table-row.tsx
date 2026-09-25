
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        asset_name: string;
        employee_name: string;
        assigned_to: string;
        assigned_on: string;
        returned_on?: string;
    };
    index: number;
    selected: boolean;
    onSelectRow: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    hideCheckbox?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    isHR?: boolean;
};

export function AssetAssignmentTableRow({
    row,
    index,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onDelete,
    hideCheckbox,
    canEdit = true,
    canDelete = true,
    isHR = false,
}: Props) {
    const isActive = !row.returned_on;

    return (
        <TableRow
            hover
            selected={selected}
            sx={{
                cursor: 'pointer',
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
            {!hideCheckbox && (
                <TableCell padding="checkbox">
                    <Checkbox
                        checked={selected}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectRow();
                        }}
                    />
                </TableCell>
            )}

            <TableCell align="center" onClick={onView} sx={{ display: { xs: 'none', md: 'table-cell' } }}>
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

            <TableCell onClick={onView} sx={{ fontWeight: 700 }}>{row.asset_name}</TableCell>

            {isHR && (
                <TableCell onClick={onView}>
                    <Typography variant="subtitle2" noWrap>{row.employee_name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{row.assigned_to}</Typography>
                </TableCell>
            )}

            <TableCell onClick={onView} sx={{ display: { xs: 'none', md: 'table-cell' } }}>{fDate(row.assigned_on)}</TableCell>

            <TableCell onClick={onView} sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                {row.returned_on ? fDate(row.returned_on) : '-'}
            </TableCell>

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
