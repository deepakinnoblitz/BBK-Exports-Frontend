import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        job_title: string;
        designation: string;
        shift: string;
        posted_on: string;
        status: string;
        location: string;
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

export function JobOpeningTableRow({
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
}: Props) {
    const formatDate = (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
    };

    return (
        <TableRow
            hover
            selected={selected}
            sx={{
                '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
                '&:last-child td, &:last-child th': { borderBottom: 0 },
            }}
        >
            {!hideCheckbox && (
                <TableCell padding="checkbox">
                    <Checkbox checked={selected} onClick={onSelectRow} />
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

            <TableCell>
                <Box
                    onClick={onView}
                    sx={{
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    {row.job_title}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {row.designation}
                </Typography>
            </TableCell>

            <TableCell>{row.shift}</TableCell>

            <TableCell>{row.location}</TableCell>

            <TableCell>{formatDate(row.posted_on)}</TableCell>

            <TableCell>
                <Label
                    variant="soft"
                    color={(row.status === 'Open' && 'success') || (row.status === 'Closed' && 'error') || 'default'}
                >
                    {row.status}
                </Label>
            </TableCell>

            <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IconButton onClick={onView} sx={{ color: 'info.main' }}>
                        <Iconify icon={"solar:eye-bold" as any} />
                    </IconButton>

                    {canEdit && (
                        <IconButton onClick={onEdit} sx={{ color: 'primary.main' }}>
                            <Iconify icon={"solar:pen-bold" as any} />
                        </IconButton>
                    )}

                    {canDelete && (
                        <IconButton onClick={onDelete} sx={{ color: 'error.main' }}>
                            <Iconify icon={"solar:trash-bin-trash-bold" as any} />
                        </IconButton>
                    )}
                </Stack>
            </TableCell>
        </TableRow>
    );
}
