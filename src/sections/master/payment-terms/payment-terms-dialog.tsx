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

import { createPaymentTerm, updatePaymentTerm, PaymentTerm } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  currentItem?: PaymentTerm | null;
};

export function PaymentTermsDialog({ open, onClose, onSuccess, currentItem }: Props) {
  const [paymentTerms, setPaymentTerms] = useState('');
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
        setPaymentTerms(currentItem.payment_terms || '');
      } else {
        setPaymentTerms('');
      }
      setError('');
    }
  }, [open, currentItem]);

  const handleSubmit = async () => {
    if (!paymentTerms.trim()) {
      setError('Payment Terms');
      setSnackbar({ open: true, message: 'Payment Terms is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (currentItem) {
        await updatePaymentTerm(currentItem.name, {
          payment_terms: paymentTerms,
        });
      } else {
        await createPaymentTerm({
          payment_terms: paymentTerms,
        });
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save payment terms';
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
        <Typography variant="h6">{currentItem ? 'Edit Payment Terms' : 'New Payment Terms'}</Typography>
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
            label="Payment Terms"
            value={paymentTerms}
            onChange={(e) => {
              setPaymentTerms(e.target.value);
              if (error === 'Payment Terms') setError('');
            }}
            error={error === 'Payment Terms'}
            helperText={error === 'Payment Terms' ? 'Payment Terms is required' : ''}
            disabled={loading}
            placeholder="e.g. 30 Days"
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
