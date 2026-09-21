
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { fTimeDist } from 'src/utils/format-time';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';
// ----------------------------------------------------------------------

const getStatusStyle = (status: string) => {
  const styles: Record<string, { bgcolor: string; border: string; color: string }> = {
    'New Lead': {
      bgcolor: 'rgba(234, 179, 8, 0.22)',
      border: '1px solid rgba(234, 179, 8, 0.45)',
      color: '#92400e'
    },
    'Contacted': {
      bgcolor: 'rgba(251, 146, 60, 0.24)',
      border: '1px solid rgba(251, 146, 60, 0.45)',
      color: '#9a3412'
    },
    'Qualified': {
      bgcolor: 'rgba(34, 197, 94, 0.25)',
      border: '1px solid rgba(34, 197, 94, 0.45)',
      color: '#15803d'
    },
    'Proposal Sent': {
      bgcolor: 'rgba(99, 102, 241, 0.25)',
      border: '1px solid rgba(99, 102, 241, 0.45)',
      color: '#4338ca'
    },
    'In Negotiation': {
      bgcolor: 'rgba(249, 115, 22, 0.25)',
      border: '1px solid rgba(249, 115, 22, 0.45)',
      color: '#c2410c'
    },
    'Follow-up Scheduled': {
      bgcolor: 'rgba(245, 158, 11, 0.25)',
      border: '1px solid rgba(245, 158, 11, 0.45)',
      color: '#92400e'
    },
    'On Hold': {
      bgcolor: 'rgba(156, 163, 175, 0.25)',
      border: '1px solid rgba(156, 163, 175, 0.45)',
      color: '#374151'
    },
    'Not Interested': {
      bgcolor: 'rgba(239, 68, 68, 0.25)',
      border: '1px solid rgba(239, 68, 68, 0.45)',
      color: '#991b1b'
    },
    'In Active': {
      bgcolor: 'rgba(139, 92, 246, 0.22)',
      border: '1px solid rgba(139, 92, 246, 0.45)',
      color: '#4c1d95'
    },
    'Closed': {
      bgcolor: 'rgba(220, 38, 38, 0.25)',   // red background
      border: '1px solid rgba(220, 38, 38, 0.45)',
      color: '#7f1d1d'                     // dark red text
    },
    'Pending': {
      bgcolor: 'rgba(249, 115, 22, 0.25)',
      border: '1px solid rgba(249, 115, 22, 0.45)',
      color: '#c2410c'
    }
  };

  return styles[status] || {
    bgcolor: 'rgba(156, 163, 175, 0.25)',
    border: '1px solid rgba(156, 163, 175, 0.45)',
    color: '#374151'
  };
};

// ----------------------------------------------------------------------

export type LeadProps = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  workflow_state: string;
  company: string;
  avatarUrl: string;
  isVerified: boolean;
  country?: string;
  modified?: string;
  leads_type?: string;
  leads_from?: string;
  service?: string;
};

type LeadTableRowProps = {
  row: LeadProps;
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
};

export function LeadTableRow({
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
}: LeadTableRowProps) {
  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.lead;

  const displayView = hasCustomPerms ? !!user?.permissions?.actions?.lead?.view : canView;
  const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.lead?.edit : canEdit;
  const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.lead?.delete : canDelete;

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

      <TableCell component="th" scope="row" sx={{ width: 260, minWidth: 240 }}>
        <Box
          sx={{
            gap: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, maxWidth: 240 }}>
            {row.name}
          </Typography>
        </Box>
      </TableCell>

      <TableCell>{row.service || '-'}</TableCell>

      <TableCell sx={{ width: 180, minWidth: 160 }}>{row.phone}</TableCell>

      <TableCell>
        <Label
          sx={{
            ...getStatusStyle(row.workflow_state || row.status),
            fontWeight: 500,
            borderRadius: '6px',
            padding: '4px 12px'
          }}
        >
          {row.workflow_state || row.status}
        </Label>
      </TableCell>

      <TableCell sx={{ width: 260, minWidth: 240 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 240 }}>
          {row.company}
        </Typography>
      </TableCell>

      <TableCell>{row.leads_type || '-'}</TableCell>

      <TableCell>{row.leads_from || '-'}</TableCell>

      <TableCell>{row.country || '-'}</TableCell>

      <TableCell 
        align="right" 
        sx={{ 
          pr: 3, 
          width: 180, 
          minWidth: 160, 
          whiteSpace: 'nowrap',
          position: 'sticky',
          right: 0,
          backgroundColor: 'background.paper',
          boxShadow: '-4px 0px 10px -4px rgba(0,0,0,0.1)',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
          <Box sx={{ typography: 'body2', color: 'text.secondary', fontWeight: 700, mr: 1, fontSize: 12, display: 'inline-block' }}>
            {row.modified ? fTimeDist(row.modified) : '-'}
          </Box>
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
