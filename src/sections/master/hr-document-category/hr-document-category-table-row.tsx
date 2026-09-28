import type { HRDocumentCategoryMaster } from 'src/api/masters';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    row: HRDocumentCategoryMaster;
    index: number;
    onEditRow: () => void;
    onDeleteRow: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
};

export function HRDocumentCategoryTableRow({
    row,
    index,
    onEditRow,
    onDeleteRow,
    canEdit = true,
    canDelete = true,
}: Props) {
    const { category_name, is_active, description } = row;

    return (
        <TableRow
            hover
            tabIndex={-1}
            sx={{
                '& td, & th': {
                    py: 1.25,
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                },
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
                    {index}
                </Box>
            </TableCell>

            <TableCell component="th" scope="row">
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {category_name || row.name}
                </Typography>
            </TableCell>

            <TableCell sx={{ maxWidth: 280 }}>
                <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                    {description || '—'}
                </Typography>
            </TableCell>

            <TableCell align="center">
                <Box
                    sx={{
                        display: 'inline-flex',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        borderRadius: '6px',
                        padding: '4px 12px',
                        ...(is_active
                            ? {
                                  bgcolor: 'rgba(34, 197, 94, 0.25)',
                                  border: '1px solid rgba(34, 197, 94, 0.45)',
                                  color: '#15803d',
                              }
                            : {
                                  bgcolor: 'rgba(156, 163, 175, 0.25)',
                                  border: '1px solid rgba(156, 163, 175, 0.45)',
                                  color: '#374151',
                              }),
                    }}
                >
                    {is_active ? 'ACTIVE' : 'INACTIVE'}
                </Box>
            </TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    {canEdit && (
                        <IconButton size="small" onClick={onEditRow} sx={{ color: 'primary.main' }}>
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}

                    {canDelete && (
                        <IconButton size="small" onClick={onDeleteRow} sx={{ color: 'error.main' }}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
