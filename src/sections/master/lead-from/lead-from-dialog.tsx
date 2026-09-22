import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { IconButton } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { createLeadFrom, updateLeadFrom, renameLeadFrom, LeadFrom } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  currentLeadFrom?: LeadFrom | null;
};

export function LeadFromDialog({ open, onClose, onSuccess, currentLeadFrom }: Props) {
  const [leadFrom, setLeadFrom] = useState('');
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
      if (currentLeadFrom) {
        setLeadFrom(currentLeadFrom.lead_from || '');
      } else {
        setLeadFrom('');
      }
      setError('');
    }
  }, [open, currentLeadFrom]);

  const handleSubmit = async () => {
    if (!leadFrom.trim()) {
      setError('Lead From');
      setSnackbar({ open: true, message: 'Lead From is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (currentLeadFrom) {
        if (currentLeadFrom.lead_from !== leadFrom) {
          await renameLeadFrom(currentLeadFrom.name, leadFrom);
        } else {
          await updateLeadFrom(currentLeadFrom.name, { lead_from: leadFrom });
        }
      } else {
        await createLeadFrom({ lead_from: leadFrom });
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save lead source';
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
        <Typography variant="h6">{currentLeadFrom ? 'Edit Lead From' : 'New Lead From'}</Typography>
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
            label="Lead From"
            value={leadFrom}
            onChange={(e) => {
              setLeadFrom(e.target.value);
              if (error === 'Lead From') setError('');
            }}
            error={error === 'Lead From'}
            helperText={error === 'Lead From' ? 'Lead From is required' : ''}
            disabled={loading}
            placeholder="e.g. Google"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
        >
          {loading ? (currentLeadFrom ? 'Updating...' : 'Creating...') : (currentLeadFrom ? 'Update' : 'Create')}
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
