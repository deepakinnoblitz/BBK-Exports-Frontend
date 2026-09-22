import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { bulkAssignShifts, previewBulkAssignShifts } from 'src/api/shift-roster';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { EmployeeSelectorDialog } from '../shift-rotation/employee-selector-dialog';

// ----------------------------------------------------------------------

const formatTime = (time?: string) => {
  if (!time) return '';
  const normalized = time.includes(':') && time.split(':')[0].length === 1 ? `0${time}` : time;
  const parsed = dayjs(`2000-01-01T${normalized}`);
  return parsed.isValid() ? parsed.format('hh:mm A') : time;
};

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
};

export function ShiftRosterBulkDialog({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'preview'>('form');

  const [shifts, setShifts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Selected Assignees
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [openSelectorDialog, setOpenSelectorDialog] = useState(false);

  const [selectedShift, setSelectedShift] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState<dayjs.Dayjs | null>(dayjs());
  const [effectiveTo, setEffectiveTo] = useState<dayjs.Dayjs | null>(dayjs().add(6, 'day'));
  const [excludeWeeklyOffs, setExcludeWeeklyOffs] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [reason, setReason] = useState('');

  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadDropdowns();
      setStep('form');
      setPreviewData(null);
      setErrorMessage(null);
      setSelectedEmployeeIds([]);
      setOpenSelectorDialog(false);
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
      const shiftRes = await getDoctypeList('Shift', ['name', 'shift_name', 'start_time', 'end_time']);
      setShifts(shiftRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handlePreview = async () => {
    if (selectedEmployeeIds.length === 0) {
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
        employees: selectedEmployeeIds,
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
        employees: selectedEmployeeIds,
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
            p: 2.5,
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
            <Stack spacing={3} sx={{ py: 1 }}>
              {/* Target Assignees */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      fontSize: '12px',
                      color: 'text.secondary',
                      letterSpacing: 0.5,
                    }}
                  >
                     Target Assignees ({selectedEmployeeIds.length} selected)
                  </Typography>

                  {selectedEmployeeIds.length > 0 && (
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      onClick={() => setSelectedEmployeeIds([])}
                      sx={{ fontSize: '12px' }}
                      startIcon={<Iconify icon={"solar:trash-bin-minimalistic-bold" as any} />}
                    >
                      Clear All
                    </Button>
                  )}
                </Stack>

                <Card
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: selectedEmployeeIds.length > 0
                      ? alpha(COMMON_COLORS.emerald.main, 0.04)
                      : (theme) => alpha(theme.palette.grey[500], 0.04),
                    borderColor: selectedEmployeeIds.length > 0
                      ? alpha(COMMON_COLORS.emerald.main, 0.3)
                      : 'divider',
                    borderRadius: 1.5,
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: selectedEmployeeIds.length > 0
                          ? alpha(COMMON_COLORS.emerald.main, 0.12)
                          : (theme) => alpha(theme.palette.grey[500], 0.12),
                        color: selectedEmployeeIds.length > 0
                          ? COMMON_COLORS.emerald.main
                          : 'text.secondary',
                      }}
                    >
                      <Iconify icon={"solar:users-group-rounded-bold" as any} width={24} />
                    </Box>

                    <div>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 800,
                          color: selectedEmployeeIds.length > 0 ? COMMON_COLORS.emerald.darker : 'text.primary',
                        }}
                      >
                        {selectedEmployeeIds.length === 0
                          ? 'No Employees Selected'
                          : `${selectedEmployeeIds.length} employees selected for bulk assignment`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {selectedEmployeeIds.length === 0
                          ? 'Filter by Department, Shift, and Line Order.'
                          : 'Ready to receive the bulk shift assignment.'}
                      </Typography>
                    </div>
                  </Stack>

                  <Button
                    size="small"
                    variant={selectedEmployeeIds.length > 0 ? 'outlined' : 'contained'}
                    onClick={() => setOpenSelectorDialog(true)}
                    startIcon={<Iconify icon={"solar:filter-bold" as any} width={16} />}
                    sx={{
                      ...(selectedEmployeeIds.length === 0
                        ? {
                            bgcolor: COMMON_COLORS.primaryButton.bg,
                            color: COMMON_COLORS.primaryButton.color,
                            '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
                          }
                        : {
                            color: COMMON_COLORS.emerald.main,
                            borderColor: COMMON_COLORS.emerald.main,
                            '&:hover': {
                              borderColor: COMMON_COLORS.emerald.darker,
                              bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                            },
                          }),
                      px: 1.75,
                      py: 0.6,
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                    }}
                  >
                    {selectedEmployeeIds.length === 0
                      ? 'Select Assignees (Dept / Shift / Line)'
                      : `Manage Selection (${selectedEmployeeIds.length})`}
                  </Button>
                </Card>
              </Box>

              {/* Shift Selector */}
              <Autocomplete
                fullWidth
                options={shifts}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  const timeStr =
                    option.start_time && option.end_time
                      ? ` (${formatTime(option.start_time)} - ${formatTime(option.end_time)})`
                      : '';
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
                          {formatTime(option.start_time)} - {formatTime(option.end_time)}
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
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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
              </Box>

              {/* Checkbox Options */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 3 }} sx={{ py: 0.5, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeWeeklyOffs}
                      onChange={(e) => setExcludeWeeklyOffs(e.target.checked)}
                      sx={{ color: '#08a3cd', '&.Mui-checked': { color: '#08a3cd' } }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Exclude Weekly Offs (Sundays)</Typography>}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeHolidays}
                      onChange={(e) => setExcludeHolidays(e.target.checked)}
                      sx={{ color: '#08a3cd', '&.Mui-checked': { color: '#08a3cd' } }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Exclude Company Holidays</Typography>}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={overrideConflicts}
                      onChange={(e) => setOverrideConflicts(e.target.checked)}
                      color="error"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Override existing shifts</Typography>}
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
              {previewData?.conflict_employees_count ? (
                <Alert severity="warning" icon={<Iconify icon={"solar:danger-circle-bold" as any} />}>
                  {previewData.conflict_employees_count} employee(s) have overlapping shift assignments.
                  {overrideConflicts
                    ? ' "Override existing shifts" is ENABLED: old assignments will be superseded.'
                    : ' "Override existing shifts" is DISABLED: conflicting employees will be skipped unless override is checked.'}
                </Alert>
              ) : (
                <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />}>
                  Review the simulated shifts before applying to the database. Overlapping active assignments will be handled based on your override settings.
                </Alert>
              )}

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
                    {(Array.isArray(previewData) ? previewData : previewData?.preview || []).map((item: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{item.employee_name || item.employee}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.employee}</Typography>
                        </TableCell>
                        <TableCell>{item.department || '-'}</TableCell>
                        <TableCell>
                          <Label variant="soft" color="info">{item.new_shift || item.shift}</Label>
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
                Apply Shift ({selectedEmployeeIds.length} Employees)
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={handlePreview}
              disabled={loadingPreview || selectedEmployeeIds.length === 0 || !selectedShift}
              sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
              startIcon={loadingPreview ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:eye-bold" />}
            >
              Preview Assignments
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {openSelectorDialog && (
        <EmployeeSelectorDialog
          open={openSelectorDialog}
          onClose={() => setOpenSelectorDialog(false)}
          selectedIds={selectedEmployeeIds}
          onConfirm={(ids) => setSelectedEmployeeIds(ids)}
          contextLabel="for this assignment"
        />
      )}
    </LocalizationProvider>
  );
}
