import type { SalesTargetEntry } from 'src/api/sales-target-entry';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

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

type SalesTargetEntryTableRowProps = {
    row: SalesTargetEntry;
    selected: boolean;
    onSelectRow: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
    canView?: boolean;
    hideCheckbox?: boolean;
    index?: number;
    contactsOptions?: any[];
};

export function SalesTargetEntryTableRow({
    row,
    selected,
    onSelectRow,
    onView,
    onEdit,
    onDelete,
    canEdit = true,
    canDelete = true,
    canView = true,
    hideCheckbox = false,
    index,
    contactsOptions = [],
}: SalesTargetEntryTableRowProps) {
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.sales_target_entry;

    const displayView = hasCustomPerms ? !!user?.permissions?.actions?.sales_target_entry?.view : canView;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.sales_target_entry?.edit : canEdit;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.sales_target_entry?.delete : canDelete;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'info';
            case 'Confirmed': return 'success';
            case 'In Progress': return 'warning';
            case 'Completed': return 'success';
            case 'Hold': return 'warning';
            case 'Cancelled': return 'error';
            default: return 'default';
        }
    };

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

            <TableCell component="th" scope="row">
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '14px', color: 'text.primary' }}>
                    {row.sales_entry_id}
                </Typography>
            </TableCell>

            <TableCell>{row.sales_person || '-'}</TableCell>

            <TableCell>{row.month || '-'}</TableCell>

            <TableCell>
                {(() => {
                    if (!row.contact_name) return '-';
                    const contactObj = contactsOptions.find((c: any) => c.name === row.contact_name);
                    const contactName = contactObj
                        ? ([contactObj.first_name, contactObj.last_name].filter(Boolean).join(' ') || contactObj.name)
                        : row.contact_name;
                    const contactId = row.contact_name;

                    return (
                        <Stack spacing={0.2}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {contactName}
                            </Typography>
                            {contactId && contactId !== contactName && (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {contactId}
                                </Typography>
                            )}
                        </Stack>
                    );
                })()}
            </TableCell>

            <TableCell>{row.service || '-'}</TableCell>

            <TableCell>
                {row.value != null ? renderCurrency(row.value) : '-'}
            </TableCell>

            <TableCell>
                <Label color={getStatusColor(row.status || '')}>{row.status || 'New'}</Label>
            </TableCell>

            <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {displayView && (
                        <IconButton onClick={onView} sx={{ color: 'info.main' }}>
                            <Iconify icon="solar:eye-bold" />
                        </IconButton>
                    )}
                    {displayEdit && (
                        <IconButton onClick={onEdit} sx={{ color: 'primary.main' }}>
                            <Iconify icon="solar:pen-bold" />
                        </IconButton>
                    )}
                    {displayDelete && (
                        <IconButton onClick={onDelete} sx={{ color: 'error.main' }}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
