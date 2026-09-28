import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AvatarGroup from '@mui/material/AvatarGroup';
import { alpha, useTheme } from '@mui/material/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { HRReminderDetailDialog } from './reminder-details-dialog';

// ----------------------------------------------------------------------
const AVATAR_COLORS = ['#00A5D1', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#06B6D4'];

const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

type Props = {
  row: any;
  index: number;
  onEdit: VoidFunction;
  onDelete: VoidFunction;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function RemindersTableRow({ row, index, onEdit, onDelete, canEdit = true, canDelete = true }: Props) {
  const theme = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);

  return (
    <>
      <TableRow hover sx={{
        '& td, & th': { borderBottom: (t) => `1px solid ${t.palette.divider}` },
        '&:last-child td, &:last-child th': { borderBottom: 0 },
      }}>
        <TableCell align="center">
          <Box
            sx={{
              width: 28,
              height: 28,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
              color: 'primary.main',
              typography: 'subtitle2',
              fontWeight: 800,
              border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.16)}`,
              mx: 'auto',
              transition: (t) => t.transitions.create(['all'], { duration: t.transitions.duration.shorter }),
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

        <TableCell sx={{ maxWidth: 450 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {row.message}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2">
            {row.trigger_time ? dayjs(`2000-01-01 ${row.trigger_time}`).format('h:mm a') : '-'}
          </Typography>
        </TableCell>

        <TableCell>
          <Stack spacing={0.5} alignItems="center">
            {!!row.is_global && (
              <Label variant="soft" color="success" sx={{ width: 'fit-content' }}>
                Global
              </Label>
            )}
            {!row.is_global && row.selected_employees?.length > 0 && (
              <Tooltip
                title={
                  <Box sx={{ p: 0.5 }}>
                    {row.selected_employees.map((emp: any) => (
                      <Typography key={emp.id} variant="caption" display="block">
                        {emp.name} ({emp.id})
                      </Typography>
                    ))}
                  </Box>
                }
                arrow
                placement="top"
              >
                <AvatarGroup
                  max={4}
                  sx={{
                    justifyContent: 'center',
                    '& .MuiAvatar-root': {
                      width: 26,
                      height: 26,
                      fontSize: 10,
                      fontWeight: 700,
                      border: (t) => `2px solid ${t.palette.background.paper}`,
                      ml: -0.75, // Overlap
                    }
                  }}
                >
                  {row.selected_employees.map((emp: any) => (
                    <Avatar
                      key={emp.id}
                      alt={emp.name}
                      sx={{ bgcolor: stringToColor(emp.name) }}
                    >
                      {emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                    </Avatar>
                  ))}
                </AvatarGroup>
              </Tooltip>
            )}
          </Stack>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <IconButton size="small" onClick={() => setOpenDetail(true)} sx={{ color: '#00A5D1' }}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
            {canEdit && (
              <IconButton size="small" onClick={onEdit}>
                <Iconify icon="solar:pen-bold" sx={{ color: 'primary.main' }} />
              </IconButton>
            )}
            {canDelete && (
              <IconButton size="small" onClick={() => setConfirmDelete(true)} sx={{ color: 'error.main' }}>
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            )}
          </Stack>
        </TableCell>
      </TableRow>


      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete"
        content="Are you sure you want to delete this reminder?"
        action={
          <Button variant="contained" color="error" onClick={onDelete}>
            Delete
          </Button>
        }
      />
      <HRReminderDetailDialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        row={row}
      />
    </>
  );
}
