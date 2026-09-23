import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { IconButton } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { type CallStatus, createCallStatus, renameCallStatus, updateCallStatus } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  currentCallStatus?: CallStatus | null;
};

export function CallStatusDialog({ open, onClose, onSuccess, currentCallStatus }: Props) {
  const [callStatus, setCallStatus] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  useEffect(() => {
    if (open) {
      if (currentCallStatus) {
        setCallStatus(currentCallStatus.call_status || '');
        setStatus(currentCallStatus.status || 'Active');
      } else {
        setCallStatus('');
        setStatus('Active');
      }
      setError('');
    }
  }, [open, currentCallStatus]);

  const handleSubmit = async () => {
    if (!callStatus.trim()) {
      setError('Call Status');
      setSnackbar({ open: true, message: 'Call Status is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (currentCallStatus) {
        let currentId = currentCallStatus.name;
        if (currentCallStatus.call_status !== callStatus) {
          await renameCallStatus(currentCallStatus.name, callStatus);
          currentId = callStatus;
        }
        await updateCallStatus(currentId, { call_status: callStatus, status });
      } else {
        await createCallStatus({ call_status: callStatus, status });
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save Call Status';
      setError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setLoading(false);
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
          boxShadow: (themeVar: any) => themeVar.customShadows.z24,
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{currentCallStatus ? 'Edit Call Status' : 'New Call Status'}</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            margin: '1rem',
            columnGap: 2,
            rowGap: 3,
            gridTemplateColumns: '1fr',
          }}
        >
          <TextField
            required
            fullWidth
            label="Call Status"
            value={callStatus}
            onChange={(e) => {
              setCallStatus(e.target.value);
              if (error === 'Call Status') setError('');
            }}
            error={error === 'Call Status'}
            helperText={error === 'Call Status' ? 'Call Status is required' : ''}
            disabled={loading}
            placeholder="e.g. Called – No Response"
          />

          <TextField
            select
            fullWidth
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
            InputLabelProps={{ shrink: true }}
            disabled={loading}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
        >
          {loading ? (currentCallStatus ? 'Updating...' : 'Creating...') : (currentCallStatus ? 'Update' : 'Create')}
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
