import type { BiometricStatus } from 'src/api/biometric';

import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { fDateTime } from 'src/utils/format-time';

import {
  triggerManualSync,
  getBiometricStatus,
  reprocessUnmappedLogs,
  testBiometricConnection,
} from 'src/api/biometric';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/email-settings/view/email-settings-view';

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
  onRefresh?: () => void;
};

export function SettingsBiometric({ data, onChange, onRefresh }: Props) {
  const { enqueueSnackbar } = useSnackbar();

  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [syncingNow, setSyncingNow] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const [manualFromDate, setManualFromDate] = useState('');
  const [manualToDate, setManualToDate] = useState('');

  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await getBiometricStatus();
      setBiometricStatus(res);
    } catch (err) {
      console.error('Failed to load biometric status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const res = await testBiometricConnection();
      if (res.status === 'success') {
        enqueueSnackbar(res.message || 'Connected to SmartOffice successfully!', { variant: 'success' });
      } else {
        enqueueSnackbar(res.message || 'Connection test failed.', { variant: 'error' });
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to connect to SmartOffice.', { variant: 'error' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncingNow(true);
      const res = await triggerManualSync(manualFromDate || undefined, manualToDate || undefined);
      enqueueSnackbar(
        `Sync completed! Received: ${res.records_received}, Created: ${res.records_created}, Duplicates Skipped: ${res.duplicates_skipped}, Punches Processed: ${res.processed_punches}`,
        { variant: 'success' }
      );
      loadStatus();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Manual synchronization failed.', { variant: 'error' });
    } finally {
      setSyncingNow(false);
    }
  };

  const handleReprocessUnmapped = async () => {
    try {
      setReprocessing(true);
      const res = await reprocessUnmappedLogs();
      enqueueSnackbar(
        `Reprocessed ${res.resolved_logs} biometric log(s) and created/updated ${res.processed_punches} punches.`,
        { variant: 'success' }
      );
      loadStatus();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Reprocessing unmapped logs failed.', { variant: 'error' });
    } finally {
      setReprocessing(false);
    }
  };

  const isEnabled = Boolean(data?.enabled);
  const isAutoSyncEnabled = Boolean(data?.auto_sync_enabled);
  const syncMode = data?.sync_mode || 'Manual Only';

  return (
    <Card
      sx={{
        p: { xs: 2.5, md: 4 },
        borderRadius: 2,
        minHeight: '65vh',
        bgcolor: '#ffffff',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: (theme) => theme.customShadows?.z1,
      }}
    >
      {/* 1. MASTER HEADER & TOGGLE */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ pb: isEnabled ? 3 : 0 }}
      >
        <Box>
          <Typography variant="h6">SmartOffice Biometric Integration</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Connect directly to the SmartOffice WebAPI for automated and manual attendance synchronization.
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: isEnabled ? '#059669' : 'text.secondary',
            }}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </Typography>
          <CustomSwitch
            checked={isEnabled}
            onChange={(e) => onChange('enabled', e.target.checked ? 1 : 0)}
          />
        </Stack>
      </Stack>

      {!isEnabled ? (
        /* PLACEHOLDER WHEN DISABLED - CLEAN WHITE BACKGROUND */
        <Box
          sx={{
            py: 14,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
              color: 'text.disabled',
              mb: 2.5,
            }}
          >
            <Iconify icon={"solar:user-id-bold" as any} width={42} />
          </Box>
          <Typography variant="h6" sx={{ color: 'text.primary', mb: 1, fontWeight: 700 }}>
            Biometric Integration is Disabled
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
            Toggle the switch above to configure your SmartOffice WebAPI connection, set custom sync schedules, and manage biometric punch logs.
          </Typography>
        </Box>
      ) : (
        /* ALL CONFIGURATION & CONTROLS WHEN ENABLED */
        <Stack spacing={4}>
          <Divider sx={{ borderStyle: 'dashed' }} />

          {/* 1. CONNECTION DETAILS */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              SmartOffice API Credentials
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2.5 }}>
              Enter your SmartOffice WebAPI base URL and authorization key.
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="API Base URL"
                value={data?.api_base_url || ''}
                onChange={(e) => onChange('api_base_url', e.target.value)}
                placeholder="http://192.168.1.100:89/api/v2/WebAPI"
                helperText="The endpoint where SmartOffice WebAPI is hosted."
              />

              <TextField
                fullWidth
                label="API Key"
                type={showApiKey ? 'text' : 'password'}
                value={data?.api_key || ''}
                onChange={(e) => onChange('api_key', e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                        <Iconify icon={showApiKey ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText="Your SmartOffice WebAPI authorization key."
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 0.5 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !data?.api_base_url}
                  startIcon={
                    testingConnection ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Iconify icon={"solar:link-circle-bold" as any} />
                    )
                  }
                  sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </Box>
            </Stack>
          </Box>

          <Divider sx={{ borderStyle: 'dashed' }} />

          {/* 2. SYNC SCHEDULE CONFIGURATION */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Sync Schedule Configuration
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2.5 }}>
              Define when and how often attendance records synchronize from the biometric devices.
            </Typography>

            <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5 }}>
              <strong>User Controlled:</strong> Automatic sync is <strong>disabled by default</strong>. Attendance
              will only synchronize automatically if you turn this on and specify your desired schedule below.
            </Alert>

            <Stack spacing={3}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: (theme) => `solid 1px ${theme.palette.divider}`,
                  bgcolor: '#ffffff',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Enable Automatic Sync
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    When toggled on, background tasks will run according to the schedule configured below.
                  </Typography>
                </Box>
                <CustomSwitch
                  checked={isAutoSyncEnabled}
                  onChange={(e) => onChange('auto_sync_enabled', e.target.checked ? 1 : 0)}
                />
              </Stack>

              {isAutoSyncEnabled && (
                <>
                  <FormControl fullWidth>
                    <InputLabel id="sync-mode-label">Sync Mode</InputLabel>
                    <Select
                      labelId="sync-mode-label"
                      value={syncMode}
                      label="Sync Mode"
                      onChange={(e) => onChange('sync_mode', e.target.value)}
                    >
                      <MenuItem value="Manual Only">Manual Only (No background sync)</MenuItem>
                      <MenuItem value="Interval in Minutes">Interval in Minutes (e.g. Every 15 or 30 mins)</MenuItem>
                      <MenuItem value="Specific Times Daily">Specific Times Daily (e.g. 09:30, 13:30, 18:30)</MenuItem>
                    </Select>
                  </FormControl>

                  {syncMode === 'Interval in Minutes' && (
                    <TextField
                      fullWidth
                      label="Sync Interval (Minutes)"
                      type="number"
                      value={data?.sync_interval_minutes || 15}
                      onChange={(e) => onChange('sync_interval_minutes', parseInt(e.target.value, 10) || 15)}
                      helperText="Frequency in minutes between automatic sync operations (Minimum 5 minutes recommended)."
                    />
                  )}

                  {syncMode === 'Specific Times Daily' && (
                    <TextField
                      fullWidth
                      label="Specific Daily Sync Times"
                      value={data?.daily_sync_times || ''}
                      onChange={(e) => onChange('daily_sync_times', e.target.value)}
                      placeholder="09:30, 13:30, 18:30"
                      helperText="Comma-separated 24-hour times (HH:MM) to trigger attendance sync daily."
                    />
                  )}

                  <TextField
                    fullWidth
                    label="Overlap Window (Minutes)"
                    type="number"
                    value={data?.overlap_minutes || 15}
                    onChange={(e) => onChange('overlap_minutes', parseInt(e.target.value, 10) || 15)}
                    helperText="Overlap window in minutes queried before the last sync to catch delayed device punches."
                  />
                </>
              )}
            </Stack>
          </Box>

          <Divider sx={{ borderStyle: 'dashed' }} />

          {/* 3. MANUAL SYNC & DIAGNOSTICS */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Manual Sync & Diagnostics
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 3 }}>
              Trigger on-demand sync for custom date ranges and verify sync status.
            </Typography>

            {/* Diagnostic Metric Cards - Crisp White with Borders */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              {/* Card 1: Last Sync Status */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                  background: (theme) =>
                    `linear-gradient(150deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  LAST SYNC STATUS
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                    fontWeight: 700,
                    color:
                      (biometricStatus?.last_sync_status || data?.last_sync_status) === 'Success'
                        ? 'success.main'
                        : (biometricStatus?.last_sync_status || data?.last_sync_status) === 'Failed'
                        ? 'error.main'
                        : 'text.primary',
                  }}
                >
                  {biometricStatus?.last_sync_status || data?.last_sync_status || 'Never Run'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {biometricStatus?.last_successful_sync
                    ? fDateTime(biometricStatus.last_successful_sync)
                    : data?.last_successful_sync
                    ? fDateTime(data.last_successful_sync)
                    : 'No sync history yet'}
                </Typography>
              </Box>

              {/* Card 2: Active Devices */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                  background: (theme) =>
                    `linear-gradient(150deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  ACTIVE DEVICES
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
                  {loadingStatus ? '...' : biometricStatus?.devices_count ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Configured biometric terminals
                </Typography>
              </Box>

              {/* Card 3: Total Biometric Logs */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                  background: (theme) =>
                    `linear-gradient(150deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  TOTAL BIOMETRIC LOGS
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
                  {loadingStatus ? '...' : biometricStatus?.total_logs ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Raw punch records
                </Typography>
              </Box>

              {/* Card 4: Unmapped / Errors */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                  background: (theme) =>
                    `linear-gradient(150deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  UNMAPPED / ERRORS
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                    fontWeight: 700,
                    color: (biometricStatus?.error_logs ?? 0) > 0 ? 'error.main' : 'text.primary',
                  }}
                >
                  {loadingStatus ? '...' : biometricStatus?.error_logs ?? 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Employee ID mismatch
                </Typography>
              </Box>
            </Box>

            {biometricStatus?.last_error_message && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>
                <strong>Last Error:</strong> {biometricStatus.last_error_message}
              </Alert>
            )}

            {/* Manual Sync Controls */}
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="From Date / Time"
                    format="DD-MM-YYYY hh:mm A"
                    value={manualFromDate ? dayjs(manualFromDate) : null}
                    onChange={(newValue) => setManualFromDate(newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '')}
                    slotProps={{
                      textField: {
                        sx: { minWidth: 240 },
                      },
                    }}
                  />

                  <DateTimePicker
                    label="To Date / Time"
                    format="DD-MM-YYYY hh:mm A"
                    value={manualToDate ? dayjs(manualToDate) : null}
                    onChange={(newValue) => setManualToDate(newValue ? newValue.format('YYYY-MM-DD HH:mm:ss') : '')}
                    slotProps={{
                      textField: {
                        sx: { minWidth: 240 },
                      },
                    }}
                  />
                </LocalizationProvider>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleManualSync}
                  disabled={syncingNow}
                  startIcon={
                    syncingNow ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Iconify icon={"solar:refresh-circle-bold" as any} width={18} />
                    )
                  }
                  sx={{
                    bgcolor: '#059669',
                    '&:hover': { bgcolor: '#047857' },
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    height: 38,
                    px: 2,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {syncingNow ? 'Syncing...' : 'Sync Attendance Now'}
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={handleReprocessUnmapped}
                  disabled={reprocessing}
                  startIcon={
                    reprocessing ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Iconify icon={"solar:user-check-bold" as any} width={18} />
                    )
                  }
                  sx={{
                    borderRadius: 1,
                    height: 38,
                    px: 2,
                    fontSize: '13px',
                    textTransform: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {reprocessing ? 'Reprocessing...' : 'Reprocess Unmapped Punches'}
                </Button>
              </Stack>
            </Stack>
          </Box>

          {/* 4. RECENT SYNC HISTORY */}
          {biometricStatus?.recent_syncs && biometricStatus.recent_syncs.length > 0 && (
            <>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Recent Sync History
                </Typography>
                <TableContainer
                  sx={{
                    borderRadius: 1.5,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    overflow: 'hidden',
                  }}
                >
                  <Table size="small">
                    <TableHead
                      sx={{
                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.06),
                        '& th': {
                          color: 'text.secondary',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          py: 1.25,
                          borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                        },
                      }}
                    >
                      <TableRow>
                        <TableCell>Sync ID</TableCell>
                        <TableCell>Started At</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="center">Received</TableCell>
                        <TableCell align="center">New Created</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {biometricStatus.recent_syncs.map((row) => (
                        <TableRow
                          key={row.name}
                          hover
                          sx={{
                            '& td': {
                              py: 1.25,
                              borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            },
                            '&:last-of-type td': {
                              borderBottom: 'none',
                            },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                          <TableCell>{row.started_at ? fDateTime(row.started_at) : '-'}</TableCell>
                          <TableCell>{row.sync_type || 'Manual'}</TableCell>
                          <TableCell align="center">{row.records_received || 0}</TableCell>
                          <TableCell align="center">{row.records_created || 0}</TableCell>
                          <TableCell align="center">
                            <Label color={row.status === 'Completed' ? 'success' : row.status === 'Failed' ? 'error' : 'default'}>
                              {row.status}
                            </Label>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </Stack>
      )}
    </Card>
  );
}
