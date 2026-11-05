import dayjs, { type Dayjs } from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { COMMON_COLORS } from 'src/theme';
import { fetchLiveLineOccupancy, type LiveLineOccupancy } from 'src/api/line-roster';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type LineChangeMode = 'pre-fixed' | 'post-fixed';

export interface PreFixedConfig {
  targetLine: string;
  sourceLine?: string;
  effectiveFrom: string;
  effectiveTo: string;
}

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSelectMode: (mode: LineChangeMode, config?: PreFixedConfig) => void;
  currentMode?: LineChangeMode;
  initialTargetLine?: string;
  initialEffectiveFrom?: Dayjs | null;
  initialEffectiveTo?: Dayjs | null;
  lines?: LiveLineOccupancy[];
};

export function FaceLineChangeModeDialog({
  open,
  onClose,
  onSelectMode,
  currentMode = 'pre-fixed',
  initialTargetLine = '',
  initialEffectiveFrom,
  initialEffectiveTo,
  lines,
}: Props) {
  const theme = useTheme();
  const [selectedMode, setSelectedMode] = useState<LineChangeMode>(currentMode);

  // Line selection & Dates
  const [linesList, setLinesList] = useState<LiveLineOccupancy[]>(lines || []);
  const [targetLine, setTargetLine] = useState<string>(initialTargetLine);
  const [effectiveFrom, setEffectiveFrom] = useState<Dayjs | null>(initialEffectiveFrom || dayjs());
  const [effectiveTo, setEffectiveTo] = useState<Dayjs | null>(initialEffectiveTo || dayjs());

  useEffect(() => {
    setSelectedMode(currentMode);
  }, [currentMode]);

  useEffect(() => {
    if (initialTargetLine) {
      setTargetLine(initialTargetLine);
    }
  }, [initialTargetLine]);

  useEffect(() => {
    if (lines && lines.length > 0) {
      setLinesList(lines);
      if (!targetLine && lines[0]?.name) {
        setTargetLine(lines[0].name);
      }
    } else if (open) {
      fetchLiveLineOccupancy(effectiveFrom?.format('YYYY-MM-DD'))
        .then((res) => {
          const list = res || [];
          setLinesList(list);
          if (!targetLine && list[0]?.name) {
            setTargetLine(list[0].name);
          }
        })
        .catch((err) => console.error('Failed to load lines for mode dialog:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lines]);

  const handleSelect = (mode: LineChangeMode) => {
    setSelectedMode(mode);
  };

  const handleConfirm = () => {
    onSelectMode(selectedMode, {
      targetLine,
      effectiveFrom: effectiveFrom?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
      effectiveTo: effectiveTo?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Typography variant="h6" sx={{ fontWeight: 800, pt: 1 }}>
              Select Line Change Mode
            </Typography>
          </Stack>
        </Stack>

        <IconButton onClick={onClose} sx={{ color: theme.palette.grey[500] }}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2, mt: 2 }}>
        <Stack spacing={2}>
          {/* ── Mode 1: Pre-Fixed Line Mode ── */}
          <Card
            onClick={() => handleSelect('pre-fixed')}
            sx={{
              p: 2.5,
              cursor: 'pointer',
              borderRadius: 2,
              border: (t) =>
                `2px solid ${
                  selectedMode === 'pre-fixed'
                    ? COMMON_COLORS.emerald.main
                    : alpha(t.palette.grey[500], 0.18)
                }`,
              bgcolor: (t) =>
                selectedMode === 'pre-fixed'
                  ? alpha(COMMON_COLORS.emerald.main, 0.05)
                  : alpha(t.palette.grey[500], 0.02),
              boxShadow: (t) =>
                selectedMode === 'pre-fixed'
                  ? `0 4px 14px ${alpha(COMMON_COLORS.emerald.main, 0.2)}`
                  : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: COMMON_COLORS.emerald.main,
                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.04),
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: '12px',
                  bgcolor: alpha(COMMON_COLORS.emerald.main, selectedMode === 'pre-fixed' ? 0.2 : 0.1),
                  color: COMMON_COLORS.emerald.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify icon={"solar:bolt-bold" as any} width={24} />
              </Box>

              <Stack spacing={0.75} sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Pre-Fixed Line Mode
                    </Typography>
                    <Label color="primary" variant="soft" sx={{ fontSize: 11, fontWeight: 700 }}>
                      Fast Queue
                    </Label>
                  </Stack>

                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: `2px solid ${
                        selectedMode === 'pre-fixed'
                          ? COMMON_COLORS.emerald.main
                          : theme.palette.divider
                      }`,
                      bgcolor:
                        selectedMode === 'pre-fixed'
                          ? COMMON_COLORS.emerald.main
                          : 'transparent',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedMode === 'pre-fixed' && (
                      <Iconify icon={"eva:checkmark-fill" as any} width={14} />
                    )}
                  </Box>
                </Stack>

                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.45 }}>
                  Select the <strong>Source Line</strong> and <strong>Target Line</strong> in advance. Workers step up to the camera consecutively and are instantly reassigned with automatic countdown progression.
                </Typography>

                <Stack direction="row" spacing={2} sx={{ pt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                    <Iconify icon={"solar:check-circle-bold" as any} width={14} sx={{ color: COMMON_COLORS.emerald.main }} />
                    Batch Transfers
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                    <Iconify icon={"solar:check-circle-bold" as any} width={14} sx={{ color: COMMON_COLORS.emerald.main }} />
                    Hands-Free Auto Advance
                  </Typography>
                </Stack>

                {/* Pre-Fixed Settings: To Line (Target Line) and Effective Dates */}
                {selectedMode === 'pre-fixed' && (
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: (t) => `1px dashed ${alpha(COMMON_COLORS.emerald.main, 0.35)}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Stack spacing={2}>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={linesList}
                        value={linesList.find((l) => l.name === targetLine) || null}
                        onChange={(_, val) => setTargetLine(val ? val.name : '')}
                        getOptionLabel={(option) => `${option.line_name} (${option.assigned_count} workers)`}
                        isOptionEqualToValue={(option, val) => option.name === val.name}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="To Line (Target Line) *"
                            placeholder="Select target line for transfer..."
                            error={!targetLine}
                            helperText={!targetLine ? 'Target line is required for Pre-Fixed Mode' : ''}
                          />
                        )}
                      />

                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid container spacing={1.5}>
                          <Grid size={{ xs: 6 }}>
                            <DatePicker
                              label="Effective From"
                              value={effectiveFrom}
                              onChange={(val) => {
                                setEffectiveFrom(val);
                                if (effectiveTo && val && val.isAfter(effectiveTo)) {
                                  setEffectiveTo(val);
                                }
                              }}
                              slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <DatePicker
                              label="Effective To"
                              value={effectiveTo}
                              minDate={effectiveFrom || undefined}
                              onChange={(val) => setEffectiveTo(val)}
                              slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                          </Grid>
                        </Grid>
                      </LocalizationProvider>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Card>

          {/* ── Mode 2: Post-Fixed Line Mode ── */}
          <Card
            onClick={() => handleSelect('post-fixed')}
            sx={{
              p: 2.5,
              cursor: 'pointer',
              borderRadius: 2,
              border: (t) =>
                `2px solid ${
                  selectedMode === 'post-fixed'
                    ? '#8b5cf6'
                    : alpha(t.palette.grey[500], 0.18)
                }`,
              bgcolor: (t) =>
                selectedMode === 'post-fixed'
                  ? alpha('#8b5cf6', 0.05)
                  : alpha(t.palette.grey[500], 0.02),
              boxShadow: (t) =>
                selectedMode === 'post-fixed'
                  ? `0 4px 14px ${alpha('#8b5cf6', 0.2)}`
                  : 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#8b5cf6',
                bgcolor: alpha('#8b5cf6', 0.04),
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: '12px',
                  bgcolor: alpha('#8b5cf6', selectedMode === 'post-fixed' ? 0.2 : 0.1),
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify icon={"solar:target-bold" as any} width={24} />
              </Box>

              <Stack spacing={0.75} sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Post-Fixed Line Mode
                    </Typography>
                    <Label color="secondary" variant="soft" sx={{ fontSize: 11, fontWeight: 700 }}>
                      Flex Allocation
                    </Label>
                  </Stack>

                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: `2px solid ${
                        selectedMode === 'post-fixed'
                          ? '#8b5cf6'
                          : theme.palette.divider
                      }`,
                      bgcolor:
                        selectedMode === 'post-fixed'
                          ? '#8b5cf6'
                          : 'transparent',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedMode === 'post-fixed' && (
                      <Iconify icon={"eva:checkmark-fill" as any} width={14} />
                    )}
                  </Box>
                </Stack>

                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.45 }}>
                  Scan the worker&apos;s face first to detect current department and line assignment. Then review live line capacities and headcounts on-screen to select the optimal destination line.
                </Typography>

                <Stack direction="row" spacing={2} sx={{ pt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                    <Iconify icon={"solar:check-circle-bold" as any} width={14} sx={{ color: '#8b5cf6' }} />
                    Live Occupancy Gauges
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                    <Iconify icon={"solar:check-circle-bold" as any} width={14} sx={{ color: '#8b5cf6' }} />
                    Dynamic Flexible Routing
                  </Typography>
                </Stack>

                {/* Post-Fixed Settings: Effective Dates */}
                {selectedMode === 'post-fixed' && (
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: (t) => `1px dashed ${alpha('#8b5cf6', 0.35)}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 6 }}>
                          <DatePicker
                            label="Effective From"
                            value={effectiveFrom}
                            onChange={(val) => {
                              setEffectiveFrom(val);
                              if (effectiveTo && val && val.isAfter(effectiveTo)) {
                                setEffectiveTo(val);
                              }
                            }}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <DatePicker
                            label="Effective To"
                            value={effectiveTo}
                            minDate={effectiveFrom || undefined}
                            onChange={(val) => setEffectiveTo(val)}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        </Grid>
                      </Grid>
                    </LocalizationProvider>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          disabled={selectedMode === 'pre-fixed' && !targetLine}
          onClick={handleConfirm}
          endIcon={<Iconify icon={"eva:arrow-forward-fill" as any} />}
          sx={{
            bgcolor: selectedMode === 'pre-fixed' ? COMMON_COLORS.emerald.main : '#8b5cf6',
            color: '#ffffff',
            borderRadius: 1.5,
            px: 3,
            fontWeight: 700,
            '&:hover': {
              bgcolor: selectedMode === 'pre-fixed' ? COMMON_COLORS.emerald.dark : '#7c3aed',
            },
          }}
        >
          {`Proceed with ${selectedMode === 'pre-fixed' ? 'Pre-Fixed' : 'Post-Fixed'} Mode`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
