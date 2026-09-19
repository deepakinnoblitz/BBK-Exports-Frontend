import type { ShiftRotation} from 'src/api/shift-rotation';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { getShiftRotationDoc } from 'src/api/shift-rotation';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  rotationName: string | null;
  onEdit?: () => void;
  canEdit?: boolean;
};

export function ShiftRotationDetailsDialog({
  open,
  onClose,
  rotationName,
  canEdit = true,
}: Props) {
  const [rotation, setRotation] = useState<ShiftRotation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && rotationName) {
      setLoading(true);
      getShiftRotationDoc(rotationName)
        .then((doc) => setRotation(doc))
        .catch((err) => console.error('Failed to load Shift Rotation:', err))
        .finally(() => setLoading(false));
    }
  }, [open, rotationName]);

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return dayjs(d).format('DD-MMM-YYYY');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionProps={{ onExited: () => setRotation(null) }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (themeVar: any) => themeVar.customShadows?.z24,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Iconify icon={"solar:refresh-circle-bold-duotone" as any} width={22} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Shift Rotation Details
          </Typography>
        </Stack>

        <IconButton
          onClick={onClose}
          sx={{
            color: 'text.disabled',
            '&:hover': {
              color: 'text.primary',
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
            },
          }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1 }}>
        {loading || !rotation ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#08a3cd' }} />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Header Banner Card */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: 'background.neutral',
                border: (theme) => `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {rotation.rotation_name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  Doc ID: <strong>{rotation.name}</strong> • Frequency: <strong>{rotation.frequency}</strong>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Label color={(rotation.status === 'Active' && 'success') || 'error'}>
                  {(rotation.status || 'Active').toUpperCase()}
                </Label>
              </Box>
            </Box>

            {/* General Information Grid */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', mb: 2, fontSize: '12px' }}
              >
                Configuration Overview
              </Typography>

              <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <DetailItem
                  label="Department"
                  value={rotation.department || 'All Departments'}
                  icon="solar:buildings-bold-duotone"
                />
                <DetailItem
                  label="Active Period"
                  value={`${formatDate(rotation.start_date)} → ${formatDate(rotation.end_date)}`}
                  icon="solar:calendar-bold-duotone"
                />
                <DetailItem
                  label="Exclude Weekly Offs"
                  value={rotation.exclude_weekly_offs ? 'Yes (Skip rotation on weekly offs)' : 'No'}
                  icon="solar:shield-check-bold"
                />
                <DetailItem
                  label="Exclude Holidays"
                  value={rotation.exclude_holidays ? 'Yes (Skip rotation on holidays)' : 'No'}
                  icon="solar:shield-check-bold"
                />
                {rotation.description && (
                  <Box sx={{ gridColumn: { xs: '1', sm: '1 / span 2' } }}>
                    <DetailItem
                      label="Description"
                      value={rotation.description}
                      icon="solar:document-text-bold-duotone"
                    />
                  </Box>
                )}
              </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Shift Sequence Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', mb: 1.5, fontSize: '12px' }}
              >
                Shift Sequence ({rotation.sequences?.length || 0} Steps)
              </Typography>

              {rotation.sequences && rotation.sequences.length > 0 ? (
                <TableContainer component={Scrollbar} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.neutral' }}>
                        <TableCell sx={{ fontWeight: 700, width: 80 }}>Step</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Shift</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rotation.sequences.map((seq, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 700 }}>
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                              }}
                            >
                              {seq.step_number || idx + 1}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {seq.shift_name || seq.shift}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  No shift sequence steps configured.
                </Typography>
              )}
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Assignees Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', mb: 1.5, fontSize: '12px' }}
              >
                Assigned Employees ({rotation.assignees?.length || 0})
              </Typography>

              {rotation.assignees && rotation.assignees.length > 0 ? (
                <TableContainer component={Scrollbar} sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1.5, maxHeight: 240 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.neutral' }}>
                        <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Employee Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Employee ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rotation.assignees.map((assignee, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ color: 'text.secondary' }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{assignee.employee_name || assignee.employee}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{assignee.employee}</TableCell>
                          <TableCell>{assignee.department || '-'}</TableCell>
                          <TableCell>{assignee.designation || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  No specific employees assigned yet.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: string;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 700,
          textTransform: 'uppercase',
          mb: 0.5,
          display: 'block',
          fontSize: '11px',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon={icon as any} width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {value || '-'}
        </Typography>
      </Box>
    </Box>
  );
}
