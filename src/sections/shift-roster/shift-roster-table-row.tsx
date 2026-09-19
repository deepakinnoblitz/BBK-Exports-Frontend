import type { ShiftRoster } from 'src/api/shift-roster';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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
  row: ShiftRoster;
  index: number;
  onEditRow: VoidFunction;
  onDeleteRow: VoidFunction;
  onViewHistory: VoidFunction;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function ShiftRosterTableRow({
  row,
  index,
  onEditRow,
  onDeleteRow,
  onViewHistory,
  canEdit = true,
  canDelete = true,
}: Props) {
  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.shift_roster;
  const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.shift_roster?.edit : canEdit;
  const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.shift_roster?.delete : canDelete;

  const {
    employee,
    employee_name,
    department,
    designation,
    shift,
    shift_name,
    effective_from,
    effective_to,
    assignment_type,
    status,
  } = row;

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return dayjs(d).format('DD-MMM-YYYY');
  };

  const isRange = effective_to && effective_to !== effective_from;

  const getSourceColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'rotation':
        return 'info';
      case 'bulk':
        return 'warning';
      case 'override':
        return 'error';
      case 'shift change':
        return 'secondary';
      default:
        return 'default';
    }
  };

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
        <TableCell align="center" sx={{ width: 60 }}>
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
            {employee_name || employee}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {employee}
          </Typography>
        </Box>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap>
          {department || '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
          {designation || '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#08a3cd',
              flexShrink: 0,
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
            {shift_name || shift}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {formatDate(effective_from)}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" noWrap sx={{ color: isRange ? 'text.primary' : 'text.disabled' }}>
          {formatDate(effective_to)}
        </Typography>
      </TableCell>

      <TableCell>
        <Label variant="soft" color={getSourceColor(assignment_type)}>
          {assignment_type || 'Manual'}
        </Label>
      </TableCell>

      <TableCell>
        <Label color={(status === 'Active' && 'success') || 'error'}>
          {(status || 'Active').toUpperCase()}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ pr: 3, whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <Tooltip title="View Assignment History">
            <IconButton size="small" onClick={onViewHistory} sx={{ color: 'info.main' }}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          {displayEdit && (
            <Tooltip title="Edit Assignment">
              <IconButton size="small" onClick={onEditRow} sx={{ color: 'primary.main' }}>
                <Iconify icon="solar:pen-bold" />
              </IconButton>
            </Tooltip>
          )}

          {displayDelete && (
            <Tooltip title="Cancel / Delete">
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
