import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  row: any;
  selected: boolean;
  onEditRow: VoidFunction;
  onSelectRow: VoidFunction;
  onDeleteRow: VoidFunction;
  index?: number;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function ShiftTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  index,
  canEdit = true,
  canDelete = true,
}: Props) {
  const { shift_name, name, start_time, end_time, description, status, allow_overtime, overtime_hours } = row;
  const displayName = shift_name || name;

  const formatTime = (time?: string) => {
    if (!time) return '';
    const normalizedTime = time.includes(':') && time.split(':')[0].length === 1 ? `0${time}` : time;
    const parsed = dayjs(`2000-01-01T${normalizedTime}`);
    if (parsed.isValid()) {
      return parsed.format('hh:mm A');
    }
    return time;
  };

  const timingDisplay =
    start_time && end_time
      ? `${formatTime(start_time)} - ${formatTime(end_time)}`
      : formatTime(start_time) || formatTime(end_time) || '-';

  return (
    <TableRow
      hover
      selected={selected}
      sx={{
        '& td, & th': {
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
          py: 1.5,
        },
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
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {displayName}
        </Typography>
      </TableCell>

      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography variant="body2" color="text.secondary">
          {timingDisplay}
        </Typography>
        {!!allow_overtime && (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block' }}>
            OT: {overtime_hours || 0} hrs
          </Typography>
        )}
      </TableCell>

      <TableCell sx={{ maxWidth: 260 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {description || '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={
            (status === 'Active' && 'success') ||
            (status === 'Inactive' && 'error') ||
            'default'
          }
        >
          {status || 'Active'}
        </Label>
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
