import type { ShiftRotation } from 'src/api/shift-rotation';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
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

        <DialogContent sx={{ m: 1.5 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Step 1: Rotation Pattern Selection */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  ml: 1,
                  color: 'text.secondary',
                  mb: 2.5,
                }}
              >
                1. Select Rotation Pattern
              </Typography>

              <Autocomplete
                fullWidth
                size="medium"
                options={availableRotations}
                getOptionLabel={(rot) =>
                  rot.rotation_name ? `${rot.rotation_name} — (${rot.frequency || 'Weekly'})` : rot.name
                }
                isOptionEqualToValue={(rot, val) => rot.name === val?.name}
                value={availableRotations.find((r) => r.name === selectedName) || null}
                onChange={(_, newVal) => setSelectedName(newVal ? newVal.name : '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Shift Rotation Pattern"
                    placeholder="Search rotation pattern..."
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />

              {/* Sequence Steps Preview */}
              {rotationDetail && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2.25,
                    borderRadius: 2,
                    bgcolor: alpha(COMMON_COLORS.emerald.main, 0.05),
                    border: `1px solid ${alpha(COMMON_COLORS.emerald.main, 0.22)}`,
                    borderLeft: `4px solid ${COMMON_COLORS.emerald.main}`,
                    boxShadow: `0 2px 10px ${alpha(COMMON_COLORS.emerald.main, 0.06)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.75 }}>
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(COMMON_COLORS.emerald.light, 1),
                          color: COMMON_COLORS.emerald.darker,
                        }}
                      >
                        <Iconify icon={"solar:repeat-bold" as any} width={18} />
                      </Box>
                      <div>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'text.primary' }}>
                          Sequence Cycle ({rotationDetail.frequency || 'Daily'} rotation)
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
                          {rotationDetail.sequences?.length || 0} sequential shift{(rotationDetail.sequences?.length || 0) === 1 ? '' : 's'} in continuous rotation
                        </Typography>
                      </div>
                    </Stack>

                    <Label
                      variant="soft"
                      color={rotationDetail.status === 'Active' ? 'success' : 'default'}
                      sx={{ fontWeight: 800, textTransform: 'uppercase', px: 1.25 }}
                    >
                      {(rotationDetail.status || 'Active').toUpperCase()}
                    </Label>
                  </Stack>

                  <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.25}>
                    {rotationDetail.sequences && rotationDetail.sequences.length > 0 ? (
                      rotationDetail.sequences.map((seq, idx) => (
                        <Stack key={idx} direction="row" alignItems="center" spacing={1.25}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.25,
                              px: 1.75,
                              py: 0.9,
                              borderRadius: 1.25,
                              bgcolor: 'background.paper',
                              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: COMMON_COLORS.emerald.main,
                                boxShadow: `0 2px 8px ${alpha(COMMON_COLORS.emerald.main, 0.12)}`,
                              },
                            }}
                          >
                            <Box
                              sx={{
                                minWidth: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                                color: COMMON_COLORS.emerald.darker,
                                border: `1.5px solid ${alpha(COMMON_COLORS.emerald.main, 0.4)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                              }}
                            >
                              {seq.step_number || idx + 1}
                            </Box>
                            <div>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  color: 'text.disabled',
                                  letterSpacing: 0.5,
                                  lineHeight: 1,
                                }}
                              >
                                Step {seq.step_number || idx + 1}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 800,
                                  color: 'text.primary',
                                  fontSize: '0.84rem',
                                  lineHeight: 1.3,
                                }}
                              >
                                {seq.shift_name || seq.shift}
                              </Typography>
                            </div>
                          </Box>

                          {idx < (rotationDetail.sequences?.length || 0) - 1 && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: COMMON_COLORS.emerald.main,
                                opacity: 0.8,
                              }}
                            >
                              <Iconify icon={"solar:arrow-right-linear" as any} width={18} />
                            </Box>
                          )}
                        </Stack>
                      ))
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        No sequence steps configured in this rotation.
                      </Typography>
                    )}

                    {rotationDetail.sequences && rotationDetail.sequences.length > 1 && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.6,
                          px: 1.25,
                          py: 0.7,
                          borderRadius: 1,
                          bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                          border: `1px dashed ${alpha(COMMON_COLORS.emerald.main, 0.4)}`,
                          color: COMMON_COLORS.emerald.darker,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                        }}
                      >
                        <Iconify icon={"solar:restart-bold" as any} width={14} />
                        Repeats Cycle
                      </Box>
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
                  fontSize: '12px',
                  ml: 1,
                  color: 'text.secondary',
                  mb: 2.5,
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
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                />
                <DatePicker
                  label="To Date *"
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  format="DD-MMM-YYYY"
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
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
                    ml: 1,
                    color: 'text.secondary',
                    mb: 1
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
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                        color: selectedEmployeeIds.length > 0 ? COMMON_COLORS.emerald.darker : 'text.primary',
                      }}
                    >
                      {selectedEmployeeIds.length === 0
                        ? 'No Employees Selected'
                        : `${selectedEmployeeIds.length} employees selected for this rotation`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {selectedEmployeeIds.length === 0
                        ? 'Filter by Department, Shift, and Line Order.'
                        : 'Ready to receive the recurring shift rotation schedule.'}
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

            {/* Step 4: Exclusions & Conflict Handling */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  color: 'text.secondary',
                  letterSpacing: 0.5,
                  mb: 1,
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
