import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import {
  createCompanyBankAccount,
  updateCompanyBankAccount,
  getCompanyBankAccount,
  CompanyBankAccount,
} from 'src/api/masters';

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
  id?: string | null;
};

export function CompanyBankAccountDialog({ open, onClose, onSuccess, id }: Props) {
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [status, setStatus] = useState<CompanyBankAccount['status']>('Active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (open) {
        if (id) {
          try {
            setLoading(true);
            const data = await getCompanyBankAccount(id);
            setBankName(data.bank_name || '');
            setAccountHolderName(data.account_holder_name || '');
            setAccountNo(data.account_no || '');
            setIfscCode(data.ifsc_code || '');
            setUpiId(data.upi_id || '');
            setStatus(data.status || 'Active');
          } catch (err) {
            console.error('Failed to fetch company bank account:', err);
            setSnackbar({ open: true, message: 'Failed to fetch details', severity: 'error' });
          } finally {
            setLoading(false);
          }
        } else {
          setBankName('');
          setAccountHolderName('');
          setAccountNo('');
          setIfscCode('');
          setUpiId('');
          setStatus('Active');
        }
        setError('');
      }
    };

    fetchData();
  }, [open, id]);

  const handleSubmit = async () => {
    if (!bankName.trim()) {
      setError('Bank Name');
      setSnackbar({ open: true, message: 'Bank Name is required', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data: Partial<CompanyBankAccount> = {
        bank_name: bankName,
        account_holder_name: accountHolderName,
        account_no: accountNo,
        ifsc_code: ifscCode,
        upi_id: upiId,
        status,
      };

      if (id) {
        await updateCompanyBankAccount(id, data);
      } else {
        await createCompanyBankAccount(data);
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save';
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
          boxShadow: (themeVar) => themeVar.customShadows.z24,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{id ? 'Edit Company Bank Account' : 'New Company Bank Account'}</Typography>
        <Iconify icon="mingcute:close-line" onClick={onClose} sx={{ cursor: 'pointer', color: 'text.disabled' }} />
      </DialogTitle>

      <DialogContent dividers>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} sx={{ py: 2 }}>
          <TextField
            required
            fullWidth
            label="Bank Name"
            placeholder="e.g. HDFC Bank"
            value={bankName}
            onChange={(e) => {
              setBankName(e.target.value);
              if (error === 'Bank Name') setError('');
            }}
            error={error === 'Bank Name'}
            helperText={error === 'Bank Name' ? 'Bank Name is required' : ''}
            disabled={loading}
            autoFocus
            InputLabelProps={{ shrink: true }}
            sx={{ gridColumn: '1 / -1', '& .MuiFormLabel-asterisk': { color: 'red' } }}
          />

          <TextField
            fullWidth
            label="Account Holder Name"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Account No"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="IFSC Code"
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="UPI ID"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            fullWidth
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CompanyBankAccount['status'])}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
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
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
        >
          {id ? 'Save Changes' : 'Create'}
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
