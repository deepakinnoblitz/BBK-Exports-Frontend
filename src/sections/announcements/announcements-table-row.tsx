import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type AnnouncementTableRowProps = {
    row: {
        id: string;
        announcement_name: string;
        announcement: string;
        is_active: 0 | 1;
        creation?: string;
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

export function AnnouncementTableRow({
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
}: AnnouncementTableRowProps) {
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

            <TableCell sx={{ fontWeight: 700 }}>{row.announcement_name || '-'}</TableCell>

            <TableCell>
                {row.announcement ? `${row.announcement.substring(0, 100)}${row.announcement.length > 100 ? '...' : ''}` : '-'}
            </TableCell>

            <TableCell>
                {row.creation ? new Date(row.creation).toLocaleDateString() : '-'}
            </TableCell>

            <TableCell>
                {/* Temp removed Label */}
                {row.is_active === 1 ? 'Active' : 'Hidden'}
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
