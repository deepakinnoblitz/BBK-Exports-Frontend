import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

import { saveRemainder } from 'src/api/reminders';


// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  reminder?: any;
};

const TYPE_OPTIONS = [
  { value: 'Break', label: 'Break' },
  { value: 'Task', label: 'Task' },
  { value: 'Custom', label: 'Custom' },
];

const REPEAT_OPTIONS = ['Single', 'Daily', 'Weekly'];

const DAY_OPTIONS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function ReminderDialog({ open, onClose, onSuccess, onError, reminder }: Props) {
  const theme = useTheme();
  const isSubmitting = useBoolean();
  const [type, setType] = useState('Task');
  const [repeat, setRepeat] = useState('Single');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState<Dayjs | null>(dayjs().add(15, 'minute'));
  const [day, setDay] = useState('Monday');

  useEffect(() => {
    if (reminder) {
      setType(reminder.type || 'Task');
      setRepeat(reminder.repeat || 'Single');
      setMessage(reminder.message || '');
      setDate(reminder.date ? dayjs(reminder.date) : dayjs());
      setTime(reminder.time ? dayjs(`2000-01-01 ${reminder.time}`) : dayjs().add(15, 'minute'));
      setDay(reminder.day || 'Monday');
    } else {
      // Reset to defaults for new reminder
      setType('Task');
      setRepeat('Single');
      setMessage('');
      setDate(dayjs());
      setTime(dayjs().add(15, 'minute'));
      setDay('Monday');
    }
  }, [reminder, open]);

  const handleSave = async () => {
    if (!time) {
      onError?.('Please select a time');
      return;
    }

    if (repeat === 'Single' && !date) {
      onError?.('Please select a date');
      return;
    }

    try {
      isSubmitting.onTrue();

      const payload = {
        name: reminder?.name,
        type,
        repeat,
        message,
        date: repeat === 'Single' ? date?.format('YYYY-MM-DD') : null,
        time: time?.format('HH:mm:ss'),
        day: repeat === 'Weekly' ? day : null,
        status: 'Active',
      };

      await saveRemainder(payload);
      onSuccess?.(reminder ? 'Reminder updated successfully!' : 'Reminder set successfully!');
      onClose();
      // Reset form
      setMessage('');
    } catch (error: any) {
      console.error(error);
      onError?.(error.message || 'Failed to save reminder');
    } finally {
      isSubmitting.onFalse();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.customShadows.z24,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, my: 2 }}>
          {reminder ? 'Edit Reminder' : 'Set New Reminder'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Reminder Type */}
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
              sx={{ borderRadius: 1.5, fontSize: '15px' }}
            >
              {TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={{ fontSize: '15px' }}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Repeat Selection */}
          <FormControl fullWidth>
            <InputLabel>Repeat</InputLabel>
            <Select
              value={repeat}
              label="Repeat"
              onChange={(e) => setRepeat(e.target.value)}
              sx={{ borderRadius: 1.5, fontSize: '15px' }}
            >
              {REPEAT_OPTIONS.map((option) => (
                <MenuItem key={option} value={option} sx={{ fontSize: '15px' }}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Dynamic Fields based on Repeat */}
          <Stack direction="row" spacing={2}>
            {repeat === 'Single' && (
              <DatePicker
                label="Date"
                value={date}
                onChange={(newValue) => setDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
                disablePast
              />
            )}

            {repeat === 'Weekly' && (
              <FormControl fullWidth>
                <InputLabel>Day</InputLabel>
                <Select
                  value={day}
                  label="Day"
                  onChange={(e) => setDay(e.target.value)}
                  sx={{ borderRadius: 1.5 }}
                >
                  {DAY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TimePicker
              label="Time"
              value={time}
              onChange={(newValue) => setTime(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>

          {/* Message Field */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Message (Optional)"
            placeholder="What should we remind you about?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          loading={isSubmitting.value}
          sx={{
            px: 2,
            fontWeight: 700,
            borderRadius: 1.5,
            boxShadow: theme.customShadows.primary,
          }}
        >
          {reminder ? 'Update Reminder' : 'Create Reminder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
