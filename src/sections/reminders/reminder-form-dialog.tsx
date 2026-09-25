import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { saveHRRemainder } from 'src/api/reminders';
import { getForValueOptions } from 'src/api/user-permissions';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from './reminders-settings-view';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
  selectedReminder?: any;
};

export function HRReminderFormDialog({ open, onClose, onSuccess, selectedReminder }: Props) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
 
  const [message, setMessage] = useState('');
  const [triggerTime, setTriggerTime] = useState<dayjs.Dayjs | null>(dayjs().second(0).millisecond(0));
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
 
  useEffect(() => {
    if (selectedReminder) {
      setMessage(selectedReminder.message || '');
      setTriggerTime(selectedReminder.trigger_time ? dayjs(selectedReminder.trigger_time, 'HH:mm:ss') : dayjs());
      setIsGlobal(!!selectedReminder.is_global);
      setSelectedEmployees(selectedReminder.selected_employees?.map((e: any) => ({ 
        name: e.id, 
        employee_name: e.name 
      })) || []);
    } else {
      setMessage('');
      setTriggerTime(dayjs().second(0).millisecond(0));
      setIsGlobal(true);
      setSelectedEmployees([]);
    }
    setErrors({});
  }, [selectedReminder, open]);
 
  useEffect(() => {
    if (open) {
      getForValueOptions('Employee')
        .then(setEmployees)
        .catch(console.error);
    }
  }, [open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!message.trim()) newErrors.message = 'Message is required';
    if (!triggerTime) newErrors.trigger_time = 'Trigger time is required';
    if (!isGlobal && selectedEmployees.length === 0) {
      newErrors.employees = 'Select at least one employee if not global';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
 
  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: selectedReminder?.name,
        message,
        trigger_time: triggerTime?.second(0).format('HH:mm:ss'),
        is_global: isGlobal ? 1 : 0,
        selected_employees: isGlobal ? [] : selectedEmployees.map((e) => ({ employee: e.name })),
      };
 
      await saveHRRemainder(payload);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2, boxShadow: (themeVar) => themeVar.customShadows.z24, } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {selectedReminder ? 'Edit Reminder' : 'New Reminder'}
        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>
 
      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Reminder Message"
              placeholder="Enter message to send to employees..."
              multiline
              rows={3}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) setErrors({ ...errors, message: '' });
              }}
              required
              error={!!errors.message}
              helperText={errors.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                },
              }}
            />
 
            <TimePicker
              label="Trigger Time"
              value={triggerTime}
              onChange={(newValue: any) => {
                setTriggerTime(newValue);
                if (errors.trigger_time) setErrors({ ...errors, trigger_time: '' });
              }}
              slotProps={{ 
                textField: { 
                  fullWidth: true, 
                  required: true,
                  error: !!errors.trigger_time,
                  helperText: errors.trigger_time,
                  sx: { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }
                } 
              }}
            />
 
            <FormControlLabel
              control={
                <CustomSwitch 
                  checked={isGlobal} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setIsGlobal(e.target.checked);
                    if (e.target.checked && errors.employees) setErrors({ ...errors, employees: '' });
                  }} 
                />
              }
              label="Send to All Active Employees"
              sx={{ '& .MuiFormControlLabel-label': { ml: 1 } }}
            />
 
            {!isGlobal && (
              <Autocomplete
                multiple
                fullWidth
                options={employees}
                getOptionLabel={(option) => `${option.employee_name} (${option.name})`}
                value={selectedEmployees}
                onChange={(_, newValue) => {
                  setSelectedEmployees(newValue);
                  if (newValue.length > 0 && errors.employees) setErrors({ ...errors, employees: '' });
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select Employees" 
                    placeholder="Search employees..." 
                    required={!isGlobal}
                    error={!!errors.employees}
                    helperText={errors.employees}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props as any;
                  return (
                    <li key={key} {...optionProps}>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {option.employee_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          ID: {option.name}
                        </Typography>
                      </Stack>
                    </li>
                  );
                }}
              />
            )}
          </Stack>
        </LocalizationProvider>
      </DialogContent>
 
      <DialogActions>
        <LoadingButton
          variant="contained"
          onClick={handleSave}
          loading={loading}
          sx={{ bgcolor: '#00A5D1', '&:hover': { bgcolor: '#0084a7' } }}
        >
          {selectedReminder ? 'Update' : 'Submit'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
