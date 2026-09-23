import dayjs from 'dayjs';
import { useState } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { triggerManualSync } from 'src/api/biometric';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type SyncResult = {
  status: string;
  sync_log?: string;
  records_received?: number;
  records_created?: number;
  duplicates_skipped?: number;
  processed_punches?: number;
  errors?: number;
};

export function AttendanceSyncDialog({ open, onClose, onSuccess }: Props) {
  const { enqueueSnackbar } = useSnackbar();

  const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [toDate, setToDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const handleReset = () => {
    setFromDate(dayjs());
    setToDate(dayjs());
    setLoading(false);
    setSyncResult(null);
  };

  const handleClose = () => {
    if (loading) return;
    const hadResult = !!syncResult;
    handleReset();
    onClose();
    if (hadResult && onSuccess) {
      onSuccess();
    }
  };

  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'week') => {
    if (preset === 'today') {
      setFromDate(dayjs());
      setToDate(dayjs());
    } else if (preset === 'yesterday') {
      setFromDate(dayjs().subtract(1, 'day'));
      setToDate(dayjs().subtract(1, 'day'));
    } else if (preset === 'week') {
      setFromDate(dayjs().subtract(6, 'day'));
      setToDate(dayjs());
    }
  };

  const handleStartSync = async () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar('Please select both From Date and To Date', { variant: 'warning' });
      return;
    }

    setLoading(true);

    try {
      const fromStr = fromDate.format('YYYY-MM-DD');
      const toStr = toDate.format('YYYY-MM-DD');
      const result = await triggerManualSync(fromStr, toStr);
      setSyncResult(result);
      enqueueSnackbar('Biometric attendance sync completed successfully', { variant: 'success' });
    } catch (err: any) {
      const msg = err?.message || 'Biometric Integration is disabled in Biometric Settings.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (theme) => theme.customShadows?.z24 || '0 24px 48px rgba(0,0,0,0.16)',
        },
      }}
    >
      {/* 1. SYNC COMPLETED VIEW */}
      {syncResult ? (
        <>
          <DialogTitle sx={{ pb: 1, pt: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
                color: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Iconify icon={"solar:check-circle-bold" as any} width={38} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Attendance Sync Complete
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Punches synced for{' '}
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {fromDate?.format('DD MMM YYYY')}
                {fromDate && toDate && !fromDate.isSame(toDate, 'day') ? ` - ${toDate.format('DD MMM YYYY')}` : ''}
              </Box>
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ px: 3, py: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                mt: 1,
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Punches Processed
                </Typography>
                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800, mt: 0.5 }}>
                  {syncResult.processed_punches ?? 0}
                </Typography>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.info.main, 0.04),
                  borderColor: (theme) => alpha(theme.palette.info.main, 0.2),
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Records Received
                </Typography>
                <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 800, mt: 0.5 }}>
                  {syncResult.records_received ?? 0}
                </Typography>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                  borderColor: (theme) => alpha(theme.palette.success.main, 0.2),
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  New Logs Created
                </Typography>
                <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 800, mt: 0.5 }}>
                  {syncResult.records_created ?? 0}
                </Typography>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                  borderColor: (theme) => alpha(theme.palette.grey[500], 0.2),
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  Duplicates Skipped
                </Typography>
                <Typography variant="h4" sx={{ color: 'text.secondary', fontWeight: 800, mt: 0.5 }}>
                  {syncResult.duplicates_skipped ?? 0}
                </Typography>
              </Card>
            </Box>

            {typeof syncResult.errors === 'number' && syncResult.errors > 0 && (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5 }}>
                {syncResult.errors} log{syncResult.errors > 1 ? 's' : ''} encountered unmapped employee codes. Check Biometric Settings to resolve.
              </Alert>
            )}

            {syncResult.sync_log && (
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', mt: 2 }}>
                Sync Reference: {syncResult.sync_log}
              </Typography>
            )}
          </DialogContent>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <DialogActions sx={{ p: 2.5 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleClose}
              sx={{ bgcolor: '#059669', color: 'common.white', fontWeight: 700, '&:hover': { bgcolor: '#047857' } }}
            >
              Done & Refresh Attendance
            </Button>
          </DialogActions>
        </>
      ) : (
        /* 2. SYNC TRIGGER FORM VIEW */
        <>
          <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Sync Attendance
              </Typography>
            </Stack>
            <IconButton onClick={handleClose} disabled={loading} sx={{ color: 'text.disabled' }}>
              <Iconify icon={"mingcute:close-line" as any} width={20} />
            </IconButton>
          </DialogTitle>

          <Divider />

          <DialogContent sx={{ px: 3, py: 3 }}>
            {loading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <CircularProgress size={48} sx={{ color: '#059669', mb: 2.5 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Syncing Biometric Logs...
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Fetching device logs and calculating attendance for {fromDate?.format('DD MMM YYYY')}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.06),
                    border: (theme) => `1px solid ${alpha(theme.palette.info.main, 0.16)}`,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Iconify icon={"solar:info-circle-bold" as any} sx={{ width: 20, height: 20, color: 'info.main', mt: 0.2, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                      Pulls punch records from SmartOffice devices for the selected date and generates/updates Attendance entries. Existing manual records remain protected.
                    </Typography>
                  </Stack>
                </Box>

                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
                      Quick Select:
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                      {[
                        { id: 'today', label: 'Today', selected: fromDate?.isSame(dayjs(), 'day') && toDate?.isSame(dayjs(), 'day') },
                        { id: 'yesterday', label: 'Yesterday', selected: fromDate?.isSame(dayjs().subtract(1, 'day'), 'day') && toDate?.isSame(dayjs().subtract(1, 'day'), 'day') },
                        { id: 'week', label: 'Last 7 Days', selected: fromDate?.isSame(dayjs().subtract(6, 'day'), 'day') && toDate?.isSame(dayjs(), 'day') },
                      ].map((preset) => (
                        <Button
                          key={preset.id}
                          size="small"
                          onClick={() => handleApplyPreset(preset.id as any)}
                          sx={{
                            borderRadius: 1,
                            py: 0.6,
                            px: 1.75,
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            transition: (theme) => theme.transitions.create(['all'], { duration: theme.transitions.duration.shorter }),
                            ...(preset.selected
                              ? {
                                  bgcolor: '#059669',
                                  color: 'common.white',
                                  boxShadow: '0 2px 8px 0 rgba(8, 163, 205, 0.35)',
                                  '&:hover': {
                                    bgcolor: '#047857',
                                  },
                                }
                              : {
                                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                  color: 'text.secondary',
                                  border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
                                  '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.16),
                                    color: 'text.primary',
                                  },
                                }),
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <DatePicker
                      label="From Date"
                      value={fromDate}
                      onChange={(newValue) => setFromDate(newValue)}
                      format="DD-MM-YYYY"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          InputLabelProps: { shrink: true },
                        },
                      }}
                    />
                    <DatePicker
                      label="To Date"
                      value={toDate}
                      onChange={(newValue) => setToDate(newValue)}
                      format="DD-MM-YYYY"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          InputLabelProps: { shrink: true },
                        },
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>
            )}
          </DialogContent>

          <Divider />

          <DialogActions sx={{ p: 2.5 }}>
            <Button
              variant="contained"
              onClick={handleStartSync}
              disabled={loading}
              startIcon={<Iconify icon={"solar:restart-bold" as any} />}
              sx={{ bgcolor: '#059669', color: 'common.white', fontWeight: 700, '&:hover': { bgcolor: '#047857' } }}
            >
              Sync Now
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
