import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const renderCurrency = (amount: any, symbolFontSize: string = '15px') => {
    const formatted = fCurrency(amount);
    if (!formatted) return '—';
    const index = formatted.indexOf('₹');
    if (index !== -1) {
        return (
            <>
                {formatted.substring(0, index)}
                <span style={{ fontFamily: 'Arial', fontSize: symbolFontSize, display: 'inline-block', verticalAlign: 'baseline', lineHeight: 'normal' }}>₹</span>{' '}
                {formatted.substring(index + 1)}
            </>
        );
    }
    return formatted;
};

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

export function SalaryStructureComponentTableRow({
  row,
  selected,
  onEditRow,
  onSelectRow,
  onDeleteRow,
  index,
  canEdit = true,
  canDelete = true,
}: Props) {
  const { component_name, field_name, type, percentage, static_amount } = row;

  const typeColor = (t: string) => {
    if (t === 'Earning') return 'success';
    if (t === 'Deduction') return 'error';
    return 'default';
  };

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
            {index + 1}
          </Box>
        </TableCell>
      )}

      <TableCell>
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {component_name || row.name}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="center">
        <Label
          variant="soft"
          color={typeColor(type) as any}
          sx={{ fontWeight: 700 }}
        >
          {type || '-'}
        </Label>
      </TableCell>

      <TableCell align="center">
        {row.is_default ? (
          <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
        ) : (
          <Iconify icon="solar:close-circle-bold" sx={{ color: 'error.main' }} />
        )}
      </TableCell>

      <TableCell align="right">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {percentage != null && percentage > 0 ? `${percentage}%` : '-'}
        </Typography>
      </TableCell>

      <TableCell align="right">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {static_amount != null && static_amount > 0
            ? renderCurrency(static_amount)
            : '-'}
        </Typography>
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
