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

import { createPaymentTypeCustom, updatePaymentTypeCustom, PaymentType } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  currentItem?: PaymentType | null;
};

export function PaymentTypeDialog({ open, onClose, onSuccess, currentItem }: Props) {
  const [paymentType, setPaymentType] = useState('');
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
      if (currentItem) {
        setPaymentType(currentItem.payment_type || '');
      } else {
        setPaymentType('');
      }
      setError('');
    }
  }, [open, currentItem]);

  const handleSubmit = async () => {
    if (!paymentType.trim()) {
      setError('Payment Type');
      setSnackbar({ open: true, message: 'Payment Type is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (currentItem) {
        await updatePaymentTypeCustom(currentItem.name, {
          payment_type: paymentType,
        });
      } else {
        await createPaymentTypeCustom({
          payment_type: paymentType,
        });
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save payment type';
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
        <Typography variant="h6">{currentItem ? 'Edit Payment Type' : 'New Payment Type'}</Typography>
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
            label="Payment Type"
            value={paymentType}
            onChange={(e) => {
              setPaymentType(e.target.value);
              if (error === 'Payment Type') setError('');
            }}
            error={error === 'Payment Type'}
            helperText={error === 'Payment Type' ? 'Payment Type is required' : ''}
            disabled={loading}
            placeholder="e.g. Bank Transfer"
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
          {loading ? (currentItem ? 'Updating...' : 'Creating...') : (currentItem ? 'Update' : 'Create')}
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
