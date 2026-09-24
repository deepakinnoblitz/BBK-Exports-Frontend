import type { LineRoster } from 'src/api/line-roster';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import {
  checkLineRosterConflict,
  createLineRosterAssignment,
  updateLineRosterAssignment,
} from 'src/api/line-roster';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const filterEmployees = createFilterOptions<any>({
  stringify: (opt) => `${opt.employee_name || ''} ${opt.name || ''} ${opt.line_order || ''}`,
});

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
  editData?: LineRoster | null;
  initialEmployee?: string;
  initialDate?: string;
};

export function LineRosterDialog({
  open,
  onClose,
  onSuccess,
  editData,
  initialEmployee,
  initialDate,
}: Props) {
  const isEdit = Boolean(editData?.name);

  const [employees, setEmployees] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [selectedLine, setSelectedLine] = useState('');
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
      const [empRes, lineRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation', 'line_order']),
        getDoctypeList('Line Order', ['name', 'line_name', 'description']),
      ]);
      setEmployees(empRes || []);
      setLines(lineRes || []);
    } catch (err: any) {
      console.error('Failed to load masters:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (editData) {
        setSelectedLine(editData.line_order || '');
        setEffectiveFrom(editData.effective_from ? dayjs(editData.effective_from) : null);
        setEffectiveTo(editData.effective_to ? dayjs(editData.effective_to) : null);
        setAssignmentType(editData.assignment_type || 'Manual');
        setStatus(editData.status || 'Active');
        setReason(editData.reason || '');
      } else {
        setSelectedLine('');
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
          const conflicts = await checkLineRosterConflict(
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
    if (!selectedLine) {
      setErrorMessage('Please select a Line.');
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
        line_order: selectedLine,
        effective_from: effectiveFrom.format('YYYY-MM-DD'),
        effective_to: effectiveTo?.isValid() ? effectiveTo.format('YYYY-MM-DD') : effectiveFrom.format('YYYY-MM-DD'),
        assignment_type: assignmentType as any,
        status: status as any,
        reason,
      };

      if (isEdit && editData?.name) {
        await updateLineRosterAssignment(editData.name, payload);
      } else {
        await createLineRosterAssignment(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save line assignment');
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
          <Typography variant="h6">{isEdit ? 'Edit Line Assignment' : 'New Line Assignment'}</Typography>
          <IconButton onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
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
              getOptionLabel={(opt) => (opt ? `${opt.employee_name || opt.name} (${opt.name})` : '')}
              filterOptions={filterEmployees}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
              value={selectedEmployee}
              onChange={(_, val) => setSelectedEmployee(val)}
              renderOption={(props, option, { selected: isSelected }) => {
                const lineName = lines.find((l) => l.name === option.line_order)?.line_name || option.line_order;

                return (
                  <li {...props} key={option.name}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {option.employee_name || option.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.25 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                          ID: {option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                          •
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: lineName ? 'text.secondary' : 'text.disabled',
                            fontWeight: 600,
                          }}
                        >
                          LINE: {lineName || '—'}
                        </Typography>
                      </Box>
                    </Box>
                    {isSelected && (
                      <Iconify icon={"solar:check-circle-bold" as any} width={20} sx={{ color: 'primary.main', ml: 1 }} />
                    )}
                  </li>
                );
              }}
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

            {/* Line Master Selector */}
            <Autocomplete
              fullWidth
              options={lines}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.line_name || option.name;
              }}
              value={lines.find((l) => l.name === selectedLine) || null}
              onChange={(_, newValue) => {
                setSelectedLine(newValue ? newValue.name : '');
              }}
              renderOption={(props, option, { selected: isSelected }) => (
                <li {...props} key={option.name}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {option.line_name || option.name}
                    </Typography>
                    {option.description && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {option.description}
                      </Typography>
                    )}
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
                  label="Line"
                  placeholder="Select Line..."
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                />
              )}
            />

            {/* Date Range Fields */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <DatePicker
                label="Effective From"
                format="DD-MM-YYYY"
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
                format="DD-MM-YYYY"
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

            {/* Status */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
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
            sx={{ bgcolor: COMMON_COLORS.primaryButton.bg, '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg } }}
          >
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
