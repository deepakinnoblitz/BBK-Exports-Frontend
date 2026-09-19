import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { alpha } from '@mui/material/styles';

import { getDoctypeList } from 'src/api/leads';
import { Iconify } from 'src/components/iconify';
import {
  createRosterAssignment,
  updateRosterAssignment,
  checkRosterConflict,
  ShiftRoster,
} from 'src/api/shift-roster';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
  editData?: ShiftRoster | null;
  initialEmployee?: string;
  initialDate?: string;
};

export function ShiftRosterDialog({
  open,
  onClose,
  onSuccess,
  editData,
  initialEmployee,
  initialDate,
}: Props) {
  const isEdit = Boolean(editData?.name);

  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [selectedShift, setSelectedShift] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState<dayjs.Dayjs | null>(null);
  const [effectiveTo, setEffectiveTo] = useState<dayjs.Dayjs | null>(null);
  const [assignmentType, setAssignmentType] = useState('Manual');
  const [status, setStatus] = useState('Active');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadDropdowns();
    }
  }, [open]);

  const loadDropdowns = async () => {
    try {
      setLoadingData(true);
      const [empRes, shiftRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation', 'shift']),
        getDoctypeList('Shift', ['name', 'shift_name', 'start_time', 'end_time']),
      ]);
      setEmployees(empRes || []);
      setShifts(shiftRes || []);
    } catch (err: any) {
      console.error('Failed to load masters:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (editData) {
        setSelectedShift(editData.shift || '');
        setEffectiveFrom(editData.effective_from ? dayjs(editData.effective_from) : null);
        setEffectiveTo(editData.effective_to ? dayjs(editData.effective_to) : null);
        setAssignmentType(editData.assignment_type || 'Manual');
        setStatus(editData.status || 'Active');
        setReason(editData.reason || '');
      } else {
        setSelectedShift('');
        setEffectiveFrom(initialDate ? dayjs(initialDate) : dayjs());
        setEffectiveTo(initialDate ? dayjs(initialDate) : dayjs());
        setAssignmentType('Manual');
        setStatus('Active');
        setReason('');
      }
      setConflictWarning(null);
      setErrorMessage(null);
    }
  }, [open, editData, initialDate]);

  useEffect(() => {
    if (open && employees.length > 0) {
      if (editData?.employee) {
        const found = employees.find((e) => e.name === editData.employee);
        setSelectedEmployee(found || { name: editData.employee, employee_name: editData.employee_name });
      } else if (initialEmployee) {
        const found = employees.find((e) => e.name === initialEmployee);
        setSelectedEmployee(found || null);
      } else if (!isEdit) {
        setSelectedEmployee(null);
      }
    }
  }, [open, employees, editData, initialEmployee, isEdit]);

  // Check conflicts dynamically
  useEffect(() => {
    const checkConflicts = async () => {
      if (selectedEmployee?.name && effectiveFrom?.isValid()) {
        try {
          const fromStr = effectiveFrom.format('YYYY-MM-DD');
          const toStr = effectiveTo?.isValid() ? effectiveTo.format('YYYY-MM-DD') : fromStr;
          const conflicts = await checkRosterConflict(
            selectedEmployee.name,
            fromStr,
            toStr,
            editData?.name
          );
          if (conflicts && conflicts.length > 0) {
            setConflictWarning(
              `Conflict detected with ${conflicts.length} existing active assignment(s). Choose "Override" assignment type if you want to replace it.`
            );
          } else {
            setConflictWarning(null);
          }
        } catch (e) {
          // ignore
        }
      } else {
        setConflictWarning(null);
      }
    };

    if (open && !isEdit) {
      checkConflicts();
    }
  }, [selectedEmployee, effectiveFrom, effectiveTo, open, isEdit, editData]);

  const handleSubmit = async () => {
    if (!selectedEmployee?.name) {
      setErrorMessage('Please select an Employee.');
      return;
    }
    if (!selectedShift) {
      setErrorMessage('Please select a Shift.');
      return;
    }
    if (!effectiveFrom || !effectiveFrom.isValid()) {
      setErrorMessage('Please select an Effective From date.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        employee: selectedEmployee.name,
        shift: selectedShift,
        effective_from: effectiveFrom.format('YYYY-MM-DD'),
        effective_to: effectiveTo?.isValid() ? effectiveTo.format('YYYY-MM-DD') : effectiveFrom.format('YYYY-MM-DD'),
        assignment_type: assignmentType as any,
        status: status as any,
        reason,
      };

      if (isEdit && editData?.name) {
        await updateRosterAssignment(editData.name, payload);
      } else {
        await createRosterAssignment(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save shift assignment');
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
        maxWidth="sm"
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
              <Iconify icon={isEdit ? 'solar:pen-bold' : 'solar:calendar-add-bold'} width={20} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {isEdit ? 'Edit Shift Assignment' : 'Assign Employee Shift'}
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
          <Stack spacing={2.5}>
            {errorMessage && (
              <Alert severity="error" onClose={() => setErrorMessage(null)}>
                {errorMessage}
              </Alert>
            )}

            {conflictWarning && (
              <Alert severity="warning">
                {conflictWarning}
              </Alert>
            )}

            {/* Employee Selector */}
            <Autocomplete
              options={employees}
              loading={loadingData}
              disabled={isEdit}
              getOptionLabel={(opt) => `${opt.employee_name || opt.name} (${opt.name})`}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              value={selectedEmployee}
              onChange={(_, val) => setSelectedEmployee(val)}
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
                  label="Employee *"
                  placeholder="Select Employee..."
                  sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                />
              )}
            />

            {/* Shift Master Selector */}
            <FormControl fullWidth sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
              <InputLabel>Shift *</InputLabel>
              <Select
                value={selectedShift}
                label="Shift *"
                onChange={(e) => setSelectedShift(e.target.value)}
              >
                {shifts.map((s) => (
                  <MenuItem key={s.name} value={s.name}>
                    {s.shift_name || s.name}{' '}
                    {s.start_time && s.end_time ? `(${String(s.start_time).slice(0, 5)} - ${String(s.end_time).slice(0, 5)})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date Range Fields */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label="Effective From *"
                value={effectiveFrom}
                onChange={(val) => {
                  setEffectiveFrom(val);
                  if (!effectiveTo || effectiveTo.isBefore(val)) {
                    setEffectiveTo(val);
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: { '& .MuiFormLabel-asterisk': { color: 'red' } },
                  },
                }}
              />

              <DatePicker
                label="Effective To"
                value={effectiveTo}
                minDate={effectiveFrom || undefined}
                onChange={(val) => setEffectiveTo(val)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Leave same for single date assignment',
                  },
                }}
              />
            </Stack>

            {/* Assignment Type & Status */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Assignment Type</InputLabel>
                <Select
                  value={assignmentType}
                  label="Assignment Type"
                  onChange={(e) => setAssignmentType(e.target.value)}
                >
                  <MenuItem value="Manual">Manual</MenuItem>
                  <MenuItem value="Bulk">Bulk</MenuItem>
                  <MenuItem value="Rotation">Rotation</MenuItem>
                  <MenuItem value="Override">Override (Replace Conflicts)</MenuItem>
                  <MenuItem value="Shift Change">Shift Change</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Reason */}
            <TextField
              label="Reason / Notes"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={2}
              placeholder="e.g. Project deployment weekend support, rotational coverage..."
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Iconify icon={isEdit ? 'solar:pen-bold' : 'solar:check-circle-bold'} />}
          >
            {isEdit ? 'Save Changes' : 'Assign Shift'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
