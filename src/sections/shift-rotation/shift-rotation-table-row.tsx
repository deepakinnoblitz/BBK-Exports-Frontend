import type { ShiftRotation } from 'src/api/shift-rotation';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

type Props = {
  row: ShiftRotation;
  index: number;
  onViewRow: VoidFunction;
  onEditRow: VoidFunction;
  onDeleteRow: VoidFunction;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function ShiftRotationTableRow({
  row,
  index,
  onViewRow,
  onEditRow,
  onDeleteRow,
  canEdit = true,
  canDelete = true,
}: Props) {
  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.shift_rotation;
  const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.shift_rotation?.edit : canEdit;
  const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.shift_rotation?.delete : canDelete;

  const {
    name,
    rotation_name,
    frequency,
    status,
    department,
    start_date,
    end_date,
    exclude_holidays,
    exclude_weekly_offs,
  } = row;

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return dayjs(d).format('DD-MMM-YYYY');
  };

  const exclusionList: string[] = [];
  if (exclude_weekly_offs) exclusionList.push('Weekly Offs');
  if (exclude_holidays) exclusionList.push('Holidays');

  return (
    <TableRow
      hover
      tabIndex={-1}
      sx={{
        '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
        '&:last-child td, &:last-child th': { borderBottom: 0 },
      }}
    >
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
      )}

      <TableCell component="th" scope="row">
        <Box>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {rotation_name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {name}
          </Typography>
        </Box>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap sx={{ textTransform: 'capitalize' }}>
          {frequency || 'Weekly'}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap>
          {department || '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {formatDate(start_date)} – {formatDate(end_date)}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap sx={{ color: exclusionList.length ? 'text.primary' : 'text.disabled' }}>
          {exclusionList.length > 0 ? exclusionList.join(', ') : '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Label color={(status === 'Active' && 'success') || 'error'}>
          {(status || 'Active').toUpperCase()}
        </Label>
      </TableCell>

      <TableCell align="right">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton size="small" onClick={onViewRow} sx={{ color: 'info.main' }}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          {displayEdit && (
            <Tooltip title="Edit Rotation">
              <IconButton size="small" onClick={onEditRow} sx={{ color: 'primary.main' }}>
                <Iconify icon="solar:pen-bold" />
              </IconButton>
            </Tooltip>
          )}

          {displayDelete && (
            <Tooltip title="Delete Rotation">
              <IconButton size="small" onClick={onDeleteRow} sx={{ color: 'error.main' }}>
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}
