import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';

import { Iconify } from 'src/components/iconify';
import { Label, LabelColor } from 'src/components/label';

// ----------------------------------------------------------------------

const getSourceLabel = (type?: string) => {
  if (!type) return 'Default Shift Change';
  const t = type.replace(/_/g, ' ').trim().toLowerCase();
  if (t === 'shift change' || t === 'default shift change') {
    return 'Default Shift Change';
  }
  return type;
};

const getSourceColor = (type?: string): LabelColor => {
  switch (type?.toLowerCase()?.replace(/_/g, ' ')) {
    case 'manual':
      return 'default';
    case 'bulk':
      return 'warning';
    case 'rotation':
      return 'info';
    case 'override':
      return 'error';
    case 'shift change':
    case 'default shift change':
      return 'secondary';
    default:
      return 'default';
  }
};

export interface ShiftChangeHistoryItem {
  name: string;
  shift: string;
  shift_name?: string;
  effective_from: string;
  effective_to?: string | null;
  status?: string;
  assignment_type?: string;
  modified?: string;
  creation?: string;
}

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onConfirm: (changeDate: string, reason: string) => Promise<void>;
  loading: boolean;
  employee: {
    id: string;
    name: string;
    department?: string;
    designation?: string;
  };
  defaultShift: string;
  newShift: string;
  existingHistory?: ShiftChangeHistoryItem[];
  onDeleteHistoryItem?: (historyItemName: string) => Promise<void>;
};

