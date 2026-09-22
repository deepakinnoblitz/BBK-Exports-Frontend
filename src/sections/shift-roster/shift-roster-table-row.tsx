import type { ShiftRoster } from 'src/api/shift-roster';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
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
  selected?: boolean;
  onSelectRow?: VoidFunction;
  onEditRow: VoidFunction;
  onDeleteRow: VoidFunction;
  onViewHistory: VoidFunction;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function ShiftRosterTableRow({
  row,
  index,
  selected = false,
  onSelectRow,
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
      selected={selected}
      sx={{
        '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}`, px: 1.5, py: 1.25 },
        '&:last-child td, &:last-child th': { borderBottom: 0 },
      }}
    >
      <TableCell padding="checkbox" sx={{ width: 48, px: 1 }}>
        <Checkbox
          checked={selected}
          onClick={onSelectRow}
          sx={{ color: 'text.secondary', '&.Mui-checked': { color: '#08a3cd' } }}
        />
      </TableCell>
      {typeof index === 'number' && (
        <TableCell align="center" sx={{ width: 50, px: 1 }}>
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

      <TableCell component="th" scope="row" sx={{ px: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {employee_name || employee}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {employee}
          </Typography>
        </Box>
      </TableCell>

      <TableCell sx={{ px: 1.5 }}>
        <Typography variant="body2" noWrap>
          {department || '-'}
        </Typography>
      </TableCell>

      <TableCell sx={{ px: 1.5 }}>
        <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
          {designation || '-'}
        </Typography>
      </TableCell>

      <TableCell sx={{ px: 1.5 }}>
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

      <TableCell sx={{ px: 1.5 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {formatDate(effective_from)}
        </Typography>
      </TableCell>

      <TableCell sx={{ px: 1.5 }}>
        <Typography variant="body2" noWrap sx={{ color: isRange ? 'text.primary' : 'text.disabled' }}>
          {formatDate(effective_to)}
        </Typography>
      </TableCell>

      <TableCell sx={{ px: 1.5 }}>
        <Label variant="soft" color={getSourceColor(assignment_type)}>
          {assignment_type || 'Manual'}
        </Label>
      </TableCell>

      <TableCell sx={{ px: 1.5 }}>
        <Label color={(status === 'Active' && 'success') || 'error'}>
          {(status || 'Active').toUpperCase()}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ pr: 2, pl: 1, whiteSpace: 'nowrap' }}>
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
