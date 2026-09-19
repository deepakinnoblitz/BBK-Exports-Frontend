import type {
  ShiftRoster} from 'src/api/shift-roster';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getDoctypeList } from 'src/api/leads';
import {
  checkRosterConflict,
  createRosterAssignment,
  updateRosterAssignment
} from 'src/api/shift-roster';

import { Iconify } from 'src/components/iconify';

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
        } catch {
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
          },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{isEdit ? 'Edit Shift Assignment' : 'New Shift Assignment'}</Typography>
          <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3} sx={{ py: 2 }}>
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
              getOptionLabel={(opt) => (opt ? opt.employee_name || opt.name : '')}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
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
                  required
                  label="Employee"
                  placeholder="Select Employee..."
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                />
              )}
            />

            {/* Shift Master Selector */}
            <FormControl fullWidth required sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
              <InputLabel shrink>Shift</InputLabel>
              <Select
                value={selectedShift}
                label="Shift"
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
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <DatePicker
                label="Effective From"
                value={effectiveFrom}
                onChange={(val) => {
                  setEffectiveFrom(val);
                  if (!effectiveTo || effectiveTo.isBefore(val)) {
                    setEffectiveTo(val);
                  }
                }}
                slotProps={{
                  textField: {
                    required: true,
                    fullWidth: true,
                    InputLabelProps: { shrink: true },
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
                    InputLabelProps: { shrink: true },
                    helperText: 'Leave same for single date assignment',
                  },
                }}
              />
            </Box>

            {/* Assignment Type & Status */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel shrink>Assignment Type</InputLabel>
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
                <InputLabel shrink>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Description / Reason */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description / Reason"
              placeholder="Add a brief description (Optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleSubmit}
            variant="contained"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ bgcolor: '#08a3cd', '&:hover': { bgcolor: '#068fb3' } }}
          >
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
