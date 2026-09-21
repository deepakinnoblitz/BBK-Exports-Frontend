
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

type Props = {
    row: {
        id: string;
        employeeId: string;
        name: string;
        employeeType?: string;
        department: string;
        designation: string;
        status: string;
    };
    selected: boolean;
    onSelectRow: VoidFunction;
    onView: VoidFunction;
    onEdit: VoidFunction;
    onDelete: VoidFunction;
    canEdit?: boolean;
    canDelete?: boolean;
    hideCheckbox?: boolean;
    index?: number;
};

export function EmployeeTableRow({
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
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.employee;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.employee?.edit : true;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.employee?.delete : true;

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

            <TableCell component="th" scope="row">
                <Box>
                    <Typography variant="subtitle2" noWrap sx={{ textTransform: 'capitalize', fontWeight: 700 }}>
                        {row.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                        {row.id}
                    </Typography>
                </Box>
            </TableCell>

            <TableCell>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
                    {row.employeeId || row.id || '-'}
                </Typography>
            </TableCell>

            <TableCell>
                <Typography variant="body2" noWrap sx={{ textTransform: 'capitalize' }}>
                    {row.employeeType || '-'}
                </Typography>
            </TableCell>

            <TableCell>
                <Typography variant="body2" noWrap>
                    {row.department || '-'}
                </Typography>
            </TableCell>

            <TableCell>
                <Typography variant="body2" noWrap>
                    {row.designation || '-'}
                </Typography>
            </TableCell>

            <TableCell>
                <Label color={(row.status === 'Active' && 'success') || 'error'}>{row.status}</Label>
            </TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IconButton size="small" onClick={onView} sx={{ color: 'info.main' }}>
                        <Iconify icon="solar:eye-bold" />
                    </IconButton>
                    {displayEdit && (
                        <IconButton size="small" onClick={onEdit} sx={{ color: 'primary.main' }}>
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}
                    {displayDelete && (
                        <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
