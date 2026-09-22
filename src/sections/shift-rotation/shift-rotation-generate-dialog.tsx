import type { ShiftRotation } from 'src/api/shift-rotation';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import {
  getShiftRotationDoc,
  generateRotationAssignments,
} from 'src/api/shift-rotation';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { EmployeeSelectorDialog } from './employee-selector-dialog';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  rotations?: ShiftRotation[];
  selectedRotationName?: string | null;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
};

export function ShiftRotationGenerateDialog({
  open,
  onClose,
  rotations,
  selectedRotationName,
  onSuccess,
  onError,
}: Props) {
  const [fetchedRotations, setFetchedRotations] = useState<ShiftRotation[]>([]);
  const availableRotations = rotations && rotations.length > 0 ? rotations : fetchedRotations;

  const [selectedName, setSelectedName] = useState<string>('');
  const [rotationDetail, setRotationDetail] = useState<ShiftRotation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Selected Assignees
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [openSelectorDialog, setOpenSelectorDialog] = useState(false);

  // Dates
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs().add(29, 'day'));

  // Options
  const [excludeWeeklyOffs, setExcludeWeeklyOffs] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [overrideConflicts, setOverrideConflicts] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadMasters();
      if (selectedRotationName && availableRotations.some((r) => r.name === selectedRotationName)) {
        setSelectedName(selectedRotationName);
      } else if (availableRotations.length > 0) {
        setSelectedName(availableRotations[0].name);
      } else {
        setSelectedName('');
      }
      setStartDate(dayjs());
      setEndDate(dayjs().add(29, 'day'));
      setExcludeWeeklyOffs(true);
      setExcludeHolidays(true);
      setOverrideConflicts(false);
      setSelectedEmployeeIds([]);
      setOpenSelectorDialog(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedRotationName, rotations]);

  useEffect(() => {
    if (!selectedName && availableRotations.length > 0) {
      if (selectedRotationName && availableRotations.some((r) => r.name === selectedRotationName)) {
        setSelectedName(selectedRotationName);
      } else {
        setSelectedName(availableRotations[0].name);
      }
    }
  }, [availableRotations, selectedName, selectedRotationName]);

  useEffect(() => {
    if (selectedName) {
      setLoadingDetail(true);
      getShiftRotationDoc(selectedName)
        .then((doc) => {
          setRotationDetail(doc);
          if (doc.exclude_weekly_offs !== undefined) {
            setExcludeWeeklyOffs(Boolean(doc.exclude_weekly_offs));
          }
          if (doc.exclude_holidays !== undefined) {
            setExcludeHolidays(Boolean(doc.exclude_holidays));
          }
        })
        .catch(console.error)
        .finally(() => setLoadingDetail(false));
    } else {
      setRotationDetail(null);
    }
  }, [selectedName]);

  const loadMasters = async () => {
    try {
      if (!rotations || rotations.length === 0) {
        const rotRes = await getDoctypeList('Shift Rotation', ['name', 'rotation_name', 'frequency', 'status', 'department']);
        setFetchedRotations(rotRes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!selectedName) {
      onError('Please select a Shift Rotation.');
      return;
    }
    if (!startDate || !endDate) {
      onError('Please select valid Start and End dates.');
      return;
    }
    if (endDate.isBefore(startDate)) {
      onError('End Date cannot be earlier than Start Date.');
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      onError('Please select at least one employee.');
      return;
    }

    try {
      setSubmitting(true);
      const res: any = await generateRotationAssignments({
        rotation_name: selectedName,
        employees: selectedEmployeeIds,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        exclude_weekly_offs: excludeWeeklyOffs ? 1 : 0,
        exclude_holidays: excludeHolidays ? 1 : 0,
        override_conflicts: overrideConflicts ? 1 : 0,
      });

      onSuccess(res?.message || `Shift Roster generated for ${selectedEmployeeIds.length} employees.`);
      onClose();
    } catch (err: any) {
      console.error(err);
      onError(err?.message || 'Failed to generate shift roster from rotation.');
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <div>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Generate Shift Roster Entries
              </Typography>
            </div>
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

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Step 1: Rotation Pattern Selection */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  color: 'text.secondary',
                  mb: 1,
                  ml: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                1. Select Rotation Pattern
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel id="rotation-select-label">Shift Rotation Pattern</InputLabel>
                <Select
                  labelId="rotation-select-label"
                  value={selectedName}
                  label="Shift Rotation Pattern"
                  onChange={(e) => setSelectedName(e.target.value)}
                >
                  {availableRotations.map((rot) => (
                    <MenuItem key={rot.name} value={rot.name}>
                      {rot.rotation_name || rot.name} — ({rot.frequency || 'Weekly'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Sequence Steps Preview */}
              {rotationDetail && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Sequence Cycle ({rotationDetail.frequency || 'Weekly'} rotation)
                    </Typography>
                    <Label color={rotationDetail.status === 'Active' ? 'success' : 'default'}>
                      {(rotationDetail.status || 'Active').toUpperCase()}
                    </Label>
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {rotationDetail.sequences && rotationDetail.sequences.length > 0 ? (
                      rotationDetail.sequences.map((seq, idx) => (
                        <Chip
                          key={idx}
                          size="small"
                          label={`Step ${seq.step_number || idx + 1}: ${seq.shift_name || seq.shift}`}
                          sx={{
                            fontWeight: 700,
                            bgcolor: 'background.paper',
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                          }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        No sequence steps configured in this rotation.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Step 2: Date Range */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  color: 'text.secondary',
                  mb: 1,
                  ml: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                2. Generation Period (Date Range)
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <DatePicker
                  label="From Date *"
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  format="DD-MMM-YYYY"
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
                <DatePicker
                  label="To Date *"
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  format="DD-MMM-YYYY"
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Stack>
            </Box>

            {/* Step 3: Employees Selection */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    ml: 1.5,
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  3. Target Assignees ({selectedEmployeeIds.length} selected)
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {selectedEmployeeIds.length === 0
                        ? 'No Employees Selected'
                        : `${selectedEmployeeIds.length} Employees Selected`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {selectedEmployeeIds.length === 0
                        ? 'Filter by Department, Shift, and Line Order.'
                        : 'Ready to receive the recurring shift rotation schedule.'}
                    </Typography>
                  </div>
                </Stack>

                <Button
                  variant={selectedEmployeeIds.length > 0 ? 'outlined' : 'contained'}
                  onClick={() => setOpenSelectorDialog(true)}
                  startIcon={<Iconify icon={"solar:filter-bold"  as any} />}
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
                    px: 2,
                    py: 1,
                    fontWeight: 700,
                  }}
                >
                  {selectedEmployeeIds.length === 0
                    ? 'Select Assignees (Dept / Shift / Line)'
                    : `Manage Selection (${selectedEmployeeIds.length})`}
                </Button>
              </Card>
            </Box>

            {/* Step 4: Exclusions & Conflict Handling */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  color: 'text.secondary',
                  mb: 1,
                  ml: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                4. Exclusions & Conflict Options
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ pt: 0.5 }}>
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
                  label="Exclude Holidays"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={overrideConflicts}
                      onChange={(e) => setOverrideConflicts(e.target.checked)}
                      color="warning"
                    />
                  }
                  label="Override Conflicting Roster Entries"
                />
              </Stack>
            </Box>

            {overrideConflicts && (
              <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                Any active shift roster assignments on overlapping dates for selected employees will be <b>cancelled and replaced</b> with rotation shifts.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={!selectedName || selectedEmployeeIds.length === 0 || submitting || loadingDetail}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Iconify icon={"solar:play-bold" as any} />}
            sx={{
              bgcolor: COMMON_COLORS.primaryButton.bg,
              color: 'common.white',
              '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
              px: 3,
            }}
          >
            {submitting ? 'Generating...' : `Generate Roster (${selectedEmployeeIds.length} Staff)`}
          </Button>
        </DialogActions>
      </Dialog>

      {openSelectorDialog && (
        <EmployeeSelectorDialog
          open={openSelectorDialog}
          onClose={() => setOpenSelectorDialog(false)}
          selectedIds={selectedEmployeeIds}
          onConfirm={(ids) => setSelectedEmployeeIds(ids)}
        />
      )}
    </LocalizationProvider>
  );
}
