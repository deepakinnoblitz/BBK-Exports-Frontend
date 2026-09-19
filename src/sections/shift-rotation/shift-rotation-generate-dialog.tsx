import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ShiftRotation, generateRotationAssignments } from 'src/api/shift-rotation';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  rotations: ShiftRotation[];
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
  const [selectedName, setSelectedName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (selectedRotationName && rotations.some((r) => r.name === selectedRotationName)) {
        setSelectedName(selectedRotationName);
      } else if (rotations.length > 0) {
        setSelectedName(rotations[0].name);
      } else {
        setSelectedName('');
      }
    }
  }, [open, selectedRotationName, rotations]);

  const activeRotation = rotations.find((r) => r.name === selectedName);

  const handleGenerate = async () => {
    if (!selectedName) return;
    try {
      setSubmitting(true);
      const res: any = await generateRotationAssignments(selectedName);
      onSuccess(res?.message || 'Shift Roster entries generated successfully');
      onClose();
    } catch (err: any) {
      console.error(err);
      onError(err?.message || 'Failed to generate assignments from rotation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Iconify icon="solar:play-bold" width={20} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Generate Shift Roster Entries
          </Typography>
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

      <DialogContent sx={{ p: 3, mt: 1 }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Select a Shift Rotation pattern to generate concrete date-wise Shift Roster entries for its assigned employees across its active duration.
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel id="rotation-select-label">Shift Rotation</InputLabel>
            <Select
              labelId="rotation-select-label"
              value={selectedName}
              label="Shift Rotation"
              onChange={(e) => setSelectedName(e.target.value)}
            >
              {rotations.map((rot) => (
                <MenuItem key={rot.name} value={rot.name}>
                  {rot.rotation_name || rot.name} ({rot.frequency || 'Weekly'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {activeRotation && (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: 'background.neutral',
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {activeRotation.rotation_name}
                  </Typography>
                  <Label color={activeRotation.status === 'Active' ? 'success' : 'error'}>
                    {(activeRotation.status || 'Active').toUpperCase()}
                  </Label>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '13px' }}>
                  Department: <strong>{activeRotation.department || 'All Departments'}</strong>
                </Typography>

                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '13px' }}>
                  Active Period: <strong>{activeRotation.start_date} → {activeRotation.end_date}</strong>
                </Typography>

                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '13px' }}>
                  Frequency: <strong>{activeRotation.frequency}</strong>
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!selectedName || submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="solar:play-bold" />}
          sx={{ bgcolor: '#08a3cd', color: 'common.white', '&:hover': { bgcolor: '#068fb3' } }}
        >
          Generate Entries
        </Button>
      </DialogActions>
    </Dialog>
  );
}
