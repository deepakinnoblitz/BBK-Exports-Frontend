import type {
  SwitchProps} from '@mui/material';

import dayjs from 'dayjs';

import { useTheme } from '@mui/material/styles';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Card,
  Stack,
  alpha,
  Switch,
  styled,
  TextField,
  Typography
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// Custom Switch Style matching the photo
export const CustomSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 24,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(18px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: '#1890FF', // The blue from the photo
        opacity: 1,
        border: 0,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 19,
    height: 19,
    boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: '#E5E7EB', // Light Gray
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

type Props = {
  settings: any;
  setSettings: (settings: any) => void;
};

export function RemindersSettingsView({ settings, setSettings }: Props) {
  const theme = useTheme();

  if (!settings) return null;

  const renderIcon = (icon: string, color: string) => (
    <Box
      sx={{
        width: 44,
        height: 44,
        display: 'flex',
        borderRadius: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette[color as 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'].main, 0.08),
        color: `${color}.main`,
      }}
    >
      <Iconify icon={icon as any} width={24} />
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack spacing={3} sx={{ p: 3 }}>

        {/* Global HR Reminders Toggle */}
        <Card sx={{ p: 3, border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}`, bgcolor: (t) => alpha(t.palette.primary.main, 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {renderIcon('solar:notification-lines-remove-bold', 'primary')}

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Enable HR Reminders</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Master toggle to enable or disable all organizational reminders sent by HR.
              </Typography>
            </Box>

            <CustomSwitch
              checked={!!settings.enable_hr_reminders}
              onChange={(e) => setSettings({ ...settings, enable_hr_reminders: e.target.checked ? 1 : 0 })}
            />
          </Stack>
        </Card>

        {/* Break Reminders */}
        <Card sx={{ p: 3, border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}` }}>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" spacing={2}>
              {renderIcon('solar:tea-cup-bold-duotone', 'warning')}

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Break Reminders</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Enable or disable all automated break-related notifications.
                </Typography>
              </Box>
              <CustomSwitch
                checked={!!settings.enable_break_reminders}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setSettings({ 
                    ...settings, 
                    enable_break_reminders: isChecked ? 1 : 0,
                    enable_max_break_reminders: isChecked ? 1 : 0
                  });
                }}
              />
            </Stack>

            {!!settings.enable_break_reminders && (
              <Stack spacing={2.5} sx={{ pl: 7.5 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Max Break Duration Alerts</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Notify employees if their current break exceeds a certain duration.
                    </Typography>
                  </Box>
                  <CustomSwitch
                    size="small"
                    checked={!!settings.enable_max_break_reminders}
                    onChange={(e) => setSettings({ ...settings, enable_max_break_reminders: e.target.checked ? 1 : 0 })}
                  />
                </Stack>

                {!!settings.enable_max_break_reminders && (
                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      label="Max Break Reminder Message"
                      multiline
                      rows={2}
                      value={settings.max_break_reminder_message || ''}
                      onChange={(e) => setSettings({ ...settings, max_break_reminder_message: e.target.value })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                    <Stack direction="row" spacing={2}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Max Break (Minutes)"
                        placeholder="0"
                        value={settings.max_break_duration_threshold || ''}
                        onChange={(e) => setSettings({ ...settings, max_break_duration_threshold: parseFloat(e.target.value) || 0 })}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="Notify Frequency (Mins)"
                        placeholder="0"
                        value={settings.break_reminder_frequency || ''}
                        onChange={(e) => setSettings({ ...settings, break_reminder_frequency: parseInt(e.target.value) || 0 })}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </Stack>
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Card>

        {/* Lunch Reminders */}
        <Card sx={{ p: 3, border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.12)}` }}>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" spacing={2}>
              {renderIcon('solar:chef-hat-bold-duotone', 'info')}

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Lunch Reminders</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Set daily lunch break notifications and manage over-stay alerts.
                </Typography>
              </Box>

              <CustomSwitch
                checked={!!settings.enable_lunch_reminders}
                onChange={(e) => setSettings({ ...settings, enable_lunch_reminders: e.target.checked ? 1 : 0 })}
              />
            </Stack>

            {!!settings.enable_lunch_reminders && (
              <Stack spacing={2.5} sx={{ pl: 7.5 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Lunch Start Reminder</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Send a reminder when lunch break officially begins.
                    </Typography>
                  </Box>
                  <CustomSwitch
                    size="small"
                    checked={!!settings.enable_lunch_start_reminder}
                    onChange={(e) => setSettings({ ...settings, enable_lunch_start_reminder: e.target.checked ? 1 : 0 })}
                  />
                </Stack>

                {!!settings.enable_lunch_start_reminder && (
                  <>
                    <TextField
                      fullWidth
                      label="Lunch Start Reminder Message"
                      multiline
                      rows={2}
                      value={settings.lunch_reminder_message || ''}
                      onChange={(e) => setSettings({ ...settings, lunch_reminder_message: e.target.value })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                    <TimePicker
                      label="Lunch Start Time"
                      value={settings.lunch_start_time ? dayjs(`2026-05-02 ${settings.lunch_start_time}`) : null}
                      onChange={(newValue) => setSettings({ ...settings, lunch_start_time: newValue?.format('HH:mm:ss') })}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }
                        }
                      }}
                    />
                  </>
                )}

                <Box sx={{ borderTop: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}`, pt: 2.5, mt: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Lunch End Reminder</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Send a reminder when lunch break officially ends.
                      </Typography>
                    </Box>
                    <CustomSwitch
                      size="small"
                      checked={!!settings.enable_lunch_end_reminder}
                      onChange={(e) => setSettings({ ...settings, enable_lunch_end_reminder: e.target.checked ? 1 : 0 })}
                    />
                  </Stack>

                  {!!settings.enable_lunch_end_reminder && (
                    <Stack spacing={2.5}>
                      <TextField
                        fullWidth
                        label="Lunch End Reminder Message"
                        multiline
                        rows={2}
                        value={settings.lunch_end_reminder_message || ''}
                        onChange={(e) => setSettings({ ...settings, lunch_end_reminder_message: e.target.value })}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                      <TimePicker
                        label="Lunch End Time"
                        value={settings.lunch_end_time ? dayjs(`2026-05-02 ${settings.lunch_end_time}`) : null}
                        onChange={(newValue) => setSettings({ ...settings, lunch_end_time: newValue?.format('HH:mm:ss') })}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }
                          }
                        }}
                      />
                    </Stack>
                  )}
                </Box>

                <Box sx={{ borderTop: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}`, pt: 2.5, mt: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Max Lunch Duration Alerts</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Notify employees if their lunch break exceeds a certain duration.
                      </Typography>
                    </Box>
                    <CustomSwitch
                      size="small"
                      checked={!!settings.enable_max_lunch_reminders}
                      onChange={(e) => setSettings({ ...settings, enable_max_lunch_reminders: e.target.checked ? 1 : 0 })}
                    />
                  </Stack>

                  {!!settings.enable_max_lunch_reminders && (
                    <Stack spacing={2.5}>
                      <TextField
                        fullWidth
                        label="Max Lunch Reminder Message"
                        multiline
                        rows={2}
                        value={settings.max_lunch_reminder_message || ''}
                        onChange={(e) => setSettings({ ...settings, max_lunch_reminder_message: e.target.value })}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                      <Stack direction="row" spacing={2}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Max Lunch (Minutes)"
                          placeholder="0"
                          value={settings.max_lunch_duration_threshold || ''}
                          onChange={(e) => setSettings({ ...settings, max_lunch_duration_threshold: parseFloat(e.target.value) || 0 })}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                        <TextField
                          fullWidth
                          type="number"
                          label="Notify Frequency (Mins)"
                          placeholder="0"
                          value={settings.lunch_reminder_frequency || ''}
                          onChange={(e) => setSettings({ ...settings, lunch_reminder_frequency: parseInt(e.target.value) || 0 })}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                      </Stack>
                    </Stack>
                  )}
                </Box>
              </Stack>
            )}
          </Stack>
        </Card>

      </Stack>
    </LocalizationProvider>
  );
}
