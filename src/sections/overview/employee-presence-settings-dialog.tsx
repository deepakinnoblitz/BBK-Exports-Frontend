import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import { useTheme, alpha } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { usePresence } from 'src/hooks/use-presence';

import { getPresenceSettings, updatePresenceSettings } from 'src/api/presence';
import { fetchEmployeesList, type EmployeeOption } from 'src/api/hr-document-generation';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/email-settings/view/email-settings-view';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
};

export function EmployeePresenceSettingsDialog({ open, onClose }: Props) {
  const theme = useTheme();
  const { requestSystemPermission, isSystemMonitoring } = usePresence();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [enableAutoStatus, setEnableAutoStatus] = useState(true);
  const [idleThreshold, setIdleThreshold] = useState(60);
  const [awayThreshold, setAwayThreshold] = useState(300);
  const [breakThreshold, setBreakThreshold] = useState(900);
  const [offlineThreshold, setOfflineThreshold] = useState(3600);
  const [enableAutoResumeBreak, setEnableAutoResumeBreak] = useState(true);
  const [events, setEvents] = useState({
    mousemove: true,
    keydown: true,
    scroll: true,
    click: true,
    touchstart: true,
  });
  // Location states
  const [enableLocationTracking, setEnableLocationTracking] = useState(false);
  const [trackOnLogin, setTrackOnLogin] = useState(true);
  const [trackOnLogout, setTrackOnLogout] = useState(true);
  const [trackOnStatusChange, setTrackOnStatusChange] = useState(true);
  const [trackingIntervalMinutes, setTrackingIntervalMinutes] = useState(15);
  const [minimumGpsAccuracy, setMinimumGpsAccuracy] = useState(100);
  const [locationTrackingTarget, setLocationTrackingTarget] = useState<'All Employees' | 'Selected Employees'>('All Employees');
  const [trackedEmployees, setTrackedEmployees] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  // Threshold unit ('sec' | 'min')
  const [unit, setUnit] = useState<'sec' | 'min'>('sec');

  // UI state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleRequestPermission = async () => {
    await requestSystemPermission();
  };

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [settings, employeesList] = await Promise.all([
        getPresenceSettings(),
        fetchEmployeesList(),
      ]);
      setEnableAutoStatus(!!settings.enable_auto_status);
      setIdleThreshold(settings.idle_threshold || 60);
      setAwayThreshold(settings.away_threshold || 300);
      setBreakThreshold(settings.break_threshold || 900);
      setOfflineThreshold(settings.offline_threshold || 3600);
      setEnableAutoResumeBreak(!!settings.enable_auto_resume_break);
      setEvents({
        mousemove: !!settings.event_mousemove,
        keydown: !!settings.event_keydown,
        scroll: !!settings.event_scroll,
        click: !!settings.event_click,
        touchstart: !!settings.event_touchstart,
      });
      setEnableLocationTracking(!!settings.enable_location_tracking);
      setTrackOnLogin(!!settings.track_on_login);
      setTrackOnLogout(!!settings.track_on_logout);
      setTrackOnStatusChange(!!settings.track_on_status_change);
      setTrackingIntervalMinutes(settings.tracking_interval_minutes || 15);
      setMinimumGpsAccuracy(settings.minimum_gps_accuracy || 100);
      setLocationTrackingTarget((settings.location_tracking_target as any) || 'All Employees');
      setTrackedEmployees(settings.tracked_employees || []);
      setEmployeeOptions(employeesList || []);
    } catch (error) {
      console.error('Error fetching presence settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePresenceSettings({
        enable_auto_status: enableAutoStatus,
        idle_threshold: idleThreshold,
        away_threshold: awayThreshold,
        break_threshold: breakThreshold,
        offline_threshold: offlineThreshold,
        enable_auto_resume_break: enableAutoResumeBreak,
        event_mousemove: events.mousemove,
        event_keydown: events.keydown,
        event_scroll: events.scroll,
        event_click: events.click,
        event_touchstart: events.touchstart,
        enable_location_tracking: enableLocationTracking,
        track_on_login: trackOnLogin,
        track_on_logout: trackOnLogout,
        track_on_status_change: trackOnStatusChange,
        tracking_interval_minutes: trackingIntervalMinutes,
        minimum_gps_accuracy: minimumGpsAccuracy,
        location_tracking_target: locationTrackingTarget,
        tracked_employees: trackedEmployees,
      });
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
      // Close after a short delay so user sees the success message
      setTimeout(() => onClose(), 800);
    } catch (error) {
      console.error('Error saving presence settings:', error);
      setSnackbar({ open: true, message: 'Failed to save settings.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isChecked = events.mousemove; // Using mousemove as proxy for unified toggle status

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: (themeVar) => themeVar.customShadows.z24,
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            Daily Status Settings
          </Typography>
          <IconButton onClick={onClose} sx={{ color: (t) => t.palette.grey[500] }}>
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, flexGrow: 1, overflowY: 'auto', mt: 2 }}>

          {loading ? (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading settings...</Typography>
            </Box>
          ) : (
            <Stack spacing={3.5}>
              {/* Enable Auto Status Toggle */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: '#f4f6f896',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Enable Auto Status
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Automatically switch users to &apos;Break&apos; or &apos;Lunch Break&apos; after inactivity.
                  </Typography>
                </Stack>
                <CustomSwitch
                  checked={enableAutoStatus}
                  onChange={(e) => setEnableAutoStatus(e.target.checked)}
                  disabled={loading}
                />
              </Box>

              {/* Threshold Fields Grid & Auto Resume Toggle (Only when Enable Auto Status is ON) */}
              {enableAutoStatus && (
                <>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: '#f4f6f896',
                      border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 800 }}>
                        Inactivity Thresholds
                      </Typography>
                      <Select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as any)}
                        size="small"
                        sx={{
                          typography: 'caption',
                          fontWeight: 700,
                          minWidth: 100,
                          bgcolor: 'background.paper',
                        }}
                      >
                        <MenuItem value="sec">Seconds</MenuItem>
                        <MenuItem value="min">Minutes</MenuItem>
                      </Select>
                    </Stack>

                    <Stack spacing={2}>
                      {(() => {
                        const multiplier = unit === 'min' ? 60 : 1;
                        return (
                          <>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <TextField
                                fullWidth
                                label="Idle Threshold"
                                type="number"
                                value={idleThreshold === 0 ? '' : parseFloat((idleThreshold / multiplier).toFixed(2))}
                                onChange={(e) => setIdleThreshold(e.target.value === '' ? 0 : Number(e.target.value) * multiplier)}
                                onFocus={(event) => event.target.select()}
                                helperText="System detects inactivity"
                                disabled={loading}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                        {unit === 'min' ? 'mins' : 'secs'}
                                      </Typography>
                                    </InputAdornment>
                                  ),
                                }}
                              />
                              <TextField
                                fullWidth
                                label="Break Threshold"
                                type="number"
                                value={awayThreshold === 0 ? '' : parseFloat((awayThreshold / multiplier).toFixed(2))}
                                onChange={(e) => setAwayThreshold(e.target.value === '' ? 0 : Number(e.target.value) * multiplier)}
                                onFocus={(event) => event.target.select()}
                                helperText="Transitions to Break status"
                                disabled={loading}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                        {unit === 'min' ? 'mins' : 'secs'}
                                      </Typography>
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Stack>
                            <TextField
                              fullWidth
                              label="Lunch Break Threshold"
                              type="number"
                              value={breakThreshold === 0 ? '' : parseFloat((breakThreshold / multiplier).toFixed(2))}
                              onChange={(e) => setBreakThreshold(e.target.value === '' ? 0 : Number(e.target.value) * multiplier)}
                              onFocus={(event) => event.target.select()}
                              helperText="Transitions to Lunch Break status"
                              disabled={loading}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                      {unit === 'min' ? 'mins' : 'secs'}
                                    </Typography>
                                  </InputAdornment>
                                ),
                              }}
                            />
                            <TextField
                              fullWidth
                              label="Auto-Offline Threshold"
                              type="number"
                              value={offlineThreshold === 0 ? '' : parseFloat((offlineThreshold / multiplier).toFixed(2))}
                              onChange={(e) => setOfflineThreshold(e.target.value === '' ? 0 : Number(e.target.value) * multiplier)}
                              onFocus={(event) => event.target.select()}
                              error={offlineThreshold <= breakThreshold}
                              helperText={offlineThreshold <= breakThreshold ? "Offline time must be greater than Break time" : "Automatically log out inactive users"}
                              disabled={loading}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                      {unit === 'min' ? 'mins' : 'secs'}
                                    </Typography>
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </>
                        );
                      })()}
                    </Stack>
                  </Box>

                  {/* Auto Resume Toggle */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: '#f4f6f896',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Auto-resume from Lunch Break
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        If off, users must click &apos;Return&apos; manually after a Lunch Break.
                      </Typography>
                    </Stack>
                    <CustomSwitch
                      checked={enableAutoResumeBreak}
                      onChange={(e) => setEnableAutoResumeBreak(e.target.checked)}
                      disabled={loading}
                    />
                  </Box>
                  {/* Activity Detectors Section */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Activity Detectors
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: {
                          xs: 'repeat(2, 1fr)',
                          sm: 'repeat(3, 1fr)',
                        },
                      }}
                    >
                      {[
                        { id: 'mousemove', label: 'Mouse', icon: 'ph:mouse-bold' },
                        { id: 'keydown', label: 'Keyboard', icon: 'ph:keyboard-bold' },
                        { id: 'scroll', label: 'Scrolling', icon: 'ph:scroll-bold' },
                        { id: 'click', label: 'Clicks', icon: 'ph:cursor-click-bold' },
                        { id: 'touchstart', label: 'Touch', icon: 'ph:hand-tap-bold' },
                      ].map((item) => {
                        const isActive = events[item.id as keyof typeof events];

                        return (
                          <Box
                            key={item.id}
                            onClick={() => {
                              if (loading) return;
                              const nextValue = !isActive;
                              setEvents({
                                mousemove: nextValue,
                                keydown: nextValue,
                                scroll: nextValue,
                                click: nextValue,
                                touchstart: nextValue,
                              });
                            }}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              cursor: loading ? 'default' : 'pointer',
                              border: '1px solid',
                              borderColor: isActive ? 'primary.main' : 'divider',
                              bgcolor: isActive ? alpha(theme.palette.primary.main, 0.04) : '#f4f6f896',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              transition: theme.transitions.create(['all']),
                              '&:hover': {
                                borderColor: isActive ? 'primary.main' : 'text.disabled',
                                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.grey[500], 0.04),
                              }
                            }}
                          >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pointerEvents: 'none' }}>
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: isActive ? 'primary.main' : 'background.paper',
                                  color: isActive ? 'common.white' : 'text.secondary',
                                  boxShadow: theme.customShadows.z1,
                                }}
                              >
                                <Iconify icon={item.icon as any} width={20} />
                              </Box>
                              <CustomSwitch
                                checked={isActive}
                                disabled={loading}
                              />
                            </Stack>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {item.label}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </>
              )}

              {/* Location Tracking Section */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: '#f4f6f896',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Enable Location Tracking
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Track geographical locations of employee activity triggers.
                    </Typography>
                  </Stack>
                  <CustomSwitch
                    checked={enableLocationTracking}
                    onChange={(e) => setEnableLocationTracking(e.target.checked)}
                    disabled={loading}
                  />
                </Stack>

                {enableLocationTracking && (
                  <Stack spacing={2.5} sx={{ mt: 3, pt: 2.5, borderTop: `1px dashed ${theme.palette.divider}` }}>
                    {/* Location Tracking Scope Selection */}
                    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.paper', border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}` }}>
                      <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.5, fontWeight: 700, fontSize: 14 }}>
                        Location Tracking Scope
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                        Choose whether location tracking applies globally to all staff or only selected employees.
                      </Typography>
                      <Stack direction="row" spacing={1.5} sx={{ mb: locationTrackingTarget === 'Selected Employees' ? 2 : 0 }}>
                        {[
                          { value: 'All Employees', label: 'All Employees' },
                          { value: 'Selected Employees', label: 'Selected Employees Only' },
                        ].map((target) => {
                          const isSelected = locationTrackingTarget === target.value;
                          return (
                            <Button
                              key={target.value}
                              size="small"
                              onClick={() => setLocationTrackingTarget(target.value as any)}
                              sx={{
                                borderRadius: 1.25,
                                px: 1.75,
                                py: 0.5,
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: isSelected ? '#059669' : 'transparent',
                                color: isSelected ? '#ffffff' : '#059669',
                                border: '1px solid #059669',
                                boxShadow: isSelected ? '0px 2px 6px rgba(8, 163, 205, 0.2)' : 'none',
                                '&:hover': {
                                  bgcolor: isSelected ? '#068aa8' : alpha('#059669', 0.08),
                                  borderColor: '#059669',
                                },
                              }}
                            >
                              {target.label}
                            </Button>
                          );
                        })}
                      </Stack>

                      {locationTrackingTarget === 'Selected Employees' && (
                        <Box sx={{ mt: 3 }}>
                          <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={employeeOptions}
                            getOptionLabel={(option) => `${option.employee_name} (${option.name})`}
                            value={employeeOptions.filter((opt) => trackedEmployees.includes(opt.name))}
                            onChange={(_, newValue) => {
                              setTrackedEmployees(newValue.map((item) => item.name));
                            }}
                            renderOption={(props, option, { selected }) => {
                              const { key, ...otherProps } = props as any;
                              return (
                                <Box
                                  component="li"
                                  key={key || option.name}
                                  {...otherProps}
                                  sx={{
                                    py: 1.25,
                                    px: 2,
                                    borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center !important',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    bgcolor: selected ? alpha('#1877F2', 0.08) : 'transparent',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                      {option.employee_name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}>
                                      ID: {option.name}
                                    </Typography>
                                  </Box>

                                  {selected && (
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#1877F2',
                                        ml: 1.5,
                                      }}
                                    >
                                      <Iconify icon="solar:check-circle-bold" width={22} />
                                    </Box>
                                  )}
                                </Box>
                              );
                            }}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  {...getTagProps({ index })}
                                  key={option.name}
                                  label={`${option.employee_name} (${option.name})`}
                                  size="small"
                                  sx={{
                                    borderRadius: 1,
                                    fontWeight: 600,
                                    bgcolor: '#059669',
                                    color: '#ffffff',
                                    '& .MuiChip-deleteIcon': {
                                      color: 'rgba(255, 255, 255, 0.7)',
                                      '&:hover': { color: '#ffffff' },
                                    },
                                  }}
                                />
                              ))
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Select Employees to Track"
                                placeholder="Search by name or employee ID..."
                                helperText="Location updates will ONLY be recorded for these selected employees."
                              />
                            )}
                          />
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: 'text.primary', mb: 2, fontWeight: 600 }}
                      >
                        Tracking Triggers & Constraints
                      </Typography>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(3, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        {[
                          {
                            label: 'On Login',
                            checked: trackOnLogin,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                              setTrackOnLogin(e.target.checked),
                          },
                          {
                            label: 'On Logout',
                            checked: trackOnLogout,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                              setTrackOnLogout(e.target.checked),
                          },
                          {
                            label: 'Status Change',
                            checked: trackOnStatusChange,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                              setTrackOnStatusChange(e.target.checked),
                          },
                        ].map((item) => (
                          <Box
                            key={item.label}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              px: 1.5,
                              py: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.label}
                            </Typography>

                            <CustomSwitch
                              checked={item.checked}
                              onChange={item.onChange}
                              disabled={loading}
                            />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Auto-Tracking Interval"
                        type="number"
                        value={trackingIntervalMinutes === 0 ? '' : trackingIntervalMinutes}
                        onChange={(e) => setTrackingIntervalMinutes(e.target.value === '' ? 0 : Number(e.target.value))}
                        helperText="Minutes between updates"
                        disabled={loading}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                mins
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Min GPS Accuracy"
                        type="number"
                        value={minimumGpsAccuracy === 0 ? '' : minimumGpsAccuracy}
                        onChange={(e) => setMinimumGpsAccuracy(e.target.value === '' ? 0 : Number(e.target.value))}
                        helperText="Filter out poor GPS signals"
                        disabled={loading}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                meters
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Stack>
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            loading={saving}
            disabled={loading || offlineThreshold <= breakThreshold || breakThreshold <= awayThreshold || awayThreshold <= idleThreshold}
            sx={{
              fontWeight: 700,
              bgcolor: '#059669',
              color: '#ffffff',
              boxShadow: '0px 4px 10px rgba(8, 163, 205, 0.24)',
              '&:hover': {
                bgcolor: '#068aa8',
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: theme.zIndex.modal + 1 }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
