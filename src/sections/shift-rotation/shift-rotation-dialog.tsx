import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { alpha } from '@mui/material/styles';

import { getDoctypeList } from 'src/api/leads';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import {
  ShiftRotation,
  createShiftRotation,
  updateShiftRotation,
  getShiftRotationDoc,
  generateRotationAssignments,
} from 'src/api/shift-rotation';

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
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

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

  // Assignees
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  const [generateNow, setGenerateNow] = useState(false);

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
      const [shiftRes, deptRes, empRes] = await Promise.all([
        getDoctypeList('Shift', ['name', 'shift_name', 'start_time', 'end_time']),
        getDoctypeList('Department', ['name', 'department_name']),
        getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation']),
      ]);
      setShifts(shiftRes || []);
      setDepartments(deptRes || []);
      setAllEmployees(empRes || []);
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

      if (doc.assignees && doc.assignees.length > 0) {
        const matched = doc.assignees.map((a) => {
          const found = allEmployees.find((e) => e.name === a.employee);
          return found || { name: a.employee, employee_name: a.employee_name };
        });
        setSelectedEmployees(matched);
      } else {
        setSelectedEmployees([]);
      }
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
    setSelectedEmployees([]);
    setGenerateNow(false);
    setErrorMessage(null);
  };

  const handleAddSequence = () => {
    setSequences((prev) => [...prev, { step_number: prev.length + 1, shift: '' }]);
  };

  const handleRemoveSequence = (idx: number) => {
    if (sequences.length <= 1) return;
    setSequences((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const handleSequenceShiftChange = (idx: number, shiftVal: string) => {
    const shiftObj = shifts.find((s) => s.name === shiftVal);
    setSequences((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, shift: shiftVal, shift_name: shiftObj?.shift_name || shiftVal } : s))
    );
  };

  const handleSubmit = async () => {
    if (!rotationName.trim()) {
      setErrorMessage('Please enter a Rotation Name.');
      return;
    }
    if (!startDate || !startDate.isValid() || !endDate || !endDate.isValid()) {
      setErrorMessage('Please select valid Start and End dates.');
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
        assignees: selectedEmployees.map((e) => ({
          doctype: 'Shift Rotation Assignee',
          employee: e.name,
          employee_name: e.employee_name,
          department: e.department,
          designation: e.designation,
        })),
      };

      if (isEdit && editName) {
        await updateShiftRotation(editName, payload);
      } else {
        await createShiftRotation(payload);
      }

      if (generateNow) {
        await generateRotationAssignments(rotationName.trim());
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
            px: 3,
            py: 2,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            fontWeight: 700,
          }}
        >
          {isEdit ? 'Edit Shift Rotation' : 'New Shift Rotation'}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.disabled',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, px: 4 }}>
          {loadingDoc ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#08a3cd' }} />
            </Box>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
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
                />

                <FormControl fullWidth required>
                  <InputLabel>Rotation Frequency</InputLabel>
                  <Select
                    value={frequency}
                    label="Rotation Frequency"
                    onChange={(e) => setFrequency(e.target.value as any)}
                  >
                    <MenuItem value="Daily">Daily</MenuItem>
                    <MenuItem value="Weekly">Weekly</MenuItem>
                    <MenuItem value="Bi-weekly">Bi-weekly (Fortnightly)</MenuItem>
                    <MenuItem value="Monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>

                <DatePicker
                  label="Start Date *"
                  value={startDate}
                  onChange={(v) => setStartDate(v)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />

                <DatePicker
                  label="End Date *"
                  value={endDate}
                  minDate={startDate || undefined}
                  onChange={(v) => setEndDate(v)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />

                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={department}
                    label="Department"
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <MenuItem value="">All / None</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.name} value={d.name}>
                        {d.department_name || d.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
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
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Shift Sequence Pattern
                  </Typography>

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:add-circle-bold" />}
                    onClick={handleAddSequence}
                    sx={{ borderRadius: 1 }}
                  >
                    Add Step
                  </Button>
                </Stack>

                <Stack spacing={1.5}>
                  {sequences.map((seq, idx) => (
                    <Stack key={idx} direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', width: 65, flexShrink: 0 }}>
                        Step {idx + 1}:
                      </Typography>

                      <FormControl fullWidth size="small" required>
                        <InputLabel>Select Shift</InputLabel>
                        <Select
                          value={seq.shift}
                          label="Select Shift"
                          onChange={(e) => handleSequenceShiftChange(idx, e.target.value)}
                        >
                          {shifts.map((s) => (
                            <MenuItem key={s.name} value={s.name}>
                              {s.shift_name || s.name}{' '}
                              {s.start_time && s.end_time ? `(${String(s.start_time).slice(0, 5)} - ${String(s.end_time).slice(0, 5)})` : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveSequence(idx)}
                        disabled={sequences.length <= 1}
                      >
                        <Iconify icon={"solar:trash-bin-minimalistic-bold" as any} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* Assignees Selector */}
              <Autocomplete
                multiple
                options={allEmployees}
                getOptionLabel={(opt) => `${opt.employee_name || opt.name} (${opt.name})`}
                isOptionEqualToValue={(option, value) => option.name === value.name}
                value={selectedEmployees}
                onChange={(_, val) => setSelectedEmployees(val)}
                renderOption={(props, option, { selected: isSelected }) => (
                  <li {...props} key={option.name}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {option.employee_name || option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                        ID: {option.name}
                      </Typography>
                    </Box>
                    {isSelected && (
                      <Iconify icon={"solar:check-circle-bold" as any} width={20} sx={{ color: 'primary.main', ml: 1 }} />
                    )}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`Assigned Employees (${selectedEmployees.length})`}
                    placeholder="Search and select employees..."
                  />
                )}
              />

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

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={generateNow}
                      onChange={(e) => setGenerateNow(e.target.checked)}
                      color="secondary"
                    />
                  }
                  label="Generate date-wise roster immediately"
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
                placeholder="Optional notes regarding this rotation..."
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || loadingDoc}
            sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
