import type { CanteenEntry } from 'src/api/canteen';

import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
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
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { createCanteenEntry, updateCanteenEntry } from 'src/api/canteen';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const MEAL_TYPES = ['Lunch', 'Breakfast', 'Dinner', 'Snacks', 'Tea'];

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
  editData?: CanteenEntry | null;
  initialEmployee?: string;
  initialDate?: string;
};

export function CanteenDialog({
  open,
  onClose,
  onSuccess,
  editData,
  initialEmployee,
  initialDate,
}: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(editData?.name);

  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [canteenDate, setCanteenDate] = useState<dayjs.Dayjs | null>(null);
  const [mealType, setMealType] = useState('Lunch');
  const [mealCount, setMealCount] = useState<number | string>(1);
  const [status, setStatus] = useState('Availed');
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open]);

  const loadEmployees = async () => {
    try {
      setLoadingData(true);
      const empRes = await getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation']);
      setEmployees(empRes || []);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (editData) {
        setCanteenDate(editData.canteen_date ? dayjs(editData.canteen_date) : null);
        setMealType(editData.meal_type || 'Lunch');
        setMealCount(editData.meal_count !== undefined && editData.meal_count !== null ? editData.meal_count : 1);
        setStatus(editData.status || 'Availed');
        setRemarks(editData.remarks || '');
      } else {
        setCanteenDate(initialDate ? dayjs(initialDate) : dayjs());
        setMealType('Lunch');
        setMealCount(1);
        setStatus('Availed');
        setRemarks('');
      }
      setErrorMessage(null);
    }
  }, [open, editData, initialDate]);

  useEffect(() => {
    if (open) {
      const empId = editData?.employee || initialEmployee;
      if (empId) {
        if (employees.length > 0) {
          const found = employees.find((e) => e.name === empId);
          if (found) {
            setSelectedEmployee(found);
            return;
          }
        }
        setSelectedEmployee({
          name: empId,
          employee_name: editData?.employee_name || empId,
          department: editData?.department,
          designation: editData?.designation,
        });
      } else {
        setSelectedEmployee(null);
      }
    }
  }, [open, employees, editData, initialEmployee]);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!selectedEmployee) {
      setErrorMessage('Please select an employee.');
      return;
    }
    if (!canteenDate || !canteenDate.isValid()) {
      setErrorMessage('Please select a valid date.');
      return;
    }

    const count = typeof mealCount === 'string' ? parseInt(mealCount, 10) : mealCount;
    if (!count || Number.isNaN(count) || count < 1) {
      setErrorMessage('Meal count must be at least 1.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<CanteenEntry> = {
        employee: selectedEmployee.name,
        employee_name: selectedEmployee.employee_name || selectedEmployee.name,
        department: selectedEmployee.department,
        designation: selectedEmployee.designation,
        canteen_date: canteenDate.format('YYYY-MM-DD'),
        meal_type: mealType,
        meal_count: count,
        status: status as any,
        remarks: remarks.trim() || undefined,
        source: isEdit ? editData?.source || 'Manual' : 'Manual',
      };

      if (isEdit && editData?.name) {
        await updateCanteenEntry(editData.name, payload);
        enqueueSnackbar('Canteen entry updated successfully', { variant: 'success' });
      } else {
        await createCanteenEntry(payload);
        enqueueSnackbar('Canteen entry created successfully', { variant: 'success' });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save canteen entry');
      enqueueSnackbar(err.message || 'Failed to save canteen entry', { variant: 'error' });
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
          <Typography variant="h6">{isEdit ? 'Edit Canteen Entry' : 'New Canteen Entry'}</Typography>
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

            {/* Employee Selector */}
            <Autocomplete
              options={employees}
              loading={loadingData}
              disabled={isEdit}
              getOptionLabel={(opt) => (opt ? `${opt.employee_name || opt.name} (${opt.name})` : '')}
              filterOptions={(opts, state) => {
                const input = state.inputValue.toLowerCase().trim();
                if (!input) {
                  return opts.slice(0, 50);
                }
                const terms = input.split(/\s+/).filter(Boolean);
                const filtered = opts.filter((opt) => {
                  const fullName = opt.employee_name || '';
                  const empId = opt.name || '';
                  const combined = `${fullName} ${empId} (${empId})`.toLowerCase();
                  return terms.every((term: string) => combined.includes(term));
                });
                return filtered.slice(0, 50);
              }}
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

            {/* Date Field */}
            <DatePicker
              label="Date"
              format="DD-MM-YYYY"
              value={canteenDate}
              onChange={(val) => setCanteenDate(val)}
              slotProps={{
                textField: {
                  required: true,
                  fullWidth: true,
                  InputLabelProps: { shrink: true },
                  sx: { '& .MuiFormLabel-asterisk': { color: 'red' } },
                },
              }}
            />

            {/* Meal Type & Count in a 2-column grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                fullWidth
                required
                label="Meal Type"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
              >
                {MEAL_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                type="number"
                fullWidth
                required
                label="Meal Count"
                value={mealCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setMealCount('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setMealCount(Number.isNaN(parsed) ? '' : Math.max(1, parsed));
                  }
                }}
                onBlur={() => {
                  if (mealCount === '' || Number(mealCount) < 1) {
                    setMealCount(1);
                  }
                }}
                inputProps={{ min: 1, max: 20 }}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
              />
            </Box>

            {/* Status */}
            <TextField
              select
              fullWidth
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="Availed">Availed</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>

            {/* Description / Remarks */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description / Reason"
              placeholder="Add a brief description (Optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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
            disabled={submitting || loadingData}
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
