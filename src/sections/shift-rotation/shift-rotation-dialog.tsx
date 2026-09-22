import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import {
  getShiftRotationDoc,
  createShiftRotation,
  updateShiftRotation,
} from 'src/api/shift-rotation';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
  editName?: string | null;
};

export function ShiftRotationDialog({ open, onClose, onSuccess, editName }: Props) {
  const isEdit = Boolean(editName);

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Masters
  const [shifts, setShifts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Form fields
  const [rotationName, setRotationName] = useState('');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly'>('Weekly');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs().add(30, 'day'));
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [excludeWeeklyOffs, setExcludeWeeklyOffs] = useState(true);
  const [description, setDescription] = useState('');

  // Sequence table
  const [sequences, setSequences] = useState<{ step_number: number; shift: string; shift_name?: string }[]>([
    { step_number: 1, shift: '' },
    { step_number: 2, shift: '' },
  ]);

  useEffect(() => {
    if (open) {
      loadMasters();
      if (editName) {
        loadDoc(editName);
      } else {
        resetForm();
      }
    }
  }, [open, editName]);

  const loadMasters = async () => {
    try {
      const [shiftRes, deptRes] = await Promise.all([
        getDoctypeList('Shift', ['name', 'shift_name', 'start_time', 'end_time']),
        getDoctypeList('Department', ['name', 'department_name']),
      ]);
      setShifts(shiftRes || []);
      setDepartments(deptRes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDoc = async (name: string) => {
    try {
      setLoadingDoc(true);
      const doc = await getShiftRotationDoc(name);
      setRotationName(doc.rotation_name);
      setFrequency(doc.frequency);
      setStatus(doc.status);
      setDepartment(doc.department || '');
      setStartDate(doc.start_date ? dayjs(doc.start_date) : null);
      setEndDate(doc.end_date ? dayjs(doc.end_date) : null);
      setExcludeHolidays(Boolean(doc.exclude_holidays));
      setExcludeWeeklyOffs(Boolean(doc.exclude_weekly_offs));
      setDescription(doc.description || '');

      setSequences(
        doc.sequences && doc.sequences.length > 0
          ? doc.sequences.map((s, idx) => ({ step_number: s.step_number || idx + 1, shift: s.shift, shift_name: s.shift_name }))
          : [{ step_number: 1, shift: '' }]
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load rotation details');
    } finally {
      setLoadingDoc(false);
    }
  };

  const resetForm = () => {
    setRotationName('');
    setFrequency('Weekly');
    setStatus('Active');
    setDepartment('');
    setStartDate(dayjs());
    setEndDate(dayjs().add(30, 'day'));
    setExcludeHolidays(true);
    setExcludeWeeklyOffs(true);
    setDescription('');
    setSequences([
      { step_number: 1, shift: '' },
      { step_number: 2, shift: '' },
    ]);
    setErrorMessage(null);
  };

  const handleAddSequence = () => {
    setSequences((prev) => [...prev, { step_number: prev.length + 1, shift: '' }]);
  };

  const handleRemoveSequence = (index: number) => {
    if (sequences.length <= 1) return;
    setSequences((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((item, idx) => ({ ...item, step_number: idx + 1 }));
    });
  };

  const handleSequenceShiftChange = (index: number, shiftValue: string) => {
    const selected = shifts.find((s) => s.name === shiftValue);
    setSequences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              shift: shiftValue,
              shift_name: selected?.shift_name || shiftValue,
            }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!rotationName.trim()) {
      setErrorMessage('Rotation Name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Start Date and End Date are required.');
      return;
    }
    if (endDate.isBefore(startDate)) {
      setErrorMessage('End Date cannot be earlier than Start Date.');
      return;
    }
    if (sequences.some((s) => !s.shift)) {
      setErrorMessage('Please choose a shift for each sequence step.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        rotation_name: rotationName.trim(),
        frequency,
        status,
        department: department || undefined,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        exclude_holidays: excludeHolidays ? 1 : 0,
        exclude_weekly_offs: excludeWeeklyOffs ? 1 : 0,
        description,
        sequences: sequences.map((s, idx) => ({
          doctype: 'Shift Rotation Sequence',
          step_number: idx + 1,
          shift: s.shift,
          shift_name: s.shift_name,
        })),
      };

      if (isEdit && editName) {
        await updateShiftRotation(editName, payload);
      } else {
        await createShiftRotation(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save Shift Rotation');
    } finally {
      setSubmitting(false);
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
            boxShadow: (themeVar: any) => themeVar.customShadows?.z24,
          },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            px: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6">{isEdit ? 'Edit Shift Rotation' : 'New Shift Rotation'}</Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'text.disabled',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {loadingDoc ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#08a3cd' }} />
            </Box>
          ) : (
            <Stack spacing={3} sx={{ py: 1 }}>
              {errorMessage && (
                <Alert severity="error" onClose={() => setErrorMessage(null)}>
                  {errorMessage}
                </Alert>
              )}

              {/* Main Form Fields Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                }}
              >
                <TextField
                  fullWidth
                  required
                  label="Rotation Name"
                  value={rotationName}
                  onChange={(e) => setRotationName(e.target.value)}
                  placeholder="e.g. Production Weekly Shift Rotation"
                  disabled={isEdit}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                />

                <TextField
                  select
                  fullWidth
                  required
                  label="Rotation Frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                >
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="Bi-weekly">Bi-weekly (Fortnightly)</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                </TextField>

                <DatePicker
                  label="Start Date"
                  format="DD-MM-YYYY"
                  value={startDate}
                  onChange={(v) => setStartDate(v)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputLabelProps: { shrink: true },
                      sx: { '& .MuiFormLabel-asterisk': { color: 'red' } },
                    },
                  }}
                />

                <DatePicker
                  label="End Date"
                  format="DD-MM-YYYY"
                  value={endDate}
                  minDate={startDate || undefined}
                  onChange={(v) => setEndDate(v)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputLabelProps: { shrink: true },
                      sx: { '& .MuiFormLabel-asterisk': { color: 'red' } },
                    },
                  }}
                />

                <TextField
                  select
                  fullWidth
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="">All / None</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.name} value={d.name}>
                      {d.department_name || d.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Box>

              {/* Shift Sequence Pattern */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 1.5,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.neutral',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Shift Sequence Pattern
                  </Typography>

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:add-circle-bold" />}
                    onClick={handleAddSequence}
                    sx={{
                      borderRadius: 1,
                      color: '#08a3cd',
                      borderColor: '#08a3cd',
                      '&:hover': {
                        borderColor: '#068fb3',
                        bgcolor: 'rgba(8, 163, 205, 0.08)',
                      },
                    }}
                  >
                    Add Step
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  {sequences.map((seq, idx) => (
                    <Stack key={idx} direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', width: 65, flexShrink: 0 }}>
                        Step {idx + 1}:
                      </Typography>

                      <TextField
                        select
                        fullWidth
                        size="small"
                        required
                        label="Select Shift"
                        value={seq.shift}
                        onChange={(e) => handleSequenceShiftChange(idx, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          '& .MuiFormLabel-asterisk': { color: 'red' },
                        }}
                      >
                        {shifts.map((s) => (
                          <MenuItem key={s.name} value={s.name}>
                            {s.shift_name || s.name}{' '}
                            {s.start_time && s.end_time ? `(${String(s.start_time).slice(0, 5)} - ${String(s.end_time).slice(0, 5)})` : ''}
                          </MenuItem>
                        ))}
                      </TextField>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveSequence(idx)}
                        disabled={sequences.length <= 1}
                        sx={{
                          color: sequences.length <= 1 ? 'text.disabled' : '#ff5630',
                          '&:hover': { bgcolor: 'rgba(255, 86, 48, 0.08)' },
                        }}
                      >
                        <Iconify icon={"solar:trash-bin-minimalistic-bold" as any} width={20} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* Exclusion Options */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeWeeklyOffs}
                      onChange={(e) => setExcludeWeeklyOffs(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Exclude Weekly Offs"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeHolidays}
                      onChange={(e) => setExcludeHolidays(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Exclude Holidays"
                />
              </Stack>

              {/* Description */}
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                placeholder="Optional notes regarding this rotation pattern..."
                InputLabelProps={{ shrink: true }}
              />

              <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                <b>Rotation Pattern:</b> This template defines the shift sequence. To assign employees and generate date-wise shift schedules, use the <b>Generate Roster</b> action.
              </Alert>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, px: 3, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || loadingDoc}
            sx={{
              bgcolor: COMMON_COLORS.primaryButton.bg,
              color: 'common.white',
              '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
              px: 3,
            }}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
