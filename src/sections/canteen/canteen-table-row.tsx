import type { CanteenEntry } from 'src/api/canteen';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  row: CanteenEntry;
  index: number;
  selected?: boolean;
  onSelectRow?: VoidFunction;
  onEditRow: VoidFunction;
  onDeleteRow: VoidFunction;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function CanteenTableRow({
  row,
  index,
  selected = false,
  onSelectRow,
  onEditRow,
  onDeleteRow,
  canEdit = true,
  canDelete = true,
}: Props) {
  const {
    employee,
    employee_name,
    department,
    designation,
    canteen_date,
    meal_type,
    meal_count,
    status,
    source,
    remarks,
  } = row;

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return dayjs(d).format('DD-MMM-YYYY');
  };

  const getMealTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'lunch':
        return 'primary';
      case 'breakfast':
        return 'warning';
      case 'dinner':
        return 'secondary';
      case 'snacks':
        return 'info';
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
          sx={{ color: 'text.secondary', '&.Mui-checked': { color: COMMON_COLORS.emerald.main }, '&.MuiCheckbox-indeterminate': { color: COMMON_COLORS.emerald.main } }}
          inputProps={{ id: `row-checkbox-${row.name}`, 'aria-label': `Row checkbox ${row.name}` }}
        />
      </TableCell>

      {/* S.No */}
      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', width: 50, px: 1 }}>
        {index}
      </TableCell>

      {/* Employee */}
      <TableCell sx={{ minWidth: 200 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'primary.lighter',
              color: 'primary.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {(employee_name || employee || '?').charAt(0).toUpperCase()}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {employee_name || employee}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {employee}
            </Typography>
          </Box>
        </Stack>
      </TableCell>

      {/* Department */}
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {department || '-'}
        </Typography>
      </TableCell>

      {/* Date */}
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatDate(canteen_date)}
        </Typography>
      </TableCell>

      {/* Meal Type */}
      <TableCell>
        <Label color={getMealTypeColor(meal_type)} variant="soft">
          {meal_type || 'Lunch'}
        </Label>
      </TableCell>

      {/* Meal Count */}
      <TableCell align="center">
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {meal_count || 1}
        </Typography>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Label color={status === 'Availed' ? 'success' : 'error'} variant="soft">
          {status}
        </Label>
      </TableCell>

      {/* Source */}
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Label color={source === 'Excel Import' ? 'info' : 'default'} variant="outlined">
          {source || 'Manual'}
        </Label>
      </TableCell>

      {/* Remarks */}
      <TableCell sx={{ maxWidth: 160 }}>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {remarks || '-'}
        </Typography>
      </TableCell>

      {/* Actions */}
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          {canEdit && (
            <Tooltip title="Edit">
              <IconButton size="small" onClick={onEditRow}>
                <Iconify icon="solar:pen-bold" width={18} />
              </IconButton>
            </Tooltip>
          )}

          {canDelete && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={onDeleteRow}>
                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}
