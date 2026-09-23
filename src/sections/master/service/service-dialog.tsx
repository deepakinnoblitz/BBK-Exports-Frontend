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

import { createService, updateService, renameService, Service } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  currentService?: Service | null;
};

export function ServiceDialog({ open, onClose, onSuccess, currentService }: Props) {
  const [serviceName, setServiceName] = useState('');
  const [serviceId, setServiceId] = useState('');
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
      if (currentService) {
        setServiceName(currentService.service_name || '');
        setServiceId(currentService.service_id || '');
      } else {
        setServiceName('');
        setServiceId('');
      }
      setError('');
    }
  }, [open, currentService]);

  const handleSubmit = async () => {
    if (!serviceName.trim()) {
      setError('Service Name');
      setSnackbar({ open: true, message: 'Service Name is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (currentService) {
        if (currentService.service_name !== serviceName) {
          await renameService(currentService.name, serviceName);
        } else {
          await updateService(currentService.name, { service_id: serviceId });
        }
      } else {
        await createService({ service_name: serviceName, service_id: serviceId });
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save service';
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
        <Typography variant="h6">{currentService ? 'Edit Service' : 'New Service'}</Typography>
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
            label="Service Name"
            value={serviceName}
            onChange={(e) => {
              setServiceName(e.target.value);
              if (error === 'Service Name') setError('');
            }}
            error={error === 'Service Name'}
            helperText={error === 'Service Name' ? 'Service Name is required' : ''}
            disabled={loading}
            placeholder="e.g. Web Development"
          />

          <TextField
            fullWidth
            label="Service ID"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              if (error) setError('');
            }}
            disabled={loading}
            placeholder="e.g. S-001"
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
          {loading ? (currentService ? 'Updating...' : 'Creating...') : (currentService ? 'Update' : 'Create')}
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
