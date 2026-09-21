import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { getDoctypeList } from 'src/api/leads';
import { bulkAssignShifts, previewBulkAssignShifts } from 'src/api/shift-roster';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
};

export function ShiftRosterBulkDialog({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'preview'>('form');

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState<dayjs.Dayjs | null>(dayjs());
  const [effectiveTo, setEffectiveTo] = useState<dayjs.Dayjs | null>(dayjs().add(6, 'day'));
  const [excludeWeeklyOffs, setExcludeWeeklyOffs] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [reason, setReason] = useState('');

  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadDropdowns();
      setStep('form');
      setPreviewData(null);
      setErrorMessage(null);
      setSelectedEmployees([]);
      setSelectedShift('');
      setEffectiveFrom(dayjs());
      setEffectiveTo(dayjs().add(6, 'day'));
      setExcludeWeeklyOffs(true);
      setExcludeHolidays(true);
      setOverrideConflicts(false);
      setReason('');
    }
  }, [open]);

  const loadDropdowns = async () => {
    try {
      setLoadingData(true);
      const [empRes, deptRes, shiftRes] = await Promise.all([
        getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation', 'shift']),
        getDoctypeList('Department', ['name', 'department_name']),
        getDoctypeList('Shift', ['name', 'shift_name', 'start_time', 'end_time']),
      ]);
      setEmployees(empRes || []);
      setDepartments(deptRes || []);
      setShifts(shiftRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredEmployeesByDept = selectedDept === 'all'
    ? employees
    : employees.filter((e) => e.department === selectedDept);

  const handleSelectAllDept = () => {
    const newSelected = [...selectedEmployees];
    filteredEmployeesByDept.forEach((emp) => {
      if (!newSelected.some((e) => e.name === emp.name)) {
        newSelected.push(emp);
      }
    });
    setSelectedEmployees(newSelected);
  };

  const handleClearAll = () => {
    setSelectedEmployees([]);
  };

  const handlePreview = async () => {
    if (selectedEmployees.length === 0) {
      setErrorMessage('Please select at least one employee.');
      return;
    }
    if (!selectedShift) {
      setErrorMessage('Please select a shift.');
      return;
    }
    if (!effectiveFrom || !effectiveFrom.isValid() || !effectiveTo || !effectiveTo.isValid()) {
      setErrorMessage('Please select valid start and end dates.');
      return;
    }

    try {
      setLoadingPreview(true);
      setErrorMessage(null);

      const preview = await previewBulkAssignShifts({
        employees: selectedEmployees.map((e) => e.name),
        shift: selectedShift,
        effective_from: effectiveFrom.format('YYYY-MM-DD'),
        effective_to: effectiveTo.format('YYYY-MM-DD'),
        exclude_weekly_offs: excludeWeeklyOffs,
        exclude_holidays: excludeHolidays,
      });

      setPreviewData(preview);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to preview bulk assignment');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      await bulkAssignShifts({
        employees: selectedEmployees.map((e) => e.name),
        shift: selectedShift,
        effective_from: effectiveFrom!.format('YYYY-MM-DD'),
        effective_to: effectiveTo!.format('YYYY-MM-DD'),
        assignment_type: 'Bulk',
        reason: reason || 'Bulk Shift Assignment',
        exclude_weekly_offs: excludeWeeklyOffs,
        exclude_holidays: excludeHolidays,
        override_conflicts: overrideConflicts,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply bulk shift assignment');
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6">
            {step === 'form' ? 'Bulk Shift Assignment' : 'Preview Bulk Shift Assignment'}
          </Typography>

          <IconButton
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {step === 'form' ? (
            <Stack spacing={2.5} sx={{ py: 1 }}>
              {/* Department filter helper */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter by Department"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.name} value={d.name}>
                      {d.department_name || d.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectAllDept}
                  sx={{ whiteSpace: 'nowrap', height: 40 }}
                >
                  Select All ({filteredEmployeesByDept.length})
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={handleClearAll}
                  disabled={selectedEmployees.length === 0}
                  sx={{ whiteSpace: 'nowrap', height: 40 }}
                >
                  Clear Selected
                </Button>
              </Stack>

              {/* Multi-employee selector */}
              <Autocomplete
                multiple
                options={employees}
                loading={loadingData}
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
                    required
                    label={`Selected Employees (${selectedEmployees.length})`}
                    placeholder={selectedEmployees.length === 0 ? "Select Employee(s)..." : ""}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                  />
                )}
              />

              {/* Shift Selector */}
              <Autocomplete
                fullWidth
                options={shifts}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  const timeStr = option.start_time && option.end_time ? ` (${String(option.start_time).slice(0, 5)} - ${String(option.end_time).slice(0, 5)})` : '';
                  return `${option.shift_name || option.name}${timeStr}`;
                }}
                value={shifts.find((s) => s.name === selectedShift) || null}
                onChange={(_, newValue) => {
                  setSelectedShift(newValue ? newValue.name : '');
                }}
                renderOption={(props, option, { selected: isSelected }) => (
                  <li {...props} key={option.name}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {option.shift_name || option.name}
                      </Typography>
                      {option.start_time && option.end_time && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {String(option.start_time).slice(0, 5)} - {String(option.end_time).slice(0, 5)}
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
                    label="Shift to Apply"
                    placeholder="Select Shift..."
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                  />
                )}
              />

              {/* Date Range */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <DatePicker
                  label="Start Date"
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
                  value={effectiveTo}
                  minDate={effectiveFrom || undefined}
                  onChange={(val) => setEffectiveTo(val)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputLabelProps: { shrink: true },
                      sx: { '& .MuiFormLabel-asterisk': { color: 'red' } },
                    },
                  }}
                />
              </Stack>

              {/* Checkbox Options */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeWeeklyOffs}
                      onChange={(e) => setExcludeWeeklyOffs(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Exclude Weekly Offs (Sundays)"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeHolidays}
                      onChange={(e) => setExcludeHolidays(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Exclude Company Holidays"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={overrideConflicts}
                      onChange={(e) => setOverrideConflicts(e.target.checked)}
                      color="error"
                    />
                  }
                  label="Override existing shifts"
                />
              </Stack>

              {/* Reason */}
              <TextField
                fullWidth
                label="Reason / Reference Note"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                multiline
                rows={2}
                placeholder="Optional assignment note..."
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />}>
                Review the simulated shifts before applying to the database. Overlapping active assignments will be handled based on your override settings.
              </Alert>

              <TableContainer sx={{ maxHeight: 380, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Shift</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Effective Period</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Conflicts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData?.map((item: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{item.employee_name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.employee}</Typography>
                        </TableCell>
                        <TableCell>{item.department || '-'}</TableCell>
                        <TableCell>
                          <Label variant="soft" color="info">{item.shift}</Label>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {item.effective_from} → {item.effective_to}
                        </TableCell>
                        <TableCell>
                          {item.conflicts && item.conflicts.length > 0 ? (
                            <Label variant="soft" color="error">{item.conflicts.length} conflict(s)</Label>
                          ) : (
                            <Label variant="soft" color="success">None (Clean)</Label>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
          {step === 'preview' ? (
            <>
              <Button variant="outlined" color="inherit" onClick={() => setStep('form')} disabled={submitting}>
                Back to Edit
              </Button>

              <Button
                variant="contained"
                onClick={handleApply}
                disabled={submitting}
                sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:check-circle-bold" />}
              >
                Apply Shift ({selectedEmployees.length} Employees)
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={handlePreview}
              disabled={loadingPreview || selectedEmployees.length === 0 || !selectedShift}
              sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
              startIcon={loadingPreview ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:eye-bold" />}
            >
              Preview Assignments
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
