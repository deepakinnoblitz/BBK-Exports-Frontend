import type { CanteenEntry } from 'src/api/canteen';

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
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { filterEmployeeOptions } from 'src/utils/filter-employees';

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
  const isEdit = Boolean(editData?.name);

  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [canteenDate, setCanteenDate] = useState<dayjs.Dayjs | null>(null);
  const [mealType, setMealType] = useState('Lunch');
  const [mealCount, setMealCount] = useState<number>(1);
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
        setMealCount(editData.meal_count || 1);
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
    if (open && employees.length > 0) {
      const empId = editData?.employee || initialEmployee;
      if (empId) {
        const found = employees.find((e) => e.name === empId);
        if (found) setSelectedEmployee(found);
      } else if (!editData) {
        setSelectedEmployee(null);
      }
    }
  }, [open, employees, editData, initialEmployee]);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!selectedEmployee) {
      setErrorMessage('Please select an employee');
      return;
    }
    if (!canteenDate || !canteenDate.isValid()) {
      setErrorMessage('Please select a valid date');
      return;
    }
    if (!mealCount || mealCount < 1) {
      setErrorMessage('Meal count must be at least 1');
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
        meal_count: Number(mealCount),
        status: status as any,
        remarks: remarks.trim() || undefined,
        source: isEdit ? editData?.source || 'Manual' : 'Manual',
      };

      if (isEdit && editData?.name) {
        await updateCanteenEntry(editData.name, payload);
      } else {
        await createCanteenEntry(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save canteen entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEdit ? 'Edit Canteen Entry' : 'New Canteen Entry'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <Iconify icon="solar:close-circle-bold" width={22} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2.5, pb: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={2.5}>
            {errorMessage && (
              <Alert severity="error" onClose={() => setErrorMessage(null)}>
                {errorMessage}
              </Alert>
            )}

            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                {/* Employee Selector */}
                <Autocomplete
                  options={employees}
                  getOptionLabel={(option) => `${option.employee_name || option.name} (${option.name})`}
                  filterOptions={filterEmployeeOptions}
                  value={selectedEmployee}
                  onChange={(_, newValue) => setSelectedEmployee(newValue)}
                  disabled={isEdit}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Employee *"
                      placeholder="Search employee by name or ID..."
                      helperText={
                        selectedEmployee
                          ? `${selectedEmployee.department || 'No Dept'} • ${selectedEmployee.designation || 'No Designation'}`
                          : 'Select the employee'
                      }
                    />
                  )}
                />

                {/* Date Picker */}
                <DatePicker
                  label="Date *"
                  value={canteenDate}
                  onChange={(val) => setCanteenDate(val)}
                  format="DD-MMM-YYYY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />

                {/* Meal Type & Count */}
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label="Meal Type *"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
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
                    label="Meal Count *"
                    value={mealCount}
                    onChange={(e) => setMealCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Stack>

                {/* Status */}
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="Availed">Availed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </TextField>

                {/* Remarks */}
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Remarks"
                  placeholder="Optional remarks or notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </>
            )}
          </Stack>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || loadingData}
          sx={{
            bgcolor: COMMON_COLORS.primaryButton.bg,
            color: COMMON_COLORS.primaryButton.color,
            '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
          }}
        >
          {submitting ? 'Saving...' : isEdit ? 'Update Entry' : 'Create Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