export function EmployeeShiftChangeConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading,
  employee,
  defaultShift,
  newShift,
  existingHistory = [],
  onDeleteHistoryItem,
}: Props) {
  const theme = useTheme();

  const [changeDate, setChangeDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [reason, setReason] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setChangeDate(dayjs());
      setReason(
        `Shift changed from ${defaultShift || 'None'} to ${newShift || 'new shift'} via Edit Employee`
      );
    }
  }, [open, defaultShift, newShift]);

  const handleConfirm = async () => {
    const formattedDate = changeDate?.isValid() ? changeDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    await onConfirm(formattedDate, reason);
  };

  const handleDeleteItem = async (name: string) => {
    if (!onDeleteHistoryItem) return;
    try {
      setDeletingId(name);
      await onDeleteHistoryItem(name);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.customShadows?.z24 || 24,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Confirm Employee Shift Change
          </Typography>

          <IconButton onClick={onClose} sx={{ color: theme.palette.grey[500] }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: 2.5 }}>
          <Stack spacing={2.5}>
            {/* Employee Summary Card */}
            <Card
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  <Iconify icon="solar:user-bold-duotone" width={22} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {employee.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ID: {employee.id}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {employee.department && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={employee.department}
                    icon={<Iconify icon="solar:buildings-bold" width={14} />}
                    sx={{ borderRadius: 1 }}
                  />
                )}
                {employee.designation && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={employee.designation}
                    icon={<Iconify icon="solar:user-id-bold" width={14} />}
                    sx={{ borderRadius: 1 }}
                  />
                )}
              </Stack>
            </Card>

            {/* Comparison Cards: Default Shift vs New Shift */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
                alignItems: 'center',
                gap: 2,
              }}
            >
              {/* Default Shift Box */}
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  borderColor: (t) => t.palette.divider,
                  bgcolor: (t) => (t.palette.mode === 'dark' ? alpha(t.palette.grey[800], 0.5) : alpha(t.palette.grey[100], 0.8)),
                }}
              >
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5 }}>
                      Default Settings
                    </Typography>
                    <Chip
                      size="small"
                      label="Original Unchanged"
                      color="default"
                      sx={{ fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {defaultShift || 'None (Unassigned)'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Employee default shift record remains completely unchanged.
                  </Typography>
                </Stack>
              </Card>

              {/* Arrow Indicator */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  my: { xs: 0, md: 'auto' },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                    color: COMMON_COLORS.emerald.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px dashed ${COMMON_COLORS.emerald.main}`,
                  }}
                >
                  <Iconify icon="solar:arrow-right-bold" width={22} />
                </Box>
              </Box>

              {/* New / Modified Shift Box */}
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  borderColor: alpha(COMMON_COLORS.emerald.main, 0.4),
                  bgcolor: alpha(COMMON_COLORS.emerald.main, 0.05),
                }}
              >
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      variant="overline"
                      sx={{ color: COMMON_COLORS.emerald.main, fontWeight: 700, letterSpacing: 0.5 }}
                    >
                      New / Modified Shift
                    </Typography>
                    <Chip
                      size="small"
                      label="Shift Assignment"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 20,
                        bgcolor: COMMON_COLORS.emerald.main,
                        color: 'common.white',
                      }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: COMMON_COLORS.emerald.darker || COMMON_COLORS.emerald.main }}>
                    {newShift}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    New assignment applies exclusively to {employee.name}.
                  </Typography>
                </Stack>
              </Card>
            </Box>

            {/* Single Effective Date Picker */}
            <DatePicker
              label="Effective Date"
              value={changeDate}
              onChange={(newValue) => setChangeDate(newValue)}
              slotProps={{
                textField: {
                  required: true,
                  fullWidth: true,
                  InputLabelProps: { shrink: true },
                  helperText: 'Date on which the shift change takes effect (automatically applies to all subsequent and future dates)',
                },
              }}
            />

            {/* Optional Reason */}
            <TextField
              fullWidth
              size="small"
              label="Change Reason / Notes"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              InputLabelProps={{ shrink: true }}
              placeholder="e.g. Temporary reassignment to morning shift"
            />

            {/* Information Alert explaining the persistence & revert behavior */}
            <Alert
              severity="info"
              icon={<Iconify icon={"solar:shield-check-bold" as any} width={22} />}
              sx={{
                borderRadius: 1.5,
                '& .MuiAlert-message': { width: '100%' },
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Behavior & System Guarantees:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0, typography: 'caption', color: 'text.secondary' }}>
                <li>This change applies <b>only to {employee.name}</b> and will not affect any other employee.</li>
                <li>The original default shift setting (<b>{defaultShift || 'None'}</b>) remains completely intact.</li>
                <li>Only the newly added shift assignment record will be saved for this employee.</li>
                <li><b>Automatic Reversion:</b> If this newly created record is deleted or cancelled, {employee.name} will automatically revert to the default settings (<b>{defaultShift || 'None'}</b>).</li>
              </Box>
            </Alert>

            {/* Existing Shift Changes History Table (if any exist) */}
            {existingHistory && existingHistory.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Iconify icon="solar:history-bold" width={18} sx={{ color: 'text.secondary' }} />
                    Previous Shift Change Records for this Employee ({existingHistory.length})
                  </Typography>
                </Stack>

                <Card variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.08) }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Shift</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Effective Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date Changed</TableCell>
                        {onDeleteHistoryItem && <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {existingHistory.map((item) => (
                        <TableRow key={item.name} hover>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {item.shift_name || item.shift}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            {item.effective_from ? dayjs(item.effective_from).format('DD-MM-YYYY') : '-'}
                          </TableCell>
                          <TableCell>
                            <Label variant="soft" color={getSourceColor(item.assignment_type)}>
                              {getSourceLabel(item.assignment_type)}
                            </Label>
                          </TableCell>
                          <TableCell>
                            <Label color={(!item.status || item.status === 'Active') ? 'success' : 'error'}>
                              {(item.status || 'Active').toUpperCase()}
                            </Label>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            {item.creation || item.modified ? dayjs(item.creation || item.modified).format('DD-MM-YYYY HH:mm') : '-'}
                          </TableCell>
                          {onDeleteHistoryItem && (
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                title="Delete this change and revert to default"
                                disabled={deletingId === item.name}
                                onClick={() => handleDeleteItem(item.name)}
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, px: 3, borderTop: `1px solid ${theme.palette.divider}`, justifyContent: 'flex-end' }}>
          <LoadingButton
            onClick={handleConfirm}
            variant="contained"
            loading={loading}
            startIcon={<Iconify icon="solar:check-circle-bold" />}
            sx={{
              borderRadius: 1,
              bgcolor: COMMON_COLORS.emerald.main,
              color: 'common.white',
              '&:hover': { bgcolor: COMMON_COLORS.emerald.dark },
              px: 3,
            }}
          >
            Confirm & Update
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
