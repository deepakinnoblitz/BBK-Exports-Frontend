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

import { createTaxTypeCustom, updateTaxTypeCustom, TaxType } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  currentItem?: TaxType | null;
};

export function TaxTypesDialog({ open, onClose, onSuccess, currentItem }: Props) {
  const [taxName, setTaxName] = useState('');
  const [taxPercentage, setTaxPercentage] = useState<number | ''>('');
  const [taxType, setTaxType] = useState<'GST' | 'IGST'>('GST');
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
      if (currentItem) {
        setTaxName(currentItem.tax_name || '');
        setTaxPercentage(currentItem.tax_percentage ?? '');
        setTaxType(currentItem.tax_type || 'GST');
        setStatus(currentItem.status || 'Active');
      } else {
        setTaxName('');
        setTaxPercentage('');
        setTaxType('GST');
        setStatus('Active');
      }
      setError('');
    }
  }, [open, currentItem]);

  const handleSubmit = async () => {
    if (!taxName.trim()) {
      setError('Tax Name');
      setSnackbar({ open: true, message: 'Tax name is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        tax_name: taxName.trim(),
        tax_percentage: taxPercentage === '' ? 0 : Number(taxPercentage),
        tax_type: taxType,
        status,
      };

      if (currentItem) {
        await updateTaxTypeCustom(currentItem.name, payload);
      } else {
        await createTaxTypeCustom(payload);
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save tax type';
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
        <Typography variant="h6">{currentItem ? 'Edit Tax Type' : 'New Tax Type'}</Typography>
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
            label="Tax Name"
            value={taxName}
            onChange={(e) => {
              setTaxName(e.target.value);
              if (error === 'Tax Name') setError('');
            }}
            error={error === 'Tax Name'}
            helperText={error === 'Tax Name' ? 'Tax name is required' : ''}
            disabled={loading}
            placeholder="e.g. CGST+SGST 18%"
          />

          <TextField
            fullWidth
            type="number"
            label="Tax Percentage"
            value={taxPercentage}
            onChange={(e) => {
              const val = e.target.value;
              setTaxPercentage(val === '' ? '' : Number(val));
            }}
            disabled={loading}
            placeholder="e.g. 18"
          />

          <TextField
            select
            fullWidth
            label="Tax Type"
            value={taxType}
            onChange={(e) => setTaxType(e.target.value as 'GST' | 'IGST')}
            disabled={loading}
          >
            <MenuItem value="GST">GST</MenuItem>
            <MenuItem value="IGST">IGST</MenuItem>
          </TextField>

          <TextField
            select
            fullWidth
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
            disabled={loading}
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
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
