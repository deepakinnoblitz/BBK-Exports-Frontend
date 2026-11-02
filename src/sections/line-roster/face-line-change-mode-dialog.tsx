import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { COMMON_COLORS } from 'src/theme';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type LineChangeMode = 'pre-fixed' | 'post-fixed';

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSelectMode: (mode: LineChangeMode) => void;
  currentMode?: LineChangeMode;
};

export function FaceLineChangeModeDialog({
  open,
  onClose,
  onSelectMode,
  currentMode = 'pre-fixed',
}: Props) {
  const theme = useTheme();
  const [selectedMode, setSelectedMode] = useState<LineChangeMode>(currentMode);

  const handleSelect = (mode: LineChangeMode) => {
    setSelectedMode(mode);
  };

  const handleConfirm = () => {
    onSelectMode(selectedMode);
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
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                bgcolor: alpha(COMMON_COLORS.emerald.main, 0.12),
                color: COMMON_COLORS.emerald.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon={"solar:face-scan-circle-bold" as any} width={22} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Select Line Change Mode
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', pl: 0.25 }}>
            Choose the reassignment workflow before entering the biometric kiosk station.
          </Typography>
        </Stack>

        <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled' }}>
          <Iconify icon={"eva:close-fill" as any} width={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
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
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, justifyContent: 'space-between' }}>
        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 1.5, fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
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
