import type { CompanyBankAccount } from 'src/api/masters';

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
  row: CompanyBankAccount;
  onViewRow: VoidFunction;
  onEditRow: VoidFunction;
  onDeleteRow: VoidFunction;
  index?: number;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function CompanyBankAccountTableRow({
  row,
  onViewRow,
  onEditRow,
  onDeleteRow,
  index,
  canEdit = true,
  canDelete = true,
}: Props) {
  const { bank_name, account_holder_name, account_no, ifsc_code, status } = row;

  return (
    <TableRow
      hover
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
          {bank_name}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {account_holder_name || '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {account_no || '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          {ifsc_code || '-'}
        </Typography>
      </TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={status === 'Inactive' ? 'default' : 'success'}
        >
          {status || 'Active'}
        </Label>
      </TableCell>

      <TableCell align="right">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <IconButton size="small" onClick={onViewRow} sx={{ color: 'info.main' }}>
            <Iconify icon="solar:eye-bold" />
          </IconButton>

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
