import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
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
  getLineRotationDoc,
  createLineRotation,
  updateLineRotation,
} from 'src/api/line-rotation';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: VoidFunction;
  editName?: string | null;
};

export function LineRotationDialog({ open, onClose, onSuccess, editName }: Props) {
  const isEdit = Boolean(editName);

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Masters
  const [lines, setLines] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

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
  const [sequences, setSequences] = useState<{ step_number: number; line_order: string; line_name?: string }[]>([
    { step_number: 1, line_order: '' },
    { step_number: 2, line_order: '' },
  ]);

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
      const [lineRes, deptRes] = await Promise.all([
        getDoctypeList('Line Order', ['name', 'line_name', 'description']),
        getDoctypeList('Department', ['name', 'department_name']),
      ]);
      setLines(lineRes || []);
      setDepartments(deptRes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDoc = async (name: string) => {
    try {
      setLoadingDoc(true);
      const doc = await getLineRotationDoc(name);
      if (doc) {
        setRotationName(doc.rotation_name || '');
        setFrequency((doc.frequency as any) || 'Weekly');
        setStatus((doc.status as any) || 'Active');
        setDepartment(doc.department || '');
        setStartDate(doc.start_date ? dayjs(doc.start_date) : null);
        setEndDate(doc.end_date ? dayjs(doc.end_date) : null);
        setExcludeHolidays(Boolean(doc.exclude_holidays));
        setExcludeWeeklyOffs(Boolean(doc.exclude_weekly_offs));
        setDescription(doc.description || '');

        setSequences(
          doc.sequences && doc.sequences.length > 0
            ? doc.sequences.map((s, idx) => ({
                step_number: s.step_number || idx + 1,
                line_order: s.line_order,
                line_name: s.line_name,
              }))
            : [{ step_number: 1, line_order: '' }]
        );
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
      { step_number: 1, line_order: '' },
      { step_number: 2, line_order: '' },
    ]);
    setErrorMessage(null);
  };

  const handleAddSequence = () => {
    setSequences((prev) => [...prev, { step_number: prev.length + 1, line_order: '' }]);
  };

  const handleRemoveSequence = (index: number) => {
    if (sequences.length <= 1) return;
    setSequences((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((item, idx) => ({ ...item, step_number: idx + 1 }));
    });
  };

  const handleSequenceLineChange = (index: number, lineValue: string) => {
    const selected = lines.find((l) => l.name === lineValue);
    setSequences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              line_order: lineValue,
              line_name: selected?.line_name || lineValue,
            }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!rotationName.trim()) {
      setErrorMessage('Rotation Name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Start Date and End Date are required.');
      return;
    }
    if (endDate.isBefore(startDate)) {
      setErrorMessage('End Date cannot be earlier than Start Date.');
      return;
    }
    if (sequences.some((s) => !s.line_order)) {
      setErrorMessage('Please choose a line order for each sequence step.');
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
          doctype: 'Line Rotation Sequence',
          step_number: idx + 1,
          line_order: s.line_order,
          line_name: s.line_name,
        })),
      };

      if (isEdit && editName) {
        await updateLineRotation(editName, payload);
      } else {
        await createLineRotation(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save Line Rotation');
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
            px: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6">{isEdit ? 'Edit Line Rotation' : 'New Line Rotation'}</Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'text.disabled',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {loadingDoc ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#059669' }} />
            </Box>
          ) : (
            <Stack spacing={3} sx={{ py: 1 }}>
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
                  placeholder="e.g. Production Weekly Line Rotation"
                  disabled={isEdit}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                />

                <TextField
                  select
                  fullWidth
                  required
                  label="Rotation Frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}
                >
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="Bi-weekly">Bi-weekly (Fortnightly)</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                </TextField>

                <DatePicker
                  label="Start Date"
                  format="DD-MM-YYYY"
                  value={startDate}
                  onChange={(v) => setStartDate(v)}
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
                  value={endDate}
                  minDate={startDate || undefined}
                  onChange={(v) => setEndDate(v)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputLabelProps: { shrink: true },
                      sx: { '& .MuiFormLabel-asterisk': { color: 'red' } },
                    },
                  }}
                />

                <Autocomplete
                  fullWidth
                  options={departments}
                  getOptionLabel={(d) => d.department_name || d.name || ''}
                  isOptionEqualToValue={(opt, val) => opt.name === val?.name}
                  value={departments.find((d) => d.name === department) || null}
                  onChange={(_, val) => setDepartment(val ? val.name : '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Department"
                      placeholder="All / None (Optional)"
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />

                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Box>

              {/* Line Sequence Pattern */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: alpha(COMMON_COLORS.emerald.main, 0.05),
                  border: `1px solid ${alpha(COMMON_COLORS.emerald.main, 0.22)}`,
                  boxShadow: `0 2px 10px ${alpha(COMMON_COLORS.emerald.main, 0.06)}`,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                        color: COMMON_COLORS.emerald.darker,
                      }}
                    >
                      <Iconify icon={"solar:repeat-bold" as any} width={18} />
                    </Box>
                    <div>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.925rem', color: 'text.primary' }}>
                        Line Sequence Pattern
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
                        {sequences.length} sequential step{sequences.length === 1 ? '' : 's'} in continuous rotation cycle
                      </Typography>
                    </div>
                  </Stack>

                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Iconify icon="solar:add-circle-bold" />}
                    onClick={handleAddSequence}
                    sx={{
                      borderRadius: 1,
                      bgcolor: COMMON_COLORS.emerald.main,
                      color: '#fff',
                      fontWeight: 700,
                      px: 1.75,
                      '&:hover': {
                        bgcolor: COMMON_COLORS.emerald.dark,
                      },
                    }}
                  >
                    Add Step
                  </Button>
                </Stack>

                <Stack spacing={0}>
                  {sequences.map((seq, idx) => (
                    <Box key={idx}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 2,
                          borderRadius: 1.5,
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
                            minWidth: 28,
                            height: 28,
                            borderRadius: '50%',
                            bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                            color: COMMON_COLORS.emerald.darker,
                            border: `1.5px solid ${alpha(COMMON_COLORS.emerald.main, 0.4)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </Box>

                        <Box sx={{ width: 60, flexShrink: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: 'text.secondary',
                              letterSpacing: 0.5,
                            }}
                          >
                            Step {idx + 1}
                          </Typography>
                        </Box>

                        <Autocomplete
                          fullWidth
                          size="small"
                          options={lines}
                          getOptionLabel={(l) => l.line_name || l.name || ''}
                          isOptionEqualToValue={(opt, val) => opt.name === val?.name}
                          value={lines.find((l) => l.name === seq.line_order) || null}
                          onChange={(_, val) => handleSequenceLineChange(idx, val ? val.name : '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              required
                              label="Select Line"
                              placeholder="Search line..."
                              InputLabelProps={{ shrink: true }}
                              sx={{
                                bgcolor: 'background.paper',
                                '& .MuiFormLabel-asterisk': { color: 'red' },
                              }}
                            />
                          )}
                        />

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveSequence(idx)}
                          disabled={sequences.length <= 1}
                          sx={{
                            color: sequences.length <= 1 ? 'text.disabled' : '#ff5630',
                            '&:hover': { bgcolor: 'rgba(255, 86, 48, 0.08)' },
                            flexShrink: 0,
                          }}
                        >
                          <Iconify icon={"solar:trash-bin-minimalistic-bold" as any} width={20} />
                        </IconButton>
                      </Box>

                      {idx < sequences.length - 1 && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 1,
                            color: COMMON_COLORS.emerald.main,
                          }}
                        >
                          <Iconify icon={"solar:arrow-down-linear" as any} width={20} />
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>

                {sequences.length > 1 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mt: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.6,
                        px: 1.25,
                        py: 0.6,
                        borderRadius: 1,
                        bgcolor: alpha(COMMON_COLORS.emerald.main, 0.08),
                        border: `1px dashed ${alpha(COMMON_COLORS.emerald.main, 0.4)}`,
                        color: COMMON_COLORS.emerald.darker,
                        fontSize: '0.725rem',
                        fontWeight: 700,
                      }}
                    >
                      <Iconify icon={"solar:restart-bold" as any} width={14} />
                      Cycle Repeats back to Step 1
                    </Box>
                  </Box>
                )}
              </Box>

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
              </Stack>

              {/* Description */}
              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                placeholder="Optional notes regarding this line rotation pattern..."
                InputLabelProps={{ shrink: true }}
              />

              <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                <b>Rotation Pattern:</b> This template defines the line sequence. To assign employees and generate date-wise line schedules, use the <b>Generate Roster</b> action.
              </Alert>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, px: 3, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || loadingDoc}
            sx={{
              bgcolor: COMMON_COLORS.primaryButton.bg,
              color: 'common.white',
              '&:hover': { bgcolor: COMMON_COLORS.primaryButton.hoverBg },
              px: 3,
            }}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
